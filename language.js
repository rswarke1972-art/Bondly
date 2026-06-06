// Language Exchange Module for Bondly

const Language = {
    supportedLanguages: [
        { code: 'en', name: 'English', flag: '🇬🇧' },
        { code: 'es', name: 'Spanish', flag: '🇪🇸' },
        { code: 'fr', name: 'French', flag: '🇫🇷' },
        { code: 'de', name: 'German', flag: '🇩🇪' },
        { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
        { code: 'ko', name: 'Korean', flag: '🇰🇷' },
        { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
        { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
        { code: 'fa', name: 'Persian', flag: '🇮🇷' },
        { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
        { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
        { code: 'ru', name: 'Russian', flag: '🇷🇺' },
        { code: 'it', name: 'Italian', flag: '🇮🇹' },
        { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
        { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
        { code: 'pl', name: 'Polish', flag: '🇵🇱' },
        { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
        { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
        { code: 'th', name: 'Thai', flag: '🇹🇭' },
        { code: 'id', name: 'Indonesian', flag: '🇮🇩' }
    ],
    
    // Get language by code
    getLanguage: (code) => {
        return Language.supportedLanguages.find(lang => lang.code === code);
    },
    
    // Get language by name
    getLanguageByName: (name) => {
        return Language.supportedLanguages.find(lang => 
            lang.name.toLowerCase() === name.toLowerCase()
        );
    },
    
    // Find language partners
    findLanguagePartners: async (userId, targetLanguage) => {
        if (!FirebaseService.isInitialized()) return [];
        
        const db = FirebaseService.getDb();
        
        try {
            // Get user data
            const userDoc = await db.collection('users').doc(userId).get();
            const userData = userDoc.data();
            
            // Find users who speak the target language and are learning user's language
            const usersSnapshot = await db.collection('users')
                .where('uid', '!=', userId)
                .where('languages', 'array-contains', targetLanguage)
                .limit(50)
                .get();
            
            const partners = [];
            
            usersSnapshot.forEach(doc => {
                const user = doc.data();
                
                // Check if they're learning any of user's languages
                const canExchange = userData.languages?.some(lang => 
                    user.learning?.includes(lang)
                );
                
                if (canExchange) {
                    partners.push({
                        ...user,
                        matchScore: Matching.calculateScore(userData, user)
                    });
                }
            });
            
            // Sort by match score
            partners.sort((a, b) => b.matchScore - a.matchScore);
            
            return partners;
            
        } catch (error) {
            console.error('Error finding language partners:', error);
            return [];
        }
    },
    
    // Add vocabulary word
    addVocabulary: async (userId, word, translation, language) => {
        if (!FirebaseService.isInitialized()) return;
        
        const db = FirebaseService.getDb();
        
        try {
            await db.collection('users').doc(userId).collection('vocabulary').add({
                word,
                translation,
                language,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            Utils.showToast('Word added to vocabulary');
            
        } catch (error) {
            console.error('Error adding vocabulary:', error);
            Utils.showToast('Error adding word');
        }
    },
    
    // Get vocabulary list
    getVocabulary: async (userId, language = null) => {
        if (!FirebaseService.isInitialized()) return [];
        
        const db = FirebaseService.getDb();
        
        try {
            let query = db.collection('users').doc(userId).collection('vocabulary')
                .orderBy('createdAt', 'desc');
            
            if (language) {
                query = query.where('language', '==', language);
            }
            
            const snapshot = await query.limit(100).get();
            
            const vocabulary = [];
            snapshot.forEach(doc => {
                vocabulary.push({ id: doc.id, ...doc.data() });
            });
            
            return vocabulary;
            
        } catch (error) {
            console.error('Error getting vocabulary:', error);
            return [];
        }
    },
    
    // Set daily language goal
    setLanguageGoal: async (userId, language, minutesPerDay) => {
        if (!FirebaseService.isInitialized()) return;
        
        const db = FirebaseService.getDb();
        
        try {
            await db.collection('users').doc(userId).collection('languageGoals').doc(language).set({
                language,
                minutesPerDay,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            Utils.showToast('Language goal set');
            
        } catch (error) {
            console.error('Error setting language goal:', error);
            Utils.showToast('Error setting goal');
        }
    },
    
    // Track language practice time
    trackPracticeTime: async (userId, language, minutes) => {
        if (!FirebaseService.isInitialized()) return;
        
        const db = FirebaseService.getDb();
        
        try {
            const today = new Date().toISOString().split('T')[0];
            const docRef = db.collection('users').doc(userId)
                .collection('languagePractice').doc(today);
            
            const doc = await docRef.get();
            
            if (doc.exists) {
                await docRef.update({
                    [language]: firebase.firestore.FieldValue.increment(minutes),
                    totalMinutes: firebase.firestore.FieldValue.increment(minutes)
                });
            } else {
                await docRef.set({
                    date: today,
                    [language]: minutes,
                    totalMinutes: minutes
                });
                // Check achievements
                if (typeof Achievements !== 'undefined') {
                    await Achievements.checkCategoryAchievements('language');
                }
            }
        } catch (error) {
            console.error('Error tracking practice time:', error);
        }
    },
    
    // Get language badges
    getLanguageBadges: async (userId) => {
        if (!FirebaseService.isInitialized()) return [];
        
        const db = FirebaseService.getDb();
        
        try {
            const snapshot = await db.collection('users').doc(userId)
                .collection('languagePractice')
                .orderBy('date', 'desc')
                .limit(30)
                .get();
            
            const practiceData = {};
            let totalMinutes = 0;
            
            snapshot.forEach(doc => {
                const data = doc.data();
                Object.keys(data).forEach(key => {
                    if (key !== 'date' && key !== 'totalMinutes') {
                        practiceData[key] = (practiceData[key] || 0) + data[key];
                        totalMinutes += data[key];
                    }
                });
            });
            
            const badges = [];
            
            // Calculate badges based on practice time
            Object.keys(practiceData).forEach(language => {
                const minutes = practiceData[language];
                const langInfo = Language.getLanguage(language);
                
                if (minutes >= 1000) {
                    badges.push({
                        type: 'master',
                        language: langInfo?.name || language,
                        flag: langInfo?.flag || '🌍',
                        minutes
                    });
                } else if (minutes >= 500) {
                    badges.push({
                        type: 'advanced',
                        language: langInfo?.name || language,
                        flag: langInfo?.flag || '🌍',
                        minutes
                    });
                } else if (minutes >= 100) {
                    badges.push({
                        type: 'intermediate',
                        language: langInfo?.name || language,
                        flag: langInfo?.flag || '🌍',
                        minutes
                    });
                } else if (minutes >= 10) {
                    badges.push({
                        type: 'beginner',
                        language: langInfo?.name || language,
                        flag: langInfo?.flag || '🌍',
                        minutes
                    });
                }
            });
            
            return badges;
            
        } catch (error) {
            console.error('Error getting language badges:', error);
            return [];
        }
    }
};

const LanguageUI = {
    init: () => {
        // Populate language select dropdowns
        const practiceSelect = document.getElementById('practice-lang-select');
        const goalSelect = document.getElementById('goal-lang-select');
        const vocabSelect = document.getElementById('vocab-lang-select');
        
        if (practiceSelect && goalSelect && vocabSelect) {
            const optionsHtml = Language.supportedLanguages.map(lang => 
                `<option value="${lang.code}">${lang.flag} ${lang.name}</option>`
            ).join('');
            
            practiceSelect.innerHTML = optionsHtml;
            goalSelect.innerHTML = optionsHtml;
            vocabSelect.innerHTML = optionsHtml;
        }
    },

    refresh: async () => {
        if (!Auth.currentUser) return;
        const userId = Auth.currentUser.uid;

        // Load vocabulary
        const vocabList = await Language.getVocabulary(userId);
        const vocabContainer = document.getElementById('vocab-list-container');
        if (vocabContainer) {
            if (vocabList.length === 0) {
                vocabContainer.innerHTML = '<p style="text-align: center; color: var(--gray-500); font-size: 0.875rem;">No words added yet</p>';
            } else {
                vocabContainer.innerHTML = vocabList.map(item => {
                    const langInfo = Language.getLanguage(item.language);
                    return `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--spacing-xs) 0; border-bottom: 1px solid var(--gray-100);">
                            <div>
                                <span style="font-weight: 600; color: var(--midnight-blue);">${Utils.escapeHTML(item.word)}</span>
                                <span style="color: var(--gray-500); font-size: 0.875rem;"> - ${Utils.escapeHTML(item.translation)}</span>
                            </div>
                            <span style="font-size: 0.8rem; background: var(--gray-100); padding: 2px 6px; border-radius: var(--radius-sm);">${langInfo?.flag || '🌍'} ${langInfo?.name || item.language}</span>
                        </div>
                    `;
                }).join('');
            }
        }

        // Load badges
        const badges = await Language.getLanguageBadges(userId);
        const badgesContainer = document.getElementById('badges-container');
        if (badgesContainer) {
            if (badges.length === 0) {
                badgesContainer.innerHTML = '<p style="text-align: center; color: var(--gray-500); font-size: 0.875rem; width: 100%;">Earn badges by practicing languages</p>';
            } else {
                badgesContainer.innerHTML = badges.map(badge => {
                    const colors = {
                        beginner: '#A3A3A3',
                        intermediate: '#7CB8A6',
                        advanced: '#7BAFD4',
                        master: '#D8B97A'
                    };
                    return `
                        <div style="padding: var(--spacing-xs) var(--spacing-sm); border: 2px solid ${colors[badge.type] || 'var(--gray-200)'}; border-radius: var(--radius-md); font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 4px; background: var(--white);">
                            <span>${badge.flag}</span>
                            <span>${badge.language} (${badge.type})</span>
                        </div>
                    `;
                }).join('');
            }
        }
    },

    logPractice: async () => {
        if (!Auth.currentUser) return;
        const select = document.getElementById('practice-lang-select');
        const input = document.getElementById('practice-minutes');
        
        const lang = select.value;
        const mins = parseInt(input.value);
        
        if (!mins || mins <= 0) {
            Utils.showToast('Please enter valid minutes');
            return;
        }
        
        Utils.showLoading('Logging practice...');
        await Language.trackPracticeTime(Auth.currentUser.uid, lang, mins);
        Utils.hideLoading();
        Utils.showToast('Practice time logged!');
        input.value = '';
        await LanguageUI.refresh();
    },

    setGoal: async () => {
        if (!Auth.currentUser) return;
        const select = document.getElementById('goal-lang-select');
        const input = document.getElementById('goal-minutes');
        
        const lang = select.value;
        const mins = parseInt(input.value);
        
        if (!mins || mins <= 0) {
            Utils.showToast('Please enter valid minutes');
            return;
        }
        
        Utils.showLoading('Setting goal...');
        await Language.setLanguageGoal(Auth.currentUser.uid, lang, mins);
        Utils.hideLoading();
        input.value = '';
        await LanguageUI.refresh();
    },

    addWord: async () => {
        if (!Auth.currentUser) return;
        const wordInput = document.getElementById('vocab-word');
        const transInput = document.getElementById('vocab-translation');
        const select = document.getElementById('vocab-lang-select');
        
        const word = wordInput.value.trim();
        const translation = transInput.value.trim();
        const lang = select.value;
        
        if (!word || !translation) {
            Utils.showToast('Please enter both word and translation');
            return;
        }
        
        Utils.showLoading('Adding word...');
        await Language.addVocabulary(Auth.currentUser.uid, word, translation, lang);
        Utils.hideLoading();
        wordInput.value = '';
        transInput.value = '';
        await LanguageUI.refresh();
    }
};

window.LanguageUI = LanguageUI;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Language, LanguageUI };
}
