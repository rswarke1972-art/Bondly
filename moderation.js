// Moderation Module for Bondly

const Moderation = {
    communityGuidelines: [
        {
            title: 'Be Respectful',
            description: 'Treat everyone with kindness and respect. No harassment, bullying, or hate speech.',
            icon: '🤝'
        },
        {
            title: 'Be Authentic',
            description: 'Be yourself. No fake profiles, impersonation, or misleading information.',
            icon: '✨'
        },
        {
            title: 'Be Safe',
            description: 'Protect your privacy. Don\'t share personal information like address, phone number, or financial details.',
            icon: '🔒'
        },
        {
            title: 'Be Appropriate',
            description: 'Keep conversations clean. No explicit content, nudity, or inappropriate material.',
            icon: '📵'
        },
        {
            title: 'Be Honest',
            description: 'Don\'t scam, spam, or deceive others. Report suspicious behavior.',
            icon: '⚠️'
        },
        {
            title: 'Be Friendly',
            description: 'Bondly is for making friends. Be open to genuine connections and meaningful conversations.',
            icon: '💙'
        }
    ],
    
    // Show community guidelines
    showGuidelines: () => {
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
            <div style="background: var(--white); padding: var(--spacing-lg); border-radius: var(--radius-lg); max-width: 500px; width: 100%; max-height: 80vh; overflow-y: auto;">
                <h2 style="margin-bottom: var(--spacing-md); text-align: center;">Community Guidelines</h2>
                <p style="margin-bottom: var(--spacing-lg); color: var(--gray-600); text-align: center;">Please follow these guidelines to keep Bondly safe and welcoming for everyone.</p>
                
                ${Moderation.communityGuidelines.map(guideline => `
                    <div style="padding: var(--spacing-md); border: 1px solid var(--gray-200); border-radius: var(--radius-md); margin-bottom: var(--spacing-md);">
                        <div style="display: flex; align-items: center; gap: var(--spacing-sm); margin-bottom: var(--spacing-xs);">
                            <span style="font-size: 1.5rem;">${guideline.icon}</span>
                            <h3 style="margin: 0;">${guideline.title}</h3>
                        </div>
                        <p style="margin: 0; color: var(--gray-600); font-size: 0.875rem;">${guideline.description}</p>
                    </div>
                `).join('')}
                
                <button onclick="this.parentElement.parentElement.remove();" style="width: 100%; background: var(--soft-blue); color: var(--white); border: none; padding: var(--spacing-md); border-radius: var(--radius-md); cursor: pointer; font-weight: 600;">I Understand</button>
            </div>
        `;
        
        document.body.appendChild(modal);
    },
    
    // Content filtering
    filterContent: (text) => {
        if (!text) return text;
        
        // Basic profanity filter (can be expanded)
        const profanityList = [
            'badword1', 'badword2', 'badword3'
            // Add more as needed
        ];
        
        let filteredText = text;
        
        profanityList.forEach(word => {
            const regex = new RegExp(word, 'gi');
            filteredText = filteredText.replace(regex, '*'.repeat(word.length));
        });
        
        return filteredText;
    },
    
    // Check if content violates guidelines
    checkContentViolation: (text) => {
        if (!text) return false;
        
        const violations = [];
        
        // Check for excessive caps (shouting)
        if (text.length > 10 && text === text.toUpperCase()) {
            violations.push('excessive_caps');
        }
        
        // Check for spam patterns (repeated substring of length >= 3)
        const isRepeatedPattern = (str) => {
            if (str.length < 6) return false;
            const doubleStr = str + str;
            return doubleStr.indexOf(str, 1) !== str.length;
        };
        if (isRepeatedPattern(text)) {
            violations.push('repetition');
        }
        
        // Check for excessive links
        const linkCount = (text.match(/https?:\/\//g) || []).length;
        if (linkCount > 3) {
            violations.push('excessive_links');
        }
        
        // Check for personal info patterns (basic)
        if (/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(text)) {
            violations.push('phone_number');
        }
        
        if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(text)) {
            violations.push('email');
        }
        
        return violations.length > 0 ? violations : null;
    },
    
    // Flag content for review
    flagContent: async (contentId, contentType, reason) => {
        if (!FirebaseService.isInitialized()) return;
        
        const db = FirebaseService.getDb();
        
        try {
            await db.collection('flaggedContent').add({
                contentId,
                contentType,
                reason,
                status: 'pending',
                flaggedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
        } catch (error) {
            console.error('Error flagging content:', error);
        }
    },
    
    // Get user violation count
    getViolationCount: async (userId) => {
        if (!FirebaseService.isInitialized()) return 0;
        
        const db = FirebaseService.getDb();
        
        try {
            const snapshot = await db.collection('userViolations')
                .where('userId', '==', userId)
                .get();
            
            return snapshot.size;
        } catch (error) {
            console.error('Error getting violation count:', error);
            return 0;
        }
    },
    
    // Add user violation
    addViolation: async (userId, violationType, description) => {
        if (!FirebaseService.isInitialized()) return;
        
        const db = FirebaseService.getDb();
        
        try {
            await db.collection('userViolations').add({
                userId,
                violationType,
                description,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Check if user should be suspended
            const violationCount = await Moderation.getViolationCount(userId);
            
            if (violationCount >= 5) {
                await Moderation.suspendUser(userId, 'Multiple violations');
            }
            
        } catch (error) {
            console.error('Error adding violation:', error);
        }
    },
    
    // Suspend user
    suspendUser: async (userId, reason) => {
        if (!FirebaseService.isInitialized()) return;
        
        const db = FirebaseService.getDb();
        
        try {
            await db.collection('users').doc(userId).update({
                suspended: true,
                suspensionReason: reason,
                suspendedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
        } catch (error) {
            console.error('Error suspending user:', error);
        }
    },
    
    // Check if user is suspended
    isSuspended: async (userId) => {
        if (!FirebaseService.isInitialized()) return false;
        
        const db = FirebaseService.getDb();
        
        try {
            const doc = await db.collection('users').doc(userId).get();
            const userData = doc.data();
            return userData?.suspended || false;
        } catch (error) {
            console.error('Error checking suspension status:', error);
            return false;
        }
    },
    
    // Auto-moderate message
    autoModerate: async (message) => {
        const violations = Moderation.checkContentViolation(message);
        
        if (violations) {
            console.log('Content violations detected:', violations);
            
            // Could take various actions:
            // - Filter the content
            // - Flag for review
            // - Warn the user
            // - Block the message
            
            return {
                allowed: false,
                violations,
                filtered: Moderation.filterContent(message)
            };
        }
        
        return {
            allowed: true,
            violations: null,
            filtered: message
        };
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Moderation;
}
