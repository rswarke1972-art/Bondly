// Messaging Module for Bondly

const Messaging = {
    currentChatUser: null,
    currentChatId: null,
    messagesListener: null,
    typingListener: null,
    typingTimeout: null,
    
    // Initialize messaging
    init: () => {
        console.log('Messaging module initializing');
        Messaging.setupMessageInput();
        Messaging.setupTypingIndicator();
    },
    
    // Setup message input
    setupMessageInput: () => {
        const messageInput = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-message-btn');
        
        // Send on enter
        messageInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                Messaging.sendMessage();
            }
        });
        
        // Send button click
        sendBtn?.addEventListener('click', () => {
            Messaging.sendMessage();
        });
        
        // Typing indicator
        messageInput?.addEventListener('input', Utils.debounce(() => {
            Messaging.sendTypingIndicator();
        }, 500));
    },
    
    // Setup typing indicator listener
    setupTypingIndicator: () => {
        // Will be set when chat is opened
    },
    
    // Load messages for a chat
    loadMessages: async (userId) => {
        if (!Auth.currentUser) return;
        if (!FirebaseService.isInitialized()) return;
        
        const db = FirebaseService.getDb();
        const currentUserId = Auth.currentUser.uid;
        const messagesContainer = document.getElementById('messages-container');
        
        try {
            // Get or create chat
            const chatId = await Messaging.getOrCreateChat(userId);
            Messaging.currentChatId = chatId;
            Messaging.currentChatUser = { uid: userId };
            
            // Remove existing listener
            if (Messaging.messagesListener) {
                Messaging.messagesListener();
            }
            
            // Listen for messages in real-time
            Messaging.messagesListener = db.collection('chats').doc(chatId)
                .collection('messages')
                .orderBy('timestamp', 'asc')
                .onSnapshot((snapshot) => {
                    const messages = [];
                    
                    snapshot.forEach(doc => {
                        const msg = doc.data();
                        // Only show non-deleted messages
                        if (!msg.deleted) {
                            messages.push({
                                id: doc.id,
                                ...msg
                            });
                        }
                    });
                    
                    Messaging.renderMessages(messages);
                    Mobile.scrollToBottom(messagesContainer);
                    
                    // Mark messages as read if they're from the other user
                    messages.forEach(msg => {
                        if (msg.sender !== currentUserId && !msg.read) {
                            Messaging.markAsRead(userId);
                        }
                    });
                }, (error) => {
                    console.error('Error loading messages:', error);
                });
            
            // Listen for typing indicator
            if (Messaging.typingListener) {
                Messaging.typingListener();
            }
            
            const rtdb = FirebaseService.getRtdb();
            const typingRef = rtdb.ref(`typing/${chatId}/${userId}`);
            
            Messaging.typingListener = typingRef.on('value', (snapshot) => {
                const isTyping = snapshot.val();
                const statusElement = document.getElementById('chat-user-status');
                
                if (isTyping) {
                    statusElement.textContent = 'typing...';
                    statusElement.style.color = 'var(--soft-blue)';
                } else {
                    statusElement.textContent = 'Online';
                    statusElement.style.color = 'var(--success)';
                }
            });
            
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    },
    
    // Get or create chat
    getOrCreateChat: async (otherUserId) => {
        if (!Auth.currentUser) return null;
        if (!FirebaseService.isInitialized()) return null;
        
        const db = FirebaseService.getDb();
        const currentUserId = Auth.currentUser.uid;
        
        try {
            // Check if chat exists
            const chatsSnapshot = await db.collection('chats')
                .where('participants', 'array-contains', currentUserId)
                .get();
            
            let existingChat = null;
            
            chatsSnapshot.forEach(doc => {
                const chat = doc.data();
                if (chat.participants.includes(otherUserId)) {
                    existingChat = { id: doc.id, ...chat };
                }
            });
            
            if (existingChat) {
                return existingChat.id;
            }
            
            // Create new chat
            const newChat = await db.collection('chats').add({
                participants: [currentUserId, otherUserId],
                lastMessage: null,
                lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                unread: {
                    [currentUserId]: 0,
                    [otherUserId]: 0
                },
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            return newChat.id;
            
        } catch (error) {
            console.error('Error getting/creating chat:', error);
            return null;
        }
    },
    
    // Render messages
    renderMessages: (messages) => {
        const messagesContainer = document.getElementById('messages-container');
        const currentUserId = Auth.currentUser?.uid;
        
        if (messages.length === 0) {
            messagesContainer.innerHTML = `
                <div style="text-align: center; color: var(--gray-500); padding: var(--spacing-xl);">
                    <p>No messages yet</p>
                    <p style="font-size: 0.875rem;">Say hello and start the conversation! 👋</p>
                </div>
            `;
            return;
        }
        
        messagesContainer.innerHTML = messages.map(msg => {
            const isSent = msg.sender === currentUserId;
            const timestamp = msg.timestamp ? msg.timestamp.toDate() : new Date();
            
            return `
                <div class="message ${isSent ? 'sent' : 'received'}">
                    <div class="message-content">${Utils.sanitizeInput(msg.text)}</div>
                    <div class="message-time">${Utils.formatMessageTime(timestamp)}</div>
                    ${msg.edited ? '<span class="edited-badge">edited</span>' : ''}
                    ${msg.reactions && msg.reactions.length > 0 ? `
                        <div class="message-reactions">
                            ${msg.reactions.map(r => `<span class="reaction">${r.emoji} ${r.count}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    },
    
    // Send message
    sendMessage: async () => {
        if (!Auth.currentUser || !Messaging.currentChatId || !Messaging.currentChatUser) return;
        if (!FirebaseService.isInitialized()) {
            Utils.showToast('Firebase not configured');
            return;
        }
        
        const messageInput = document.getElementById('message-input');
        const text = messageInput.value.trim();
        
        if (!text) return;
        
        const db = FirebaseService.getDb();
        const currentUserId = Auth.currentUser.uid;
        const otherUserId = Messaging.currentChatUser.uid;
        
        try {
            // Add message
            await db.collection('chats').doc(Messaging.currentChatId)
                .collection('messages').add({
                sender: currentUserId,
                text: text,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                reactions: [],
                edited: false,
                deleted: false,
                read: false
            });
            
            // Update chat last message
            await db.collection('chats').doc(Messaging.currentChatId).update({
                lastMessage: text,
                lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                unread: {
                    [currentUserId]: 0,
                    [otherUserId]: firebase.firestore.FieldValue.increment(1)
                }
            });
            
            // Clear input
            messageInput.value = '';
            
            // Send notification
            if (FirebaseService.isInitialized()) {
                try {
                    await Notifications.sendNotification(otherUserId, {
                        type: 'message',
                        from: currentUserId,
                        message: text,
                        chatId: Messaging.currentChatId
                    });
                } catch (notifError) {
                    console.error('Error sending notification:', notifError);
                }
            }
            
            // Update stats
            try {
                await db.collection('userStats').doc(currentUserId).update({
                    messagesCount: firebase.firestore.FieldValue.increment(1)
                });
            } catch (statsError) {
                console.error('Error updating stats:', statsError);
            }
            
            // Check for achievements
            try {
                await Achievements.checkAchievement('first_message');
            } catch (achievementError) {
                console.error('Error checking achievement:', achievementError);
            }
            
            Mobile.hapticFeedback('light');
            
        } catch (error) {
            console.error('Error sending message:', error);
            Utils.showToast('Error sending message');
        }
    },
    
    // Send typing indicator
    sendTypingIndicator: () => {
        if (!Messaging.currentChatId || !Auth.currentUser) return;
        
        const rtdb = FirebaseService.getRtdb();
        const currentUserId = Auth.currentUser.uid;
        const otherUserId = Messaging.currentChatUser.uid;
        
        // Set typing status
        rtdb.ref(`typing/${Messaging.currentChatId}/${currentUserId}`).set(true);
        
        // Clear previous timeout
        if (Messaging.typingTimeout) {
            clearTimeout(Messaging.typingTimeout);
        }
        
        // Clear typing status after 2 seconds
        Messaging.typingTimeout = setTimeout(() => {
            rtdb.ref(`typing/${Messaging.currentChatId}/${currentUserId}`).set(false);
        }, 2000);
    },
    
    // Mark messages as read
    markAsRead: async (otherUserId) => {
        if (!Auth.currentUser || !Messaging.currentChatId) return;
        if (!FirebaseService.isInitialized()) return;
        
        const db = FirebaseService.getDb();
        const currentUserId = Auth.currentUser.uid;
        
        try {
            await db.collection('chats').doc(Messaging.currentChatId).update({
                [`unread.${currentUserId}`]: 0
            });
            
            Home.loadActivity();
            
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    },
    
    // Add reaction to message
    addReaction: async (messageId, emoji) => {
        if (!Messaging.currentChatId) return;
        if (!FirebaseService.isInitialized()) return;
        
        const db = FirebaseService.getDb();
        
        try {
            await db.collection('chats').doc(Messaging.currentChatId)
                .collection('messages').doc(messageId).update({
                reactions: firebase.firestore.FieldValue.arrayUnion({ emoji, count: 1 })
            });
        } catch (error) {
            console.error('Error adding reaction:', error);
        }
    },
    
    // Delete message
    deleteMessage: async (messageId) => {
        if (!Messaging.currentChatId) return;
        if (!FirebaseService.isInitialized()) return;
        
        const db = FirebaseService.getDb();
        
        if (!confirm('Delete this message?')) return;
        
        try {
            await db.collection('chats').doc(Messaging.currentChatId)
                .collection('messages').doc(messageId).update({
                deleted: true,
                text: 'Message deleted'
            });
            
            Utils.showToast('Message deleted');
        } catch (error) {
            console.error('Error deleting message:', error);
        }
    },
    
    // Edit message
    editMessage: async (messageId, newText) => {
        if (!Messaging.currentChatId) return;
        if (!FirebaseService.isInitialized()) return;
        
        const db = FirebaseService.getDb();
        
        try {
            await db.collection('chats').doc(Messaging.currentChatId)
                .collection('messages').doc(messageId).update({
                text: newText,
                edited: true
            });
            
            Utils.showToast('Message edited');
        } catch (error) {
            console.error('Error editing message:', error);
        }
    },
    
    // Cleanup listeners
    cleanup: () => {
        if (Messaging.messagesListener) {
            Messaging.messagesListener();
        }
        if (Messaging.typingListener) {
            Messaging.typingListener();
        }
        if (Messaging.typingTimeout) {
            clearTimeout(Messaging.typingTimeout);
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Messaging;
}
