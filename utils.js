// Utility Functions for Bondly

const Utils = {
    // Generate unique ID
    generateId: () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },
    
    // Format timestamp
    formatTime: (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
        
        return date.toLocaleDateString();
    },
    
    // Format time for messages
    formatMessageTime: (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },
    
    // Get greeting based on time of day
    getGreeting: () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return 'Good morning ☀️';
        if (hour >= 12 && hour < 17) return 'Good afternoon 🌤️';
        if (hour >= 17 && hour < 21) return 'Good evening 🌙';
        return 'Good night �';
    },
    
    // Truncate text
    truncate: (text, maxLength) => {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },
    
    // Fuzzy search for typo tolerance
    fuzzyMatch: (text, query) => {
        if (!text || !query) return false;
        const lowerText = text.toLowerCase();
        const lowerQuery = query.toLowerCase();
        
        // Exact match
        if (lowerText.includes(lowerQuery)) return true;
        
        // Levenshtein distance for close matches
        const distance = Utils.levenshteinDistance(lowerText, lowerQuery);
        return distance <= 2;
    },
    
    // Levenshtein distance algorithm
    levenshteinDistance: (str1, str2) => {
        const m = str1.length;
        const n = str2.length;
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
        
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (str1[i - 1] === str2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = 1 + Math.min(
                        dp[i - 1][j],
                        dp[i][j - 1],
                        dp[i - 1][j - 1]
                    );
                }
            }
        }
        
        return dp[m][n];
    },
    
    // Calculate match score between users
    calculateMatchScore: (user1, user2) => {
        let score = 0;
        let factors = 0;
        
        // Shared interests
        if (user1.interests && user2.interests) {
            const shared = user1.interests.filter(i => user2.interests.includes(i));
            score += (shared.length / Math.max(user1.interests.length, user2.interests.length)) * 30;
            factors++;
        }
        
        // Language compatibility
        if (user1.languages && user2.languages && user1.learning && user2.learning) {
            const canTeach1 = user1.languages.filter(l => user2.learning.includes(l));
            const canTeach2 = user2.languages.filter(l => user1.learning.includes(l));
            score += ((canTeach1.length + canTeach2.length) / 2) * 25;
            factors++;
        }
        
        // Timezone proximity (within 3 hours)
        if (user1.timezone && user2.timezone) {
            const diff = Math.abs(parseInt(user1.timezone) - parseInt(user2.timezone));
            if (diff <= 3) {
                score += 20;
            }
            factors++;
        }
        
        // Shared personality tags
        if (user1.personality && user2.personality) {
            const shared = user1.personality.filter(p => user2.personality.includes(p));
            score += (shared.length / Math.max(user1.personality.length, user2.personality.length)) * 15;
            factors++;
        }
        
        // Deep mode compatibility
        if (user1.deepMode && user2.deepMode) {
            score += 10;
            factors++;
        }
        
        // Normalize score
        return Math.min(100, Math.round(score));
    },
    
    // Get random conversation prompt
    getRandomPrompt: () => {
        const prompts = {
            deep: [
                "What belief changed your life?",
                "What helps you feel understood?",
                "What fear do you think people hide most?",
                "What changed your worldview?",
                "What's something you wish everyone understood?",
                "What's the most important lesson you've learned?",
                "What makes you feel alive?",
                "What would you tell your younger self?"
            ],
            fun: [
                "What weird food combination do you secretly love?",
                "What's your most useless talent?",
                "What's the weirdest dream you've had?",
                "What's your guilty pleasure?",
                "What's the funniest thing that happened to you?",
                "What would you do if you won the lottery?",
                "What's your favorite joke?"
            ],
            casual: [
                "What's your comfort food?",
                "What are you currently reading/watching?",
                "What's your favorite way to relax?",
                "What's your favorite season?",
                "What's your dream travel destination?",
                "What's your favorite hobby?",
                "What's the best advice you've received?"
            ],
            language: [
                "What word in your language has no translation?",
                "What's your favorite expression in your language?",
                "What's the hardest thing about learning a new language?",
                "What language do you want to learn next?",
                "What's your favorite word in English?",
                "What cultural difference surprised you?"
            ]
        };
        
        const categories = Object.keys(prompts);
        const category = categories[Math.floor(Math.random() * categories.length)];
        const categoryPrompts = prompts[category];
        return categoryPrompts[Math.floor(Math.random() * categoryPrompts.length)];
    },
    
    // Show toast notification
    showToast: (message, duration = 3000) => {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toast-message');
        
        if (toast && toastMessage) {
            toastMessage.textContent = message;
            toast.classList.remove('hidden');
            
            setTimeout(() => {
                toast.classList.add('hidden');
            }, duration);
        }
    },
    
    // Show loading overlay
    showLoading: (message = 'Loading...') => {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.querySelector('p').textContent = message;
            overlay.classList.remove('hidden');
        }
    },
    
    // Hide loading overlay
    hideLoading: () => {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    },
    
    // Validate email
    isValidEmail: (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    
    // Validate password strength
    isStrongPassword: (password) => {
        return password.length >= 8;
    },
    
    // Sanitize user input
    sanitizeInput: (input) => {
        if (typeof input !== 'string') return input;
        return input
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .trim();
    },

    // Escape text for safe HTML rendering without changing stored values
    escapeHTML: (input) => {
        if (input === null || input === undefined) return '';
        return String(input)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
    },

    // Decode HTML entities for display
    decodeHTML: (input) => {
        if (typeof input !== 'string') return input;
        const textArea = document.createElement('textarea');
        textArea.innerHTML = input;
        return textArea.value;
    },
    
    // Parse comma-separated tags
    parseTags: (tagsString) => {
        if (!tagsString) return [];
        return tagsString
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);
    },
    
    // Format tags for display
    formatTags: (tags) => {
        if (!tags || !Array.isArray(tags)) return '';
        return tags.join(', ');
    },
    
    // Get flag emoji for country
    getCountryFlag: (country) => {
        const flags = {
            'USA': '🇺🇸',
            'UK': '🇬🇧',
            'Canada': '🇨🇦',
            'Australia': '🇦🇺',
            'Germany': '🇩🇪',
            'France': '🇫🇷',
            'Spain': '🇪🇸',
            'Italy': '🇮🇹',
            'Japan': '🇯🇵',
            'China': '🇨🇳',
            'India': '🇮🇳',
            'Brazil': '🇧🇷',
            'Mexico': '🇲🇽',
            'South Korea': '🇰🇷',
            'Russia': '🇷🇺',
            'Iran': '🇮🇷',
            'Turkey': '🇹🇷',
            'Netherlands': '🇳🇱',
            'Sweden': '🇸🇪',
            'Norway': '🇳🇴',
            'Denmark': '🇩🇰',
            'Finland': '🇫🇮',
            'Poland': '🇵🇱',
            'Portugal': '🇵🇹',
            'Greece': '🇬🇷',
            'Argentina': '🇦🇷',
            'Colombia': '🇨🇴',
            'Chile': '🇨🇱',
            'Peru': '🇵🇪',
            'Vietnam': '🇻🇳',
            'Thailand': '🇹🇭',
            'Indonesia': '🇮🇩',
            'Philippines': '🇵🇭',
            'Malaysia': '🇲🇾',
            'Singapore': '🇸🇬',
            'Egypt': '🇪🇬',
            'South Africa': '🇿🇦',
            'Nigeria': '🇳🇬',
            'Kenya': '🇰🇪',
            'Morocco': '🇲🇦'
        };
        
        return flags[country] || '🌍';
    },
    
    // Debounce function
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Throttle function
    throttle: (func, limit) => {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    // Local storage helpers
    storage: {
        set: (key, value) => {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (e) {
                console.error('Storage set error:', e);
            }
        },
        
        get: (key) => {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : null;
            } catch (e) {
                console.error('Storage get error:', e);
                return null;
            }
        },
        
        remove: (key) => {
            try {
                localStorage.removeItem(key);
            } catch (e) {
                console.error('Storage remove error:', e);
            }
        },
        
        clear: () => {
            try {
                localStorage.clear();
            } catch (e) {
                console.error('Storage clear error:', e);
            }
        }
    },
    
    // Sanitize user object to protect email privacy
    sanitizeUser: (userData) => {
        if (!userData) return null;
        const sanitized = { ...userData };
        if (typeof Auth !== 'undefined' && Auth.currentUser) {
            if (sanitized.uid !== Auth.currentUser.uid) {
                delete sanitized.email;
            }
        } else {
            // Safety fallback: if auth is not initialized or user is not logged in, remove email
            delete sanitized.email;
        }
        return sanitized;
    },

    // Build a public-safe user object for cards, profiles, chat lists, and feeds
    sanitizePublicUser: (userData) => {
        const user = Utils.sanitizeUser(userData);
        if (!user) return null;
        delete user.email;
        return user;
    },

    // Shared Cloudinary upload helper used by media features
    uploadToCloudinary: async (file, resourceType = 'auto') => {
        if (!file) throw new Error('No file selected');

        const endpointType = resourceType === 'auto'
            ? (file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'raw')
            : resourceType;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'bondly_upload');

        console.log('[Bondly] Cloudinary upload started:', {
            name: file.name,
            type: file.type,
            size: file.size,
            endpointType
        });

        const response = await fetch(`https://api.cloudinary.com/v1_1/dvjdqc8pj/${endpointType}/upload`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (!response.ok || data.error) {
            console.error('[Bondly] Cloudinary upload failed:', data.error || data);
            throw new Error(data.error?.message || 'Upload failed');
        }

        console.log('[Bondly] Cloudinary upload complete:', data.secure_url);
        return data;
    },

    // Check if device is mobile
    isMobile: () => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },
    
    // Get device info
    getDeviceInfo: () => {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            isMobile: Utils.isMobile(),
            screenWidth: window.screen.width,
            screenHeight: window.screen.height
        };
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}
