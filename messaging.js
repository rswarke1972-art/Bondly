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
    selectedMessage: null,
    longPressTimer: null,
    menuSetup: false,
    replyTarget: null,
    inputSetup: false,

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

    // Typing indicator
    messageInput?.addEventListener(
        'input',
        Utils.debounce(
            () => {
                Messaging.sendTypingIndicator();
            },
            500
        )
    );

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

        console.log('[Bondly] Message selected:', { messageId, sender, text, type });

        Messaging.selectedMessage = {
            id: messageId,
            sender: sender,
            text: text,
            type: type
        };

        const menu = document.getElementById('message-action-menu');
        if (!menu) {
            console.error('[Bondly] Menu element not found');
            return;
        }

        console.log('[Bondly] Menu element found, positioning at:', x, y);

        // Position menu near the message
        const menuWidth = 280;
        const menuHeight = 200;

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
                Messaging.replyTarget = Messaging.selectedMessage;
                Utils.showToast('Reply selected');
                break;
            case 'forward':
                console.log('[Bondly] Forward clicked');
                Utils.showToast('Forward feature coming soon');
                break;
            case 'copy':
                Messaging.copyMessage();
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
                        // Only show non-deleted messages
                        if (!msg.deleted) {
                            messages.push({
                                id: doc.id,
                                ...msg
                            });
                        }
                    });
                    
                    Messaging.renderMessages(
    messages.reverse()
);

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
            
            // Listen for typing indicator (Firestore-based)
            if (Messaging.typingListener) {
                Messaging.typingListener();
            }

            // Firestore-based typing indicator (optional - doesn't crash if not available)
            try {
                const db = FirebaseService.getDb();
                const typingDoc = db.collection('chats').doc(chatId).collection('typing').doc(userId);

                Messaging.typingListener = typingDoc.onSnapshot((snapshot) => {
                    const isTyping = snapshot.exists && snapshot.data().isTyping;
                    const statusElement = document.getElementById('chat-user-status');

                    if (statusElement) {
                        if (isTyping) {
                            statusElement.textContent = 'typing...';
                            statusElement.style.color = 'var(--soft-blue)';
                        } else {
                            statusElement.textContent = 'Online';
                            statusElement.style.color = 'var(--success)';
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

        messagesContainer.innerHTML = messages.map(msg => {
            const isSent = msg.sender === currentUserId;
            const timestamp = msg.timestamp ? msg.timestamp.toDate() : new Date();
            const messageType = msg.type || 'text';

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
            href="${msg.fileUrl}"
            target="_blank"
            rel="noopener noreferrer"
            class="message-file"
        >
            📄 ${msg.fileName}
        </a>
    `;
    break;
}
    messageContent = `
        <a
            href="${
    isPdf
    ? `https://drive.google.com/viewerng/viewer?embedded=true&url=${encodeURIComponent(msg.fileUrl)}`
    : msg.fileUrl
}"
target="_blank"
            rel="noopener noreferrer"
            class="message-file"
        >
            📄 ${msg.fileName}
        </a>
    `;
    break;

    case 'voice':
        messageContent = `
            <audio
    controls
    src="${msg.voiceUrl}">
</audio>
        `;
        break;

    default:
        messageContent = msg.text || '';
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

            return `
                <div class="message ${isSent ? 'sent' : 'received'}" data-type="${messageType}" data-message-id="${msg.id}" data-sender="${msg.sender}" data-text="${msg.text || ''}">
                    <div class="message-content">${messageContent}</div>
                    <div class="message-time">${Utils.formatMessageTime(timestamp)} ${statusIndicator}</div>
                    ${msg.edited ? '<span class="edited-badge">edited</span>' : ''}
                    ${msg.reactions && msg.reactions.length > 0 ? `
                        <div class="message-reactions">
                            ${msg.reactions.map(r => `<span class="reaction">${r.emoji} ${r.count}</span>`).join('')}
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
            // Add message with status tracking
            await db.collection('chats').doc(Messaging.currentChatId)
                .collection('messages').add({
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
            });

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

            // Send notification
            if (FirebaseService.isInitialized()) {
                try {
                    const senderDoc = await db.collection('users').doc(currentUserId).get();
                    const senderData = senderDoc.data();

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

            // Check for achievements
            try {
                await Achievements.checkAchievement('first_message');
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

            // Clear typing status after 2 seconds
            Messaging.typingTimeout = setTimeout(() => {
                db.collection('chats').doc(Messaging.currentChatId)
                    .collection('typing').doc(currentUserId).set({
                    isTyping: false,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            }, 2000);
        } catch (error) {
            console.error('Error sending typing indicator (non-critical):', error);
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
                const reactorData = reactorDoc.data();

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
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Messaging;
}
