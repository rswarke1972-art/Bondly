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

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Language;
}
