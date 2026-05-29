// Deep Mode Module for Bondly

const DeepMode = {
    conversationPrompts: {
        philosophy: [
            "What's your philosophy on life?",
            "Do you believe in fate or free will?",
            "What does success mean to you?",
            "What's the most important lesson life has taught you?",
            "What would you do if you knew you couldn't fail?",
            "What's something you've changed your mind about recently?",
            "What do you think happens after we die?",
            "What's the meaning of life to you?"
        ],
        psychology: [
            "What makes you feel most alive?",
            "What's your biggest fear and how do you cope with it?",
            "What's a misconception people have about you?",
            "What emotional experience shaped you the most?",
            "What do you value most in yourself?",
            "What's something you wish everyone understood about mental health?",
            "How do you define happiness?",
            "What's your relationship with vulnerability?"
        ],
        growth: [
            "What personal growth are you most proud of?",
            "What habit changed your life for the better?",
            "What's something you used to struggle with but don't anymore?",
            "What would you tell your younger self?",
            "What's a risk you took that paid off?",
            "What's something you're currently working on improving?",
            "What failure taught you the most?",
            "What's the best advice you've ever received?"
        ],
        dreams: [
            "What's your biggest dream in life?",
            "If money wasn't a factor, what would you do with your life?",
            "What legacy do you want to leave behind?",
            "What's on your bucket list and why?",
            "What does your ideal life look like?",
            "What's a dream you've achieved and how did it feel?",
            "What's something you've always wanted to learn?",
            "Where do you see yourself in 10 years?"
        ],
        relationships: [
            "What do you value most in a friendship?",
            "What's the most important quality in a person?",
            "How do you handle conflict in relationships?",
            "What's something a friend did that meant a lot to you?",
            "What makes someone trustworthy to you?",
            "What's your love language?",
            "What's the hardest thing about maintaining friendships?",
            "What role do friends play in your life?"
        ]
    },
    
    // Get random deep conversation prompt
    getRandomPrompt: (category = null) => {
        if (category && DeepMode.conversationPrompts[category]) {
            const prompts = DeepMode.conversationPrompts[category];
            return prompts[Math.floor(Math.random() * prompts.length)];
        }
        
        // Get random category
        const categories = Object.keys(DeepMode.conversationPrompts);
        const randomCategory = categories[Math.floor(Math.random() * categories.length)];
        const prompts = DeepMode.conversationPrompts[randomCategory];
        return prompts[Math.floor(Math.random() * prompts.length)];
    },
    
    // Get prompts by category
    getPromptsByCategory: (category) => {
        return DeepMode.conversationPrompts[category] || [];
    },
    
    // Get all categories
    getCategories: () => {
        return Object.keys(DeepMode.conversationPrompts);
    },
    
    // Toggle deep mode for user
    toggleDeepMode: async (userId, enabled) => {
        if (!FirebaseService.isInitialized()) return;
        
        const db = FirebaseService.getDb();
        
        try {
            await db.collection('users').doc(userId).update({
                deepMode: enabled
            });
            
            Utils.storage.set('deepMode', enabled);
            
            const message = enabled ? 'Deep mode enabled 🌙' : 'Deep mode disabled';
            Utils.showToast(message);
            
        } catch (error) {
            console.error('Error toggling deep mode:', error);
            Utils.showToast('Error updating deep mode');
        }
    },
    
    // Find deep mode users
    findDeepModeUsers: async (userId) => {
        if (!FirebaseService.isInitialized()) return [];
        
        const db = FirebaseService.getDb();
        
        try {
            // Get user data
            const userDoc = await db.collection('users').doc(userId).get();
            const userData = userDoc.data();
            
            // Find deep mode users
            const usersSnapshot = await db.collection('users')
                .where('uid', '!=', userId)
                .where('deepMode', '==', true)
                .limit(50)
                .get();
            
            const users = [];
            
            usersSnapshot.forEach(doc => {
                const user = doc.data();
                const matchScore = Matching.calculateScore(userData, user);
                users.push({ ...user, matchScore });
            });
            
            // Sort by match score
            users.sort((a, b) => b.matchScore - a.matchScore);
            
            return users;
            
        } catch (error) {
            console.error('Error finding deep mode users:', error);
            return [];
        }
    },
    
    // Start deep conversation
    startDeepConversation: async (chatId, prompt) => {
        if (!FirebaseService.isInitialized()) return;
        
        const db = FirebaseService.getDb();
        
        try {
            // Add system message with prompt
            await db.collection('chats').doc(chatId)
                .collection('messages').add({
                sender: 'system',
                text: `🌙 Deep Mode Prompt: ${prompt}`,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                isSystem: true
            });
            
            Utils.showToast('Deep conversation started');
            
        } catch (error) {
            console.error('Error starting deep conversation:', error);
            Utils.showToast('Error starting conversation');
        }
    },
    
    // Check if conversation is meaningful (for achievements)
    isMeaningfulConversation: (messages) => {
        if (!messages || messages.length < 5) return false;
        
        // Check for long messages
        const longMessages = messages.filter(m => m.text && m.text.length > 100);
        if (longMessages.length < 3) return false;
        
        // Check for variety (not just short responses)
        const avgLength = messages.reduce((sum, m) => sum + (m.text?.length || 0), 0) / messages.length;
        if (avgLength < 50) return false;
        
        return true;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DeepMode;
}
