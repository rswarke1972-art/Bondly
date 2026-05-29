// Achievements Module for Bondly

const Achievements = {
    achievementDefinitions: [
        {
            id: 'first_friend',
            name: 'First Friend',
            description: 'Make your first friend on Bondly',
            icon: '💙',
            rarity: 'common'
        },
        {
            id: 'first_message',
            name: 'First Conversation',
            description: 'Send your first message',
            icon: '💬',
            rarity: 'common'
        },
        {
            id: 'language_explorer',
            name: 'Language Explorer',
            description: 'Connect with someone from a different country',
            icon: '🌍',
            rarity: 'uncommon'
        },
        {
            id: 'meaningful_conversation',
            name: 'Meaningful Conversation',
            description: 'Have a deep conversation with someone',
            icon: '🧠',
            rarity: 'rare'
        },
        {
            id: 'supportive_friend',
            name: 'Supportive Friend',
            description: 'Have 10 friends',
            icon: '🫂',
            rarity: 'uncommon'
        },
        {
            id: 'deep_talker',
            name: 'Deep Talker',
            description: 'Enable Deep Mode and have 5 deep conversations',
            icon: '🌙',
            rarity: 'rare'
        },
        {
            id: 'study_buddy',
            name: 'Study Buddy',
            description: 'Connect with someone for learning',
            icon: '📚',
            rarity: 'uncommon'
        },
        {
            id: 'cultural_explorer',
            name: 'Cultural Explorer',
            description: 'Connect with people from 5 different countries',
            icon: '✨',
            rarity: 'rare'
        },
        {
            id: 'conversation_master',
            name: 'Conversation Master',
            description: 'Send 100 messages',
            icon: '🎯',
            rarity: 'rare'
        },
        {
            id: 'social_butterfly',
            name: 'Social Butterfly',
            description: 'Have 25 friends',
            icon: '🦋',
            rarity: 'epic'
        },
        {
            id: 'polyglot',
            name: 'Polyglot',
            description: 'Practice 3 different languages',
            icon: '🗣️',
            rarity: 'epic'
        },
        {
            id: 'bondly_legend',
            name: 'Bondly Legend',
            description: 'Have 50 friends and 500 meaningful conversations',
            icon: '👑',
            rarity: 'legendary'
        }
    ],
    
    // Check if user has earned an achievement
    checkAchievement: async (achievementId) => {
        if (!Auth.currentUser) return;
        
        const db = FirebaseService.getDb();
        const userId = Auth.currentUser.uid;
        
        try {
            // Check if already earned
            const achievementDoc = await db.collection('users').doc(userId)
                .collection('achievements').doc(achievementId).get();
            
            if (achievementDoc.exists) return; // Already earned
            
            // Check if achievement criteria is met
            const earned = await Achievements.verifyAchievement(achievementId);
            
            if (earned) {
                await Achievements.awardAchievement(achievementId);
            }
            
        } catch (error) {
            console.error('Error checking achievement:', error);
        }
    },
    
    // Verify if achievement criteria is met
    verifyAchievement: async (achievementId) => {
        if (!Auth.currentUser) return false;
        
        const db = FirebaseService.getDb();
        const userId = Auth.currentUser.uid;
        
        try {
            const statsDoc = await db.collection('userStats').doc(userId).get();
            const stats = statsDoc.data();
            
            switch (achievementId) {
                case 'first_friend':
                    return (stats?.friendsCount || 0) >= 1;
                    
                case 'first_message':
                    return (stats?.messagesCount || 0) >= 1;
                    
                case 'supportive_friend':
                    return (stats?.friendsCount || 0) >= 10;
                    
                case 'conversation_master':
                    return (stats?.messagesCount || 0) >= 100;
                    
                case 'social_butterfly':
                    return (stats?.friendsCount || 0) >= 25;
                    
                case 'bondly_legend':
                    return (stats?.friendsCount || 0) >= 50 && (stats?.messagesCount || 0) >= 500;
                    
                case 'language_explorer':
                case 'cultural_explorer':
                    // Check friends from different countries
                    const friendsSnapshot = await db.collection('friends')
                        .where('participants', 'array-contains', userId)
                        .get();
                    
                    const countries = new Set();
                    
                    for (const friendDoc of friendsSnapshot.docs) {
                        const friendData = friendDoc.data();
                        const friendId = friendData.participants.find(p => p !== userId);
                        
                        const userDoc = await db.collection('users').doc(friendId).get();
                        const userData = userDoc.data();
                        
                        if (userData.country) {
                            countries.add(userData.country);
                        }
                    }
                    
                    if (achievementId === 'language_explorer') {
                        return countries.size >= 1;
                    } else {
                        return countries.size >= 5;
                    }
                    
                case 'meaningful_conversation':
                case 'deep_talker':
                    // Check for meaningful conversations
                    const chatsSnapshot = await db.collection('chats')
                        .where('participants', 'array-contains', userId)
                        .get();
                    
                    let meaningfulCount = 0;
                    
                    for (const chatDoc of chatsSnapshot.docs) {
                        const chatId = chatDoc.id;
                        
                        const messagesSnapshot = await db.collection('chats').doc(chatId)
                            .collection('messages')
                            .limit(20)
                            .get();
                        
                        const messages = [];
                        messagesSnapshot.forEach(doc => {
                            messages.push(doc.data());
                        });
                        
                        if (DeepMode.isMeaningfulConversation(messages)) {
                            meaningfulCount++;
                        }
                    }
                    
                    if (achievementId === 'meaningful_conversation') {
                        return meaningfulCount >= 1;
                    } else {
                        // Check if deep mode is enabled
                        const userDoc = await db.collection('users').doc(userId).get();
                        const userData = userDoc.data();
                        
                        return userData.deepMode && meaningfulCount >= 5;
                    }
                    
                case 'study_buddy':
                    // Check if user has friends with learning goals
                    const studyFriendsSnapshot = await db.collection('friends')
                        .where('participants', 'array-contains', userId)
                        .get();
                    
                    for (const friendDoc of studyFriendsSnapshot.docs) {
                        const friendData = friendDoc.data();
                        const friendId = friendData.participants.find(p => p !== userId);
                        
                        const userDoc = await db.collection('users').doc(friendId).get();
                        const userData = userDoc.data();
                        
                        if (userData.goals?.includes('study buddy') || 
                            userData.goals?.includes('language partner')) {
                            return true;
                        }
                    }
                    
                    return false;
                    
                case 'polyglot':
                    // Check language practice
                    const badges = await Language.getLanguageBadges(userId);
                    return badges.length >= 3;
                    
                default:
                    return false;
            }
            
        } catch (error) {
            console.error('Error verifying achievement:', error);
            return false;
        }
    },
    
    // Award achievement to user
    awardAchievement: async (achievementId) => {
        if (!Auth.currentUser) return;
        
        const db = FirebaseService.getDb();
        const userId = Auth.currentUser.uid;
        
        try {
            const achievement = Achievements.achievementDefinitions.find(a => a.id === achievementId);
            
            // Add to user's achievements
            await db.collection('users').doc(userId)
                .collection('achievements').doc(achievementId).set({
                achievementId,
                earnedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Update user stats
            await db.collection('userStats').doc(userId).update({
                achievements: firebase.firestore.FieldValue.arrayUnion(achievementId)
            });
            
            // Show notification
            Utils.showToast(`🏆 Achievement Unlocked: ${achievement.name}`);
            Mobile.hapticFeedback('success');
            
            // Send notification
            await Notifications.sendNotification(userId, {
                type: 'achievement',
                message: `You earned the ${achievement.name} achievement!`
            });
            
        } catch (error) {
            console.error('Error awarding achievement:', error);
        }
    },
    
    // Get user's achievements
    getUserAchievements: async () => {
        if (!Auth.currentUser) return [];
        
        const db = FirebaseService.getDb();
        const userId = Auth.currentUser.uid;
        
        try {
            const snapshot = await db.collection('users').doc(userId)
                .collection('achievements')
                .get();
            
            const achievements = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                const definition = Achievements.achievementDefinitions.find(a => a.id === data.achievementId);
                
                if (definition) {
                    achievements.push({
                        ...definition,
                        earnedAt: data.earnedAt?.toDate()
                    });
                }
            });
            
            // Sort by rarity and earned date
            const rarityOrder = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
            achievements.sort((a, b) => {
                if (rarityOrder[b.rarity] !== rarityOrder[a.rarity]) {
                    return rarityOrder[b.rarity] - rarityOrder[a.rarity];
                }
                return b.earnedAt - a.earnedAt;
            });
            
            return achievements;
            
        } catch (error) {
            console.error('Error getting user achievements:', error);
            return [];
        }
    },
    
    // Show achievements modal
    showAchievements: async () => {
        const achievements = await Achievements.getUserAchievements();
        const allAchievements = Achievements.achievementDefinitions;
        
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
        
        const earnedIds = achievements.map(a => a.id);
        
        modal.innerHTML = `
            <div style="background: var(--white); padding: var(--spacing-lg); border-radius: var(--radius-lg); max-width: 500px; width: 100%; max-height: 80vh; overflow-y: auto;">
                <h2 style="margin-bottom: var(--spacing-md);">Achievements</h2>
                <p style="margin-bottom: var(--spacing-lg); color: var(--gray-600);">${achievements.length} / ${allAchievements.length} unlocked</p>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--spacing-md); margin-bottom: var(--spacing-lg);">
                    ${allAchievements.map(achievement => {
                        const earned = earnedIds.includes(achievement.id);
                        const rarityColors = {
                            common: '#A3A3A3',
                            uncommon: '#7CB8A6',
                            rare: '#7BAFD4',
                            epic: '#C2B5E2',
                            legendary: '#D8B97A'
                        };
                        
                        return `
                            <div style="padding: var(--spacing-md); border: 2px solid ${earned ? rarityColors[achievement.rarity] : 'var(--gray-200)'}; border-radius: var(--radius-md); opacity: ${earned ? 1 : 0.5};">
                                <div style="font-size: 2rem; text-align: center; margin-bottom: var(--spacing-xs);">${achievement.icon}</div>
                                <div style="font-weight: 600; text-align: center; font-size: 0.875rem;">${achievement.name}</div>
                                <div style="font-size: 0.75rem; color: var(--gray-500); text-align: center; margin-top: var(--spacing-xs);">${achievement.description}</div>
                                ${earned ? '<div style="font-size: 0.7rem; color: var(--success); text-align: center; margin-top: var(--spacing-xs);">✓ Earned</div>' : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <button onclick="this.parentElement.parentElement.remove();" style="width: 100%; background: var(--soft-blue); color: var(--white); border: none; padding: var(--spacing-md); border-radius: var(--radius-md); cursor: pointer; font-weight: 600;">Close</button>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Achievements;
}
