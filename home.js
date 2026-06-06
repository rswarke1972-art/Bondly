// Home Dashboard Module for Bondly

const Home = {
    userData: null,
    selectedPostMedia: null,
    postSetup: false,
    activityData: {
        unreadMessages: 0,
        friendRequests: 0,
        newMatches: 0,
        studyBuddies: 0
    },
    listenersSetup: false,
    
    // Initialize home screen
    init: () => {
        console.log('Home module initializing');
        Home.loadGreeting();
        Home.loadDailyPrompt();
        Home.loadActivity();
        Home.setupPosts();
        Home.loadPosts();
        Home.loadRecommendations();
        Home.setupActivityListeners();
    },
    
    // Refresh home screen
    refresh: () => {
        Home.loadGreeting();
        Home.loadDailyPrompt();
        Home.loadActivity();
        Home.setupPosts();
        Home.loadPosts();
        Home.loadRecommendations();
        Home.setupActivityListeners();
    },

    // Setup post composer events
    setupPosts: () => {
        if (Home.postSetup) return;

        const form = document.getElementById('post-create-form');
        const mediaBtn = document.getElementById('post-media-btn');
        const mediaInput = document.getElementById('post-media-input');

        form?.addEventListener('submit', (e) => {
            e.preventDefault();
            Home.createPost();
        });

        mediaBtn?.addEventListener('click', () => mediaInput?.click());

        mediaInput?.addEventListener('change', (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
                Utils.showToast('Please choose an image or video');
                return;
            }
            if (file.size > 50 * 1024 * 1024) {
                Utils.showToast('Media must be less than 50MB');
                return;
            }
            Home.selectedPostMedia = file;
            Home.renderPostMediaPreview(file);
        });

        Home.postSetup = true;
    },

    renderPostMediaPreview: (file) => {
        const preview = document.getElementById('post-media-preview');
        if (!preview) return;

        const url = URL.createObjectURL(file);
        const isVideo = file.type.startsWith('video/');
        preview.classList.remove('hidden');
        preview.innerHTML = `
            <div class="post-media-preview-inner">
                ${isVideo ? `<video src="${url}" muted playsinline></video>` : `<img src="${url}" alt="Selected media">`}
                <button type="button" class="post-media-remove" onclick="Home.clearPostMedia()">Remove</button>
            </div>
        `;
    },

    clearPostMedia: () => {
        Home.selectedPostMedia = null;
        const input = document.getElementById('post-media-input');
        const preview = document.getElementById('post-media-preview');
        if (input) input.value = '';
        if (preview) {
            preview.classList.add('hidden');
            preview.innerHTML = '';
        }
    },

    getVisiblePostAuthorIds: async () => {
        const db = FirebaseService.getDb();
        const userId = Auth.currentUser.uid;
        const authorIds = new Set([userId]);

        const friendsSnapshot = await db.collection('friends')
            .where('participants', 'array-contains', userId)
            .get();

        friendsSnapshot.forEach(doc => {
            const participants = doc.data().participants || [];
            participants.forEach(participantId => {
                if (participantId !== userId) authorIds.add(participantId);
            });
        });

        return Array.from(authorIds);
    },

    // Load posts from self and friends
    loadPosts: async () => {
        if (!Auth.currentUser || !FirebaseService.isInitialized()) return;

        const db = FirebaseService.getDb();
        const feed = document.getElementById('posts-feed');
        if (!feed) return;

        feed.innerHTML = '<div class="post-loading">Loading posts...</div>';

        try {
            const authorIds = await Home.getVisiblePostAuthorIds();
            const chunks = [];
            for (let i = 0; i < authorIds.length; i += 10) {
                chunks.push(authorIds.slice(i, i + 10));
            }

            const snapshots = await Promise.all(chunks.map(ids =>
                db.collection('posts')
                    .where('authorId', 'in', ids)
                    .limit(30)
                    .get()
            ));

            const posts = [];
            snapshots.forEach(snapshot => {
                snapshot.forEach(doc => posts.push({ id: doc.id, ...doc.data() }));
            });

            posts.sort((a, b) => {
                const aTime = a.timestamp?.toMillis?.() || 0;
                const bTime = b.timestamp?.toMillis?.() || 0;
                return bTime - aTime;
            });

            Home.renderPosts(posts.slice(0, 30));
        } catch (error) {
            console.error('[Bondly] Error loading posts:', error);
            feed.innerHTML = '<p style="text-align: center; color: var(--gray-500); padding: var(--spacing-lg);">Unable to load posts</p>';
        }
    },

    createPost: async () => {
        if (!Auth.currentUser || !FirebaseService.isInitialized()) return;

        const textEl = document.getElementById('post-text');
        const rawText = textEl?.value.trim() || '';
        const file = Home.selectedPostMedia;

        if (!rawText && !file) {
            Utils.showToast('Add text or media to post');
            return;
        }

        const db = FirebaseService.getDb();
        const userId = Auth.currentUser.uid;

        Utils.showLoading(file ? 'Uploading post...' : 'Creating post...');

        try {
            const userDoc = await db.collection('users').doc(userId).get();
            const userData = Utils.sanitizeUser(userDoc.data()) || {};
            let mediaUrl = '';
            let mediaType = '';

            if (file) {
                const upload = await Utils.uploadToCloudinary(file, file.type.startsWith('image/') ? 'image' : 'video');
                mediaUrl = upload.secure_url;
                mediaType = file.type.startsWith('image/') ? 'image' : 'video';
            }

            await db.collection('posts').add({
                authorId: userId,
                author: {
                    displayName: userData.displayName || Auth.currentUser.displayName || 'User',
                    username: userData.username || '',
                    avatar: userData.avatar || Auth.currentUser.photoURL || ''
                },
                text: Utils.sanitizeInput(rawText),
                mediaUrl,
                mediaType,
                likes: [],
                likeCount: 0,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            if (textEl) textEl.value = '';
            Home.clearPostMedia();
            Utils.showToast('Post created');
            Home.loadPosts();
        } catch (error) {
            console.error('[Bondly] Error creating post:', error);
            Utils.showToast(error.message || 'Unable to create post');
        } finally {
            Utils.hideLoading();
        }
    },

    renderPosts: (posts) => {
        const feed = document.getElementById('posts-feed');
        if (!feed) return;

        if (posts.length === 0) {
            feed.innerHTML = '<p style="text-align: center; color: var(--gray-500); padding: var(--spacing-lg);">No posts yet. Share the first update.</p>';
            return;
        }

        const currentUserId = Auth.currentUser?.uid;
        const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 44 44'%3E%3Crect fill='%237BAFD4' width='44' height='44'/%3E%3Ctext x='22' y='22' font-size='20' text-anchor='middle' dy='.3em' fill='white'%3EU%3C/text%3E%3C/svg%3E";
        feed.innerHTML = posts.map(post => {
            const liked = (post.likes || []).includes(currentUserId);
            const author = post.author || {};
            const timestamp = post.timestamp?.toDate?.() || new Date();
            const media = post.mediaUrl ? `
                <div class="post-media ${post.mediaType === 'video' ? 'is-video' : 'is-image'}">
                    <div class="media-placeholder">Loading ${post.mediaType || 'media'}...</div>
                    ${post.mediaType === 'video'
                        ? `<video src="${post.mediaUrl}" controls preload="metadata" onloadeddata="this.previousElementSibling.style.display='none'"></video>`
                        : `<img src="${post.mediaUrl}" alt="Post media" loading="lazy" onload="this.previousElementSibling.style.display='none'">`}
                </div>
            ` : '';

            return `
                <article class="post-card" data-post-id="${post.id}">
                    <div class="post-header">
                        <img src="${Utils.escapeHTML(author.avatar || defaultAvatar)}" alt="${Utils.escapeHTML(author.displayName || 'User')}" class="post-avatar">
                        <div class="post-author">
                            <div class="post-author-name">${Utils.escapeHTML(author.displayName || 'User')}</div>
                            <div class="post-time">@${Utils.escapeHTML(author.username || '')} · ${Utils.formatTime(timestamp)}</div>
                        </div>
                        ${post.authorId === currentUserId ? `<button class="post-delete-btn" onclick="Home.deletePost('${post.id}')">Delete</button>` : ''}
                    </div>
                    ${post.text ? `<p class="post-text">${Utils.escapeHTML(Utils.decodeHTML(post.text))}</p>` : ''}
                    ${media}
                    <div class="post-actions">
                        <button class="post-like-btn ${liked ? 'liked' : ''}" onclick="Home.togglePostLike('${post.id}', ${liked})">
                            ${liked ? 'Unlike' : 'Like'}
                        </button>
                        <span class="post-like-count">${post.likeCount || 0} ${(post.likeCount || 0) === 1 ? 'like' : 'likes'}</span>
                    </div>
                </article>
            `;
        }).join('');
    },

    togglePostLike: async (postId, alreadyLiked) => {
        if (!Auth.currentUser || !FirebaseService.isInitialized()) return;

        const db = FirebaseService.getDb();
        const userId = Auth.currentUser.uid;

        try {
            await db.collection('posts').doc(postId).update({
                likes: alreadyLiked
                    ? firebase.firestore.FieldValue.arrayRemove(userId)
                    : firebase.firestore.FieldValue.arrayUnion(userId),
                likeCount: firebase.firestore.FieldValue.increment(alreadyLiked ? -1 : 1)
            });
            Home.loadPosts();
        } catch (error) {
            console.error('[Bondly] Error toggling post like:', error);
            Utils.showToast('Unable to update like');
        }
    },

    deletePost: async (postId) => {
        if (!Auth.currentUser || !FirebaseService.isInitialized()) return;
        if (!confirm('Delete this post?')) return;

        try {
            await FirebaseService.getDb().collection('posts').doc(postId).delete();
            Utils.showToast('Post deleted');
            Home.loadPosts();
        } catch (error) {
            console.error('[Bondly] Error deleting post:', error);
            Utils.showToast('Unable to delete post');
        }
    },
    
    // Load greeting based on time
    loadGreeting: () => {
        const greeting = Utils.getGreeting();
        const greetingElement = document.getElementById('greeting');
        if (greetingElement) {
            greetingElement.textContent = greeting;
        }
    },
    
    // Load daily conversation prompt
    loadDailyPrompt: () => {
        const prompt = Utils.getRandomPrompt();
        const promptElement = document.getElementById('daily-prompt');
        if (promptElement) {
            promptElement.textContent = prompt;
        }
    },
    
    // Load activity data
    loadActivity: async () => {
        if (!Auth.currentUser) return;
        if (!FirebaseService.isInitialized()) return;

        const db = FirebaseService.getDb();
        const userId = Auth.currentUser.uid;

        try {
            // Get unread messages count
            const chatsSnapshot = await db.collection('chats')
                .where('participants', 'array-contains', userId)
                .get();

            let unreadCount = 0;
            chatsSnapshot.forEach(doc => {
                const chat = doc.data();
                if (chat.unread && chat.unread[userId] > 0) {
                    unreadCount += chat.unread[userId];
                }
            });

            Home.activityData.unreadMessages = unreadCount;
            document.getElementById('unread-count').textContent = unreadCount;

            // Get friend requests count
            const requestsSnapshot = await db.collection('friendRequests')
                .where('to', '==', userId)
                .where('status', '==', 'pending')
                .get();

            Home.activityData.friendRequests = requestsSnapshot.size;
            document.getElementById('requests-count').textContent = requestsSnapshot.size;

            // Get matches count (from recommendations)
            const userDoc = await db.collection('users').doc(userId).get();
            const userData = userDoc.data();

            const friendsSnapshot = await db.collection('friends')
                .where('participants', 'array-contains', userId)
                .get();

            const friendIds = new Set();
            friendsSnapshot.forEach(doc => {
                const participants = doc.data().participants;
                participants.forEach(p => {
                    if (p !== userId) friendIds.add(p);
                });
            });

            const usersSnapshot = await db.collection('users')
.orderBy('lastActive', 'desc')
                .limit(20)
                .get();

                const recommended =
    usersSnapshot.docs.filter(
        doc => doc.id !== userId
    );

            let matchesCount = 0;
            usersSnapshot.forEach(doc => {
                const user = Utils.sanitizeUser(doc.data());
                if (!friendIds.has(user.uid)) {
                    const similarityScore = Home.calculateSimilarityScore(userData, user);
                    if (similarityScore > 0) {
                        matchesCount++;
                    }
                }
            });

            Home.activityData.matches = matchesCount;
            document.getElementById('matches-count').textContent = matchesCount;

            // Get blocked users count
            try {
                const blockedSnapshot = await db.collection('blockedUsers')
                    .where('blocker', '==', userId)
                    .get();

                Home.activityData.blockedUsers = blockedSnapshot.size;
                document.getElementById('blocked-count').textContent = blockedSnapshot.size;
            } catch (error) {
                // If blockedUsers collection doesn't exist, set count to 0
                Home.activityData.blockedUsers = 0;
                document.getElementById('blocked-count').textContent = 0;
            }

            // Update badges
            Home.updateBadges();

        } catch (error) {
            console.error('Error loading activity:', error);
        }
    },
    
    // Load recommendations
    loadRecommendations: async () => {
        if (!Auth.currentUser) return;
        if (!FirebaseService.isInitialized()) return;

        const db = FirebaseService.getDb();
        const userId = Auth.currentUser.uid;
        const recommendationsList = document.getElementById('recommendations-list');

        console.log('[Bondly] Finding similar users');

        try {
            // Get current user data
            const userDoc = await db.collection('users').doc(userId).get();
            const userData = userDoc.data();
            Home.userData = userData;

            // Get current user's friends
            const friendsSnapshot = await db.collection('friends')
                .where('participants', 'array-contains', userId)
                .get();

            const friendIds = new Set();
            friendsSnapshot.forEach(doc => {
                const friends = doc.data().participants;
                friends.forEach(friendId => {
                    if (friendId !== userId) friendIds.add(friendId);
                });
            });

            // Get pending friend requests
            const requestsSnapshot = await db.collection('friendRequests')
                .where('from', '==', userId)
                .get();

            const requestedIds = new Set();
            requestsSnapshot.forEach(doc => {
                requestedIds.add(doc.data().to);
            });

            // Get current user's blocked users to exclude them
            const blockedSnapshot = await db.collection('blockedUsers')
                .where('blocker', '==', userId)
                .get();

            const blockedIds = new Set();
            blockedSnapshot.forEach(doc => {
                blockedIds.add(doc.data().blocked);
            });

            // Get potential matches
            const usersSnapshot = await db.collection('users')
                .where('uid', '!=', userId)
                .limit(20)
                .get();

            const recommendations = [];

            usersSnapshot.forEach(doc => {
                const user = Utils.sanitizeUser(doc.data());

                // Exclude friends
                if (friendIds.has(user.uid)) return;

                // Exclude already requested
                if (requestedIds.has(user.uid)) return;

                // Exclude blocked users
                if (blockedIds.has(user.uid)) return;

                // Calculate similarity score
                const similarityScore = Home.calculateSimilarityScore(userData, user);

                console.log('[Bondly] Similarity score:', similarityScore, 'for user:', user.displayName);

                if (similarityScore > 0) {
                    recommendations.push({
                        ...user,
                        similarityScore
                    });
                }
            });

            // Sort by similarity score
            recommendations.sort((a, b) => b.similarityScore - a.similarityScore);

            // Take top 3
            const topRecommendations = recommendations.slice(0, 3);

            console.log('[Bondly] Recommended users loaded:', topRecommendations.length);

            // Render recommendations
            if (topRecommendations.length > 0) {
                recommendationsList.innerHTML = topRecommendations.map(rec => `
                    <div class="recommendation-card">
                        <img src="${rec.avatar}" alt="${rec.displayName}" class="recommendation-avatar">
                        <div class="recommendation-info">
                            <div class="recommendation-name">${rec.displayName}</div>
                            <div class="recommendation-details">
                                ${Utils.getCountryFlag(rec.country)} ${rec.country} • ${rec.similarityScore}% match
                            </div>
                            <div class="recommendation-tags">
                                ${rec.interests.slice(0, 2).map(interest =>
                                    `<span class="tag">${interest}</span>`
                                ).join('')}
                            </div>
                        </div>
                        <button class="connect-btn" onclick="Home.sendFriendRequest('${rec.uid}')">
                            💙 Connect
                        </button>
                    </div>
                `).join('');
            } else {
                const recentUsersSnapshot =
    await db.collection('users')
        .orderBy('lastActive', 'desc')
        .limit(10)
        .get();

// Remove current user manually
const filteredUsers =
    recentUsersSnapshot.docs.filter(
        doc => doc.id !== userId
    );

                const recentUsers = [];
                filteredUsers.forEach(doc => {
                    const user = Utils.sanitizeUser(doc.data());
                    if (!friendIds.has(user.uid) && !requestedIds.has(user.uid) && !blockedIds.has(user.uid)) {
                        recentUsers.push(user);
                    }
                });

                if (recentUsers.length > 0) {
                    recommendationsList.innerHTML = recentUsers.map(rec => `
                        <div class="recommendation-card">
                            <img src="${rec.avatar}" alt="${rec.displayName}" class="recommendation-avatar">
                            <div class="recommendation-info">
                                <div class="recommendation-name">${rec.displayName}</div>
                                <div class="recommendation-details">
                                    ${Utils.getCountryFlag(rec.country)} ${rec.country}
                                </div>
                                <div class="recommendation-tags">
                                    ${rec.interests.slice(0, 2).map(interest =>
                                        `<span class="tag">${interest}</span>`
                                    ).join('')}
                                </div>
                            </div>
                            <button class="connect-btn" onclick="Home.sendFriendRequest('${rec.uid}')">
                                💙 Connect
                            </button>
                        </div>
                    `).join('');
                } else {
                    recommendationsList.innerHTML = '<p style="text-align: center; color: var(--gray-500);">No strong matches yet — explore more people 🌍</p>';
                }
            }

        } catch (error) {
            console.error('Error loading recommendations:', error);
            recommendationsList.innerHTML = '<p style="text-align: center; color: var(--gray-500);">Unable to load recommendations</p>';
        }
    },

    // Calculate similarity score between users
    calculateSimilarityScore: (user1, user2) => {
        let score = 0;

        // Same languages/interests: +5 points
        if (user1.interests && user2.interests) {
            const sharedInterests = user1.interests.filter(i => user2.interests.includes(i));
            score += sharedInterests.length * 5;
        }

        // Same goals: +4 points
        if (user1.goals && user2.goals) {
            const sharedGoals = user1.goals.filter(g => user2.goals.includes(g));
            score += sharedGoals.length * 4;
        }

        // Same country/language learning: +3 points
        if (user1.country === user2.country) {
            score += 3;
        }

        if (user1.learning && user2.languages) {
            const canLearn = user1.learning.filter(l => user2.languages.includes(l));
            score += canLearn.length * 3;
        }

        if (user2.learning && user1.languages) {
            const canTeach = user2.learning.filter(l => user1.languages.includes(l));
            score += canTeach.length * 3;
        }

        // Mutual interests (hobbies, study focus): +2 points
        if (user1.hobbies && user2.hobbies) {
            const sharedHobbies = user1.hobbies.filter(h => user2.hobbies.includes(h));
            score += sharedHobbies.length * 2;
        }

        if (user1.studyFocus && user2.studyFocus) {
            if (user1.studyFocus === user2.studyFocus) {
                score += 2;
            }
        }

        // Normalize to percentage (max score ~50)
        return Math.min(Math.round(score * 2), 100);
    },
    
    // Setup activity card listeners using event delegation
    setupActivityListeners: () => {
        // Prevent duplicate setup
        if (Home.listenersSetup) {
            console.log('Home activity listeners already setup, skipping');
            return;
        }

        console.log('Setting up home activity listeners');

        // Use event delegation on document to handle dashboard card clicks
        // This works even if elements don't exist at init time
        document.addEventListener('click', (e) => {
            const card = e.target.closest('.activity-card');
            if (card) {
                e.preventDefault();
                const cardId = card.id;
                if (cardId === 'unread-messages-card') {
                    console.log('[Bondly] Opening chats');
                    App.navigateTo('chats');
                } else if (cardId === 'friend-requests-card') {
                    console.log('[Bondly] Requests opened');
                    Home.openRequestsModal();
                } else if (cardId === 'new-matches-card') {
                    console.log('[Bondly] Scrolling to posts feed');
                    Home.scrollToRecommendations();
                } else if (cardId === 'blocked-users-card') {
                    console.log('[Bondly] Blocked users opened');
                    Home.openBlockedModal();
                }
            }
        });

        // Add cursor pointer style to all activity cards
        const style = document.createElement('style');
        style.textContent = '.activity-card { cursor: pointer; }';
        document.head.appendChild(style);

        Home.listenersSetup = true;
        console.log('Home activity listeners setup complete');
    },

    // Open requests modal
    openRequestsModal: async () => {
        console.log('[Bondly] Opening requests modal...');

        if (!Auth.currentUser) {
            console.error('[Bondly] No current user');
            return;
        }
        if (!FirebaseService.isInitialized()) {
            console.error('[Bondly] Firebase not initialized');
            return;
        }

        const db = FirebaseService.getDb();
        const userId = Auth.currentUser.uid;
        const modal = document.getElementById('requests-modal');
        const modalList = document.getElementById('requests-modal-list');

        console.log('[Bondly] Modal element:', modal);
        console.log('[Bondly] Modal list element:', modalList);

        if (!modal) {
            console.error('[Bondly] Requests modal element not found');
            return;
        }

        try {
            const requestsSnapshot = await db.collection('friendRequests')
                .where('to', '==', userId)
                .where('status', '==', 'pending')
                .get();

            console.log('[Bondly] Requests snapshot size:', requestsSnapshot.size);

            if (requestsSnapshot.empty) {
                modalList.innerHTML = '<p class="mini-modal-empty">No pending requests</p>';
            } else {
                const requestsWithUsers = await Promise.all(
                    requestsSnapshot.docs.map(async (doc) => {
                        const request = doc.data();
                        const userDoc = await db.collection('users').doc(request.from).get();
                        const userData = Utils.sanitizeUser(userDoc.data());
                        return { id: doc.id, ...request, userData };
                    })
                );

                modalList.innerHTML = requestsWithUsers.map(request => `
                    <div class="mini-modal-item">
                        <img src="${request.userData.avatar}" alt="${request.userData.displayName}" class="mini-modal-avatar">
                        <div class="mini-modal-info">
                            <div class="mini-modal-name">${request.userData.displayName}</div>
                            <div class="mini-modal-bio">@${request.userData.username}</div>
                        </div>
                        <div class="mini-modal-actions">
                            <button class="mini-modal-btn mini-modal-btn-accept" onclick="Home.acceptRequestFromModal('${request.id}', '${request.from}')">Accept</button>
                            <button class="mini-modal-btn mini-modal-btn-decline" onclick="Home.declineRequestFromModal('${request.id}')">Decline</button>
                        </div>
                    </div>
                `).join('');
            }

            modal.classList.remove('hidden');
            console.log('[Bondly] Modal classes after removing hidden:', modal.className);

            // Close modal when clicking outside
            setTimeout(() => {
                document.addEventListener('click', Home.closeRequestsModalOutside);
            }, 0);

        } catch (error) {
            console.error('Error loading requests:', error);
            modalList.innerHTML = '<p class="mini-modal-empty">Unable to load requests</p>';
        }
    },

    // Close requests modal
    closeRequestsModal: () => {
        const modal = document.getElementById('requests-modal');
        modal.classList.add('hidden');
        document.removeEventListener('click', Home.closeRequestsModalOutside);
    },

    // Close requests modal when clicking outside
    closeRequestsModalOutside: (e) => {
        const modal = document.getElementById('requests-modal');
        if (modal && !modal.contains(e.target)) {
            Home.closeRequestsModal();
        }
    },

    // Accept request from modal
    acceptRequestFromModal: async (requestId, fromUserId) => {
        console.log('[Bondly] Request accepted');
        await Friends.acceptRequest(requestId, fromUserId);
        Home.openRequestsModal(); // Refresh modal
        Home.loadActivity(); // Update count
    },

    // Decline request from modal
    declineRequestFromModal: async (requestId) => {
        console.log('[Bondly] Request declined');
        await Friends.declineRequest(requestId);
        Home.openRequestsModal(); // Refresh modal
        Home.loadActivity(); // Update count
    },

    // Open blocked modal
    openBlockedModal: async () => {
        console.log('[Bondly] Opening blocked modal...');

        if (!Auth.currentUser) {
            console.error('[Bondly] No current user');
            return;
        }
        if (!FirebaseService.isInitialized()) {
            console.error('[Bondly] Firebase not initialized');
            return;
        }

        const db = FirebaseService.getDb();
        const userId = Auth.currentUser.uid;
        const modal = document.getElementById('blocked-modal');
        const modalList = document.getElementById('blocked-modal-list');

        console.log('[Bondly] Blocked modal element:', modal);
        console.log('[Bondly] Blocked modal list element:', modalList);

        if (!modal) {
            console.error('[Bondly] Blocked modal element not found');
            return;
        }

        try {
            // Check if blocked collection exists, if not show empty state
            const blockedSnapshot = await db.collection('blockedUsers')
                .where('blocker', '==', userId)
                .get();

            console.log('[Bondly] Blocked snapshot size:', blockedSnapshot.size);

            if (blockedSnapshot.empty) {
                modalList.innerHTML = '<p class="mini-modal-empty">No blocked users</p>';
            } else {
                const blockedWithUsers = await Promise.all(
                    blockedSnapshot.docs.map(async (doc) => {
                        const blocked = doc.data();
                        const userDoc = await db.collection('users').doc(blocked.blocked).get();
                        const userData = Utils.sanitizeUser(userDoc.data());
                        return { id: doc.id, ...blocked, userData };
                    })
                );

                modalList.innerHTML = blockedWithUsers.map(blocked => `
                    <div class="mini-modal-item">
                        <img src="${blocked.userData.avatar}" alt="${blocked.userData.displayName}" class="mini-modal-avatar">
                        <div class="mini-modal-info">
                            <div class="mini-modal-name">${blocked.userData.displayName}</div>
                            <div class="mini-modal-bio">@${blocked.userData.username}</div>
                        </div>
                        <div class="mini-modal-actions">
                            <button class="mini-modal-btn mini-modal-btn-unblock" onclick="Home.unblockUser('${blocked.id}', '${blocked.blocked}')">Unblock</button>
                        </div>
                    </div>
                `).join('');
            }

            modal.classList.remove('hidden');
            console.log('[Bondly] Blocked modal classes after removing hidden:', modal.className);

            // Close modal when clicking outside
            setTimeout(() => {
                document.addEventListener('click', Home.closeBlockedModalOutside);
            }, 0);

        } catch (error) {
            console.error('Error loading blocked users:', error);
            modalList.innerHTML = '<p class="mini-modal-empty">Unable to load blocked users</p>';
        }
    },

    // Close blocked modal
    closeBlockedModal: () => {
        const modal = document.getElementById('blocked-modal');
        modal.classList.add('hidden');
        document.removeEventListener('click', Home.closeBlockedModalOutside);
    },

    // Close blocked modal when clicking outside
    closeBlockedModalOutside: (e) => {
        const modal = document.getElementById('blocked-modal');
        if (modal && !modal.contains(e.target)) {
            Home.closeBlockedModal();
        }
    },

    // Unblock user
    unblockUser: async (blockId, blockedUserId) => {
        if (!Auth.currentUser) return;
        if (!FirebaseService.isInitialized()) return;

        console.log('[Bondly] User unblocked:', blockedUserId);

        const db = FirebaseService.getDb();

        try {
            await db.collection('blockedUsers').doc(blockId).delete();

            // Also remove the reverse block
            const reverseBlockSnapshot = await db.collection('blockedUsers')
                .where('blocker', '==', blockedUserId)
                .where('blocked', '==', Auth.currentUser.uid)
                .get();

            const batch = db.batch();
            reverseBlockSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            console.log('[Bondly] Returned to discover');

            Home.openBlockedModal(); // Refresh modal
            Home.loadActivity(); // Update count
            if (typeof Discover !== 'undefined' && Discover.refresh) {
                Discover.refresh(); // Refresh Discover to show user again
            }
            Utils.showToast('User unblocked');
        } catch (error) {
            console.error('Error unblocking user:', error);
            Utils.showToast('Error unblocking user');
        }
    },

    // Scroll to recommendations
    scrollToRecommendations: () => {
        const postsSection = document.querySelector('#home-screen .posts-section');
        if (postsSection) {
            postsSection.scrollIntoView({ behavior: 'smooth' });
        } else {
            // Fallback: try to find by ID or class
            const section = document.querySelector('.section');
            if (section) {
                section.scrollIntoView({ behavior: 'smooth' });
            }
        }
    },
    
    // Update navigation badges
    updateBadges: () => {
        const chatsBadge = document.getElementById('chats-badge');
        const friendsBadge = document.getElementById('friends-badge');
        
        if (Home.activityData.unreadMessages > 0) {
            chatsBadge.textContent = Home.activityData.unreadMessages;
            chatsBadge.style.display = 'block';
        } else {
            chatsBadge.style.display = 'none';
        }
        
        if (Home.activityData.friendRequests > 0) {
            friendsBadge.textContent = Home.activityData.friendRequests;
            friendsBadge.style.display = 'block';
        } else {
            friendsBadge.style.display = 'none';
        }
    },
    
    sendFriendRequest: async (toUserId) => {
        if (!Auth.currentUser) return;
        if (!FirebaseService.isInitialized()) {
            Utils.showToast('Firebase not configured');
            return;
        }
        
        const db = FirebaseService.getDb();
        const fromUserId = Auth.currentUser.uid;
        
        if (toUserId === fromUserId) {
            Utils.showToast('You cannot send a friend request to yourself');
            return;
        }
        
        try {
            // Check block status
            const blockedSnapshot = await db.collection('blockedUsers')
                .where('blocker', '==', fromUserId)
                .where('blocked', '==', toUserId)
                .get();
            if (!blockedSnapshot.empty) {
                Utils.showToast('You have blocked this user');
                return;
            }
            
            const reverseBlockedSnapshot = await db.collection('blockedUsers')
                .where('blocker', '==', toUserId)
                .where('blocked', '==', fromUserId)
                .get();
            if (!reverseBlockedSnapshot.empty) {
                Utils.showToast('This user has blocked you');
                return;
            }

            // Check if already friends
            const friendsSnapshot = await db.collection('friends')
                .where('participants', 'array-contains', fromUserId)
                .get();
            let alreadyFriends = false;
            friendsSnapshot.forEach(doc => {
                if (doc.data().participants.includes(toUserId)) {
                    alreadyFriends = true;
                }
            });
            if (alreadyFriends) {
                Utils.showToast('You are already friends');
                return;
            }

            // Check if there is an incoming pending request from this user
            const incomingRequest = await db.collection('friendRequests')
                .where('from', '==', toUserId)
                .where('to', '==', fromUserId)
                .where('status', '==', 'pending')
                .get();
            if (!incomingRequest.empty) {
                // Automatically accept request instead of creating duplicate
                const reqDoc = incomingRequest.docs[0];
                await Friends.acceptRequest(reqDoc.id, toUserId);
                return;
            }

            // Check if request already exists (outgoing)
            const existingRequest = await db.collection('friendRequests')
                .where('from', '==', fromUserId)
                .where('to', '==', toUserId)
                .where('status', '==', 'pending')
                .get();
            
            if (!existingRequest.empty) {
                Utils.showToast('Friend request already sent');
                return;
            }
            
            // Create friend request
            await db.collection('friendRequests').add({
                from: fromUserId,
                to: toUserId,
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Get sender data for notification
            const senderDoc = await db.collection('users').doc(fromUserId).get();
            const senderData = senderDoc.data();

            // Send notification
            await Notifications.sendNotification(toUserId, {
                type: 'friend_request',
                senderId: fromUserId,
                senderName: senderData?.displayName || 'Someone',
                message: 'sent you a friend request'
            });

            console.log('[Bondly] Friend request sent and notification delivered');

            Utils.showToast('Friend request sent!');
            Mobile.hapticFeedback('success');
            
        } catch (error) {
            console.error('Error sending friend request:', error);
            Utils.showToast('Error sending friend request');
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Home;
}
