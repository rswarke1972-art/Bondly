// Settings Module for Bondly

const Settings = {
    // Load settings
    load: () => {
        Settings.loadDarkMode();
        Settings.loadDeepMode();
        Settings.loadNotificationSettings();
        Settings.loadPrivacySettings();
        
        // Show current user's email privately in Settings
        if (typeof Auth !== 'undefined' && Auth.currentUser) {
            const emailElement = document.getElementById('settings-user-email');
            if (emailElement) {
                emailElement.textContent = Auth.currentUser.email || '';
            }
        }
    },
    
    // Load dark mode setting
    loadDarkMode: async () => {
        const darkMode = Utils.storage.get('darkMode');
        const toggle = document.getElementById('dark-mode-toggle');

        // Load from Firebase if available
        if (Auth.currentUser && FirebaseService.isInitialized()) {
            try {
                const db = FirebaseService.getDb();
                const doc = await db.collection('users').doc(Auth.currentUser.uid).get();
                const userData = doc.data();

                if (userData?.darkMode !== undefined) {
                    if (toggle) {
                        toggle.checked = userData.darkMode;
                    }
                    document.body.classList.toggle('dark-mode', userData.darkMode);
                    Utils.storage.set('darkMode', userData.darkMode);
                } else {
                    if (toggle) {
                        toggle.checked = darkMode || false;
                    }
                    document.body.classList.toggle('dark-mode', darkMode);
                }
            } catch (error) {
                console.error('[Bondly] Error loading dark mode:', error);
                if (toggle) {
                    toggle.checked = darkMode || false;
                }
                document.body.classList.toggle('dark-mode', darkMode);
            }
        } else {
            if (toggle) {
                toggle.checked = darkMode || false;
            }
            document.body.classList.toggle('dark-mode', darkMode);
        }
    },
    
    // Load deep mode setting
    loadDeepMode: async () => {
        const deepMode = Utils.storage.get('deepMode');
        const toggle = document.getElementById('deep-mode-toggle');
        
        if (toggle) {
            toggle.checked = deepMode || false;
        }
        
        // Also load from Firestore if available
        if (Auth.currentUser && FirebaseService.isInitialized()) {
            try {
                const db = FirebaseService.getDb();
                const doc = await db.collection('users').doc(Auth.currentUser.uid).get();
                const userData = doc.data();
                
                if (userData?.deepMode !== undefined) {
                    if (toggle) {
                        toggle.checked = userData.deepMode;
                    }
                    Utils.storage.set('deepMode', userData.deepMode);
                }
            } catch (error) {
                console.error('Error loading deep mode:', error);
            }
        }
    },
    
    // Load notification settings
    loadNotificationSettings: async () => {
        const notifications = Utils.storage.get('notifications');
        const toggle = document.getElementById('notifications-toggle');

        // Load from Firebase if available
        if (Auth.currentUser && FirebaseService.isInitialized()) {
            try {
                const db = FirebaseService.getDb();
                const doc = await db.collection('users').doc(Auth.currentUser.uid).get();
                const userData = doc.data();

                if (userData?.notificationSettings) {
                    const settings = userData.notificationSettings;
                    if (toggle) {
                        toggle.checked = settings.messages !== false;
                    }
                    Utils.storage.set('notifications', settings.messages !== false);
                } else {
                    if (toggle) {
                        toggle.checked = notifications !== false;
                    }
                }
            } catch (error) {
                console.error('[Bondly] Error loading notification settings:', error);
                if (toggle) {
                    toggle.checked = notifications !== false;
                }
            }
        } else {
            if (toggle) {
                toggle.checked = notifications !== false;
            }
        }
    },
    
    // Load privacy settings
    loadPrivacySettings: async () => {
        if (!Auth.currentUser || !FirebaseService.isInitialized()) return;
        
        const db = FirebaseService.getDb();
        
        try {
            const doc = await db.collection('users').doc(Auth.currentUser.uid).get();
            const userData = doc.data();
            
            // Load various privacy settings
            const settings = {
                showOnlineStatus: userData?.showOnlineStatus ?? true,
                allowMessagesFromNonFriends: userData?.allowMessagesFromNonFriends ?? false,
                showInDiscover: userData?.showInDiscover ?? true,
                allowSearch: userData?.allowSearch ?? true
            };
            
            Utils.storage.set('privacy', settings);
            
        } catch (error) {
            console.error('Error loading privacy settings:', error);
        }
    },
    
    // Save dark mode
    saveDarkMode: async (enabled) => {
        document.body.classList.toggle('dark-mode', enabled);
        Utils.storage.set('darkMode', enabled);

        if (enabled) {
            console.log('[Bondly] Dark mode applied');
        }

        // Persist to Firebase
        if (Auth.currentUser && FirebaseService.isInitialized()) {
            try {
                const db = FirebaseService.getDb();
                await db.collection('users').doc(Auth.currentUser.uid).update({
                    darkMode: enabled
                });
                console.log('[Bondly] Settings saved: dark mode');
            } catch (error) {
                console.error('[Bondly] Error saving dark mode to Firebase:', error);
            }
        }
    },
    
    // Save deep mode
    saveDeepMode: async (enabled) => {
        Utils.storage.set('deepMode', enabled);
        
        if (Auth.currentUser && FirebaseService.isInitialized()) {
            try {
                const db = FirebaseService.getDb();
                await db.collection('users').doc(Auth.currentUser.uid).update({
                    deepMode: enabled
                });
            } catch (error) {
                console.error('Error saving deep mode:', error);
            }
        }
    },
    
    // Save notification settings
    saveNotificationSettings: async (enabled) => {
        Utils.storage.set('notifications', enabled);

        if (enabled) {
            await Notifications.requestPermission();
        }

        // Persist to Firebase
        if (Auth.currentUser && FirebaseService.isInitialized()) {
            try {
                const db = FirebaseService.getDb();
                await db.collection('users').doc(Auth.currentUser.uid).update({
                    notificationSettings: {
                        messages: enabled,
                        friendRequests: enabled,
                        reactions: enabled
                    }
                });
                console.log('[Bondly] Settings saved: notifications');
            } catch (error) {
                console.error('[Bondly] Error saving notification settings to Firebase:', error);
            }
        }
    },
    
    // Save privacy setting
    savePrivacySetting: async (setting, value) => {
        if (!Auth.currentUser || !FirebaseService.isInitialized()) return;
        
        const db = FirebaseService.getDb();
        
        try {
            await db.collection('users').doc(Auth.currentUser.uid).update({
                [setting]: value
            });
            
            const privacy = Utils.storage.get('privacy') || {};
            privacy[setting] = value;
            Utils.storage.set('privacy', privacy);
            
        } catch (error) {
            console.error('Error saving privacy setting:', error);
        }
    },
    
    // Show privacy settings modal
    showPrivacySettings: () => {
        const privacy = Utils.storage.get('privacy') || {
            showOnlineStatus: true,
            allowMessagesFromNonFriends: false,
            showInDiscover: true,
            allowSearch: true
        };
        
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
            padding: var(--spacing-lg);
        `;
        
        modal.innerHTML = `
            <div style="background: var(--white); padding: var(--spacing-lg); border-radius: var(--radius-lg); max-width: 400px; width: 100%;">
                <h2 style="margin-bottom: var(--spacing-lg);">Privacy Settings</h2>
                
                <div style="margin-bottom: var(--spacing-md);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-md);">
                        <span>Show online status</span>
                        <label class="toggle">
                            <input type="checkbox" id="privacy-online" ${privacy.showOnlineStatus ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-md);">
                        <span>Allow messages from non-friends</span>
                        <label class="toggle">
                            <input type="checkbox" id="privacy-messages" ${privacy.allowMessagesFromNonFriends ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-md);">
                        <span>Show in discover</span>
                        <label class="toggle">
                            <input type="checkbox" id="privacy-discover" ${privacy.showInDiscover ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-md);">
                        <span>Allow people to search for me</span>
                        <label class="toggle">
                            <input type="checkbox" id="privacy-search" ${privacy.allowSearch ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                </div>
                
                <div style="display: flex; gap: var(--spacing-sm);">
                    <button onclick="this.parentElement.parentElement.parentElement.remove();" style="flex: 1; background: var(--gray-200); border: none; padding: var(--spacing-md); border-radius: var(--radius-md); cursor: pointer;">Cancel</button>
                    <button onclick="
                        Settings.savePrivacySetting('showOnlineStatus', document.getElementById('privacy-online').checked);
                        Settings.savePrivacySetting('allowMessagesFromNonFriends', document.getElementById('privacy-messages').checked);
                        Settings.savePrivacySetting('showInDiscover', document.getElementById('privacy-discover').checked);
                        Settings.savePrivacySetting('allowSearch', document.getElementById('privacy-search').checked);
                        Utils.showToast('Privacy settings saved');
                        this.parentElement.parentElement.parentElement.remove();
                    " style="flex: 1; background: var(--soft-blue); color: var(--white); border: none; padding: var(--spacing-md); border-radius: var(--radius-md); cursor: pointer;">Save</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    },
    
    // Show chat themes
    showChatThemes: () => {
        const themes = [
            { name: 'Default', colors: { primary: '#7BAFD4', secondary: '#F8F4EE' } },
            { name: 'Ocean', colors: { primary: '#4A90E2', secondary: '#E8F4F8' } },
            { name: 'Forest', colors: { primary: '#7CB8A6', secondary: '#F0F8F4' } },
            { name: 'Sunset', colors: { primary: '#D8B97A', secondary: '#FFF8F0' } },
            { name: 'Lavender', colors: { primary: '#C2B5E2', secondary: '#F8F4FC' } },
            { name: 'Midnight', colors: { primary: '#324D6E', secondary: '#1A1F2E' } }
        ];
        
        const currentTheme = Utils.storage.get('chatTheme') || 'Default';
        
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
            padding: var(--spacing-lg);
        `;
        
        modal.innerHTML = `
            <div style="background: var(--white); padding: var(--spacing-lg); border-radius: var(--radius-lg); max-width: 400px; width: 100%;">
                <h2 style="margin-bottom: var(--spacing-lg);">Chat Themes</h2>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--spacing-md); margin-bottom: var(--spacing-lg);">
                    ${themes.map(theme => `
                        <div onclick="
                            Utils.storage.set('chatTheme', '${theme.name}');
                            Utils.showToast('Theme: ${theme.name}');
                            this.parentElement.parentElement.parentElement.remove();
                        " style="padding: var(--spacing-md); border: 2px solid ${currentTheme === theme.name ? 'var(--soft-blue)' : 'var(--gray-200)'}; border-radius: var(--radius-md); cursor: pointer; text-align: center;">
                            <div style="width: 40px; height: 40px; background: ${theme.colors.primary}; border-radius: 50%; margin: 0 auto var(--spacing-sm);"></div>
                            <div style="font-weight: 600;">${theme.name}</div>
                        </div>
                    `).join('')}
                </div>
                
                <button onclick="this.parentElement.parentElement.remove();" style="width: 100%; background: var(--gray-200); border: none; padding: var(--spacing-md); border-radius: var(--radius-md); cursor: pointer;">Cancel</button>
            </div>
        `;
        
        document.body.appendChild(modal);
    },
    
    // Clear app data
    clearAppData: () => {
        if (!confirm('This will clear all local data. Are you sure?')) return;
        
        Utils.storage.clear();
        Utils.showToast('App data cleared');
        
        // Reload page
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Settings;
}
