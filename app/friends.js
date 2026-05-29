// Friends Module for Bondly

const Friends = {
    friends: [],
    friendRequests: [],
    currentCategory: 'all',
    
    // Initialize friends screen
    init: () => {
        console.log('Friends module initializing');
        Friends.loadFriendRequests();
        Friends.loadFriends();
        Friends.setupCategoryListeners();
    },
    
    // Refresh friends screen
    refresh: () => {
        Friends.loadFriendRequests();
        Friends.loadFriends();
    },
    
    // Load friend requests
    loadFriendRequests: async () => {
        if (!Auth.currentUser) return;
        if (!FirebaseService.isInitialized()) return;
        
        const db = FirebaseService.getDb();
        const userId = Auth.currentUser.uid;
        const requestsSection = document.getElementById('friend-requests-section');
        const requestsList = document.getElementById('friend-requests-list');
        
        try {
            const requestsSnapshot = await db.collection('friendRequests')
                .where('to', '==', userId)
                .where('status', '==', 'pending')
                .orderBy('createdAt', 'desc')
                .get();
            
            Friends.friendRequests = [];
            
            requestsSnapshot.forEach(doc => {
                Friends.friendRequests.push({ id: doc.id, ...doc.data() });
            });
            
            if (Friends.friendRequests.length > 0) {
                requestsSection.classList.remove('hidden');
                
                // Load user data for each request
                const requestsWithUsers = await Promise.all(
                    Friends.friendRequests.map(async (request) => {
                        const userDoc = await db.collection('users').doc(request.from).get();
                        const userData = userDoc.data();
                        return { ...request, userData };
                    })
                );
                
                requestsList.innerHTML = requestsWithUsers.map(request => `
                    <div class="friend-request-card">
                        <img src="${request.userData.avatar}" alt="${request.userData.displayName}" class="recommendation-avatar">
                        <div class="recommendation-info">
                            <div class="recommendation-name">${request.userData.displayName}</div>
                            <div class="recommendation-details">@${request.userData.username}</div>
                        </div>
                        <div class="friend-request-actions">
                            <button class="accept-btn" onclick="Friends.acceptRequest('${request.id}', '${request.from}')">Accept</button>
                            <button class="decline-btn" onclick="Friends.declineRequest('${request.id}')">Decline</button>
                        </div>
                    </div>
                `).join('');
            } else {
                requestsSection.classList.add('hidden');
            }
            
        } catch (error) {
            console.error('Error loading friend requests:', error);
        }
    },
    
    // Load friends list
    loadFriends: async () => {
        if (!Auth.currentUser) return;
        if (!FirebaseService.isInitialized()) return;
        
        const db = FirebaseService.getDb();
        const userId = Auth.currentUser.uid;
        const friendsList = document.getElementById('friends-list');
        
        try {
            const friendsSnapshot = await db.collection('friends')
                .where('participants', 'array-contains', userId)
                .get();
            
            Friends.friends = [];
            
            friendsSnapshot.forEach(doc => {
                const friendData = doc.data();
                const friendId = friendData.participants.find(p => p !== userId);
                Friends.friends.push({ id: doc.id, friendId, ...friendData });
            });
            
            // Load user data for each friend
            const friendsWithUsers = await Promise.all(
                Friends.friends.map(async (friend) => {
                    const userDoc = await db.collection('users').doc(friend.friendId).get();
                    const userData = userDoc.data();
                    return { ...friend, userData };
                })
            );
            
            // Filter by category
            const filteredFriends = Friends.filterByCategory(friendsWithUsers);
            
            if (filteredFriends.length > 0) {
                friendsList.innerHTML = filteredFriends.map(friend => `
                    <div class="friend-item" onclick="App.openChat('${friend.userData.uid}', '${friend.userData.displayName}', '${friend.userData.avatar}')">
                        <img src="${friend.userData.avatar}" alt="${friend.userData.displayName}" class="chat-avatar ${friend.userData.online ? '' : 'offline'}">
                        <div class="chat-info">
                            <div class="chat-name">${friend.userData.displayName} ${friend.favorite ? '⭐' : ''}</div>
                            <div class="chat-preview">${friend.userData.online ? 'Online' : 'Last active ' + Utils.formatTime(friend.userData.lastActive?.toDate())}</div>
                        </div>
                        <div class="chat-meta">
                            ${friend.category ? `<span class="tag">${friend.category}</span>` : ''}
                        </div>
                    </div>
                `).join('');
            } else {
                friendsList.innerHTML = '<p style="text-align: center; color: var(--gray-500); padding: var(--spacing-lg);">No friends yet. Discover new people to connect with!</p>';
            }
            
        } catch (error) {
            console.error('Error loading friends:', error);
            friendsList.innerHTML = '<p style="text-align: center; color: var(--gray-500);">Unable to load friends</p>';
        }
    },
    
    // Filter friends by category
    filterByCategory: (friends) => {
        if (Friends.currentCategory === 'all') return friends;
        
        return friends.filter(friend => {
            if (!friend.category) return Friends.currentCategory === 'new';
            return friend.category === Friends.currentCategory;
        });
    },
    
    // Setup category listeners
    setupCategoryListeners: () => {
        const categoryChips = document.querySelectorAll('.category-chip');
        
        categoryChips.forEach(chip => {
            chip.addEventListener('click', () => {
                categoryChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                Friends.currentCategory = chip.dataset.category;
                Friends.loadFriends();
            });
        });
    },
    
    // Accept friend request
    acceptRequest: async (requestId, fromUserId) => {
        if (!Auth.currentUser) return;
        if (!FirebaseService.isInitialized()) {
            Utils.showToast('Firebase not configured');
            return;
        }
        
        const db = FirebaseService.getDb();
        const userId = Auth.currentUser.uid;
        
        Utils.showLoading('Accepting request...');
        
        try {
            // Update request status
            await db.collection('friendRequests').doc(requestId).update({
                status: 'accepted',
                respondedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Create friend relationship
            await db.collection('friends').add({
                participants: [userId, fromUserId],
                category: 'new',
                favorite: false,
                nickname: null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Update user stats
            await db.collection('userStats').doc(userId).update({
                friendsCount: firebase.firestore.FieldValue.increment(1)
            });
            
            await db.collection('userStats').doc(fromUserId).update({
                friendsCount: firebase.firestore.FieldValue.increment(1)
            });
            
            // Send notification
            await Notifications.sendNotification(fromUserId, {
                type: 'friend_accepted',
                from: userId,
                message: 'accepted your friend request'
            });
            
            // Check for first friend achievement
            await Achievements.checkAchievement('first_friend');
            
            Utils.showToast('Friend request accepted!');
            Mobile.hapticFeedback('success');
            
            // Reload
            Friends.loadFriendRequests();
            Friends.loadFriends();
            Home.loadActivity();
            
        } catch (error) {
            console.error('Error accepting request:', error);
            Utils.showToast('Error accepting request');
        } finally {
            Utils.hideLoading();
        }
    },
    
    // Decline friend request
    declineRequest: async (requestId) => {
        if (!Auth.currentUser) return;
        if (!FirebaseService.isInitialized()) {
            Utils.showToast('Firebase not configured');
            return;
        }
        
        const db = FirebaseService.getDb();
        
        Utils.showLoading('Declining request...');
        
        try {
            await db.collection('friendRequests').doc(requestId).update({
                status: 'declined',
                respondedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            Utils.showToast('Friend request declined');
            
            Friends.loadFriendRequests();
            Home.loadActivity();
            
        } catch (error) {
            console.error('Error declining request:', error);
            Utils.showToast('Error declining request');
        } finally {
            Utils.hideLoading();
        }
    },
    
    // Cancel friend request
    cancelRequest: async (requestId) => {
        if (!Auth.currentUser) return;
        if (!FirebaseService.isInitialized()) {
            Utils.showToast('Firebase not configured');
            return;
        }
        
        const db = FirebaseService.getDb();
        
        Utils.showLoading('Cancelling request...');
        
        try {
            await db.collection('friendRequests').doc(requestId).update({
                status: 'cancelled',
                respondedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            Utils.showToast('Friend request cancelled');
            
            Friends.loadFriendRequests();
            Home.loadActivity();
            
        } catch (error) {
            console.error('Error cancelling request:', error);
            Utils.showToast('Error cancelling request');
        } finally {
            Utils.hideLoading();
        }
    },
    
    // Remove friend
    removeFriend: async (friendId) => {
        if (!Auth.currentUser) return;
        if (!FirebaseService.isInitialized()) {
            Utils.showToast('Firebase not configured');
            return;
        }
        
        const db = FirebaseService.getDb();
        const userId = Auth.currentUser.uid;
        
        if (!confirm('Are you sure you want to remove this friend?')) return;
        
        Utils.showLoading('Removing friend...');
        
        try {
            // Find and delete friend relationship
            const friendsSnapshot = await db.collection('friends')
                .where('participants', 'array-contains', userId)
                .get();
            
            const batch = db.batch();
            
            friendsSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.participants.includes(friendId)) {
                    batch.delete(doc.ref);
                }
            });
            
            await batch.commit();
            
            // Update user stats
            await db.collection('userStats').doc(userId).update({
                friendsCount: firebase.firestore.FieldValue.increment(-1)
            });
            
            await db.collection('userStats').doc(friendId).update({
                friendsCount: firebase.firestore.FieldValue.increment(-1)
            });
            
            Utils.showToast('Friend removed');
            
            Friends.loadFriends();
            
        } catch (error) {
            console.error('Error removing friend:', error);
            Utils.showToast('Error removing friend');
        } finally {
            Utils.hideLoading();
        }
    },
    
    // Toggle friend favorite
    toggleFavorite: async (friendId) => {
        if (!Auth.currentUser) return;
        if (!FirebaseService.isInitialized()) return;
        
        const db = FirebaseService.getDb();
        const userId = Auth.currentUser.uid;
        
        try {
            const friendsSnapshot = await db.collection('friends')
                .where('participants', 'array-contains', userId)
                .get();
            
            friendsSnapshot.forEach(async (doc) => {
                const data = doc.data();
                if (data.participants.includes(friendId)) {
                    await doc.ref.update({
                        favorite: !data.favorite
                    });
                }
            });
            
            Friends.loadFriends();
            Mobile.hapticFeedback('light');
            
        } catch (error) {
            console.error('Error toggling favorite:', error);
        }
    },
    
    // Update friend category
    updateCategory: async (friendId, category) => {
        if (!Auth.currentUser) return;
        if (!FirebaseService.isInitialized()) return;
        
        const db = FirebaseService.getDb();
        const userId = Auth.currentUser.uid;
        
        try {
            const friendsSnapshot = await db.collection('friends')
                .where('participants', 'array-contains', userId)
                .get();
            
            friendsSnapshot.forEach(async (doc) => {
                const data = doc.data();
                if (data.participants.includes(friendId)) {
                    await doc.ref.update({
                        category: category
                    });
                }
            });
            
            Friends.loadFriends();
            Utils.showToast('Category updated');
            
        } catch (error) {
            console.error('Error updating category:', error);
        }
    },
    
    // Set friend nickname
    setNickname: async (friendId, nickname) => {
        if (!Auth.currentUser) return;
        if (!FirebaseService.isInitialized()) return;
        
        const db = FirebaseService.getDb();
        const userId = Auth.currentUser.uid;
        
        try {
            const friendsSnapshot = await db.collection('friends')
                .where('participants', 'array-contains', userId)
                .get();
            
            friendsSnapshot.forEach(async (doc) => {
                const data = doc.data();
                if (data.participants.includes(friendId)) {
                    await doc.ref.update({
                        nickname: nickname || null
                    });
                }
            });
            
            Friends.loadFriends();
            Utils.showToast('Nickname updated');
            
        } catch (error) {
            console.error('Error setting nickname:', error);
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Friends;
}
