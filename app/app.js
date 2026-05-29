// Main App Controller for Bondly

const App = {
    currentScreen: 'home',
    previousScreen: null,
    
    // Initialize app
    init: () => {
        console.log('Bondly app initializing...');
        
        // Show demo banner if Firebase not configured
        if (FirebaseService.isDemoMode()) {
            document.getElementById('demo-banner').classList.remove('hidden');
        }
        
        // Setup navigation
        App.setupNavigation();
        
        // Setup screen transitions
        App.setupScreenTransitions();
        
        // Setup back buttons
        App.setupBackButtons();
        
        // Load settings
        App.loadSettings();
        
        console.log('Bondly app initialized');
    },
    
    // Setup navigation
    setupNavigation: () => {
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const screen = item.dataset.screen;
                App.navigateTo(screen);
            });
        });
    },
    
    // Setup screen transitions
    setupScreenTransitions: () => {
        // Add transition classes for smooth screen changes
        const screens = document.querySelectorAll('.content-screen');
        screens.forEach(screen => {
            screen.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        });
    },
    
    // Setup back buttons
    setupBackButtons: () => {
        // Chat back button
        document.getElementById('chat-back-btn')?.addEventListener('click', () => {
            App.closeChat();
        });
        
        // Settings back button
        document.getElementById('settings-back-btn')?.addEventListener('click', () => {
            App.closeSettings();
        });
        
        // Edit profile back button
        document.getElementById('edit-profile-back-btn')?.addEventListener('click', () => {
            App.closeEditProfile();
        });
        
        // User profile back button
        document.getElementById('user-profile-back-btn')?.addEventListener('click', () => {
            App.closeUserProfile();
        });
        
        // Notification settings back button
        document.getElementById('notification-settings-back-btn')?.addEventListener('click', () => {
            App.closeNotificationSettings();
        });
    },
    
    // Navigate to screen
    navigateTo: (screen) => {
        if (screen === App.currentScreen) return;
        
        App.previousScreen = App.currentScreen;
        App.currentScreen = screen;
        
        // Update nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.screen === screen) {
                item.classList.add('active');
            }
        });
        
        // Update screens
        document.querySelectorAll('.content-screen').forEach(s => {
            s.classList.remove('active');
            s.classList.add('hidden');
        });
        
        const targetScreen = document.getElementById(`${screen}-screen`);
        if (targetScreen) {
            targetScreen.classList.remove('hidden');
            targetScreen.classList.add('active');
            
            // Trigger screen-specific initialization
            App.initScreen(screen);
        }
        
        // Haptic feedback
        Mobile.hapticFeedback('light');
    },
    
    // Initialize screen-specific functionality
    initScreen: (screen) => {
        switch (screen) {
            case 'home':
                Home.refresh();
                break;
            case 'discover':
                Discover.refresh();
                break;
            case 'chats':
                Chats.refresh();
                break;
            case 'friends':
                Friends.refresh();
                break;
            case 'profile':
                Profile.refresh();
                break;
        }
    },
    
    // Open chat screen
    openChat: (userId, userName, userAvatar) => {
        Messaging.currentChatUser = {
            uid: userId,
            displayName: userName,
            avatar: userAvatar
        };
        
        // Update chat header
        document.getElementById('chat-user-name').textContent = userName;
        document.getElementById('chat-user-avatar').src = userAvatar;
        
        // Show chat screen
        document.getElementById('chat-screen').classList.remove('hidden');
        document.getElementById('chat-screen').classList.add('active');
        
        // Load messages
        Messaging.loadMessages(userId);
        
        // Mark messages as read
        Messaging.markAsRead(userId);
    },
    
    // Close chat screen
    closeChat: () => {
        document.getElementById('chat-screen').classList.remove('active');
        document.getElementById('chat-screen').classList.add('hidden');
        
        Messaging.currentChatUser = null;
    },
    
    // Open settings screen
    openSettings: () => {
        document.getElementById('settings-screen').classList.remove('hidden');
        document.getElementById('settings-screen').classList.add('active');
        
        Settings.load();
    },
    
    // Close settings screen
    closeSettings: () => {
        document.getElementById('settings-screen').classList.remove('active');
        document.getElementById('settings-screen').classList.add('hidden');
    },
    
    // Open edit profile screen
    openEditProfile: () => {
        document.getElementById('edit-profile-screen').classList.remove('hidden');
        document.getElementById('edit-profile-screen').classList.add('active');
        
        Profile.loadEditForm();
    },
    
    // Close edit profile screen
    closeEditProfile: () => {
        document.getElementById('edit-profile-screen').classList.remove('active');
        document.getElementById('edit-profile-screen').classList.add('hidden');
    },
    
    // Open user profile screen
    openUserProfile: (userId) => {
        document.getElementById('user-profile-screen').classList.remove('hidden');
        document.getElementById('user-profile-screen').classList.add('active');
        
        Profile.loadUserProfile(userId);
    },
    
    // Close user profile screen
    closeUserProfile: () => {
        document.getElementById('user-profile-screen').classList.remove('active');
        document.getElementById('user-profile-screen').classList.add('hidden');
    },
    
    // Open notification settings screen
    openNotificationSettings: () => {
        document.getElementById('notification-settings-screen').classList.remove('hidden');
        document.getElementById('notification-settings-screen').classList.add('active');
        
        // Load notification settings
        const settings = Utils.storage.get('notificationSettings') || {
            messages: true,
            friendRequests: true,
            matches: true,
            achievements: true,
            push: true,
            sound: true
        };
        
        document.getElementById('notify-messages').checked = settings.messages;
        document.getElementById('notify-friend-requests').checked = settings.friendRequests;
        document.getElementById('notify-matches').checked = settings.matches;
        document.getElementById('notify-achievements').checked = settings.achievements;
        document.getElementById('notify-push').checked = settings.push;
        document.getElementById('notify-sound').checked = settings.sound;
    },
    
    // Close notification settings screen
    closeNotificationSettings: () => {
        document.getElementById('notification-settings-screen').classList.remove('active');
        document.getElementById('notification-settings-screen').classList.add('hidden');
    },
    
    // Load settings
    loadSettings: () => {
        const darkMode = Utils.storage.get('darkMode');
        const deepMode = Utils.storage.get('deepMode');
        const notifications = Utils.storage.get('notifications');
        const onlineStatus = Utils.storage.get('onlineStatus');
        
        if (darkMode) {
            document.body.classList.add('dark-mode');
            document.getElementById('dark-mode-toggle').checked = true;
        }
        
        if (deepMode) {
            document.getElementById('deep-mode-toggle').checked = true;
        }
        
        if (notifications !== false) {
            document.getElementById('notifications-toggle').checked = true;
        }
        
        if (onlineStatus !== false) {
            document.getElementById('online-status-toggle').checked = true;
        }
        
        // Setup settings event listeners
        App.setupSettingsListeners();
    },
    
    // Setup settings listeners
    setupSettingsListeners: () => {
        // Dark mode toggle
        document.getElementById('dark-mode-toggle')?.addEventListener('change', (e) => {
            const enabled = e.target.checked;
            document.body.classList.toggle('dark-mode', enabled);
            Utils.storage.set('darkMode', enabled);
        });
        
        // Deep mode toggle
        document.getElementById('deep-mode-toggle')?.addEventListener('change', async (e) => {
            const enabled = e.target.checked;
            Utils.storage.set('deepMode', enabled);
            
            // Update in Firestore
            if (Auth.currentUser) {
                const db = FirebaseService.getDb();
                await db.collection('users').doc(Auth.currentUser.uid).update({
                    deepMode: enabled
                });
            }
        });
        
        // Notifications toggle
        document.getElementById('notifications-toggle')?.addEventListener('change', (e) => {
            const enabled = e.target.checked;
            Utils.storage.set('notifications', enabled);
        });
        
        // Online status toggle
        document.getElementById('online-status-toggle')?.addEventListener('change', async (e) => {
            const enabled = e.target.checked;
            Utils.storage.set('onlineStatus', enabled);
            
            // Update in Firestore
            if (Auth.currentUser) {
                const db = FirebaseService.getDb();
                await db.collection('users').doc(Auth.currentUser.uid).update({
                    online: enabled
                });
            }
        });
        
        // Settings navigation
        document.getElementById('privacy-settings')?.addEventListener('click', () => {
            Utils.showToast('Privacy settings coming soon');
        });
        
        document.getElementById('blocked-users')?.addEventListener('click', () => {
            Safety.showBlockedUsers();
        });
        
        document.getElementById('language-settings')?.addEventListener('click', () => {
            Utils.showToast('Language preferences coming soon');
        });
        
        document.getElementById('notification-settings')?.addEventListener('click', () => {
            App.openNotificationSettings();
        });
        
        document.getElementById('chat-themes')?.addEventListener('click', () => {
            Utils.showToast('Chat themes coming soon');
        });
        
        document.getElementById('achievements-settings')?.addEventListener('click', () => {
            Achievements.showAchievements();
        });
        
        // Edit profile button
        document.getElementById('edit-profile-btn')?.addEventListener('click', () => {
            App.openEditProfile();
        });
        
        // Settings button
        document.getElementById('settings-btn')?.addEventListener('click', () => {
            App.openSettings();
        });
        
        // Notification settings save
        const notifyToggles = ['notify-messages', 'notify-friend-requests', 'notify-matches', 'notify-achievements', 'notify-push', 'notify-sound'];
        notifyToggles.forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => {
                const settings = {
                    messages: document.getElementById('notify-messages').checked,
                    friendRequests: document.getElementById('notify-friend-requests').checked,
                    matches: document.getElementById('notify-matches').checked,
                    achievements: document.getElementById('notify-achievements').checked,
                    push: document.getElementById('notify-push').checked,
                    sound: document.getElementById('notify-sound').checked
                };
                Utils.storage.set('notificationSettings', settings);
            });
        });
        
        // Mark all as read button
        document.getElementById('mark-all-read-btn')?.addEventListener('click', () => {
            NotificationCenter.markAllAsRead();
        });
    },
    
    // Show toast notification
    showToast: (message, duration = 3000) => {
        Utils.showToast(message, duration);
    },
    
    // Show loading
    showLoading: (message = 'Loading...') => {
        Utils.showLoading(message);
    },
    
    // Hide loading
    hideLoading: () => {
        Utils.hideLoading();
    }
};

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', App.init);
} else {
    App.init();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = App;
}
