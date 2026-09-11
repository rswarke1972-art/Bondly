// Chats Module for Bondly

const Chats = {
    chats: [],
    chatsListener: null,
    // In-memory cache: { [uid]: userData } — prevents re-fetching profiles on every snapshot
    userCache: {},

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
                
                // Collect unique partner UIDs that are not yet in cache
                const uncachedUids = [...new Set(
                    chats
                        .map(chat => chat.participants?.find(p => p !== userId))
                        .filter(uid => uid && !Chats.userCache[uid])
                )];

                // Fetch all uncached users in parallel (single batch)
                if (uncachedUids.length > 0) {
                    await Promise.all(uncachedUids.map(async uid => {
                        try {
                            const userDoc = await db.collection('users').doc(uid).get();
                            if (userDoc.exists) {
                                Chats.userCache[uid] = Utils.sanitizePublicUser(userDoc.data());
                            }
                        } catch (err) {
                            console.warn('[Bondly Chats] Could not fetch user:', uid, err);
                        }
                    }));
                }

                // Build enriched chat list using cache
                const chatsWithUsers = chats.map(chat => {
                    const otherUserId = chat.participants?.find(p => p !== userId);
                    const userData = Chats.userCache[otherUserId] || {
                        uid: otherUserId,
                        displayName: 'Unknown User',
                        username: '',
                        avatar: '',
                        online: false
                    };
                    return { ...chat, userData };
                });
                
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
            const userData = chat.userData || {};
            const displayName = Utils.escapeHTML(userData.displayName || 'Unknown User');
            const avatar = Utils.escapeHTML(userData.avatar || '');
            const uid = Utils.escapeHTML(userData.uid || '');
            
            return `
                <div class="chat-item ${isUnread ? 'unread' : ''}" onclick="App.openChat('${uid}', '${displayName}', '${avatar}')">
                    <img src="${avatar}" alt="${displayName}" class="chat-avatar ${userData.online ? '' : 'offline'}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'44\\' height=\\'44\\' viewBox=\\'0 0 44 44\\'%3E%3Crect fill=\\'%237BAFD4\\' width=\\'44\\' height=\\'44\\'/%3E%3Ctext x=\\'22\\' y=\\'22\\' font-size=\\'20\\' text-anchor=\\'middle\\' dy=\\'.3em\\' fill=\\'white\\'%3E👤%3C/text%3E%3C/svg%3E'">
                    <div class="chat-info">
                        <div class="chat-name">${displayName}</div>
                        <div class="chat-preview">${Utils.escapeHTML(chat.lastMessage || 'No messages yet')}</div>
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
