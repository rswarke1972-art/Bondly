// Messaging Module for Bondly

const Messaging = {
    currentChatUser: null,
    currentChatId: null,
    mediaRecorder: null,
    audioChunks: [],
    isRecording: false,
    recordingStartTime: null,
    messagesListener: null,
    typingListener: null,
    typingTimeout: null,
    presenceListener: null,
    otherUserPresence: null,
    selectedMessage: null,
    longPressTimer: null,
    menuSetup: false,
    replyTarget: null,
    forwardTargets: [],
    forwardFriendsData: [],
    inputSetup: false,
    searchQuery: '',
    currentMessages: [],

    // Initialize messaging
    init: () => {
        console.log('Messaging module initializing');
        Messaging.setupMessageInput();
        Messaging.setupTypingIndicator();
    },
    
    // Setup message input
setupMessageInput: () => {
    // Prevent duplicate setup
    if (Messaging.inputSetup) {
        console.log('setupMessageInput already setup, skipping');
        return;
    }

    console.log('setupMessageInput running');

    const messageInput =
        document.getElementById(
            'message-input'
        );

    const sendBtn =
        document.getElementById(
            'send-message-btn'
        );

    const voiceBtn =
    document.getElementById(
        'voice-btn'
    );

if (voiceBtn) {

    // Desktop
    let holdTimeout;

if (voiceBtn) {

    // Desktop
    voiceBtn.addEventListener(
        'mousedown',
        () => {

            holdTimeout =
                setTimeout(() => {

                    Messaging
                    .startVoiceRecording();

                }, 300);
        }
    );

    voiceBtn.addEventListener(
        'mouseup',
        () => {

            clearTimeout(
                holdTimeout
            );

            if (
                Messaging
                .isRecording
            ) {

                Messaging
                .stopVoiceRecording();
            }
        }
    );

    // Mobile
    voiceBtn.addEventListener(
        'touchstart',
        (e) => {

            e.preventDefault();

            holdTimeout =
                setTimeout(() => {

                    Messaging
                    .startVoiceRecording();

                }, 300);
        }
    );

    voiceBtn.addEventListener(
        'touchend',
        () => {

            clearTimeout(
                holdTimeout
            );

            if (
                Messaging
                .isRecording
            ) {

                Messaging
                .stopVoiceRecording();
            }
        }
    );
};

    voiceBtn.addEventListener(
        'mouseup',
        () => {
            Messaging.stopVoiceRecording();
        }
    );

    // Mobile
    voiceBtn.addEventListener(
        'touchstart',
        (e) => {
            e.preventDefault();
            Messaging.startVoiceRecording();
        }
    );

    voiceBtn.addEventListener(
        'touchend',
        () => {
            Messaging.stopVoiceRecording();
        }
    );
}

    const attachBtn =
        document.getElementById(
            'attach-btn'
        );

    console.log(
        'messageInput:',
        messageInput
    );

    console.log(
        'sendBtn:',
        sendBtn
    );

    console.log(
        'voiceBtn:',
        voiceBtn
    );

    console.log(
        'attachBtn:',
        attachBtn
    );

    // ENTER SEND
    messageInput?.addEventListener(
        'keypress',
        (e) => {
            if (
                e.key === 'Enter' &&
                !e.shiftKey
            ) {
                e.preventDefault();

                console.log(
                    'ENTER SEND'
                );

                Messaging.sendMessage();
            }
        }
    );

    // SEND BUTTON
    sendBtn?.addEventListener(
        'click',
        () => {
            console.log(
                'SEND CLICKED'
            );

            Messaging.sendMessage();
        }
    );

    // ATTACH BUTTON
    attachBtn?.addEventListener(
        'click',
        () => {
            console.log(
                'ATTACH CLICKED'
            );

            Messaging.toggleAttachmentMenu();
        }
    );

    // Typing indicator - throttled to immediately trigger and update every 1.5 seconds while typing
    let lastTypingTime = 0;
    messageInput?.addEventListener('input', () => {
        const now = Date.now();
        if (now - lastTypingTime > 1500) {
            lastTypingTime = now;
            Messaging.sendTypingIndicator();
        }
    });

    // Setup Chat Search Listeners
    const searchToggleBtn = document.getElementById('chat-search-toggle-btn');
    searchToggleBtn?.addEventListener('click', () => {
        Messaging.toggleSearch();
    });

    const searchInput = document.getElementById('chat-message-search');
    searchInput?.addEventListener('input', (e) => {
        Messaging.handleSearch(e.target.value);
    });

    const searchClearBtn = document.getElementById('chat-search-clear-btn');
    searchClearBtn?.addEventListener('click', () => {
        Messaging.clearSearch();
    });

    // Setup Chat Options Menu
    const chatOptionsBtn = document.getElementById('chat-options-btn');
    chatOptionsBtn?.addEventListener('click', () => {
        Messaging.showChatOptions();
    });

    // Mark setup as complete
    Messaging.inputSetup = true;
    console.log('setupMessageInput FINISHED');
},

    // Setup typing indicator listener
    setupTypingIndicator: () => {
        // Will be set when chat is opened
    },

    // Setup message menu with long-press detection
    setupMessageMenu: () => {
        console.log('[Bondly] Setting up message menu...');

        const messagesContainer = document.getElementById('messages-container');

        if (!messagesContainer) {
            console.error('[Bondly] Messages container not found');
            return;
        }

        console.log('[Bondly] Messages container found, attaching listeners');

        // Use event delegation for message interactions
        messagesContainer.addEventListener('contextmenu', (e) => {
            console.log('[Bondly] Context menu event triggered');
            const messageEl = e.target.closest('.message');
            if (messageEl) {
                console.log('[Bondly] Message element found:', messageEl.dataset.messageId);
                e.preventDefault();
                Messaging.openMessageMenu(messageEl, e.clientX, e.clientY);
            }
        });

        // Long-press detection for mobile
        let touchStartTime;
        let touchStartX;
        let touchStartY;

        messagesContainer.addEventListener('touchstart', (e) => {
            const messageEl = e.target.closest('.message');
            if (messageEl) {
                console.log('[Bondly] Touch started on message');
                touchStartTime = Date.now();
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            }
        }, { passive: true });

        messagesContainer.addEventListener('touchend', (e) => {
            const messageEl = e.target.closest('.message');
            if (messageEl && touchStartTime) {
                const touchDuration = Date.now() - touchStartTime;
                const touchEndX = e.changedTouches[0].clientX;
                const touchEndY = e.changedTouches[0].clientY;
                const touchDistance = Math.sqrt(
                    Math.pow(touchEndX - touchStartX, 2) +
                    Math.pow(touchEndY - touchStartY, 2)
                );

                console.log('[Bondly] Touch ended - duration:', touchDuration, 'distance:', touchDistance);

                // Long press: 400-500ms and minimal movement
                if (touchDuration >= 400 && touchDistance < 10) {
                    console.log('[Bondly] Long press detected, opening menu');
                    e.preventDefault();
                    Messaging.openMessageMenu(messageEl, touchEndX, touchEndY);
                }

                touchStartTime = null;
            }
        }, { passive: false });

        // Setup menu event listeners
        Messaging.setupMenuListeners();

        console.log('[Bondly] Message menu setup complete');
    },

    // Open message action menu
    openMessageMenu: (messageEl, x, y) => {
        console.log('[Bondly] Opening message menu...');

        const messageId = messageEl.dataset.messageId;
        const sender = messageEl.dataset.sender;
        const text = messageEl.dataset.text;
        const type = messageEl.dataset.type;
        const senderName = messageEl.dataset.senderName;

        console.log('[Bondly] Message selected:', { messageId, sender, text, type });

        Messaging.selectedMessage = {
            id: messageId,
            sender: sender,
            text: text,
            type: type,
            senderName: senderName,
            imageUrl: messageEl.dataset.imageUrl || '',
            fileUrl: messageEl.dataset.fileUrl || '',
            fileName: messageEl.dataset.fileName || '',
            voiceUrl: messageEl.dataset.voiceUrl || '',
            duration: Number(messageEl.dataset.duration || 0)
        };

        const menu = document.getElementById('message-action-menu');
        if (!menu) {
            console.error('[Bondly] Menu element not found');
            return;
        }

        console.log('[Bondly] Menu element found, positioning at:', x, y);

        // Position menu near the message
        const menuWidth = 280;
        const menuHeight = 240;

        let menuX = x - menuWidth / 2;
        let menuY = y - menuHeight / 2;

        // Keep menu within viewport
        if (menuX < 10) menuX = 10;
        if (menuX + menuWidth > window.innerWidth - 10) menuX = window.innerWidth - menuWidth - 10;
        if (menuY < 10) menuY = 10;
        if (menuY + menuHeight > window.innerHeight - 10) menuY = window.innerHeight - menuHeight - 10;

        menu.style.left = menuX + 'px';
        menu.style.top = menuY + 'px';

        menu.classList.remove('hidden');
        setTimeout(() => menu.classList.add('show'), 10);

        console.log('[Bondly] Menu opened successfully');

        // Close menu when clicking outside
        setTimeout(() => {
            document.addEventListener('click', Messaging.closeMenuOutside);
        }, 0);
    },

    // Close menu when clicking outside
    closeMenuOutside: (e) => {
        const menu = document.getElementById('message-action-menu');
        if (menu && !menu.contains(e.target)) {
            Messaging.closeMessageMenu();
        }
    },

    // Close message menu
    closeMessageMenu: () => {
        console.log('[Bondly] Menu closed');

        const menu = document.getElementById('message-action-menu');
        if (menu) {
            menu.classList.remove('show');
            setTimeout(() => menu.classList.add('hidden'), 200);
        }

        document.removeEventListener('click', Messaging.closeMenuOutside);
        Messaging.selectedMessage = null;
    },

    // Setup menu event listeners
    setupMenuListeners: () => {
        console.log('[Bondly] Setting up menu listeners...');

        // Emoji reactions
        const emojiBtns = document.querySelectorAll('.emoji-btn');
        console.log('[Bondly] Found emoji buttons:', emojiBtns.length);
        emojiBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const emoji = e.target.dataset.emoji;
                Messaging.handleReaction(emoji);
            });
        });

        // Action buttons
        const actionBtns = document.querySelectorAll('.action-btn');
        console.log('[Bondly] Found action buttons:', actionBtns.length);
        actionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                console.log('[Bondly] Action clicked:', action);
                Messaging.handleMessageAction(action);
            });
        });

        console.log('[Bondly] Menu listeners setup complete');
    },

    // Handle emoji reaction
    handleReaction: async (emoji) => {
        if (!Messaging.selectedMessage || !Messaging.currentChatId) return;

        console.log('[Bondly] Reaction added:', emoji);

        const db = FirebaseService.getDb();
        const currentUserId = Auth.currentUser.uid;

        try {
            const messageRef = db.collection('chats').doc(Messaging.currentChatId)
                .collection('messages').doc(Messaging.selectedMessage.id);

            const doc = await messageRef.get();
            if (!doc.exists) return;

            const data = doc.data();
            const reactions = data.reactions || [];

            // Check if user already reacted
            const existingReactionIndex = reactions.findIndex(r => r.userId === currentUserId);

            if (existingReactionIndex !== -1) {
                // Remove reaction if same emoji, otherwise replace
                if (reactions[existingReactionIndex].emoji === emoji) {
                    reactions.splice(existingReactionIndex, 1);
                    console.log('[Bondly] Reaction removed');
                } else {
                    reactions[existingReactionIndex].emoji = emoji;
                    console.log('[Bondly] Reaction replaced');
                }
            } else {
                // Add new reaction (without timestamp - Firestore doesn't support serverTimestamp in arrays)
                reactions.push({
                    userId: currentUserId,
                    emoji: emoji
                });
                console.log('[Bondly] Reaction saved');
            }

            await messageRef.update({ reactions });

        } catch (error) {
            console.error('Error handling reaction:', error);
        }

        Messaging.closeMessageMenu();
    },

    // Handle message action
    handleMessageAction: (action) => {
        console.log('[Bondly] Action button clicked:', action);

        if (!Messaging.selectedMessage) {
            console.error('[Bondly] No message selected');
            return;
        }

        console.log('[Bondly] Selected message:', Messaging.selectedMessage);

        switch (action) {
            case 'reply':
                console.log('[Bondly] Reply target selected:', Messaging.selectedMessage);
                Messaging.showReplyPreview(Messaging.selectedMessage);
                break;
            case 'forward':
                console.log('[Bondly] Forward clicked');
                Messaging.openForwardModal(Messaging.selectedMessage);
                break;
            case 'copy':
                Messaging.copyMessage();
                break;
            case 'translate':
                Messaging.translateMessage(Messaging.selectedMessage);
                break;
            case 'delete':
                Messaging.deleteMessage();
                break;
            default:
                console.error('[Bondly] Unknown action:', action);
        }

        Messaging.closeMessageMenu();
    },

    // Copy message text
    copyMessage: () => {
        if (!Messaging.selectedMessage || !Messaging.selectedMessage.text) {
            Utils.showToast('Cannot copy this message type');
            return;
        }

        navigator.clipboard.writeText(Messaging.selectedMessage.text).then(() => {
            Utils.showToast('Copied');
        }).catch(() => {
            Utils.showToast('Failed to copy');
        });
    },

    // Delete message
    deleteMessage: async () => {
        console.log('[Bondly] Delete clicked');

        if (!Messaging.selectedMessage) {
            console.error('[Bondly] No message selected for delete');
            return;
        }

        console.log('[Bondly] Selected message object:', Messaging.selectedMessage);

        const currentUserId = Auth.currentUser.uid;

        // Safely resolve message ID
        const messageId = Messaging.selectedMessage.id || Messaging.selectedMessage.messageId;

        console.log('[Bondly] Chat ID:', Messaging.currentChatId);
        console.log('[Bondly] Message ID:', messageId);
        console.log('[Bondly] Message path:', `chats/${Messaging.currentChatId}/messages/${messageId}`);

        if (!messageId) {
            console.error('[Bondly] No message ID found in selected message');
            Utils.showToast('Failed to delete message');
            return;
        }

        // Only allow deleting own messages
        if (Messaging.selectedMessage.sender !== currentUserId) {
            console.log('[Bondly] User tried to delete someone else\'s message');
            Utils.showToast('You can only delete your own messages');
            return;
        }

        if (!confirm('Delete this message?')) {
            console.log('[Bondly] Delete cancelled by user');
            return;
        }

        try {
            const db = FirebaseService.getDb();
            const messageRef = db.collection('chats').doc(Messaging.currentChatId)
                .collection('messages').doc(messageId);

            // Check if document exists before deleting
            const doc = await messageRef.get();
            if (!doc.exists) {
                console.log('[Bondly] Message not found');
                Utils.showToast('Message not found');
                return;
            }

            // Use delete() instead of update()
            await messageRef.delete();

            console.log('[Bondly] Delete success');
            Utils.showToast('Message deleted');

        } catch (error) {
            console.error('[Bondly] Delete failed:', error);
            Utils.showToast('Failed to delete message');
        }
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

            // Mark messages as seen when receiver enters chat
            Messaging.markMessagesAsSeen();

            // Setup message menu (only once per chat session)
            if (!Messaging.menuSetup) {
                Messaging.setupMessageMenu();
                Messaging.menuSetup = true;
            }

            // Remove existing listener
            if (Messaging.messagesListener) {
                Messaging.messagesListener();
            }
            
            // Listen for messages in real-time
            Messaging.messagesListener = db.collection('chats').doc(chatId)
                .collection('messages')
                .orderBy('timestamp', 'desc')
                .onSnapshot((snapshot) => {
                    const messages = [];
                    
                    snapshot.forEach(doc => {
    const msg = doc.data();

    // Get notification settings
    const settings =
        Utils.storage.get(
            'notificationSettings'
        ) || {};

    // 🔔 New message notification
    if (
        document.hidden &&
        Notification.permission ===
            "granted" &&
        msg.sender !== currentUserId &&
        settings.messages !== false &&
        settings.push !== false
    ) {

        new Notification(
            "New Message 💬",
            {
                body:
                    msg.text ||
                    "Sent a photo/video/file",
                icon:
                    "/favicon.ico"
            }
        );

        // Optional sound
        if (
            settings.sound !== false
        ) {
            new Audio(
                "/notification.mp3"
            ).play()
            .catch(() => {});
        }

        console.log(
            "[Bondly] Message notification sent"
        );
    }

    // Only show non-deleted messages
    if (!msg.deleted) {
        messages.push({
            id: doc.id,
            ...msg
        });
    }
});
                    
                    Messaging.currentMessages = messages.reverse();
                    Messaging.renderMessages(Messaging.currentMessages);

                    Mobile.scrollToBottom(messagesContainer);
                    
                    // Mark messages as read if they're from the other user
                    messages.forEach(msg => {
                        if (msg.sender !== currentUserId && !msg.read) {
                            Messaging.markAsRead(userId);
                        }
                    });

                    // Mark messages from current user as delivered when receiver opens chat
                    messages.forEach(msg => {
                        if (msg.sender === currentUserId && msg.status && !msg.status.delivered) {
                            Messaging.markAsDelivered(msg.id);
                        }
                    });
                }, (error) => {
                    console.error('Error loading messages:', error);
                });
            
            // Listen for other user's presence (RTDB-based)
            if (Messaging.presenceListener) {
                Messaging.presenceListener();
            }
            if (typeof Presence !== 'undefined') {
                console.log('[Bondly Debug] Subscribing to other user presence:', userId);
                Messaging.presenceListener = Presence.listenToUserPresence(userId, (presence) => {
                    console.log('[Bondly Debug] Presence update for user:', userId, presence);
                    Messaging.otherUserPresence = presence;
                    const statusElement = document.getElementById('chat-user-status');
                    if (statusElement && statusElement.textContent !== 'typing...') {
                        Messaging.updateUserStatusUI(presence);
                    }
                });
            }

            // Listen for typing indicator (Firestore-based)
            if (Messaging.typingListener) {
                Messaging.typingListener();
            }

            // Firestore-based typing indicator (optional - doesn't crash if not available)
            try {
                const db = FirebaseService.getDb();
                const typingDoc = db.collection('chats').doc(chatId).collection('typing').doc(userId);

                Messaging.typingListener = typingDoc.onSnapshot((snapshot) => {
                    const typingData = snapshot.exists ? snapshot.data() : null;
                    const typedAt = typingData?.timestamp?.toMillis?.() || 0;
                    const isTyping = Boolean(typingData?.isTyping) && (Date.now() - typedAt < 7000);
                    const statusElement = document.getElementById('chat-user-status');

                    if (statusElement) {
                        if (isTyping) {
                            statusElement.textContent = 'typing...';
                            statusElement.style.color = 'var(--soft-blue)';
                        } else {
                            // Revert to actual presence status
                            Messaging.updateUserStatusUI(Messaging.otherUserPresence);
                        }
                    }
                }, (error) => {
                    console.error('Typing indicator error (non-critical):', error);
                });
            } catch (error) {
                console.error('Error setting up typing indicator (non-critical):', error);
            }

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

        let displayMessages = messages;
        if (Messaging.searchQuery && Messaging.searchQuery.trim() !== '') {
            const query = Messaging.searchQuery.trim().toLowerCase();
            displayMessages = messages.filter(msg => {
                const textMatch = msg.text && Utils.fuzzyMatch(msg.text, query);
                const fileMatch = msg.fileName && Utils.fuzzyMatch(msg.fileName, query);
                return textMatch || fileMatch;
            });
        }

        if (displayMessages.length === 0) {
            messagesContainer.innerHTML = `
                <div style="text-align: center; color: var(--gray-500); padding: var(--spacing-xl);">
                    <p>No messages match your search</p>
                </div>
            `;
            return;
        }

        messagesContainer.innerHTML = displayMessages.map(msg => {
            const isSent = msg.sender === currentUserId;
            const timestamp = msg.timestamp ? msg.timestamp.toDate() : new Date();
            const messageType = msg.type || 'text';
            const senderName = msg.sender === currentUserId ? 'You' : (Messaging.currentChatUser?.displayName || 'User');

            let messageContent = '';

            switch (messageType) {

    case 'image':
        messageContent = `
            <img
                src="${msg.imageUrl}"
                alt="Photo"
                class="message-image"
                onclick="window.open('${msg.imageUrl}', '_blank')"
            >
        `;
        break;

    case 'video':
        messageContent = `
            <video
                src="${msg.fileUrl}"
                controls
                class="message-video"
            ></video>
        `;
        break;

    case 'file': {
    const isPdf =
        msg.fileName
            ?.toLowerCase()
            .endsWith('.pdf');

    messageContent = `
        <a
            href="${isPdf ? `https://drive.google.com/viewerng/viewer?embedded=true&url=${encodeURIComponent(msg.fileUrl)}` : msg.fileUrl}"
            target="_blank"
            rel="noopener noreferrer"
            class="message-file"
        >
            📄 ${msg.fileName}
        </a>
    `;
    break;
}

    case 'voice':
        messageContent = `
            <audio
    controls
    src="${msg.voiceUrl}">
</audio>
        `;
        break;

    default:
        messageContent = Utils.escapeHTML(msg.text || '');
}

            // Build reply quote HTML if this message is replying to another
            let replyQuoteHtml = '';
            if (msg.replyTo && msg.replyTo.id) {
                const replyName = msg.replyTo.senderName || 'User';
                const replyText = Messaging.getReplyPreviewText(msg.replyTo);
                replyQuoteHtml = `
                    <div class="reply-quote" onclick="Messaging.scrollToMessage('${msg.replyTo.id}')">
                        <div class="reply-quote-bar"></div>
                        <div class="reply-quote-info">
                            <span class="reply-quote-name">${replyName}</span>
                            <span class="reply-quote-text">${replyText}</span>
                        </div>
                    </div>
                `;
            }

            // Calculate message status indicator
            let statusIndicator = '';
            if (isSent && msg.status) {
                if (msg.status.seen) {
                    statusIndicator = '<span class="message-status seen">👀</span>';
                } else if (msg.status.delivered) {
                    statusIndicator = '<span class="message-status delivered">✓✓</span>';
                } else if (msg.status.sent) {
                    statusIndicator = '<span class="message-status sent">✓</span>';
                }
            }

            // Escape text for data attribute to prevent XSS
            const safeText = Utils.escapeHTML(msg.text || '');

            return `
                <div class="message ${isSent ? 'sent' : 'received'}"
                    data-type="${messageType}"
                    data-message-id="${msg.id}"
                    data-sender="${msg.sender}"
                    data-sender-name="${Utils.escapeHTML(senderName)}"
                    data-text="${safeText}"
                    data-image-url="${Utils.escapeHTML(msg.imageUrl || '')}"
                    data-file-url="${Utils.escapeHTML(msg.fileUrl || '')}"
                    data-file-name="${Utils.escapeHTML(msg.fileName || '')}"
                    data-voice-url="${Utils.escapeHTML(msg.voiceUrl || '')}"
                    data-duration="${msg.duration || 0}">
                    ${replyQuoteHtml}
                    <div class="message-content">${messageContent}</div>
                    ${msg.translation ? `<div class="message-translation">${Utils.escapeHTML(msg.translation.text || '')}</div>` : ''}
                    <div class="message-time">${Utils.formatMessageTime(timestamp)} ${statusIndicator}</div>
                    ${msg.edited ? '<span class="edited-badge">edited</span>' : ''}
                    ${msg.reactions && msg.reactions.length > 0 ? `
                        <div class="message-reactions">
                            ${msg.reactions.map(r => `<span class="reaction">${r.emoji}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        setTimeout(() => {

    const chatScreen =
        document.getElementById(
            'chat-screen'
        );

    chatScreen.scrollTop =
        chatScreen.scrollHeight;

}, 300);
    },

    
    
    // Send message
    sendMessage: async () => {
        console.log('Sending message...');
        console.log('Current chat:', Messaging.currentChatId);
        console.log('Current user:', Auth.currentUser);
        console.log('Chat user:', Messaging.currentChatUser);

        if (!Auth.currentUser) {
            console.error('No current user');
            Utils.showToast('Please sign in to send messages');
            return;
        }

        if (!Messaging.currentChatId) {
            console.error('No current chat ID');
            Utils.showToast('Chat not initialized');
            return;
        }

        if (!Messaging.currentChatUser) {
            console.error('No current chat user');
            Utils.showToast('Chat user not set');
            return;
        }

        if (!FirebaseService.isInitialized()) {
            Utils.showToast('Firebase not configured');
            return;
        }

        const messageInput = document.getElementById('message-input');
        const text = messageInput.value.trim();

        if (!text) {
            console.log('Empty message, not sending');
            return;
        }

        const db = FirebaseService.getDb();
        const currentUserId = Auth.currentUser.uid;
        const otherUserId = Messaging.currentChatUser.uid;

        console.log('Message data:', { currentUserId, otherUserId, text });

        try {
            // Build message object
            const messageObj = {
                sender: currentUserId,
                text: text,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                reactions: [],
                edited: false,
                deleted: false,
                read: false,
                status: {
                    sent: true,
                    delivered: false,
                    seen: false
                }
            };

            // Attach reply metadata if replying
            if (Messaging.replyTarget) {
                messageObj.replyTo = {
                    id: Messaging.replyTarget.id,
                    text: Messaging.replyTarget.text || '',
                    type: Messaging.replyTarget.type || 'text',
                    sender: Messaging.replyTarget.sender,
                    senderName: Messaging.replyTarget.senderName || 'User'
                };
                Messaging.cancelReply();
            }

            // Add message with status tracking
            await db.collection('chats').doc(Messaging.currentChatId)
                .collection('messages').add(messageObj);

            console.log('Message added to Firestore');

            // Update chat last message
            await db.collection('chats').doc(Messaging.currentChatId).update({
                lastMessage: text,
                lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                unread: {
                    [currentUserId]: 0,
                    [otherUserId]: firebase.firestore.FieldValue.increment(1)
                }
            });

            console.log('Chat metadata updated');

            // Clear input
            messageInput.value = '';
            Messaging.clearTypingIndicator();

            // Send notification
            if (FirebaseService.isInitialized()) {
                try {
                    const senderDoc = await db.collection('users').doc(currentUserId).get();
                    const senderData = Utils.sanitizeUser(senderDoc.data());

                    await Notifications.sendNotification(otherUserId, {
                        type: 'message',
                        senderId: currentUserId,
                        senderName: senderData?.displayName || 'Someone',
                        message: text,
                        chatId: Messaging.currentChatId
                    });
                } catch (notifError) {
                    console.error('[Bondly] Error sending notification:', notifError);
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

            // Check for message-related achievements
            try {
                await Achievements.checkCategoryAchievements('messages');
            } catch (achievementError) {
                console.error('Error checking achievement:', achievementError);
            }

            Mobile.hapticFeedback('light');
            console.log('Message sent successfully');

        } catch (error) {
            console.error('Error sending message:', error);
            Utils.showToast('Error sending message');
        }
    },

    // START VOICE RECORDING
startVoiceRecording:
async () => {

    try {

        const stream =
            await navigator
            .mediaDevices
            .getUserMedia({
                audio: true
            });

        Messaging.audioChunks = [];

        Messaging.mediaRecorder =
            new MediaRecorder(
                stream
            );

        Messaging.mediaRecorder
        .ondataavailable =
            (event) => {

            Messaging
            .audioChunks
            .push(
                event.data
            );
        };

        Messaging.mediaRecorder
        .onstop =
        async () => {

            const audioBlob =
                new Blob(
                    Messaging
                    .audioChunks,
                    {
                        type:
                        'audio/webm'
                    }
                );

            const audioUrl =
                URL.createObjectURL(
                    audioBlob
                );

            const db =
                FirebaseService
                .getDb();

            await db
                .collection(
                    'chats'
                )
                .doc(
                    Messaging
                    .currentChatId
                )
                .collection(
                    'messages'
                )
                .add({

                    sender:
                    Auth
                    .currentUser
                    .uid,

                    type:
                    'voice',

                    audioUrl:
                    audioUrl,

                    timestamp:
                    firebase
                    .firestore
                    .FieldValue
                    .serverTimestamp()
                });

            console.log(
                'VOICE SENT'
            );
        };

        Messaging
        .mediaRecorder
        .start();

        Messaging
        .isRecording =
        true;

        const voiceBtn =
            document
            .getElementById(
                'voice-btn'
            );

        if (voiceBtn) {
            voiceBtn.textContent =
                '🔴';
        }

        Utils.showToast(
            'Recording...'
        );

    } catch (
        error
    ) {

        console.error(
            error
        );

        Utils.showToast(
            'Microphone denied'
        );
    }
},

// STOP RECORDING
stopVoiceRecording:
() => {

    Messaging
    .mediaRecorder
    ?.stop();

    Messaging
    .isRecording =
    false;

    const voiceBtn =
        document
        .getElementById(
            'voice-btn'
        );

    if (voiceBtn) {
        voiceBtn.textContent =
            '🎤';
    }

    Utils.showToast(
        'Voice sent 🎤'
    );
},
    
    // Send typing indicator (Firestore-based)
    sendTypingIndicator: () => {
        if (!Messaging.currentChatId || !Auth.currentUser) return;

        try {
            const db = FirebaseService.getDb();
            const currentUserId = Auth.currentUser.uid;

            // Set typing status in Firestore
            db.collection('chats').doc(Messaging.currentChatId)
                .collection('typing').doc(currentUserId).set({
                isTyping: true,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Clear previous timeout
            if (Messaging.typingTimeout) {
                clearTimeout(Messaging.typingTimeout);
            }

            // Clear typing status after 3 seconds
            Messaging.typingTimeout = setTimeout(() => {
                db.collection('chats').doc(Messaging.currentChatId)
                    .collection('typing').doc(currentUserId).set({
                    isTyping: false,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            }, 3000);
        } catch (error) {
            console.error('Error sending typing indicator (non-critical):', error);
        }
    },

    clearTypingIndicator: () => {
        if (!Messaging.currentChatId || !Auth.currentUser || !FirebaseService.isInitialized()) return;

        try {
            if (Messaging.typingTimeout) {
                clearTimeout(Messaging.typingTimeout);
                Messaging.typingTimeout = null;
            }
            FirebaseService.getDb().collection('chats').doc(Messaging.currentChatId)
                .collection('typing').doc(Auth.currentUser.uid).set({
                    isTyping: false,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            console.log('[Bondly] Typing indicator cleared');
        } catch (error) {
            console.error('Error clearing typing indicator (non-critical):', error);
        }
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

    // Mark message as delivered
    markAsDelivered: async (messageId) => {
        if (!Messaging.currentChatId) return;
        if (!FirebaseService.isInitialized()) return;

        const db = FirebaseService.getDb();

        try {
            await db.collection('chats').doc(Messaging.currentChatId)
                .collection('messages').doc(messageId).update({
                    'status.delivered': true
                });
            console.log('Message marked as delivered:', messageId);
        } catch (error) {
            console.error('Error marking as delivered:', error);
        }
    },

    // Mark messages as seen when receiver enters chat
    markMessagesAsSeen: async () => {
        if (!Auth.currentUser || !Messaging.currentChatId) return;
        if (!FirebaseService.isInitialized()) return;

        const db = FirebaseService.getDb();
        const currentUserId = Auth.currentUser.uid;

        try {
            // Get all messages from other user that are not seen
            const messagesSnapshot = await db.collection('chats').doc(Messaging.currentChatId)
                .collection('messages')
                .where('sender', '!=', currentUserId)
                .where('status.seen', '==', false)
                .get();

            const batch = db.batch();
            messagesSnapshot.forEach(doc => {
                batch.update(doc.ref, { 'status.seen': true });
            });

            if (messagesSnapshot.size > 0) {
                await batch.commit();
                console.log('Marked', messagesSnapshot.size, 'messages as seen');
            }
        } catch (error) {
            console.error('Error marking as seen:', error);
        }
    },
    
    // Add reaction to message
    addReaction: async (messageId, emoji) => {
        if (!Messaging.currentChatId) return;
        if (!FirebaseService.isInitialized()) return;

        const db = FirebaseService.getDb();
        const currentUserId = Auth.currentUser.uid;

        try {
            // Get message to find original sender
            const messageDoc = await db.collection('chats').doc(Messaging.currentChatId)
                .collection('messages').doc(messageId).get();
            const messageData = messageDoc.data();

            // Add reaction
            await db.collection('chats').doc(Messaging.currentChatId)
                .collection('messages').doc(messageId).update({
                reactions: firebase.firestore.FieldValue.arrayUnion({ emoji, count: 1 })
            });

            // Send notification to original message sender (if not current user)
            if (messageData.sender !== currentUserId) {
                const reactorDoc = await db.collection('users').doc(currentUserId).get();
                const reactorData = Utils.sanitizeUser(reactorDoc.data());

                await Notifications.sendNotification(messageData.sender, {
                    type: 'reaction',
                    senderId: currentUserId,
                    senderName: reactorData?.displayName || 'Someone',
                    emoji: emoji,
                    message: 'reacted to your message'
                });
            }

            console.log('[Bondly] Reaction added and notification sent');

        } catch (error) {
            console.error('[Bondly] Error adding reaction:', error);
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
    
    // Toggle Chat Search Bar
    toggleSearch: () => {
        const searchBar = document.getElementById('chat-search-bar');
        if (!searchBar) return;
        
        const isHidden = searchBar.classList.contains('hidden');
        if (isHidden) {
            searchBar.classList.remove('hidden');
            document.getElementById('chat-message-search')?.focus();
        } else {
            Messaging.clearSearch();
            searchBar.classList.add('hidden');
        }
    },

    // Clear Search query
    clearSearch: () => {
        const searchInput = document.getElementById('chat-message-search');
        if (searchInput) {
            searchInput.value = '';
        }
        Messaging.searchQuery = '';
        Messaging.renderMessages(Messaging.currentMessages);
    },

    // Handle Search input change
    handleSearch: (query) => {
        Messaging.searchQuery = query;
        Messaging.renderMessages(Messaging.currentMessages);
    },

    // Cleanup listeners
    cleanup: () => {
        // Reset search state
        Messaging.searchQuery = '';
        const searchBar = document.getElementById('chat-search-bar');
        if (searchBar) {
            searchBar.classList.add('hidden');
        }
        const searchInput = document.getElementById('chat-message-search');
        if (searchInput) {
            searchInput.value = '';
        }

        Messaging.clearTypingIndicator();
        if (Messaging.messagesListener) {
            Messaging.messagesListener();
        }
        if (Messaging.typingListener) {
            Messaging.typingListener();
        }
        if (Messaging.typingTimeout) {
            clearTimeout(Messaging.typingTimeout);
        }

        // Stop voice recording if in progress
        if (Messaging.isRecording && Messaging.mediaRecorder) {
            Messaging.mediaRecorder.stop();
            Messaging.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            Messaging.isRecording = false;

            const voiceBtn = document.getElementById('voice-btn');
            if (voiceBtn) {
                voiceBtn.textContent = '🎤';
                voiceBtn.style.background = '';
                voiceBtn.style.color = '';
            }
        }
    },

    // Toggle attachment menu
    toggleAttachmentMenu: () => {
    const menu = document.getElementById('attachment-menu');

    if (!menu) {
        console.error('Attachment menu not found');
        return;
    }

    const isOpen = menu.classList.contains('show');

    if (isOpen) {
        // CLOSE
        menu.classList.remove('show');
        menu.classList.add('hidden');
    } else {
        // OPEN
        menu.classList.remove('hidden');
        menu.classList.add('show');
    }

    console.log('Menu classes:', menu.className);
},

    // Close attachment menu when clicking outside
    closeAttachmentMenuOutside: (e) => {
        const menu = document.getElementById('attachment-menu');
        const attachBtn = document.getElementById('attach-btn');

        if (menu && !menu.contains(e.target) && !attachBtn.contains(e.target)) {
            menu.classList.add('hidden');
            document.removeEventListener('click', Messaging.closeAttachmentMenuOutside);
        }
    },

    // Handle attachment menu item clicks
    handleAttachmentClick: (type) => {

        const menu =
document.getElementById(
    'attachment-menu'
);

menu?.classList.remove('show');
        Messaging.toggleAttachmentMenu();

        if (!Auth.currentUser || !Messaging.currentChatId) {
            Utils.showToast('Please start a chat first');
            return;
        }

        if (!FirebaseService.isInitialized()) {
            Utils.showToast('Firebase not configured');
            return;
        }

        const input = document.createElement('input');
        input.type = 'file';
        input.style.display = 'none';

        switch (type) {
            case 'photo':
    input.accept = 'image/*';

    input.onchange = async (e) => {
        const file = e.target.files[0];

        if (!file) return;

        try {
            console.log('Uploading photo...');

            Utils.showLoading('Uploading photo...');

            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', 'bondly_upload');
            formData.append(
    'file',
    file
);

formData.append(
    'upload_preset',
    'bondly_upload'
);

const endpoint = 'image/upload';

const response =
    await fetch(
        `https://api.cloudinary.com/v1_1/dvjdqc8pj/${endpoint}`,
        {
            method: 'POST',
            body: formData
        }
    );

            const data = await response.json();

            console.log('Cloudinary success:', data);

            const db = FirebaseService.getDb();

            await db.collection('chats')
.doc(Messaging.currentChatId)
.collection('messages')
.add({

    sender:
    Auth.currentUser.uid,

    type:
    type === 'photo'
        ? 'image'
        : 'file',

    imageUrl:
    type === 'photo'
        ? data.secure_url
        : null,

    fileUrl:
    type !== 'photo'
        ? data.secure_url
        : null,

    fileName:
    file.name,

    timestamp:
    firebase.firestore
    .FieldValue
    .serverTimestamp(),

    read: false,
    status: {
        sent: true,
        delivered: false,
        seen: false
    }
});

            Utils.hideLoading();
            console.log('Image message sent');

        } catch (error) {
            console.error('Photo upload failed:', error);
            Utils.hideLoading();
            Utils.showToast('Failed to upload photo');
        }
    };

    break;
            case 'video':
                input.accept = 'video/*';
                input.onchange = (e) => Messaging.handleFileUpload(e.target.files[0], 'video');
                break;
            case 'file':
                input.accept = '*/*';
                input.onchange = (e) => Messaging.handleFileUpload(e.target.files[0], 'file');
                break;
        }

        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    },

    // Handle file upload to Firebase Storage
    handleFileUpload: async (file, type) => {
        if (!file) return;

        // Validate file size (max 50MB)
        if (file.size > 50 * 1024 * 1024) {
            Utils.showToast('File must be less than 50MB');
            return;
        }

        Utils.showLoading('Uploading...');

        try {
            const currentUserId =
    Auth.currentUser.uid;

console.log(
    `Uploading ${type}...`
);

const formData =
    new FormData();

formData.append(
    'file',
    file
);

formData.append(
    'upload_preset',
    'bondly_upload'
);

const isPdf =
    file.type ===
    'application/pdf';

const endpoint =
    type === 'photo'
        ? 'image/upload'
        : type === 'video'
        ? 'video/upload'
        : 'raw/upload';

console.log('TYPE:', type);
console.log('FILE TYPE:', file.type);
console.log('ENDPOINT:', endpoint);



const response = await fetch(
    `https://api.cloudinary.com/v1_1/dvjdqc8pj/${endpoint}`,
    {
        method: 'POST',
        body: formData
    }
);

const data =
    await response.json();

console.log(
    'Cloudinary success:',
    data
);

const downloadURL =
    data.secure_url;

            // Save message to Firestore
            const db = FirebaseService.getDb();
            const messageData = {
    sender: currentUserId,
    type:
        type === 'photo'
            ? 'image'
            : type === 'video'
            ? 'video'
            : 'file',

    imageUrl:
        type === 'photo'
            ? data.secure_url
            : null,

    fileUrl:
        type !== 'photo'
            ? data.secure_url
            : null,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                reactions: [],
                edited: false,
                deleted: false,
                read: false,
                status: {
                    sent: true,
                    delivered: false,
                    seen: false
                }
            };

            if (type === 'file') {
                messageData.fileName = file.name;
            }

            await db.collection('chats').doc(Messaging.currentChatId)
                .collection('messages').add(messageData);

            // Update chat last message
            await db.collection('chats').doc(Messaging.currentChatId).update({
                lastMessage: type === 'file' ? `📎 ${file.name}` : `📎 ${type}`,
                lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                unread: {
                    [currentUserId]: 0,
                    [Messaging.currentChatUser.uid]: firebase.firestore.FieldValue.increment(1)
                }
            });

            // Send notification
            try {
                await Notifications.sendNotification(Messaging.currentChatUser.uid, {
                    type: 'message',
                    from: currentUserId,
                    message: type === 'file' ? `📎 ${file.name}` : `📎 ${type}`,
                    chatId: Messaging.currentChatId
                });
            } catch (notifError) {
                console.error('Error sending notification:', notifError);
            }

            Mobile.hapticFeedback('success');
            Utils.showToast('File uploaded successfully');

        } catch (error) {
            console.error('Error uploading file:', error);
            Utils.showToast('Error uploading file');
        } finally {
            Utils.hideLoading();
        }
    },

    async startVoiceRecording() {

    if (Messaging.isRecording) return;

    try {

        const stream =
            await navigator.mediaDevices.getUserMedia({
                audio: true
            });

        Messaging.audioChunks = [];

        Messaging.mediaRecorder =
            new MediaRecorder(stream);

        Messaging.isRecording = true;
        Messaging.recordingStartTime =
            Date.now();

        console.log(
            'VOICE RECORDING STARTED'
        );

        Messaging.mediaRecorder.ondataavailable =
            (event) => {

                if (event.data.size > 0) {
                    Messaging.audioChunks.push(
                        event.data
                    );
                }
            };

        Messaging.mediaRecorder.start();

    } catch (error) {

        console.error(
            'MIC ERROR:',
            error
        );

        Utils.showToast(
            'Microphone permission denied'
        );
    }
},

async stopVoiceRecording() {

    if (
        !Messaging.isRecording ||
        !Messaging.mediaRecorder
    ) return;

    Messaging.isRecording = false;

    Messaging.mediaRecorder.onstop =
        async () => {

            const audioBlob =
                new Blob(
                    Messaging.audioChunks,
                    {
                        type: 'audio/webm'
                    }
                );

            console.log(
    'VOICE READY:',
    audioBlob
);

await Messaging
    .uploadVoiceMessage(
        audioBlob
    );
        };

    Messaging.mediaRecorder.stop();

    console.log(
        'VOICE RECORDING STOPPED'
    );
},

    // Toggle voice recording
    toggleVoiceRecording: async () => {
        if (!Auth.currentUser || !Messaging.currentChatId) {
            Utils.showToast('Please start a chat first');
            return;
        }

        if (!FirebaseService.isInitialized()) {
            Utils.showToast('Firebase not configured');
            return;
        }

        const voiceBtn = document.getElementById('voice-btn');

        if (Messaging.isRecording) {
            // Stop recording
            Messaging.stopRecording();
        } else {
            // Start recording
            Messaging.startRecording();
        }
    },

    // Start voice recording
    startRecording: async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            Messaging.mediaRecorder = new MediaRecorder(stream);
            Messaging.audioChunks = [];
            Messaging.recordingStartTime = Date.now();

            Messaging.mediaRecorder.ondataavailable = (event) => {
                Messaging.audioChunks.push(event.data);
            };

            Messaging.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(Messaging.audioChunks, { type: 'audio/webm' });
                await Messaging.uploadVoiceMessage(audioBlob);
            };

            Messaging.mediaRecorder.start();
            Messaging.isRecording = true;

            const voiceBtn = document.getElementById('voice-btn');
            voiceBtn.textContent = '⏹️';
            voiceBtn.style.background = 'var(--error)';
            voiceBtn.style.color = 'var(--white)';

            Utils.showToast('Recording...');

        } catch (error) {
            console.error('Error starting recording:', error);
            Utils.showToast('Could not access microphone');
        }
    },

    // Stop voice recording
    stopRecording: () => {
        if (Messaging.mediaRecorder && Messaging.isRecording) {
            Messaging.mediaRecorder.stop();
            Messaging.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            Messaging.isRecording = false;

            const voiceBtn = document.getElementById('voice-btn');
            voiceBtn.textContent = '🎤';
            voiceBtn.style.background = '';
            voiceBtn.style.color = '';

            Utils.showToast('Processing voice message...');
        }
    },

    // Upload voice message to Firebase Storage
    async uploadVoiceMessage(audioBlob) {

    try {

        Utils.showLoading(
            'Uploading voice message...'
        );

        const formData =
            new FormData();

        formData.append(
            'file',
            audioBlob,
            'voice-message.webm'
        );

        formData.append(
            'upload_preset',
            'bondly_upload'
        );

        const response =
            await fetch(
                'https://api.cloudinary.com/v1_1/dvjdqc8pj/video/upload',
                {
                    method: 'POST',
                    body: formData
                }
            );

        const result =
            await response.json();

        console.log(
            'VOICE CLOUDINARY:',
            result
        );

        const db =
            FirebaseService.getDb();

        const currentUserId =
            Auth.currentUser.uid;

        await db.collection(
            'chats'
        )
        .doc(
            Messaging.currentChatId
        )
        .collection(
            'messages'
        )
        .add({

            sender:
                currentUserId,

            type:
                'voice',

            voiceUrl:
                result.secure_url,

            duration:
                Math.floor(
                    (
                        Date.now() -
                        Messaging
                        .recordingStartTime
                    ) / 1000
                ),

            timestamp:
                firebase
                .firestore
                .FieldValue
                .serverTimestamp(),

            reactions: [],
            edited: false,
            deleted: false,
            read: false,
            status: {
                sent: true,
                delivered: false,
                seen: false
            }
        });

        Utils.showToast(
            'Voice sent 🎤'
        );

    } catch (error) {

        console.error(
            'VOICE ERROR:',
            error
        );

        Utils.showToast(
            'Voice upload failed'
        );

    } finally {

        Utils.hideLoading();
    }
},

    // ========================================
    // UPDATE USER STATUS UI (presence-based)
    // ========================================
    updateUserStatusUI: (presence) => {
        const statusElement = document.getElementById('chat-user-status');
        if (!statusElement) return;

        if (!presence) {
            statusElement.textContent = 'Offline';
            statusElement.style.color = 'var(--gray-500)';
            return;
        }

        const state = presence.state || 'offline';
        switch (state) {
            case 'online':
                statusElement.textContent = 'Online';
                statusElement.style.color = 'var(--success, #48BB78)';
                break;
            case 'away':
                statusElement.textContent = 'Away';
                statusElement.style.color = 'var(--warning, #ECC94B)';
                break;
            default:
                statusElement.textContent = 'Offline';
                statusElement.style.color = 'var(--gray-500)';
        }
    },

    // ========================================
    // REPLY FEATURE
    // ========================================

    // Show reply preview bar above input
    showReplyPreview: (message) => {
        Messaging.replyTarget = message;

        const previewEl = document.getElementById('reply-preview');
        const nameEl = document.getElementById('reply-preview-name');
        const textEl = document.getElementById('reply-preview-text');

        if (!previewEl || !nameEl || !textEl) return;

        // Determine sender name
        const currentUserId = Auth.currentUser?.uid;
        const senderName = message.sender === currentUserId ? 'You' : (message.senderName || Messaging.currentChatUser?.displayName || 'User');

        // Store senderName on the reply target for later use
        Messaging.replyTarget.senderName = senderName;

        nameEl.textContent = senderName;
        textEl.textContent = Messaging.getReplyPreviewText(message);

        previewEl.classList.remove('hidden');

        // Focus the input
        const messageInput = document.getElementById('message-input');
        if (messageInput) messageInput.focus();

        console.log('[Bondly] Reply preview shown for message:', message.id);
    },

    // Cancel / dismiss reply
    cancelReply: () => {
        Messaging.replyTarget = null;

        const previewEl = document.getElementById('reply-preview');
        if (previewEl) previewEl.classList.add('hidden');

        console.log('[Bondly] Reply cancelled');
    },

    // Generate preview text for different message types
    getReplyPreviewText: (message) => {
        const type = message.type || 'text';
        switch (type) {
            case 'image':  return '\ud83d\udcf7 Photo';
            case 'video':  return '\ud83c\udfa5 Video';
            case 'file':   return '\ud83d\udcc4 ' + (message.fileName || 'File');
            case 'voice':  return '\ud83c\udfa4 Voice message';
            default:       return message.text || '';
        }
    },

    // Scroll to a message and highlight it
    scrollToMessage: (messageId) => {
        const messageEl = document.querySelector(`.message[data-message-id="${messageId}"]`);
        if (!messageEl) {
            Utils.showToast('Original message not found');
            return;
        }

        // Scroll into view
        messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Remove any previous highlight
        messageEl.classList.remove('reply-highlight');
        // Force reflow so animation restarts
        void messageEl.offsetWidth;
        messageEl.classList.add('reply-highlight');

        // Clean up after animation
        setTimeout(() => messageEl.classList.remove('reply-highlight'), 1600);
    },

    // Translation architecture placeholder. Provider integration belongs here later.
    translateMessage: async (message) => {
        if (!message || !Messaging.currentChatId) return;

        console.log('[Bondly] Translate requested:', {
            messageId: message.id,
            type: message.type
        });

        if ((message.type || 'text') !== 'text' || !message.text) {
            Utils.showToast('Only text translation is available later');
            return;
        }

        try {
            await FirebaseService.getDb()
                .collection('chats').doc(Messaging.currentChatId)
                .collection('messages').doc(message.id)
                .update({
                    translation: {
                        status: 'pending_provider',
                        targetLanguage: 'en',
                        text: 'Translation provider not connected yet.'
                    }
                });
            Utils.showToast('Translation placeholder added');
        } catch (error) {
            console.error('[Bondly] Translate placeholder failed:', error);
            Utils.showToast('Unable to prepare translation');
        }
    },

    // ========================================
    // FORWARD FEATURE
    // ========================================

    // Open the forward modal and load friends
    openForwardModal: async (message) => {
        console.log('[Bondly] Opening forward modal for:', message);

        Messaging.forwardTargets = [];
        Messaging.forwardMessage = message;

        const modal = document.getElementById('forward-modal');
        const friendsList = document.getElementById('forward-friends-list');
        const searchInput = document.getElementById('forward-search-input');
        const countEl = document.getElementById('forward-selected-count');
        const sendBtn = document.getElementById('forward-send-btn');

        if (!modal) return;

        // Reset UI
        if (countEl) countEl.textContent = '0 selected';
        if (sendBtn) sendBtn.disabled = true;
        if (searchInput) searchInput.value = '';

        // Show modal
        modal.classList.remove('hidden');

        // Load friends from Firestore
        friendsList.innerHTML = '<p style="text-align:center; color:var(--gray-500); padding:16px;">Loading friends...</p>';

        try {
            const db = FirebaseService.getDb();
            const currentUserId = Auth.currentUser.uid;

            const friendsSnapshot = await db.collection('friends')
                .where('participants', 'array-contains', currentUserId)
                .get();

            const friendIds = [];
            friendsSnapshot.forEach(doc => {
                const data = doc.data();
                const friendId = data.participants.find(p => p !== currentUserId);
                if (friendId && !friendIds.includes(friendId)) {
                    friendIds.push(friendId);
                }
            });

            // Fetch user data for each friend
            const friendsData = await Promise.all(
                friendIds.map(async (fid) => {
                    const userDoc = await db.collection('users').doc(fid).get();
                    if (!userDoc.exists) return null;
                    const userData = Utils.sanitizeUser(userDoc.data());
                    return { uid: fid, ...userData };
                })
            );

            Messaging.forwardFriendsData = friendsData.filter(f => f !== null);

            Messaging.renderForwardFriends('');

            // Setup search
            if (searchInput) {
                searchInput.oninput = () => {
                    Messaging.renderForwardFriends(searchInput.value.trim().toLowerCase());
                };
            }

        } catch (error) {
            console.error('[Bondly] Error loading friends for forward:', error);
            friendsList.innerHTML = '<p style="text-align:center; color:var(--gray-500); padding:16px;">Failed to load friends</p>';
        }
    },

    // Render friends in forward modal with optional search filter
    renderForwardFriends: (filter) => {
        const friendsList = document.getElementById('forward-friends-list');
        if (!friendsList) return;

        let friends = Messaging.forwardFriendsData;

        if (filter) {
            friends = friends.filter(f => {
                const name = (f.displayName || '').toLowerCase();
                const username = (f.username || '').toLowerCase();
                return name.includes(filter) || username.includes(filter);
            });
        }

        if (friends.length === 0) {
            friendsList.innerHTML = '<p style="text-align:center; color:var(--gray-500); padding:16px;">No friends found</p>';
            return;
        }

        friendsList.innerHTML = friends.map(f => {
            const isSelected = Messaging.forwardTargets.includes(f.uid);
            const avatar = f.avatar || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect fill='%237BAFD4' width='40' height='40'/%3E%3Ctext x='20' y='20' font-size='20' text-anchor='middle' dy='.3em' fill='white'%3E\ud83d\udc64%3C/text%3E%3C/svg%3E";
            return `
                <div class="forward-friend-item ${isSelected ? 'selected' : ''}" onclick="Messaging.toggleForwardTarget('${f.uid}')">
                    <img class="forward-friend-avatar" src="${avatar}" alt="${f.displayName}">
                    <div class="forward-friend-info">
                        <div class="forward-friend-name">${f.displayName || 'User'}</div>
                        <div class="forward-friend-username">@${f.username || ''}</div>
                    </div>
                    <div class="forward-friend-check">${isSelected ? '\u2713' : ''}</div>
                </div>
            `;
        }).join('');
    },

    // Toggle a friend in the forward selection
    toggleForwardTarget: (uid) => {
        const idx = Messaging.forwardTargets.indexOf(uid);
        if (idx === -1) {
            Messaging.forwardTargets.push(uid);
        } else {
            Messaging.forwardTargets.splice(idx, 1);
        }

        const count = Messaging.forwardTargets.length;
        const countEl = document.getElementById('forward-selected-count');
        const sendBtn = document.getElementById('forward-send-btn');

        if (countEl) countEl.textContent = count + ' selected';
        if (sendBtn) sendBtn.disabled = count === 0;

        // Re-render to update checkmarks
        const searchInput = document.getElementById('forward-search-input');
        Messaging.renderForwardFriends((searchInput?.value || '').trim().toLowerCase());
    },

    // Close forward modal
    closeForwardModal: () => {
        const modal = document.getElementById('forward-modal');
        if (modal) modal.classList.add('hidden');

        Messaging.forwardTargets = [];
        Messaging.forwardMessage = null;

        console.log('[Bondly] Forward modal closed');
    },

    // Execute forward: send the message to all selected friends
    executeForward: async () => {
        if (!Messaging.forwardMessage || Messaging.forwardTargets.length === 0) return;

        const db = FirebaseService.getDb();
        const currentUserId = Auth.currentUser.uid;
        const msg = Messaging.forwardMessage;

        Utils.showLoading('Forwarding...');

        let successCount = 0;

        try {
            for (const targetUid of Messaging.forwardTargets) {
                try {
                    // Get or create a chat with this target
                    const chatId = await Messaging.getOrCreateChat(targetUid);
                    if (!chatId) {
                        console.error('[Bondly] Could not get/create chat for:', targetUid);
                        continue;
                    }

                    // Build forwarded message
                    const forwardedMsg = {
                        sender: currentUserId,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                        reactions: [],
                        edited: false,
                        deleted: false,
                        read: false,
                        forwarded: true,
                        status: {
                            sent: true,
                            delivered: false,
                            seen: false
                        }
                    };

                    // Copy content based on type
                    const type = msg.type || 'text';
                    forwardedMsg.type = type;

                    switch (type) {
                        case 'image':
                            forwardedMsg.imageUrl = msg.imageUrl || '';
                            break;
                        case 'video':
                            forwardedMsg.fileUrl = msg.fileUrl || '';
                            break;
                        case 'file':
                            forwardedMsg.fileUrl = msg.fileUrl || '';
                            forwardedMsg.fileName = msg.fileName || 'file';
                            break;
                        case 'voice':
                            forwardedMsg.voiceUrl = msg.voiceUrl || '';
                            forwardedMsg.duration = msg.duration || 0;
                            break;
                        default:
                            forwardedMsg.text = msg.text || '';
                    }

                    await db.collection('chats').doc(chatId)
                        .collection('messages').add(forwardedMsg);

                    // Update chat last message
                    const lastMsgText = type === 'text' ? (msg.text || '') : `\ud83d\udce4 Forwarded ${type}`;
                    await db.collection('chats').doc(chatId).update({
                        lastMessage: lastMsgText,
                        lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                        unread: {
                            [currentUserId]: 0,
                            [targetUid]: firebase.firestore.FieldValue.increment(1)
                        }
                    });

                    successCount++;
                } catch (err) {
                    console.error('[Bondly] Error forwarding to', targetUid, err);
                }
            }

            Utils.hideLoading();
            Messaging.closeForwardModal();

            if (successCount > 0) {
                Utils.showToast(`Forwarded to ${successCount} friend${successCount > 1 ? 's' : ''}`);
                Mobile.hapticFeedback('light');
            } else {
                Utils.showToast('Failed to forward message');
            }

        } catch (error) {
            console.error('[Bondly] Forward error:', error);
            Utils.hideLoading();
            Utils.showToast('Failed to forward message');
        }
    },

    // Show Chat Options Modal
    showChatOptions: () => {
        if (!Messaging.currentChatUser) return;

        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        modal.innerHTML = `
            <div style="background: var(--white); padding: var(--spacing-lg); border-radius: var(--radius-lg); max-width: 350px; width: 90%; text-align: center;">
                <h3 style="margin-bottom: var(--spacing-md); color: var(--midnight-blue); font-family: var(--font-secondary);">Chat Options</h3>
                <div style="display: flex; flex-direction: column; gap: var(--spacing-sm);">
                    <button id="opts-view-profile" style="width: 100%; padding: var(--spacing-md); border: none; background: var(--gray-100); border-radius: var(--radius-md); font-weight: 600; cursor: pointer; color: var(--midnight-blue);">👤 View Profile</button>
                    <button id="opts-insights" style="width: 100%; padding: var(--spacing-md); border: none; background: var(--gray-100); border-radius: var(--radius-md); font-weight: 600; cursor: pointer; color: var(--midnight-blue);">📊 Conversation Insights</button>
                    <button id="opts-block" style="width: 100%; padding: var(--spacing-md); border: none; background: rgba(229, 115, 115, 0.1); border-radius: var(--radius-md); font-weight: 600; cursor: pointer; color: var(--error);">🚫 Block User</button>
                    <button id="opts-report" style="width: 100%; padding: var(--spacing-md); border: none; background: rgba(229, 115, 115, 0.1); border-radius: var(--radius-md); font-weight: 600; cursor: pointer; color: var(--error);">⚠️ Report User</button>
                    <button id="opts-close" style="width: 100%; padding: var(--spacing-md); border: none; background: var(--gray-200); border-radius: var(--radius-md); font-weight: 600; cursor: pointer; margin-top: var(--spacing-sm);">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        modal.querySelector('#opts-view-profile').onclick = () => {
            modal.remove();
            App.openUserProfile(Messaging.currentChatUser.uid);
        };

        modal.querySelector('#opts-insights').onclick = () => {
            modal.remove();
            Messaging.showConversationInsights();
        };

        modal.querySelector('#opts-block').onclick = () => {
            modal.remove();
            if (typeof Friends !== 'undefined') {
                Friends.blockUser(Messaging.currentChatUser.uid);
            } else {
                Safety.blockUser(Auth.currentUser.uid, Messaging.currentChatUser.uid);
            }
        };

        modal.querySelector('#opts-report').onclick = () => {
            modal.remove();
            Safety.showReportDialog(Messaging.currentChatUser.uid, Messaging.currentChatUser.displayName);
        };

        modal.querySelector('#opts-close').onclick = () => {
            modal.remove();
        };

        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };
    },

    // Show Conversation Insights Modal
    showConversationInsights: async () => {
        if (!Messaging.currentChatUser || !Messaging.currentChatId) return;

        Utils.showLoading('Calculating insights...');

        try {
            const db = FirebaseService.getDb();
            const userId = Auth.currentUser.uid;
            const targetId = Messaging.currentChatUser.uid;

            // 1. Friendship Age
            let friendshipAge = "0 days";
            try {
                const friendshipQuery = await db.collection('friends')
                    .where('participants', 'array-contains', userId)
                    .get();
                friendshipQuery.forEach(doc => {
                    const data = doc.data();
                    if (data.participants.includes(targetId)) {
                        const createdAt = data.createdAt?.toDate() || new Date();
                        const diffTime = Math.abs(new Date() - createdAt);
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        friendshipAge = `${diffDays} days`;
                    }
                });
            } catch (e) {
                console.warn('Could not read friendship age:', e);
            }

            // 2. Messages Exchanged
            let messagesExchanged = 0;
            try {
                const messagesSnapshot = await db.collection('chats').doc(Messaging.currentChatId)
                    .collection('messages').get();
                messagesExchanged = messagesSnapshot.size;
            } catch (e) {
                console.warn('Could not count messages:', e);
                messagesExchanged = Messaging.currentMessages.length;
            }

            // 3. Languages Practiced
            const uniqueLangs = new Set();
            Messaging.currentMessages.forEach(m => {
                if (m.translation?.language) {
                    uniqueLangs.add(m.translation.language);
                }
            });
            const languagesPracticed = Math.max(1, uniqueLangs.size);

            // 4. Streak
            const dates = Messaging.currentMessages
                .map(m => m.timestamp?.toDate()?.toDateString())
                .filter(Boolean);
            const uniqueDates = Array.from(new Set(dates)).map(d => new Date(d));
            uniqueDates.sort((a, b) => a - b);
            let currentStreak = 0;
            let longestStreak = 0;
            let prevDate = null;
            uniqueDates.forEach(date => {
                if (!prevDate) {
                    currentStreak = 1;
                } else {
                    const diff = (date - prevDate) / (1000 * 60 * 60 * 24);
                    if (diff <= 1.5) {
                        currentStreak++;
                    } else {
                        currentStreak = 1;
                    }
                }
                if (currentStreak > longestStreak) {
                    longestStreak = currentStreak;
                }
                prevDate = date;
            });
            longestStreak = Math.max(longestStreak, messagesExchanged > 0 ? 1 : 0);

            // 5. Most Discussed Topic
            const topics = {
                Travel: ['travel', 'trip', 'flight', 'country', 'visit', 'explore', 'vacation', 'beach', 'holiday'],
                Hobbies: ['hobby', 'hobbies', 'game', 'play', 'movie', 'sport', 'book', 'read', 'draw', 'music', 'dance'],
                Languages: ['learn', 'study', 'practice', 'speak', 'write', 'pronounce', 'word', 'grammar', 'translate', 'sentence'],
                Life: ['philosophy', 'dream', 'life', 'future', 'feeling', 'happy', 'sad', 'goal', 'family', 'friend']
            };
            const topicCounts = { Travel: 0, Hobbies: 0, Languages: 0, Life: 0 };
            Messaging.currentMessages.forEach(m => {
                if (m.text) {
                    const text = m.text.toLowerCase();
                    Object.keys(topics).forEach(topic => {
                        topics[topic].forEach(keyword => {
                            if (text.includes(keyword)) {
                                topicCounts[topic]++;
                            }
                        });
                    });
                }
            });
            let mostDiscussedTopic = 'Getting Started';
            let maxCount = 0;
            Object.keys(topicCounts).forEach(topic => {
                if (topicCounts[topic] > maxCount) {
                    maxCount = topicCounts[topic];
                    mostDiscussedTopic = topic;
                }
            });

            Utils.hideLoading();

            // Render Insights Modal
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10001;
            `;

            modal.innerHTML = `
                <div style="background: var(--white); padding: var(--spacing-lg); border-radius: var(--radius-lg); max-width: 400px; width: 90%; text-align: center;">
                    <h2 style="margin-bottom: var(--spacing-md); color: var(--midnight-blue); font-family: var(--font-secondary);">📊 Conversation Insights</h2>
                    <p style="margin-bottom: var(--spacing-lg); color: var(--gray-500); font-size: 0.875rem;">Your connection with ${Messaging.currentChatUser.displayName}</p>
                    
                    <div style="display: flex; flex-direction: column; gap: var(--spacing-md); margin-bottom: var(--spacing-lg); text-align: left;">
                        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--gray-100); padding-bottom: var(--spacing-xs);">
                            <span style="font-weight: 500; color: var(--gray-600);">🗓️ Friendship Age</span>
                            <span style="font-weight: 700; color: var(--midnight-blue);">${friendshipAge}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--gray-100); padding-bottom: var(--spacing-xs);">
                            <span style="font-weight: 500; color: var(--gray-600);">💬 Messages Exchanged</span>
                            <span style="font-weight: 700; color: var(--midnight-blue);">${messagesExchanged}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--gray-100); padding-bottom: var(--spacing-xs);">
                            <span style="font-weight: 500; color: var(--gray-600);">🗣️ Languages Practiced</span>
                            <span style="font-weight: 700; color: var(--midnight-blue);">${languagesPracticed}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--gray-100); padding-bottom: var(--spacing-xs);">
                            <span style="font-weight: 500; color: var(--gray-600);">🔥 Longest Streak</span>
                            <span style="font-weight: 700; color: var(--midnight-blue);">${longestStreak} day${longestStreak !== 1 ? 's' : ''}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--gray-100); padding-bottom: var(--spacing-xs);">
                            <span style="font-weight: 500; color: var(--gray-600);">💡 Most Discussed Topic</span>
                            <span style="font-weight: 700; color: var(--midnight-blue);">${mostDiscussedTopic}</span>
                        </div>
                    </div>
                    
                    <button id="insights-close-btn" style="width: 100%; padding: var(--spacing-md); border: none; background: var(--soft-blue); color: var(--white); border-radius: var(--radius-md); font-weight: 600; cursor: pointer;">Awesome!</button>
                </div>
            `;

            document.body.appendChild(modal);

            modal.querySelector('#insights-close-btn').onclick = () => {
                modal.remove();
            };

            modal.onclick = (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            };

        } catch (error) {
            console.error('Error fetching conversation insights:', error);
            Utils.hideLoading();
            Utils.showToast('Could not load conversation insights');
        }
    },
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Messaging;
}
