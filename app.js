// Main App Controller for Bondly

const App = {
    currentScreen: null,
    previousScreen: null,
    
    // Initialize app
    init: () => {
        // Setup navigation using event delegation
        App.setupNavigation();

        // Setup screen transitions
        App.setupScreenTransitions();

        // Setup back buttons
        App.setupBackButtons();

        // Load settings
        App.loadSettings();

        // Setup Android back button handling
        App.setupAndroidBackButton();

        App.navigateTo('home');
    },
    
    // Setup navigation using event delegation
    setupNavigation: () => {
        // Use event delegation on the document to handle nav clicks
        // This works even if elements don't exist at init time
        document.addEventListener('click', (e) => {
            const navItem = e.target.closest('.nav-item');
            if (navItem) {
                e.preventDefault();
                const screen = navItem.dataset.screen;
                if (screen) {
                    App.navigateTo(screen);
                }
            }
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

        // Profile back button
        document.getElementById('profile-back-btn')?.addEventListener('click', () => {
            App.navigateTo(App.previousScreen || 'home');
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
    openChat: async (userId, userName, userAvatar) => {
        if (!Auth.currentUser) return;
        if (!FirebaseService.isInitialized()) return;

        const db = FirebaseService.getDb();
        const currentUserId = Auth.currentUser.uid;

        try {
            // Check if users are blocked
            const blockedSnapshot = await db.collection('blockedUsers')
                .where('blocker', '==', currentUserId)
                .where('blocked', '==', userId)
                .get();

            if (!blockedSnapshot.empty) {
                console.log('[Bondly] Messaging prevented for blocked user');
                Utils.showToast('You have blocked this user');
                return;
            }

            const reverseBlockedSnapshot = await db.collection('blockedUsers')
                .where('blocker', '==', userId)
                .where('blocked', '==', currentUserId)
                .get();

            if (!reverseBlockedSnapshot.empty) {
                console.log('[Bondly] Messaging prevented for blocked user');
                Utils.showToast('This user has blocked you');
                return;
            }

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

// IMPORTANT: setup buttons after chat opens
setTimeout(() => {
    Messaging.setupMessageInput();
}, 100);

// Mark messages as read
Messaging.markAsRead(userId);
        } catch (error) {
            console.error('Error checking block status:', error);
            // Allow chat to open if check fails
            Messaging.currentChatUser = {
                uid: userId,
                displayName: userName,
                avatar: userAvatar
            };

            document.getElementById('chat-user-name').textContent = userName;
            document.getElementById('chat-user-avatar').src = userAvatar;

            document.getElementById('chat-screen').classList.remove('hidden');
            document.getElementById('chat-screen').classList.add('active');

            Messaging.loadMessages(userId);

            setTimeout(() => {
                Messaging.setupMessageInput();
            }, 100);

            Messaging.markAsRead(userId);
        }
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
    },

    // Setup Android back button handling
    setupAndroidBackButton: () => {
        // Handle browser back button / Android back button
        window.addEventListener('popstate', (event) => {
            // Check if we're on an inner screen that should go back
            const chatScreen = document.getElementById('chat-screen');
            const settingsScreen = document.getElementById('settings-screen');
            const editProfileScreen = document.getElementById('edit-profile-screen');
            const userProfileScreen = document.getElementById('user-profile-screen');
            const notificationSettingsScreen = document.getElementById('notification-settings-screen');

            // If any inner screen is active, go back instead of exiting
            if (!chatScreen.classList.contains('hidden')) {
                App.closeChat();
                event.preventDefault();
                history.pushState(null, null, location.href);
            } else if (!settingsScreen.classList.contains('hidden')) {
                App.closeSettings();
                event.preventDefault();
                history.pushState(null, null, location.href);
            } else if (!editProfileScreen.classList.contains('hidden')) {
                App.closeEditProfile();
                event.preventDefault();
                history.pushState(null, null, location.href);
            } else if (!userProfileScreen.classList.contains('hidden')) {
                App.closeUserProfile();
                event.preventDefault();
                history.pushState(null, null, location.href);
            } else if (!notificationSettingsScreen.classList.contains('hidden')) {
                App.closeNotificationSettings();
                event.preventDefault();
                history.pushState(null, null, location.href);
            } else if (App.currentScreen !== 'home') {
                // If on a different main screen, go to home
                App.navigateTo('home');
                event.preventDefault();
                history.pushState(null, null, location.href);
            }
        });

        // Push initial state to history
        history.pushState(null, null, location.href);
    }
};

// Initialize app when DOM is ready
window.addEventListener('load', () => {
    console.log('App initializing...');
    App.init();
});

// Register service worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('[Bondly] Service Worker registered:', registration.scope);
            })
            .catch((error) => {
                console.log('[Bondly] Service Worker registration failed:', error);
            });
    });
}

// PWA Install Prompt Logic
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();

    // Stash the event so it can be triggered later
    deferredPrompt = e;

    // Check if already installed
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;

    if (!isInstalled) {
        console.log('[Bondly] PWA install prompt available');

        // Show install prompt after a delay
        setTimeout(() => {
            App.showInstallPrompt();
        }, 3000);
    }
});

// Show install prompt
App.showInstallPrompt = () => {
    if (!deferredPrompt) return;

    const installModal = document.createElement('div');
    installModal.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--white);
        border-radius: var(--radius-lg);
        padding: var(--spacing-lg);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        max-width: 90vw;
        width: 320px;
        text-align: center;
    `;

    installModal.innerHTML = `
        <div style="margin-bottom: var(--spacing-md);">
            <div style="font-size: 2rem; margin-bottom: var(--spacing-sm);">💙🌍</div>
            <h3 style="margin-bottom: var(--spacing-xs);">Install Bondly</h3>
            <p style="color: var(--gray-500); font-size: 0.875rem;">Get faster access like a real app</p>
        </div>
        <div style="display: flex; gap: var(--spacing-sm);">
            <button id="install-dismiss" style="flex: 1; background: var(--gray-200); border: none; padding: var(--spacing-sm) var(--spacing-md); border-radius: var(--radius-md); cursor: pointer; font-size: 0.875rem;">Later</button>
            <button id="install-accept" style="flex: 1; background: var(--soft-blue); color: var(--white); border: none; padding: var(--spacing-sm) var(--spacing-md); border-radius: var(--radius-md); cursor: pointer; font-size: 0.875rem;">Install</button>
        </div>
    `;

    document.body.appendChild(installModal);

    document.getElementById('install-accept').addEventListener('click', async () => {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('[Bondly] App installed');
        }

        deferredPrompt = null;
        installModal.remove();
    });

    document.getElementById('install-dismiss').addEventListener('click', () => {
        installModal.remove();
    });
};

// Hide install prompt if already installed
window.addEventListener('appinstalled', () => {
    console.log('[Bondly] App installed');
    deferredPrompt = null;
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = App;
}
