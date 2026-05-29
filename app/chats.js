// Chats Module for Bondly

const Chats = {
    chats: [],
    chatsListener: null,
    
    // Initialize chats screen
    init: () => {
        console.log('Chats module initializing');
        Chats.loadChats();
        Chats.setupNewChatButton();
    },
    
    // Refresh chats screen
    refresh: () => {
        Chats.loadChats();
    },
    
    // Load chats list
    loadChats: () => {
        if (!Auth.currentUser) return;
        if (!FirebaseService.isInitialized()) return;
        
        const db = FirebaseService.getDb();
        const userId = Auth.currentUser.uid;
        const chatList = document.getElementById('chat-list');
        
        // Remove existing listener
        if (Chats.chatsListener) {
            Chats.chatsListener();
        }
        
        // Listen for chats
        Chats.chatsListener = db.collection('chats')
            .where('participants', 'array-contains', userId)
            .onSnapshot(async (snapshot) => {
                const chats = [];
                
                snapshot.forEach(doc => {
                    chats.push({ id: doc.id, ...doc.data() });
                });
                
                // Sort client-side by lastMessageTime
                chats.sort((a, b) => {
                    const timeA = a.lastMessageTime ? a.lastMessageTime.toDate() : new Date(0);
                    const timeB = b.lastMessageTime ? b.lastMessageTime.toDate() : new Date(0);
                    return timeB - timeA;
                });
                
                Chats.chats = chats;
                
                // Load user data for each chat
                const chatsWithUsers = await Promise.all(
                    chats.map(async (chat) => {
                        const otherUserId = chat.participants.find(p => p !== userId);
                        const userDoc = await db.collection('users').doc(otherUserId).get();
                        const userData = userDoc.data();
                        return { ...chat, userData };
                    })
                );
                
                Chats.renderChats(chatsWithUsers);
            });
    },
    
    // Render chats list
    renderChats: (chats) => {
        const chatList = document.getElementById('chat-list');
        
        if (chats.length === 0) {
            chatList.innerHTML = `
                <div style="text-align: center; color: var(--gray-500); padding: var(--spacing-xl);">
                    <p>No conversations yet</p>
                    <p style="font-size: 0.875rem;">Start connecting with people to begin chatting!</p>
                </div>
            `;
            return;
        }
        
        chatList.innerHTML = chats.map(chat => {
            const unreadCount = chat.unread?.[Auth.currentUser.uid] || 0;
            const isUnread = unreadCount > 0;
            
            return `
                <div class="chat-item ${isUnread ? 'unread' : ''}" onclick="App.openChat('${chat.userData.uid}', '${chat.userData.displayName}', '${chat.userData.avatar}')">
                    <img src="${chat.userData.avatar}" alt="${chat.userData.displayName}" class="chat-avatar ${chat.userData.online ? '' : 'offline'}">
                    <div class="chat-info">
                        <div class="chat-name">${chat.userData.displayName}</div>
                        <div class="chat-preview">${chat.lastMessage || 'No messages yet'}</div>
                    </div>
                    <div class="chat-meta">
                        <div class="chat-time">${chat.lastMessageTime ? Utils.formatTime(chat.lastMessageTime.toDate()) : ''}</div>
                        ${isUnread ? `<span class="unread-badge">${unreadCount}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },
    
    // Setup new chat button
    setupNewChatButton: () => {
        document.getElementById('new-chat-btn')?.addEventListener('click', () => {
            App.navigateTo('discover');
        });
    },
    
    // Cleanup listener
    cleanup: () => {
        if (Chats.chatsListener) {
            Chats.chatsListener();
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Chats;
}
