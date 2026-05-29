// Home Dashboard Module for Bondly

const Home = {
    userData: null,
    activityData: {
        unreadMessages: 0,
        friendRequests: 0,
        newMatches: 0,
        studyBuddies: 0
    },
    
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
        
        try {
            // Get current user data
            const userDoc = await db.collection('users').doc(userId).get();
            const userData = userDoc.data();
            Home.userData = userData;
            
            // Get potential matches
            const usersSnapshot = await db.collection('users')
                .where('uid', '!=', userId)
                .limit(10)
                .get();
            
            const recommendations = [];
            
            usersSnapshot.forEach(doc => {
                const user = doc.data();
                
                // Calculate match score
                const matchScore = Utils.calculateMatchScore(userData, user);
                
                if (matchScore > 50) {
                    recommendations.push({
                        ...user,
                        matchScore
                    });
                }
            });
            
            // Sort by match score
            recommendations.sort((a, b) => b.matchScore - a.matchScore);
            
            // Take top 3
            const topRecommendations = recommendations.slice(0, 3);
            
            // Render recommendations
            recommendationsList.innerHTML = topRecommendations.map(rec => `
                <div class="recommendation-card">
                    <img src="${rec.avatar}" alt="${rec.displayName}" class="recommendation-avatar">
                    <div class="recommendation-info">
                        <div class="recommendation-name">${rec.displayName}</div>
                        <div class="recommendation-details">
                            ${Utils.getCountryFlag(rec.country)} ${rec.country} • ${rec.matchScore}% match
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
            
        } catch (error) {
            console.error('Error loading recommendations:', error);
            recommendationsList.innerHTML = '<p style="text-align: center; color: var(--gray-500);">Unable to load recommendations</p>';
        }
    },
    
    // Setup activity card listeners
    setupActivityListeners: () => {
        document.getElementById('unread-messages-card')?.addEventListener('click', () => {
            App.navigateTo('chats');
        });
        
        document.getElementById('friend-requests-card')?.addEventListener('click', () => {
            App.navigateTo('friends');
        });
        
        document.getElementById('new-matches-card')?.addEventListener('click', () => {
            App.navigateTo('discover');
        });
        
        document.getElementById('study-buddies-card')?.addEventListener('click', () => {
            App.navigateTo('discover');
        });
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
            
            // Send notification
            await Notifications.sendNotification(toUserId, {
                type: 'friend_request',
                from: fromUserId,
                message: 'sent you a friend request'
            });
            
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
