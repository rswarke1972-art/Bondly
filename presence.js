// Presence Module for Bondly - Online/Offline Tracking

const Presence = {
    presenceRef: null,
    awayTimeout: null,
    isAway: false,
    
    // Initialize presence tracking
    init: () => {
        if (!Auth.currentUser) return;
        if (!FirebaseService.isInitialized()) return;
        
        Presence.setupPresenceListeners();
        Presence.setupIdleDetection();
    },
    
    // Setup presence listeners for other users
    setupPresenceListeners: () => {
        if (!Auth.currentUser) return;
        if (!FirebaseService.isInitialized()) return;
        
        const rtdb = FirebaseService.getRtdb();
        const userId = Auth.currentUser.uid;
        
        // Set own presence
        Presence.setPresence(userId, 'online');
        
        // Handle page visibility
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                Presence.setAway();
            } else {
                Presence.setOnline();
            }
        });
        
        // Handle page unload
        window.addEventListener('beforeunload', () => {
            Presence.setOffline();
        });
    },
    
    // Setup idle detection
    setupIdleDetection: () => {
        let idleTime = 0;
        
        // Reset idle timer on user activity
        const resetIdle = () => {
            idleTime = 0;
            if (Presence.isAway) {
                Presence.setOnline();
            }
        };
        
        // Track user activity
        document.addEventListener('mousemove', resetIdle);
        document.addEventListener('keypress', resetIdle);
        document.addEventListener('click', resetIdle);
        document.addEventListener('scroll', resetIdle);
        document.addEventListener('touchstart', resetIdle);
        
        // Check idle status every minute
        setInterval(() => {
            idleTime++;
            
            // If idle for 5 minutes, set to away
            if (idleTime >= 5 && !Presence.isAway) {
                Presence.setAway();
            }
        }, 60000); // Check every minute
    },
    
    // Set presence status
    setPresence: (userId, status) => {
        if (!FirebaseService.isInitialized()) return;
        
        const rtdb = FirebaseService.getRtdb();
        const presenceRef = rtdb.ref(`users/${userId}/presence`);
        const connectedRef = rtdb.ref('.info/connected');
        
        const payload = {
            state: status,
            online: status === 'online',
            away: status === 'away',
            lastSeen: firebase.database.ServerValue.TIMESTAMP
        };

        connectedRef.once('value').then((snapshot) => {
            if (snapshot.val() === true) {
                presenceRef.onDisconnect().set({
                    state: 'offline',
                    online: false,
                    away: false,
                    lastSeen: firebase.database.ServerValue.TIMESTAMP
                });
            }
            return presenceRef.set(payload);
        }).catch((error) => {
            console.error('[Bondly] Presence update failed:', error);
        });
    },
    
    // Set user as online
    setOnline: () => {
        if (!Auth.currentUser) return;
        
        Presence.isAway = false;
        Presence.setPresence(Auth.currentUser.uid, 'online');
        
        // Also update Firestore
        if (FirebaseService.isInitialized()) {
            const db = FirebaseService.getDb();
            db.collection('users').doc(Auth.currentUser.uid).update({
                online: true,
                lastActive: firebase.firestore.FieldValue.serverTimestamp()
            }).catch(error => {
                console.error('Error updating online status:', error);
            });
        }
    },
    
    // Set user as away
    setAway: () => {
        if (!Auth.currentUser) return;
        
        Presence.isAway = true;
        Presence.setPresence(Auth.currentUser.uid, 'away');
        
        // Also update Firestore
        if (FirebaseService.isInitialized()) {
            const db = FirebaseService.getDb();
            db.collection('users').doc(Auth.currentUser.uid).update({
                online: false,
                lastActive: firebase.firestore.FieldValue.serverTimestamp()
            }).catch(error => {
                console.error('Error updating away status:', error);
            });
        }
    },
    
    // Set user as offline
    setOffline: () => {
        if (!Auth.currentUser) return;
        
        Presence.setPresence(Auth.currentUser.uid, 'offline');
        
        // Also update Firestore
        if (FirebaseService.isInitialized()) {
            const db = FirebaseService.getDb();
            db.collection('users').doc(Auth.currentUser.uid).update({
                online: false,
                lastActive: firebase.firestore.FieldValue.serverTimestamp()
            }).catch(error => {
                console.error('Error updating offline status:', error);
            });
        }
    },
    
    // Listen to a user's presence
    listenToUserPresence: (userId, callback) => {
        if (!FirebaseService.isInitialized()) return;
        
        const rtdb = FirebaseService.getRtdb();
        const presenceRef = rtdb.ref(`users/${userId}/presence`);
        
        presenceRef.on('value', (snapshot) => {
            const presence = snapshot.val();
            callback(presence);
        });
        
        // Return unsubscribe function
        return () => presenceRef.off();
    },
    
    // Get user presence status
    getUserPresence: async (userId) => {
        if (!FirebaseService.isInitialized()) return null;
        
        const rtdb = FirebaseService.getRtdb();
        const presenceRef = rtdb.ref(`users/${userId}/presence`);
        
        const snapshot = await presenceRef.once('value');
        return snapshot.val();
    },
    
    // Cleanup
    cleanup: () => {
        if (Presence.awayTimeout) {
            clearTimeout(Presence.awayTimeout);
        }
        Presence.setOffline();
    }
};

// Initialize presence when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', Presence.init);
} else {
    Presence.init();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Presence;
}
