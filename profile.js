// Profile Module for Bondly

const Profile = {
    userData: null,
    
    // Load current user profile
    loadProfile: async () => {
        if (!Auth.currentUser) return;
        if (!FirebaseService.isInitialized()) return;

        const db = FirebaseService.getDb();
        const userId = Auth.currentUser.uid;

        try {
            const userDoc = await db.collection('users').doc(userId).get();
            const userData = userDoc.data();
            Profile.userData = userData;

            console.log('[Bondly] Profile data loaded');

            // Update profile UI
            document.getElementById('profile-name').textContent = userData.displayName || 'Your Name';
            document.getElementById('profile-username').textContent = `@${userData.username || 'username'}`;
            document.getElementById('profile-bio').textContent = Utils.decodeHTML(userData.bio) || 'Your bio goes here...';
            document.getElementById('profile-avatar-img').src = userData.avatar || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect fill="%237BAFD4" width="100" height="100"/%3E%3Ctext x="50" y="50" font-size="40" text-anchor="middle" dy=".3em" fill="white"%3E👤%3C/text%3E%3C/svg%3E';

            // Load profile details
            Profile.loadProfileDetails(userData);

            // Setup camera icon click handler
            const avatarEditBtn = document.getElementById('profile-avatar-edit-btn');
            if (avatarEditBtn) {
                avatarEditBtn.onclick = Profile.handleAvatarUpload;
            }

            // Load stats
            await Profile.loadStats();

            // Load tags
            Profile.loadTags(userData);

        } catch (error) {
            console.error('Error loading profile:', error);
        }
    },
    
    // Load user stats
    loadStats: async () => {
        if (!Auth.currentUser) return;

        const db = FirebaseService.getDb();
        const userId = Auth.currentUser.uid;

        try {
            // Count friends (accepted only)
            const friendsSnapshot = await db.collection('friends')
                .where('participants', 'array-contains', userId)
                .get();

            const friendsCount = friendsSnapshot.size;
            console.log('[Bondly] Friends count:', friendsCount);
            document.getElementById('friends-stat').textContent = friendsCount;

            // Count conversations (active chat partners)
            const chatsSnapshot = await db.collection('chats')
                .where('participants', 'array-contains', userId)
                .get();

            const conversationsCount = chatsSnapshot.size;
            console.log('[Bondly] Conversations count:', conversationsCount);
            document.getElementById('conversations-stat').textContent = conversationsCount;

            // Count achievements or use safe fallback
            let achievementsCount = 0;
            try {
                const achievementsSnapshot = await db.collection('achievements')
                    .where('userId', '==', userId)
                    .where('unlocked', '==', true)
                    .get();

                achievementsCount = achievementsSnapshot.size;
            } catch (error) {
                // If achievements collection doesn't exist or query fails, use 0
                achievementsCount = 0;
            }

            console.log('[Bondly] Achievements count:', achievementsCount);
            document.getElementById('achievements-stat').textContent = achievementsCount;

        } catch (error) {
            console.error('Error loading stats:', error);
        }
    },
    
    // Load profile details (Country, Age, Pronouns, Learning Goals)
    loadProfileDetails: (userData) => {
        // Country
        const countrySection = document.getElementById('profile-country-section');
        const countryElement = document.getElementById('profile-country');
        if (userData.country) {
            countryElement.textContent = userData.country;
            countrySection.style.display = 'block';
        } else {
            countrySection.style.display = 'none';
        }

        // Age Range
        const ageSection = document.getElementById('profile-age-section');
        const ageElement = document.getElementById('profile-age');
        if (userData.ageRange) {
            ageElement.textContent = userData.ageRange;
            ageSection.style.display = 'block';
        } else {
            ageSection.style.display = 'none';
        }

        // Pronouns
        const pronounsSection = document.getElementById('profile-pronouns-section');
        const pronounsElement = document.getElementById('profile-pronouns');
        if (userData.pronouns) {
            pronounsElement.textContent = userData.pronouns;
            pronounsSection.style.display = 'block';
        } else {
            pronounsSection.style.display = 'none';
        }

        // Learning Goals
        const learningSection = document.getElementById('profile-learning-section');
        const learningElement = document.getElementById('profile-learning');
        if (userData.learning && userData.learning.length > 0) {
            learningElement.innerHTML = userData.learning.map(lang =>
                `<span class="tag">📚 ${lang}</span>`
            ).join('');
            learningSection.style.display = 'block';
        } else {
            learningSection.style.display = 'none';
        }
    },

    // Load profile tags
    loadTags: (userData) => {
        // Languages
        const languagesContainer = document.getElementById('profile-languages');
        if (userData.languages && userData.languages.length > 0) {
            languagesContainer.innerHTML = userData.languages.map(lang =>
                `<span class="tag">🌍 ${lang}</span>`
            ).join('');
        } else {
            languagesContainer.innerHTML = '<span class="tag">Add languages</span>';
        }

        // Interests
        const interestsContainer = document.getElementById('profile-interests');
        if (userData.interests && userData.interests.length > 0) {
            interestsContainer.innerHTML = userData.interests.map(interest =>
                `<span class="tag">${interest}</span>`
            ).join('');
        } else {
            interestsContainer.innerHTML = '<span class="tag">Add interests</span>';
        }

        // Personality
        const personalityContainer = document.getElementById('profile-personality');
        if (userData.personality && userData.personality.length > 0) {
            personalityContainer.innerHTML = userData.personality.map(trait =>
                `<span class="tag">✨ ${trait}</span>`
            ).join('');
        } else {
            personalityContainer.innerHTML = '<span class="tag">Add personality traits</span>';
        }

        // Goals (Looking For)
        const goalsContainer = document.getElementById('profile-goals');
        if (userData.goals && userData.goals.length > 0) {
            goalsContainer.innerHTML = userData.goals.map(goal =>
                `<span class="tag">🫂 ${goal}</span>`
            ).join('');
        } else {
            goalsContainer.innerHTML = '<span class="tag">Add what you\'re looking for</span>';
        }

        // Deep mode badge
        if (userData.deepMode) {
            const deepModeBadge = document.createElement('span');
            deepModeBadge.className = 'tag';
            deepModeBadge.style.background = 'var(--lavender)';
            deepModeBadge.textContent = '🌙 Deep Mode';
            personalityContainer.appendChild(deepModeBadge);
        }
    },
    
    // Load edit profile form
    loadEditForm: () => {
        if (!Profile.userData) return;

        const userData = Profile.userData;

        document.getElementById('edit-name').value = userData.displayName || '';
        document.getElementById('edit-bio').value = Utils.decodeHTML(userData.bio) || '';
        document.getElementById('edit-country').value = userData.country || '';
        document.getElementById('edit-age').value = userData.ageRange || '';
        document.getElementById('edit-pronouns').value = userData.pronouns || '';
        document.getElementById('edit-languages').value = Utils.formatTags(userData.languages);
        document.getElementById('edit-learning').value = Utils.formatTags(userData.learning);
        document.getElementById('edit-interests').value = Utils.formatTags(userData.interests);
        document.getElementById('edit-personality').value = Utils.formatTags(userData.personality);
        document.getElementById('edit-goals').value = Utils.formatTags(userData.goals);

        // Setup form submission
        document.getElementById('edit-profile-form').onsubmit = Profile.saveProfile;

        // Setup avatar upload
        const avatarEditBtn = document.getElementById('avatar-edit-btn');
        if (avatarEditBtn) {
            avatarEditBtn.onclick = Profile.handleAvatarUpload;
        }
    },
    
    // Handle avatar upload
    handleAvatarUpload: () => {
        console.log('[Bondly] Profile image selection initiated');

        // Create file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';

        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            console.log('[Bondly] Profile image selected:', file.name);

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                Utils.showToast('Image must be less than 5MB');
                return;
            }

            // Validate file type
            if (!file.type.startsWith('image/')) {
                Utils.showToast('Please select an image file');
                return;
            }

            await Profile.uploadAvatar(file);
        };

        document.body.appendChild(fileInput);
        fileInput.click();
        document.body.removeChild(fileInput);
    },
    
    // Upload avatar to Cloudinary
    uploadAvatar: async (file) => {
        if (!Auth.currentUser) return;
        if (!FirebaseService.isInitialized()) {
            Utils.showToast('Firebase not configured');
            return;
        }

        const userId = Auth.currentUser.uid;

        Utils.showLoading('Uploading image...');

        try {
            console.log('[Bondly] Uploading to Cloudinary');

            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', 'bondly_upload');

            const response = await fetch(
                `https://api.cloudinary.com/v1_1/dvjdqc8pj/image/upload`,
                {
                    method: 'POST',
                    body: formData
                }
            );

            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(data.error?.message || 'Upload failed');
            }

            console.log('[Bondly] Upload success:', data.secure_url);

            // Update user profile with new avatar URL
            const db = FirebaseService.getDb();
            await db.collection('users').doc(userId).update({
                avatar: data.secure_url
            });

            // Update auth profile photo
            await Auth.currentUser.updateProfile({
                photoURL: data.secure_url
            });

            Utils.showToast('Avatar updated successfully!');
            Mobile.hapticFeedback('success');

            // Reload profile
            await Profile.loadProfile();

        } catch (error) {
            console.error('[Bondly] Upload failed:', error);
            Utils.showToast('Upload failed');
        } finally {
            Utils.hideLoading();
        }
    },
    
    // Save profile
    saveProfile: async (e) => {
        e.preventDefault();
        
        if (!Auth.currentUser) return;
        if (!FirebaseService.isInitialized()) {
            Utils.showToast('Firebase not configured');
            return;
        }
        
        const db = FirebaseService.getDb();
        const userId = Auth.currentUser.uid;
        
        Utils.showLoading('Saving profile...');
        
        try {
            const name = Utils.sanitizeInput(document.getElementById('edit-name').value);
            
            // Validate name
            if (!name || name.length < 2) {
                Utils.showToast('Name must be at least 2 characters');
                Utils.hideLoading();
                return;
            }
            
            const profileData = {
                displayName: name,
                bio: Utils.sanitizeInput(document.getElementById('edit-bio').value),
                country: Utils.sanitizeInput(document.getElementById('edit-country').value),
                ageRange: Utils.sanitizeInput(document.getElementById('edit-age').value),
                pronouns: Utils.sanitizeInput(document.getElementById('edit-pronouns').value),
                languages: Utils.parseTags(document.getElementById('edit-languages').value),
                learning: Utils.parseTags(document.getElementById('edit-learning').value),
                interests: Utils.parseTags(document.getElementById('edit-interests').value),
                personality: Utils.parseTags(document.getElementById('edit-personality').value),
                goals: Utils.parseTags(document.getElementById('edit-goals').value),
                lastActive: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await db.collection('users').doc(userId).update(profileData);
            
            // Update auth display name
            await Auth.currentUser.updateProfile({
                displayName: profileData.displayName
            });
            
            Utils.showToast('Profile saved successfully!');
            Mobile.hapticFeedback('success');
            
            // Reload profile
            await Profile.loadProfile();
            
            // Close edit screen
            App.closeEditProfile();
            
        } catch (error) {
            console.error('Error saving profile:', error);
            Utils.showToast('Error saving profile');
        } finally {
            Utils.hideLoading();
        }
    },
    
    // Load another user's profile
    loadUserProfile: async (userId) => {
        const db = FirebaseService.getDb();
        const content = document.getElementById('user-profile-content');
        
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            const userData = userDoc.data();
            
            content.innerHTML = `
                <div class="profile-header" style="background: linear-gradient(135deg, var(--soft-blue) 0%, var(--lavender) 100%);">
                    <div class="profile-avatar">
                        <img src="${userData.avatar}" alt="${userData.displayName}">
                    </div>
                    <h1>${userData.displayName}</h1>
                    <p>@${userData.username}</p>
                    <p class="profile-bio">${userData.bio || 'No bio yet'}</p>
                </div>
                
                <div class="profile-details">
                    <div class="detail-section">
                        <h3>🌍 ${userData.country || 'Unknown'}</h3>
                        <p style="color: var(--gray-500); font-size: 0.875rem;">${userData.timezone || ''}</p>
                    </div>
                    
                    <div class="detail-section">
                        <h3>Languages</h3>
                        <div class="tags-container">
                            ${userData.languages?.map(lang => `<span class="tag">🌍 ${lang}</span>`).join('') || ''}
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h3>Learning</h3>
                        <div class="tags-container">
                            ${userData.learning?.map(lang => `<span class="tag">📚 ${lang}</span>`).join('') || ''}
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h3>Interests</h3>
                        <div class="tags-container">
                            ${userData.interests?.map(interest => `<span class="tag">${interest}</span>`).join('') || ''}
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h3>Personality</h3>
                        <div class="tags-container">
                            ${userData.personality?.map(trait => `<span class="tag">✨ ${trait}</span>`).join('') || ''}
                        </div>
                    </div>
                    
                    ${userData.deepMode ? '<div class="detail-section"><span class="tag" style="background: var(--lavender);">🌙 Deep Mode Enabled</span></div>' : ''}
                    
                    <div class="profile-actions">
                        <button class="btn btn-primary btn-full" onclick="Profile.sendFriendRequest('${userId}')">
                            💙 Send Friend Request
                        </button>
                        <button class="btn btn-secondary btn-full" onclick="App.openChat('${userId}', '${userData.displayName}', '${userData.avatar}')">
                            💬 Send Message
                        </button>
                    </div>
                </div>
            `;
            
        } catch (error) {
            console.error('Error loading user profile:', error);
            content.innerHTML = '<p style="text-align: center; color: var(--gray-500);">Unable to load profile</p>';
        }
    },
    
    // Send friend request from profile
    sendFriendRequest: async (toUserId) => {
        await Home.sendFriendRequest(toUserId);
    },
    
    // Refresh profile
    refresh: async () => {
        await Profile.loadProfile();
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Profile;
}
