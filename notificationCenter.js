// Notification Center Module for Bondly

const NotificationCenter = {
    notifications: [],
    listener: null,
    unreadCount: 0,
    
    // Initialize notification center
    init: () => {
        if (!Auth.currentUser) return;
        if (!FirebaseService.isInitialized()) return;
        
        NotificationCenter.loadNotifications();
        NotificationCenter.setupRealtimeListener();
    },
    
    // Load notifications
    loadNotifications: async () => {
        if (!Auth.currentUser) return;
        if (!FirebaseService.isInitialized()) return;
        
        const db = FirebaseService.getDb();
        const userId = Auth.currentUser.uid;
        
        try {
            const snapshot = await db.collection('notifications')
                .where('userId', '==', userId)
                .orderBy('createdAt', 'desc')
                .limit(50)
                .get();
            
            NotificationCenter.notifications = [];
            NotificationCenter.unreadCount = 0;
            
            snapshot.forEach(doc => {
                const notification = { id: doc.id, ...doc.data() };
                NotificationCenter.notifications.push(notification);
                if (!notification.read) {
                    NotificationCenter.unreadCount++;
                }
            });
            
            NotificationCenter.updateBadge();
            
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    },
    
    // Setup realtime listener for notifications
    setupRealtimeListener: () => {
        if (!Auth.currentUser) return;
        if (!FirebaseService.isInitialized()) return;
        
        const db = FirebaseService.getDb();
        const userId = Auth.currentUser.uid;
        
        // Remove existing listener
        if (NotificationCenter.listener) {
            NotificationCenter.listener();
        }
        
        // Listen for new notifications
        NotificationCenter.listener = db.collection('notifications')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .onSnapshot((snapshot) => {
                NotificationCenter.notifications = [];
                NotificationCenter.unreadCount = 0;
                
                snapshot.forEach(doc => {
                    const notification = { id: doc.id, ...doc.data() };
                    NotificationCenter.notifications.push(notification);
                    if (!notification.read) {
                        NotificationCenter.unreadCount++;
                    }
                });
                
                NotificationCenter.updateBadge();
                NotificationCenter.renderNotifications();
                
                // Show toast for new unread notifications
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added' && !change.doc.data().read) {
                        const notification = change.doc.data();
                        if ((notification.senderId || notification.from) === Auth.currentUser?.uid) {
                            console.log('[Bondly] Ignoring self notification in center:', notification.type);
                            return;
                        }
                        NotificationCenter.showNotificationToast(notification);
                        if (Notification.permission === 'granted') {
                            Notifications.showBrowserNotification(notification);
                        }
                    }
                });
            }, (error) => {
                console.error('Error listening to notifications:', error);
            });
    },
    
    // Show notification toast
    showNotificationToast: (notification) => {
        const settings = Utils.storage.get('notificationSettings') || {};
        
        // Check if notifications are enabled for this type
        if (notification.type === 'message' && settings.messages === false) return;
        if (notification.type === 'friend_request' && settings.friendRequests === false) return;
        if (notification.type === 'match' && settings.matches === false) return;
        
        // Show toast
        Utils.showToast(notification.title);
    },
    
    // Update badge
    updateBadge: () => {
        const badge = document.getElementById('notifications-badge');
        if (badge) {
            if (NotificationCenter.unreadCount > 0) {
                badge.textContent = NotificationCenter.unreadCount > 99 ? '99+' : NotificationCenter.unreadCount;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    },
    
    // Mark notification as read
    markAsRead: async (notificationId) => {
        if (!Auth.currentUser) return;
        if (!FirebaseService.isInitialized()) return;
        
        const db = FirebaseService.getDb();
        const userId = Auth.currentUser.uid;
        
        try {
            await db.collection('notifications').doc(notificationId).update({
                read: true,
                readAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            await db.collection('users').doc(userId).update({
                unreadNotifications: firebase.firestore.FieldValue.increment(-1)
            });
            
            NotificationCenter.unreadCount = Math.max(0, NotificationCenter.unreadCount - 1);
            NotificationCenter.updateBadge();
            
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    },
    
    // Mark all as read
    markAllAsRead: async () => {
        if (!Auth.currentUser) return;
        if (!FirebaseService.isInitialized()) return;
        
        const db = FirebaseService.getDb();
        const userId = Auth.currentUser.uid;
        
        try {
            const unreadNotifications = NotificationCenter.notifications.filter(n => !n.read);
            
            if (unreadNotifications.length === 0) return;
            
            const batch = db.batch();
            
            unreadNotifications.forEach(notification => {
                const ref = db.collection('notifications').doc(notification.id);
                batch.update(ref, {
                    read: true,
                    readAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
            
            await batch.commit();
            
            await db.collection('users').doc(userId).update({
                unreadNotifications: 0
            });
            
            NotificationCenter.unreadCount = 0;
            NotificationCenter.updateBadge();
            
            Utils.showToast('All notifications marked as read');
            
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    },
    
    // Delete notification
    deleteNotification: async (notificationId) => {
        if (!Auth.currentUser) return;
        if (!FirebaseService.isInitialized()) return;
        
        const db = FirebaseService.getDb();
        const userId = Auth.currentUser.uid;
        
        try {
            const notif = NotificationCenter.notifications.find(n => n.id === notificationId);
            const wasUnread = notif && !notif.read;
            
            await db.collection('notifications').doc(notificationId).delete();
            
            if (wasUnread) {
                await db.collection('users').doc(userId).update({
                    unreadNotifications: firebase.firestore.FieldValue.increment(-1)
                });
            }
            
            Utils.showToast('Notification deleted');
            
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    },
    
    // Render notifications
    renderNotifications: () => {
        const container = document.getElementById('notifications-list');
        if (!container) return;
        
        if (NotificationCenter.notifications.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: var(--gray-500); padding: var(--spacing-xl);">
                    <p>No notifications yet</p>
                    <p style="font-size: 0.875rem;">You'll see your notifications here</p>
                </div>
            `;
            return;
        }
        
        // Group notifications by date
        const grouped = NotificationCenter.groupByDate(NotificationCenter.notifications);
        
        container.innerHTML = Object.entries(grouped).map(([date, notifications]) => `
            <div class="notification-group">
                <h3 class="notification-group-title">${date}</h3>
                ${notifications.map(notification => NotificationCenter.renderNotificationItem(notification)).join('')}
            </div>
        `).join('');
    },
    
    // Group notifications by date
    groupByDate: (notifications) => {
        const groups = {};
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        notifications.forEach(notification => {
            const notificationDate = notification.createdAt?.toDate() || new Date();
            let dateKey;
            
            if (notificationDate.toDateString() === today.toDateString()) {
                dateKey = 'Today';
            } else if (notificationDate.toDateString() === yesterday.toDateString()) {
                dateKey = 'Yesterday';
            } else {
                dateKey = notificationDate.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                });
            }
            
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(notification);
        });
        
        return groups;
    },
    
    // Render single notification item
    renderNotificationItem: (notification) => {
        const icon = NotificationCenter.getNotificationIcon(notification.type);
        const time = Utils.formatTime(notification.createdAt?.toDate());
        
        return `
            <div class="notification-item ${notification.read ? 'read' : 'unread'}" onclick="NotificationCenter.handleNotificationClick('${notification.id}', '${notification.type}', '${notification.data?.chatId || ''}', '${notification.data?.from || ''}')">
                <div class="notification-icon">${icon}</div>
                <div class="notification-content">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-message">${notification.message}</div>
                    <div class="notification-time">${time}</div>
                </div>
                <div class="notification-actions">
                    ${!notification.read ? '<span class="unread-dot"></span>' : ''}
                    <button class="notification-delete" onclick="event.stopPropagation(); NotificationCenter.deleteNotification('${notification.id}')">✕</button>
                </div>
            </div>
        `;
    },
    
    // Get notification icon
    getNotificationIcon: (type) => {
        const icons = {
            'message': '💬',
            'friend_request': '🫂',
            'friend_accepted': '✅',
            'match': '🌍',
            'achievement': '🏆'
        };
        return icons[type] || '🔔';
    },
    
    // Handle notification click
    handleNotificationClick: async (notificationId, type, chatId, fromUserId) => {
        // Mark as read
        await NotificationCenter.markAsRead(notificationId);
        
        // Navigate based on type
        if (type === 'message' && chatId) {
            // Open chat
            const userDoc = await FirebaseService.getDb().collection('users').doc(fromUserId).get();
            const userData = userDoc.data();
            App.openChat(fromUserId, userData.displayName, userData.avatar);
        } else if (type === 'friend_request' || type === 'friend_accepted') {
            // Navigate to friends
            App.navigateTo('friends');
        } else if (type === 'match') {
            // Navigate to discover
            App.navigateTo('discover');
        }
    },
    
    // Cleanup
    cleanup: () => {
        if (NotificationCenter.listener) {
            NotificationCenter.listener();
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationCenter;
}
