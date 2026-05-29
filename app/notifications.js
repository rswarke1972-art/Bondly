// Notifications Module for Bondly

const Notifications = {
    notificationPermission: 'default',
    fcmToken: null,
    
    // Initialize notifications
    init: async () => {
        console.log('Notifications module initializing');
        
        // Request notification permission
        await Notifications.requestPermission();
        
        // Setup message listener
        Notifications.setupMessageListener();
    },
    
    // Request notification permission
    requestPermission: async () => {
        if (!('Notification' in window)) {
            console.log('This browser does not support notifications');
            return;
        }
        
        if (Notification.permission === 'granted') {
            Notifications.notificationPermission = 'granted';
            return;
        }
        
        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            Notifications.notificationPermission = permission;
        }
    },
    
    // Setup FCM message listener
    setupMessageListener: () => {
        if (!('serviceWorker' in navigator)) {
            console.log('Service workers not supported');
            return;
        }
        
        // This would be set up with Firebase Cloud Messaging
        // For now, we'll use a simple in-app notification system
    },
    
    // Send notification to user
    sendNotification: async (userId, notificationData) => {
        if (!FirebaseService.isInitialized()) return;
        
        const db = FirebaseService.getDb();
        
        try {
            // Check if user has notifications enabled
            const settings = Utils.storage.get('notifications');
            if (settings === false) return;
            
            // Add notification to user's notifications collection
            await db.collection('users').doc(userId).collection('notifications').add({
                ...notificationData,
                read: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Update unread count
            await db.collection('users').doc(userId).update({
                unreadNotifications: firebase.firestore.FieldValue.increment(1)
            });
            
            // Show in-app notification if user is online
            if (Auth.currentUser?.uid === userId) {
                Notifications.showInAppNotification(notificationData);
            }
            
        } catch (error) {
            console.error('Error sending notification:', error);
        }
    },
    
    // Show in-app notification
    showInAppNotification: (notificationData) => {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toast-message');
        
        if (toast && toastMessage) {
            let message = '';
            
            switch (notificationData.type) {
                case 'message':
                    message = 'New message received';
                    break;
                case 'friend_request':
                    message = 'New friend request';
                    break;
                case 'friend_accepted':
                    message = 'Friend request accepted';
                    break;
                case 'match':
                    message = 'New match found';
                    break;
                default:
                    message = notificationData.message || 'New notification';
            }
            
            toastMessage.textContent = message;
            toast.classList.remove('hidden');
            
            setTimeout(() => {
                toast.classList.add('hidden');
            }, 3000);
        }
    },
    
    // Get notifications for current user
    getNotifications: async () => {
        if (!Auth.currentUser) return [];
        
        const db = FirebaseService.getDb();
        const userId = Auth.currentUser.uid;
        
        try {
            const snapshot = await db.collection('users').doc(userId)
                .collection('notifications')
                .orderBy('createdAt', 'desc')
                .limit(50)
                .get();
            
            const notifications = [];
            
            snapshot.forEach(doc => {
                notifications.push({ id: doc.id, ...doc.data() });
            });
            
            return notifications;
            
        } catch (error) {
            console.error('Error getting notifications:', error);
            return [];
        }
    },
    
    // Mark notification as read
    markAsRead: async (notificationId) => {
        if (!Auth.currentUser) return;
        
        const db = FirebaseService.getDb();
        const userId = Auth.currentUser.uid;
        
        try {
            await db.collection('users').doc(userId)
                .collection('notifications').doc(notificationId).update({
                read: true,
                readAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            await db.collection('users').doc(userId).update({
                unreadNotifications: firebase.firestore.FieldValue.increment(-1)
            });
            
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    },
    
    // Mark all notifications as read
    markAllAsRead: async () => {
        if (!Auth.currentUser) return;
        
        const db = FirebaseService.getDb();
        const userId = Auth.currentUser.uid;
        
        try {
            const snapshot = await db.collection('users').doc(userId)
                .collection('notifications')
                .where('read', '==', false)
                .get();
            
            const batch = db.batch();
            
            snapshot.forEach(doc => {
                batch.update(doc.ref, {
                    read: true,
                    readAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
            
            await batch.commit();
            
            await db.collection('users').doc(userId).update({
                unreadNotifications: 0
            });
            
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    },
    
    // Delete notification
    deleteNotification: async (notificationId) => {
        if (!Auth.currentUser) return;
        
        const db = FirebaseService.getDb();
        const userId = Auth.currentUser.uid;
        
        try {
            const doc = await db.collection('users').doc(userId)
                .collection('notifications').doc(notificationId).get();
            
            if (doc.exists && !doc.data().read) {
                await db.collection('users').doc(userId).update({
                    unreadNotifications: firebase.firestore.FieldValue.increment(-1)
                });
            }
            
            await db.collection('users').doc(userId)
                .collection('notifications').doc(notificationId).delete();
            
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    },
    
    // Get unread count
    getUnreadCount: async () => {
        if (!Auth.currentUser) return 0;
        
        const db = FirebaseService.getDb();
        const userId = Auth.currentUser.uid;
        
        try {
            const doc = await db.collection('users').doc(userId).get();
            const userData = doc.data();
            return userData?.unreadNotifications || 0;
        } catch (error) {
            console.error('Error getting unread count:', error);
            return 0;
        }
    }
};

// Initialize notifications when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', Notifications.init);
} else {
    Notifications.init();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Notifications;
}
