// Discover Module for Bondly

const Discover = {
    users: [],
    currentFilter: 'all',
    searchQuery: '',
    
    // Initialize discover screen
    init: () => {
        console.log('Discover module initializing');
        Discover.loadUsers();
        Discover.setupFilters();
        Discover.setupSearch();
    },
    
    // Refresh discover screen
    refresh: () => {
        Discover.loadUsers();
    },
    
    // Load users for discovery
    loadUsers: async () => {
        if (!Auth.currentUser) return;
        if (!FirebaseService.isInitialized()) return;
        
        const db = FirebaseService.getDb();
        const userId = Auth.currentUser.uid;
        const resultsContainer = document.getElementById('discover-results');
        
        Utils.showLoading('Discovering people...');
        
        try {
            // Get current user data for matching
            const userDoc = await db.collection('users').doc(userId).get();
            const userData = userDoc.data();
            
            // Build query based on current filter
            let query = db.collection('users').where('uid', '!=', userId);
            
            // Apply specific filter to query
            if (Discover.currentFilter === 'deepmode') {
                query = query.where('deepMode', '==', true);
            }
            
            // Get users
            const usersSnapshot = await query.limit(50).get();
            
            const users = [];
            
            usersSnapshot.forEach(doc => {
                users.push(doc.data());
            });
            
            // Calculate match scores
            const usersWithScores = users.map(user => ({
                ...user,
                matchScore: Utils.calculateMatchScore(userData, user)
            }));
            
            // Sort by match score
            usersWithScores.sort((a, b) => b.matchScore - a.matchScore);
            
            Discover.users = usersWithScores;
            
            // Apply filters and search
            Discover.renderResults();
            
        } catch (error) {
            console.error('Error loading users:', error);
            resultsContainer.innerHTML = '<p style="text-align: center; color: var(--gray-500);">Unable to load users</p>';
        } finally {
            Utils.hideLoading();
        }
    },
    
    // Setup filters
    setupFilters: () => {
        const filterChips = document.querySelectorAll('.filter-chip');
        
        filterChips.forEach(chip => {
            chip.addEventListener('click', () => {
                filterChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                Discover.currentFilter = chip.dataset.filter;
                Discover.renderResults();
            });
        });
    },
    
    // Setup search
    setupSearch: () => {
        const searchInput = document.getElementById('discover-search');
        
        searchInput?.addEventListener('input', Utils.debounce((e) => {
            Discover.searchQuery = e.target.value;
            Discover.renderResults();
        }, 300));
    },
    
    // Render results
    renderResults: () => {
        const resultsContainer = document.getElementById('discover-results');
        
        // Filter users
        let filteredUsers = Discover.users;
        
        // Apply category filter (client-side for non-deepmode filters)
        if (Discover.currentFilter === 'language') {
            filteredUsers = filteredUsers.filter(user => 
                user.languages && user.languages.length > 0
            );
        } else if (Discover.currentFilter === 'interest') {
            filteredUsers = filteredUsers.filter(user => 
                user.interests && user.interests.length > 0
            );
        } else if (Discover.currentFilter === 'country') {
            filteredUsers = filteredUsers.filter(user => 
                user.country && user.country.length > 0
            );
        }
        
        // Apply search with typo tolerance
        if (Discover.searchQuery) {
            filteredUsers = filteredUsers.filter(user => 
                Utils.fuzzyMatch(user.displayName, Discover.searchQuery) ||
                Utils.fuzzyMatch(user.username, Discover.searchQuery) ||
                user.interests?.some(interest => Utils.fuzzyMatch(interest, Discover.searchQuery)) ||
                user.languages?.some(lang => Utils.fuzzyMatch(lang, Discover.searchQuery)) ||
                Utils.fuzzyMatch(user.country, Discover.searchQuery)
            );
        }
        
        if (filteredUsers.length === 0) {
            resultsContainer.innerHTML = `
                <div style="text-align: center; color: var(--gray-500); padding: var(--spacing-xl);">
                    <p>No users found</p>
                    <p style="font-size: 0.875rem;">Try adjusting your filters or search terms</p>
                </div>
            `;
            return;
        }
        
        resultsContainer.innerHTML = filteredUsers.map(user => `
            <div class="recommendation-card">
                <img src="${user.avatar}" alt="${user.displayName}" class="recommendation-avatar">
                <div class="recommendation-info">
                    <div class="recommendation-name">${user.displayName} ${user.deepMode ? '🌙' : ''}</div>
                    <div class="recommendation-details">
                        ${Utils.getCountryFlag(user.country)} ${user.country} • ${user.matchScore}% match
                    </div>
                    <div class="recommendation-tags">
                        ${user.languages?.slice(0, 2).map(lang => 
                            `<span class="tag">🌍 ${lang}</span>`
                        ).join('')}
                        ${user.interests?.slice(0, 2).map(interest => 
                            `<span class="tag">${interest}</span>`
                        ).join('')}
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; gap: var(--spacing-xs);">
                    <button class="connect-btn" onclick="App.openUserProfile('${user.uid}')">
                        👤 View
                    </button>
                    <button class="connect-btn" onclick="Home.sendFriendRequest('${user.uid}')">
                        💙 Connect
                    </button>
                </div>
            </div>
        `).join('');
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Discover;
}
