// Authentication Module for Bondly

const Auth = {
    currentUser: null,
    authProvider: null,
    
    // Initialize authentication
    init: () => {
        if (!FirebaseService.isInitialized()) {
            console.warn('Firebase not initialized - running in demo mode');
            Auth.setupEventListeners();
            return;
        }
        
        const auth = FirebaseService.getAuth();
        
        // Listen for auth state changes
        auth.onAuthStateChanged((user) => {
            if (user) {
                Auth.currentUser = user;
                Auth.onSignIn(user);
            } else {
                Auth.currentUser = null;
                Auth.onSignOut();
            }
        });
        
        // Setup auth event listeners
        Auth.setupEventListeners();
    },
    
    // Setup event listeners
    setupEventListeners: () => {
        // Switch between login and signup forms
        document.getElementById('switch-to-signup')?.addEventListener('click', (e) => {
            e.preventDefault();
            Auth.switchForm('signup');
        });
        
        document.getElementById('switch-to-login')?.addEventListener('click', (e) => {
            e.preventDefault();
            Auth.switchForm('login');
        });
        
        // Email login form
        document.getElementById('login-email-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            Auth.handleEmailLogin();
        });
        
        // Email signup form
        document.getElementById('signup-email-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            Auth.handleEmailSignup();
        });
        
        // Google login
        document.getElementById('google-login-btn')?.addEventListener('click', () => {
            Auth.handleGoogleLogin();
        });
        
        // Google signup
        document.getElementById('google-signup-btn')?.addEventListener('click', () => {
            Auth.handleGoogleLogin();
        });
        
        // Logout
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            Auth.handleLogout();
        });
        
        // Forgot password
        document.getElementById('forgot-password-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            Auth.handleForgotPassword();
        });
    },
    
    // Switch between login and signup forms
    switchForm: (form) => {
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        
        if (form === 'signup') {
            loginForm.classList.remove('active');
            signupForm.classList.add('active');
        } else {
            signupForm.classList.remove('active');
            loginForm.classList.add('active');
        }
    },
    
    // Handle email login
    handleEmailLogin: async () => {
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        
        if (!email || !password) {
            Utils.showToast('Please fill in all fields');
            return;
        }
        
        if (!Utils.isValidEmail(email)) {
            Utils.showToast('Please enter a valid email');
            return;
        }
        
        Utils.showLoading('Signing in...');
        
        try {
            const auth = FirebaseService.getAuth();
            await auth.signInWithEmailAndPassword(email, password);
            Utils.showToast('Welcome back!');
        } catch (error) {
            console.error('[Bondly Login Failure]:', error);
            Utils.showToast(Auth.getErrorMessage(error));
        } finally {
            Utils.hideLoading();
        }
    },
    
    // Handle email signup
    handleEmailSignup: async () => {
        const name = document.getElementById('signup-name').value.trim();
        const username = document.getElementById('signup-username').value.trim().toLowerCase();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        let createdUser = null;

        console.log('[Bondly Signup] Starting validation', {
            hasName: Boolean(name),
            username,
            email,
            passwordLength: password ? password.length : 0
        });
        
        // Validation
        if (!name || !username || !email || !password) {
            Utils.showToast('Please fill in all fields');
            return;
        }
        
        if (name.length < 2) {
            Utils.showToast('Name must be at least 2 characters');
            return;
        }
        
        if (username.length < 3) {
            Utils.showToast('Username must be at least 3 characters');
            return;
        }
        
        if (!/^[a-z0-9_]+$/.test(username)) {
            Utils.showToast('Username can only contain letters, numbers, and underscores');
            return;
        }
        
        if (!Utils.isValidEmail(email)) {
            Utils.showToast('Please enter a valid email');
            return;
        }
        
        if (!Utils.isStrongPassword(password)) {
            Utils.showToast('Password must be at least 8 characters');
            return;
        }
        
        Utils.showLoading('Creating account...');
        
        try {
            const auth = FirebaseService.getAuth();
            const db = FirebaseService.getDb();
            
            // Check if username is already taken
            console.log('[Bondly Signup] Checking username availability:', username);
            const usernameQuery = await db.collection('users')
                .where('username', '==', username)
                .limit(1)
                .get();
            
            if (!usernameQuery.empty) {
                Utils.showToast('Username already taken');
                Utils.hideLoading();
                return;
            }
            
            // Create user account
            console.log('[Bondly Signup] Creating Firebase Auth user');
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            createdUser = user;
            
            // Update display name
            console.log('[Bondly Signup] Updating auth display name');
            await user.updateProfile({ displayName: name });
            
            // Create user profile in Firestore
            const userProfile = {
                uid: user.uid,
                displayName: name,
                username: username,
                email: email,
                bio: '',
                country: '',
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                languages: ['English'],
                learning: [],
                interests: [],
                personality: [],
                goals: ['friendship'],
                ageRange: '',
                pronouns: '',
                deepMode: false,
                showOnlineStatus: true,
                allowMessagesFromNonFriends: false,
                showInDiscover: true,
                allowSearch: true,
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=7BAFD4&color=fff`,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastActive: firebase.firestore.FieldValue.serverTimestamp(),
                online: true,
                suspended: false
            };
            
            console.log('[Bondly Signup] Creating Firestore user profile:', user.uid);
            await db.collection('users').doc(user.uid).set(userProfile);
            
            // Initialize user stats
            console.log('[Bondly Signup] Creating user stats:', user.uid);
            await db.collection('userStats').doc(user.uid).set({
                friendsCount: 0,
                conversationsCount: 0,
                messagesCount: 0,
                achievements: []
            });
            
            console.log('[Bondly Signup] Account created successfully:', user.uid);
            Utils.showToast('Account created successfully!');
        } catch (error) {
            console.error('[Bondly Signup Failure]:', {
                message: error.message,
                code: error.code,
                stack: error.stack,
                errorObject: error
            });
            Utils.showToast(Auth.getErrorMessage(error), 5000);
            
            // If user was created but profile failed, delete the user
            if (createdUser) {
                try {
                    console.log('[Bondly Signup] Rolling back partially created auth user:', createdUser.uid);
                    await createdUser.delete();
                } catch (deleteError) {
                    console.error('Error deleting user:', deleteError);
                }
            }
        } finally {
            Utils.hideLoading();
        }
    },
    
    // Handle Google login
    handleGoogleLogin: async () => {
        Utils.showLoading('Signing in with Google...');
        
        try {
            const auth = FirebaseService.getAuth();
            const db = FirebaseService.getDb();
            const provider = new firebase.auth.GoogleAuthProvider();
            
            const result = await auth.signInWithPopup(provider);
            const user = result.user;
            
            // Check if user profile exists
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (!userDoc.exists) {
                // Generate unique username from email
                let baseUsername = (user.email?.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9_]/g, '');
                let username = baseUsername;
                let counter = 1;
                
                // Check if username exists and generate unique one
                while (true) {
                    const usernameQuery = await db.collection('users')
                        .where('username', '==', username)
                        .limit(1)
                        .get();
                    
                    if (usernameQuery.empty) {
                        break;
                    }
                    
                    username = `${baseUsername}${counter}`;
                    counter++;
                }
                
                // Create new user profile
                const userProfile = {
                    uid: user.uid,
                    displayName: user.displayName || '',
                    username: username,
                    email: user.email || '',
                    bio: '',
                    country: '',
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    languages: ['English'],
                    learning: [],
                    interests: [],
                    personality: [],
                    goals: ['friendship'],
                    ageRange: '',
                    pronouns: '',
                    deepMode: false,
                    showOnlineStatus: true,
                    allowMessagesFromNonFriends: false,
                    showInDiscover: true,
                    allowSearch: true,
                    avatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=7BAFD4&color=fff`,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastActive: firebase.firestore.FieldValue.serverTimestamp(),
                    online: true,
                    suspended: false
                };
                
                await db.collection('users').doc(user.uid).set(userProfile);
                
                // Initialize user stats
                await db.collection('userStats').doc(user.uid).set({
                    friendsCount: 0,
                    conversationsCount: 0,
                    messagesCount: 0,
                    achievements: []
                });
            }
            
            Utils.showToast('Welcome to Bondly!');
        } catch (error) {
            console.error('[Bondly Google Login Failure]:', error);
            Utils.showToast(Auth.getErrorMessage(error));
        } finally {
            Utils.hideLoading();
        }
    },
    
    // Handle logout
    handleLogout: async () => {
        Utils.showLoading('Signing out...');
        
        try {
            const auth = FirebaseService.getAuth();
            const db = FirebaseService.getDb();
            
            // Update online status
            if (Auth.currentUser && FirebaseService.isInitialized()) {
                try {
                    await db.collection('users').doc(Auth.currentUser.uid).update({
                        online: false,
                        lastActive: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } catch (error) {
                    console.error('Error updating online status:', error);
                }
            }
            
            await auth.signOut();
            
            // Clear local storage
            Utils.storage.clear();
            
            Utils.showToast('Signed out successfully');
        } catch (error) {
            console.error('Logout error:', error);
            Utils.showToast('Error signing out');
        } finally {
            Utils.hideLoading();
        }
    },
    
    // Handle forgot password
    handleForgotPassword: async () => {
        const email = prompt('Enter your email address to reset password:');
        
        if (!email) {
            return;
        }
        
        if (!Utils.isValidEmail(email)) {
            Utils.showToast('Please enter a valid email');
            return;
        }
        
        Utils.showLoading('Sending reset email...');
        
        try {
            const auth = FirebaseService.getAuth();
            await auth.sendPasswordResetEmail(email);
            Utils.showToast('Password reset email sent!');
        } catch (error) {
            console.error('[Bondly Password Reset Failure]:', error);
            Utils.showToast(Auth.getErrorMessage(error));
        } finally {
            Utils.hideLoading();
        }
    },
    
    // Handle sign in
    onSignIn: async (user) => {
        console.log('User signed in:', user.uid);
        
        const db = FirebaseService.getDb();
        
        // Ensure user document exists before any operations
        if (FirebaseService.isInitialized()) {
            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                
                if (!userDoc.exists) {
                    // Generate username fallback if needed
                    let username = user.displayName ? user.displayName.toLowerCase().replace(/[^a-z0-9_]/g, '') : '';
                    if (!username) {
                        username = 'user';
                    }
                    // Add random 4 digits
                    username = username + Math.floor(1000 + Math.random() * 9000);
                    
                    // Create user document
                    await db.collection('users').doc(user.uid).set({
                        uid: user.uid,
                        email: user.email || '',
                        displayName: user.displayName || 'User',
                        photoURL: user.photoURL || '',
                        username: username,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        online: true,
                        lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
                        bio: '',
                        country: '',
                        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                        languages: ['English'],
                        learning: [],
                        interests: [],
                        personality: [],
                        goals: ['friendship'],
                        ageRange: '',
                        deepMode: false
                    });
                    
                    // Create user stats document
                    await db.collection('userStats').doc(user.uid).set({
                        friendsCount: 0,
                        conversationsCount: 0,
                        messagesCount: 0,
                        achievements: [],
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    console.log('User document created for:', user.uid);
                }
            } catch (error) {
                console.error('Error ensuring user document exists:', error);
            }
        }
        
        // Update online status
        if (FirebaseService.isInitialized()) {
            try {
                await db.collection('users').doc(user.uid).update({
                    online: true,
                    lastActive: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (error) {
                console.error('Error updating online status:', error);
            }
        }
        
        // Switch to main screen
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('main-screen').classList.remove('hidden');
        
        // Load user data
        if (FirebaseService.isInitialized()) {
            await Profile.loadProfile();
        }
        
        // Initialize other modules
        Home.init();
        Chats.init();
        Friends.init();
        Discover.init();
        
        // Initialize notification center
        NotificationCenter.init();
        
        // Initialize presence tracking
        Presence.init();
    },
    
    // Handle sign out
    onSignOut: () => {
        console.log('User signed out');
        
        // Switch to auth screen
        document.getElementById('main-screen').classList.add('hidden');
        document.getElementById('auth-screen').classList.remove('hidden');
        
        // Reset forms
        document.getElementById('login-email-form').reset();
        document.getElementById('signup-email-form').reset();
    },
    
    // Get error message from error code or error object
    getErrorMessage: (error) => {
        if (!error) return 'An error occurred. Please try again.';
        
        const code = typeof error === 'string' ? error : error.code;
        const message = typeof error === 'object' ? (error.message || '') : '';
        
        console.error('[Bondly Auth Error Mapping]:', {
            code: code,
            message: message,
            originalError: error
        });
        
        const messages = {
            'auth/email-already-in-use': 'Email already in use',
            'auth/invalid-email': 'Invalid email address',
            'auth/weak-password': 'Password is too weak. Must be at least 8 characters.',
            'auth/user-not-found': 'User not found',
            'auth/wrong-password': 'Incorrect password',
            'auth/popup-closed-by-user': 'Sign in cancelled',
            'auth/account-exists-with-different-credential': 'Account already exists with different credentials',
            'auth/invalid-credential': 'Invalid credentials',
            'auth/too-many-requests': 'Too many attempts. Try again later',
            'auth/user-disabled': 'This account has been disabled',
            'auth/operation-not-allowed': 'Email/password signup is not enabled in Firebase Authentication',
            'permission-denied': 'Firebase permission denied. Check Firestore security rules.',
            'unavailable': 'Firebase is temporarily unavailable. Please try again.'
        };
        
        return messages[code] || message || 'An error occurred. Please try again.';
    },
    
    // Check if user is authenticated
    isAuthenticated: () => {
        return Auth.currentUser !== null;
    },
    
    // Get current user
    getCurrentUser: () => {
        return Auth.currentUser;
    }
};

// Initialize auth when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', Auth.init);
} else {
    Auth.init();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Auth;
}
