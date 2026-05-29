// Safety Module for Bondly

const Safety = {
    // Block a user
    blockUser: async (userId, blockedUserId) => {
        if (!FirebaseService.isInitialized()) return;
        
        const db = FirebaseService.getDb();
        
        if (!confirm('Are you sure you want to block this user?')) return;
        
        Utils.showLoading('Blocking user...');
        
        try {
            // Add to blocked users list
            await db.collection('users').doc(userId).collection('blocked').doc(blockedUserId).set({
                blockedUserId,
                blockedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Remove friend if exists
            const friendsSnapshot = await db.collection('friends')
                .where('participants', 'array-contains', userId)
                .get();
            
            const batch = db.batch();
            
            friendsSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.participants.includes(blockedUserId)) {
                    batch.delete(doc.ref);
                }
            });
            
            await batch.commit();
            
            Utils.showToast('User blocked');
            Mobile.hapticFeedback('success');
            
        } catch (error) {
            console.error('Error blocking user:', error);
            Utils.showToast('Error blocking user');
        } finally {
            Utils.hideLoading();
        }
    },
    
    // Unblock a user
    unblockUser: async (userId, blockedUserId) => {
        if (!FirebaseService.isInitialized()) return;
        
        const db = FirebaseService.getDb();
        
        try {
            await db.collection('users').doc(userId).collection('blocked').doc(blockedUserId).delete();
            
            Utils.showToast('User unblocked');
            
        } catch (error) {
            console.error('Error unblocking user:', error);
            Utils.showToast('Error unblocking user');
        }
    },
    
    // Check if user is blocked
    isBlocked: async (userId, targetUserId) => {
        if (!FirebaseService.isInitialized()) return false;
        
        const db = FirebaseService.getDb();
        
        try {
            const doc = await db.collection('users').doc(userId).collection('blocked').doc(targetUserId).get();
            return doc.exists;
        } catch (error) {
            console.error('Error checking block status:', error);
            return false;
        }
    },
    
    // Get blocked users list
    getBlockedUsers: async (userId) => {
        if (!FirebaseService.isInitialized()) return [];
        
        const db = FirebaseService.getDb();
        
        try {
            const snapshot = await db.collection('users').doc(userId).collection('blocked').get();
            
            const blockedUsers = [];
            
            for (const doc of snapshot.docs) {
                const data = doc.data();
                const userDoc = await db.collection('users').doc(data.blockedUserId).get();
                if (userDoc.exists) {
                    blockedUsers.push({
                        id: doc.id,
                        ...userDoc.data()
                    });
                }
            }
            
            return blockedUsers;
            
        } catch (error) {
            console.error('Error getting blocked users:', error);
            return [];
        }
    },
    
    // Show blocked users
    showBlockedUsers: async () => {
        if (!Auth.currentUser) return;
        
        const blockedUsers = await Safety.getBlockedUsers(Auth.currentUser.uid);
        
        if (blockedUsers.length === 0) {
            Utils.showToast('No blocked users');
            return;
        }
        
        // Create a simple modal to show blocked users
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
        `;
        
        modal.innerHTML = `
            <div style="background: var(--white); padding: var(--spacing-lg); border-radius: var(--radius-lg); max-width: 400px; width: 90%; max-height: 80vh; overflow-y: auto;">
                <h2 style="margin-bottom: var(--spacing-md);">Blocked Users</h2>
                ${blockedUsers.map(user => `
                    <div style="display: flex; align-items: center; gap: var(--spacing-md); padding: var(--spacing-md); border-bottom: 1px solid var(--gray-200);">
                        <img src="${user.avatar}" alt="${user.displayName}" style="width: 40px; height: 40px; border-radius: 50%;">
                        <div style="flex: 1;">
                            <div style="font-weight: 600;">${user.displayName}</div>
                            <div style="font-size: 0.875rem; color: var(--gray-500);">@${user.username}</div>
                        </div>
                        <button onclick="Safety.unblockUser('${Auth.currentUser.uid}', '${user.uid}'); this.parentElement.remove();" style="background: var(--soft-blue); color: var(--white); border: none; padding: var(--spacing-sm) var(--spacing-md); border-radius: var(--radius-md); cursor: pointer;">Unblock</button>
                    </div>
                `).join('')}
                <button onclick="this.parentElement.parentElement.remove();" style="width: 100%; margin-top: var(--spacing-md); background: var(--gray-200); border: none; padding: var(--spacing-md); border-radius: var(--radius-md); cursor: pointer;">Close</button>
            </div>
        `;
        
        document.body.appendChild(modal);
    },
    
    // Report a user
    reportUser: async (userId, reportedUserId, reason) => {
        if (!FirebaseService.isInitialized()) return;
        
        const db = FirebaseService.getDb();
        
        Utils.showLoading('Submitting report...');
        
        try {
            await db.collection('reports').add({
                reporter: userId,
                reported: reportedUserId,
                reason,
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            Utils.showToast('Report submitted');
            Mobile.hapticFeedback('success');
            
        } catch (error) {
            console.error('Error reporting user:', error);
            Utils.showToast('Error submitting report');
        } finally {
            Utils.hideLoading();
        }
    },
    
    // Show report dialog
    showReportDialog: (reportedUserId, reportedUserName) => {
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
        `;
        
        modal.innerHTML = `
            <div style="background: var(--white); padding: var(--spacing-lg); border-radius: var(--radius-lg); max-width: 400px; width: 90%;">
                <h2 style="margin-bottom: var(--spacing-md);">Report ${reportedUserName}</h2>
                <p style="margin-bottom: var(--spacing-md); color: var(--gray-600);">Please select a reason for reporting this user:</p>
                <select id="report-reason" style="width: 100%; padding: var(--spacing-md); border: 2px solid var(--gray-200); border-radius: var(--radius-md); margin-bottom: var(--spacing-md);">
                    <option value="">Select a reason</option>
                    <option value="harassment">Harassment</option>
                    <option value="spam">Spam</option>
                    <option value="inappropriate_content">Inappropriate content</option>
                    <option value="impersonation">Impersonation</option>
                    <option value="scam">Scam or fraud</option>
                    <option value="other">Other</option>
                </select>
                <textarea id="report-details" placeholder="Additional details (optional)" style="width: 100%; padding: var(--spacing-md); border: 2px solid var(--gray-200); border-radius: var(--radius-md); margin-bottom: var(--spacing-md); min-height: 80px;"></textarea>
                <div style="display: flex; gap: var(--spacing-sm);">
                    <button onclick="this.parentElement.parentElement.parentElement.remove();" style="flex: 1; background: var(--gray-200); border: none; padding: var(--spacing-md); border-radius: var(--radius-md); cursor: pointer;">Cancel</button>
                    <button onclick="const reason = document.getElementById('report-reason').value; if (!reason) { Utils.showToast('Please select a reason'); return; } Safety.reportUser('${Auth.currentUser.uid}', '${reportedUserId}', reason); this.parentElement.parentElement.parentElement.remove();" style="flex: 1; background: var(--error); color: var(--white); border: none; padding: var(--spacing-md); border-radius: var(--radius-md); cursor: pointer;">Submit Report</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    },
    
    // Mute a user
    muteUser: async (userId, mutedUserId, duration = 24) => {
        if (!FirebaseService.isInitialized()) return;
        
        const db = FirebaseService.getDb();
        
        try {
            const unmuteAt = new Date(Date.now() + duration * 60 * 60 * 1000);
            
            await db.collection('users').doc(userId).collection('muted').doc(mutedUserId).set({
                mutedUserId,
                mutedAt: firebase.firestore.FieldValue.serverTimestamp(),
                unmuteAt: unmuteAt
            });
            
            Utils.showToast(`User muted for ${duration} hours`);
            
        } catch (error) {
            console.error('Error muting user:', error);
            Utils.showToast('Error muting user');
        }
    },
    
    // Unmute a user
    unmuteUser: async (userId, mutedUserId) => {
        if (!FirebaseService.isInitialized()) return;
        
        const db = FirebaseService.getDb();
        
        try {
            await db.collection('users').doc(userId).collection('muted').doc(mutedUserId).delete();
            
            Utils.showToast('User unmuted');
            
        } catch (error) {
            console.error('Error unmuting user:', error);
            Utils.showToast('Error unmuting user');
        }
    },
    
    // Check if user is muted
    isMuted: async (userId, targetUserId) => {
        if (!FirebaseService.isInitialized()) return false;
        
        const db = FirebaseService.getDb();
        
        try {
            const doc = await db.collection('users').doc(userId).collection('muted').doc(targetUserId).get();
            
            if (!doc.exists) return false;
            
            const data = doc.data();
            const now = new Date();
            const unmuteAt = data.unmuteAt?.toDate();
            
            // Check if mute has expired
            if (unmuteAt && now > unmuteAt) {
                await doc.ref.delete();
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Error checking mute status:', error);
            return false;
        }
    },
    
    // Hide profile from user
    hideProfileFrom: async (userId, targetUserId) => {
        if (!FirebaseService.isInitialized()) return;
        
        const db = FirebaseService.getDb();
        
        try {
            await db.collection('users').doc(userId).collection('hiddenFrom').doc(targetUserId).set({
                targetUserId,
                hiddenAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            Utils.showToast('Profile hidden from this user');
            
        } catch (error) {
            console.error('Error hiding profile:', error);
            Utils.showToast('Error hiding profile');
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Safety;
}
