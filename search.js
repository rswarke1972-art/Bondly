// Search Module for Bondly

const Search = {
    // Search users
    searchUsers: async (query, filters = {}) => {
        if (!FirebaseService.isInitialized() || !query) return [];
        
        const db = FirebaseService.getDb();
        
        try {
            // Get all users (in production, use Algolia or similar for better search)
            const usersSnapshot = await db.collection('users')
                .limit(100)
                .get();
            
            const users = [];
            
            usersSnapshot.forEach(doc => {
                users.push(doc.data());
            });
            
            // Filter by query
            const filteredUsers = users.filter(user => {
                // Skip current user
                if (user.uid === Auth.currentUser?.uid) return false;
                
                // Check if matches query
                const matchesQuery = 
                    Utils.fuzzyMatch(user.displayName, query) ||
                    Utils.fuzzyMatch(user.username, query) ||
                    Utils.fuzzyMatch(user.bio, query);
                
                if (!matchesQuery) return false;
                
                // Apply additional filters
                if (filters.country && user.country !== filters.country) return false;
                if (filters.language && !user.languages?.includes(filters.language)) return false;
                if (filters.interest && !user.interests?.includes(filters.interest)) return false;
                if (filters.deepMode && !user.deepMode) return false;
                
                return true;
            });
            
            return filteredUsers;
            
        } catch (error) {
            console.error('Error searching users:', error);
            return [];
        }
    },
    
    // Search messages
    searchMessages: async (query) => {
        if (!FirebaseService.isInitialized() || !query || !Auth.currentUser) return [];
        
        const db = FirebaseService.getDb();
        const userId = Auth.currentUser.uid;
        
        try {
            // Get all chats
            const chatsSnapshot = await db.collection('chats')
                .where('participants', 'array-contains', userId)
                .get();
            
            const messages = [];
            
            for (const chatDoc of chatsSnapshot.docs) {
                const chatId = chatDoc.id;
                
                // Search messages in this chat
                const messagesSnapshot = await db.collection('chats').doc(chatId)
                    .collection('messages')
                    .orderBy('timestamp', 'desc')
                    .limit(100)
                    .get();
                
                messagesSnapshot.forEach(doc => {
                    const message = doc.data();
                    if (message.text && Utils.fuzzyMatch(message.text, query)) {
                        messages.push({
                            id: doc.id,
                            chatId,
                            ...message
                        });
                    }
                });
            }
            
            // Sort by timestamp
            messages.sort((a, b) => b.timestamp?.toDate() - a.timestamp?.toDate());
            
            return messages;
            
        } catch (error) {
            console.error('Error searching messages:', error);
            return [];
        }
    },
    
    // Search friends
    searchFriends: async (query) => {
        if (!Auth.currentUser) return [];
        
        const db = FirebaseService.getDb();
        const userId = Auth.currentUser.uid;
        
        try {
            // Get friends
            const friendsSnapshot = await db.collection('friends')
                .where('participants', 'array-contains', userId)
                .get();
            
            const friends = [];
            
            for (const friendDoc of friendsSnapshot.docs) {
                const friendData = friendDoc.data();
                const friendId = friendData.participants.find(p => p !== userId);
                
                const userDoc = await db.collection('users').doc(friendId).get();
                const userData = userDoc.data();
                
                if (Utils.fuzzyMatch(userData.displayName, query) ||
                    Utils.fuzzyMatch(userData.username, query)) {
                    friends.push(userData);
                }
            }
            
            return friends;
            
        } catch (error) {
            console.error('Error searching friends:', error);
            return [];
        }
    },
    
    // Global search
    globalSearch: async (query) => {
        if (!query) return { users: [], messages: [], friends: [] };
        
        const [users, messages, friends] = await Promise.all([
            Search.searchUsers(query),
            Search.searchMessages(query),
            Search.searchFriends(query)
        ]);
        
        return { users, messages, friends };
    },
    
    // Get search suggestions
    getSuggestions: async (partialQuery) => {
        if (!partialQuery || partialQuery.length < 2) return [];
        
        const suggestions = new Set();
        
        // Get user suggestions
        const users = await Search.searchUsers(partialQuery);
        users.forEach(user => {
            suggestions.add(user.displayName);
            suggestions.add(user.username);
        });
        
        // Get interest suggestions
        if (Auth.currentUser) {
            try {
                const db = FirebaseService.getDb();
                const userDoc = await db.collection('users').doc(Auth.currentUser.uid).get();
                const userData = userDoc.data();
                
                userData.interests?.forEach(interest => {
                    if (Utils.fuzzyMatch(interest, partialQuery)) {
                        suggestions.add(interest);
                    }
                });
                
                userData.languages?.forEach(language => {
                    if (Utils.fuzzyMatch(language, partialQuery)) {
                        suggestions.add(language);
                    }
                });
            } catch (error) {
                console.error('Error getting suggestions:', error);
            }
        }
        
        return Array.from(suggestions).slice(0, 10);
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Search;
}
