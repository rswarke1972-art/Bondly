// Smart Matching Module for Bondly

const Matching = {
    // Calculate compatibility score between two users
    calculateScore: (user1, user2) => {
        let score = 0;
        let factors = 0;
        
        // Shared interests (30% weight)
        if (user1.interests && user2.interests) {
            const shared = user1.interests.filter(i => user2.interests.includes(i));
            const totalUnique = [...new Set([...user1.interests, ...user2.interests])];
            if (totalUnique.length > 0) {
                score += (shared.length / totalUnique.length) * 30;
                factors++;
            }
        }
        
        // Language compatibility (25% weight)
        if (user1.languages && user2.languages && user1.learning && user2.learning) {
            const canTeach1 = user1.languages.filter(l => user2.learning.includes(l));
            const canTeach2 = user2.languages.filter(l => user1.learning.includes(l));
            const totalLearning = [...new Set([...user1.learning, ...user2.learning])];
            if (totalLearning.length > 0) {
                score += ((canTeach1.length + canTeach2.length) / totalLearning.length) * 25;
                factors++;
            }
        }
        
        // Timezone proximity (20% weight)
        if (user1.timezone && user2.timezone) {
            try {
                const offset1 = Matching.getTimezoneOffset(user1.timezone);
                const offset2 = Matching.getTimezoneOffset(user2.timezone);
                const diff = Math.abs(offset1 - offset2);
                
                if (diff <= 1) {
                    score += 20;
                } else if (diff <= 3) {
                    score += 15;
                } else if (diff <= 5) {
                    score += 10;
                } else if (diff <= 8) {
                    score += 5;
                }
                factors++;
            } catch (e) {
                // Timezone parsing failed, skip this factor
            }
        }
        
        // Shared personality tags (15% weight)
        if (user1.personality && user2.personality) {
            const shared = user1.personality.filter(p => user2.personality.includes(p));
            const totalUnique = [...new Set([...user1.personality, ...user2.personality])];
            if (totalUnique.length > 0) {
                score += (shared.length / totalUnique.length) * 15;
                factors++;
            }
        }
        
        // Deep mode compatibility (10% weight)
        if (user1.deepMode && user2.deepMode) {
            score += 10;
            factors++;
        }
        
        // Normalize score if we had factors
        if (factors > 0) {
            return Math.min(100, Math.round(score));
        }
        
        // Default to 50% if no factors matched
        return 50;
    },
    
    // Get timezone offset in hours
    getTimezoneOffset: (timezone) => {
        try {
            const date = new Date();
            const options = { timeZone: timezone, timeZoneName: 'shortOffset' };
            const formatter = new Intl.DateTimeFormat('en-US', options);
            const parts = formatter.formatToParts(date);
            const offsetPart = parts.find(p => p.type === 'timeZoneName');
            
            if (offsetPart) {
                const match = offsetPart.value.match(/GMT([+-])(\d{2}):?(\d{2})?/);
                if (match) {
                    const sign = match[1] === '+' ? 1 : -1;
                    const hours = parseInt(match[2]);
                    const minutes = match[3] ? parseInt(match[3]) : 0;
                    return sign * (hours + minutes / 60);
                }
            }
            
            // Fallback: try to parse common timezone names
            const timezoneOffsets = {
                'UTC': 0,
                'GMT': 0,
                'America/New_York': -5,
                'America/Chicago': -6,
                'America/Denver': -7,
                'America/Los_Angeles': -8,
                'Europe/London': 0,
                'Europe/Paris': 1,
                'Europe/Berlin': 1,
                'Asia/Tokyo': 9,
                'Asia/Shanghai': 8,
                'Asia/Dubai': 4,
                'Asia/Tehran': 3.5,
                'Australia/Sydney': 10,
                'Pacific/Auckland': 12
            };
            
            return timezoneOffsets[timezone] || 0;
        } catch (e) {
            return 0;
        }
    },
    
    // Find best matches for a user
    findMatches: async (userId, limit = 10) => {
        if (!FirebaseService.isInitialized()) return [];
        
        const db = FirebaseService.getDb();
        
        try {
            // Get user data
            const userDoc = await db.collection('users').doc(userId).get();
            const userData = userDoc.data();
            
            // Get potential matches
            const usersSnapshot = await db.collection('users')
                .where('uid', '!=', userId)
                .limit(100)
                .get();
            
            const users = [];
            usersSnapshot.forEach(doc => {
                users.push(doc.data());
            });
            
            // Calculate scores and sort
            const scoredUsers = users.map(user => ({
                ...user,
                matchScore: Matching.calculateScore(userData, user)
            }));
            
            scoredUsers.sort((a, b) => b.matchScore - a.matchScore);
            
            return scoredUsers.slice(0, limit);
            
        } catch (error) {
            console.error('Error finding matches:', error);
            return [];
        }
    },
    
    // Get match explanation
    getMatchExplanation: (user1, user2) => {
        const reasons = [];
        
        // Shared interests
        if (user1.interests && user2.interests) {
            const shared = user1.interests.filter(i => user2.interests.includes(i));
            if (shared.length > 0) {
                reasons.push(`Shared interests: ${shared.join(', ')}`);
            }
        }
        
        // Language compatibility
        if (user1.languages && user2.languages && user1.learning && user2.learning) {
            const canTeach1 = user1.languages.filter(l => user2.learning.includes(l));
            const canTeach2 = user2.languages.filter(l => user1.learning.includes(l));
            if (canTeach1.length > 0 || canTeach2.length > 0) {
                reasons.push('Language exchange compatible');
            }
        }
        
        // Deep mode
        if (user1.deepMode && user2.deepMode) {
            reasons.push('Both prefer deep conversations');
        }
        
        // Timezone
        if (user1.timezone && user2.timezone) {
            try {
                const offset1 = Matching.getTimezoneOffset(user1.timezone);
                const offset2 = Matching.getTimezoneOffset(user2.timezone);
                const diff = Math.abs(offset1 - offset2);
                if (diff <= 3) {
                    reasons.push('Similar timezone');
                }
            } catch (e) {
                // Skip
            }
        }
        
        return reasons.length > 0 ? reasons : ['Good potential match'];
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Matching;
}
