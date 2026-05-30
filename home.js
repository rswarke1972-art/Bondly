// Home Dashboard Module for Bondly

const Home = {
    userData: null,
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
        Home.loadRecommendations();
        Home.setupActivityListeners();
    },
    
    // Refresh home screen
    refresh: () => {
        Home.loadGreeting();
        Home.loadDailyPrompt();
        Home.loadActivity();
        Home.loadRecommendations();
        Home.setupActivityListeners();
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
                .where('uid', '!=', userId)
                .orderBy('uid')
                .limit(20)
                .get();

            let matchesCount = 0;
            usersSnapshot.forEach(doc => {
                const user = doc.data();
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
                const user = doc.data();

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
                // Fallback: show recent active users
                const recentUsersSnapshot = await db.collection('users')
                    .where('uid', '!=', userId)
                    .orderBy('lastActive', 'desc')
                    .limit(3)
                    .get();

                const recentUsers = [];
                recentUsersSnapshot.forEach(doc => {
                    const user = doc.data();
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
                    console.log('[Bondly] Scrolling to recommendations');
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
                        const userData = userDoc.data();
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
                        const userData = userDoc.data();
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
        const recommendationsSection = document.querySelector('#home-screen .section h2');
        if (recommendationsSection && recommendationsSection.textContent === 'Recommended Connections') {
            recommendationsSection.scrollIntoView({ behavior: 'smooth' });
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
    
    // Send friend request
    sendFriendRequest: async (toUserId) => {
        if (!Auth.currentUser) return;
        if (!FirebaseService.isInitialized()) {
            Utils.showToast('Firebase not configured');
            return;
        }
        
        const db = FirebaseService.getDb();
        const fromUserId = Auth.currentUser.uid;
        
        try {
            // Check if request already exists
            const existingRequest = await db.collection('friendRequests')
                .where('from', '==', fromUserId)
                .where('to', '==', toUserId)
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
