# PHASE 3 - Production QA & Real Testing Guide

## Overview
This guide provides step-by-step instructions for testing Bondly with real Firebase. Before testing can begin, Firebase must be configured with real credentials.

## Prerequisites

1. **Configure Firebase** (REQUIRED)
   - Follow `FIREBASE_SETUP_GUIDE.md`
   - Create Firebase project at console.firebase.google.com
   - Enable Auth, Firestore, Realtime Database, Storage
   - Copy config to `app/firebase.js`
   - Apply `firestore.rules` in Firebase Console

2. **Test Environment**
   - Use Chrome DevTools for mobile simulation
   - Test on actual devices if possible
   - Clear browser cache before testing

## Test Accounts Setup

Create 3 test accounts for comprehensive testing:

### Account A
- Email: `test.account.a@example.com`
- Username: `testusera`
- Display Name: `Test User A`
- Password: `Test123456`

### Account B
- Email: `test.account.b@example.com`
- Username: `testuserb`
- Display Name: `Test User B`
- Password: `Test123456`

### Account C
- Email: `test.account.c@example.com`
- Username: `testuserc`
- Display Name: `Test User C`
- Password: `Test123456`

## Testing Checklist

### 1. AUTH TESTING

#### Email Signup
- [ ] Navigate to signup form
- [ ] Enter valid email, username, password
- [ ] Submit form
- [ ] Verify account created
- [ ] Verify profile created in Firestore
- [ ] Verify user stats initialized
- [ ] Verify redirected to main screen

#### Invalid Cases - Email Signup
- [ ] Try duplicate email → Error message
- [ ] Try weak password (< 8 chars) → Error message
- [ ] Try short username (< 3 chars) → Error message
- [ ] Try invalid username (special chars) → Error message
- [ ] Try missing fields → Error message
- [ ] Try invalid email format → Error message

#### Email Login
- [ ] Enter valid email and password
- [ ] Submit form
- [ ] Verify logged in successfully
- [ ] Verify session persists on refresh
- [ ] Verify online status updates

#### Invalid Cases - Email Login
- [ ] Try wrong password → Error message
- [ ] Try non-existent email → Error message
- [ ] Try missing fields → Error message

#### Google Authentication
- [ ] Click "Continue with Google"
- [ ] Complete Google sign-in flow
- [ ] Verify account created/loaded
- [ ] Verify profile created if new user
- [ ] Verify unique username generated

#### Logout
- [ ] Click logout button
- [ ] Verify logged out successfully
- [ ] Verify redirected to auth screen
- [ ] Verify online status set to offline
- [ ] Verify local storage cleared

#### Forgot Password
- [ ] Click "Forgot password?" link
- [ ] Enter email address
- [ ] Submit form
- [ ] Verify reset email sent
- [ ] Check email for reset link
- [ ] Test password reset flow

#### Session Persistence
- [ ] Login with Account A
- [ ] Refresh browser
- [ ] Verify still logged in
- [ ] Verify profile loads correctly
- [ ] Close browser, reopen, verify still logged in

---

### 2. FRIEND SYSTEM TESTING

#### Send Friend Request
- [ ] Login as Account A
- [ ] Navigate to Discover
- [ ] Find Account B
- [ ] Click "Connect"
- [ ] Verify request sent
- [ ] Verify toast notification

#### Receive Friend Request
- [ ] Login as Account B
- [ ] Navigate to Friends
- [ ] Verify request visible
- [ ] Verify notification received

#### Accept Friend Request
- [ ] Click "Accept" on request
- [ ] Verify friendship created
- [ ] Verify both users in friend list
- [ ] Verify stats updated
- [ ] Verify notification sent to Account A

#### Decline Friend Request
- [ ] Send request from Account A to Account C
- [ ] Login as Account C
- [ ] Click "Decline"
- [ ] Verify request declined
- [ ] Verify not in friend list

#### Cancel Friend Request
- [ ] Send request from Account A to Account C
- [ ] Click "Cancel" before acceptance
- [ ] Verify request cancelled
- [ ] Verify request removed from list

#### Remove Friend
- [ ] Login as Account A
- [ ] Navigate to Friends
- [ ] Find Account B
- [ ] Remove friend
- [ ] Verify friend removed
- [ ] Verify stats updated

#### Friend Categories
- [ ] Set friend category to "close"
- [ ] Verify category saved
- [ ] Filter by category
- [ ] Verify filter works

#### Favorites
- [ ] Toggle favorite on friend
- [ ] Verify star appears
- [ ] Verify favorite persists
- [ ] Filter by favorites

#### Nicknames
- [ ] Set nickname for friend
- [ ] Verify nickname saved
- [ ] Verify nickname displays

---

### 3. MESSAGING TESTING

#### Real-time Messaging
- [ ] Login as Account A
- [ ] Open chat with Account B
- [ ] Send message "Hello from A"
- [ ] Login as Account B in different browser/incognito
- [ ] Open chat with Account A
- [ ] Verify message received instantly
- [ ] Verify message order correct

#### Typing Indicators
- [ ] Account A starts typing
- [ ] Account B sees "typing..." indicator
- [ ] Account A stops typing
- [ ] Account B sees "Online" indicator

#### Read Receipts
- [ ] Account A sends message
- [ ] Account B opens chat
- [ ] Account A sees read receipt
- [ ] Verify unread count updates

#### Message Editing
- [ ] Account A sends message
- [ ] Edit message
- [ ] Verify "edited" badge appears
- [ ] Account B sees updated message

#### Message Deletion
- [ ] Account A sends message
- [ ] Delete message
- [ ] Verify message removed
- [ ] Account B sees "Message deleted"

#### Reactions
- [ ] Account A sends message
- [ ] Add reaction
- [ ] Verify reaction displays
- [ ] Account B sees reaction

#### Conversation Preview
- [ ] Send message from Account A to B
- [ ] Verify chat list updates with last message
- [ ] Verify timestamp updates

---

### 4. NOTIFICATIONS TESTING

#### Message Notifications
- [ ] Account A sends message to B
- [ ] Account B receives notification
- [ ] Verify notification title and message
- [ ] Verify badge updates
- [ ] Click notification → opens chat

#### Friend Request Notifications
- [ ] Account A sends request to B
- [ ] Account B receives notification
- [ ] Verify notification type
- [ ] Click notification → opens friends

#### Accepted Request Notifications
- [ ] Account B accepts A's request
- [ ] Account A receives notification
- [ ] Verify notification type

#### Badge System
- [ ] Send message to Account B
- [ ] Verify badge count = 1
- [ ] Send another message
- [ ] Verify badge count = 2
- [ ] Mark as read
- [ ] Verify badge count = 0
- [ ] Test 99+ cap

#### Notification Center
- [ ] Navigate to notifications screen
- [ ] Verify notifications grouped by date
- [ ] Verify unread indicators
- [ ] Click notification → navigates correctly
- [ ] Mark as read → indicator disappears
- [ ] Mark all as read → all cleared
- [ ] Delete notification → removed

#### Notification Settings
- [ ] Navigate to notification settings
- [ ] Disable message notifications
- [ ] Send message → no notification
- [ ] Re-enable → notifications work
- [ ] Test all toggles

#### No Duplicates
- [ ] Send multiple messages
- [ ] Verify no duplicate notifications
- [ ] Verify no notification spam

---

### 5. PRESENCE TESTING

#### Online Status
- [ ] Login as Account A
- [ ] Account B sees A as "Online"
- [ ] Verify green indicator

#### Away Status
- [ ] Account A goes idle for 5 minutes
- [ ] Account B sees A as "Away"
- [ ] Verify yellow indicator

#### Offline Status
- [ ] Account A logs out
- [ ] Account B sees A as "Offline"
- [ ] Verify gray indicator

#### Last Seen
- [ ] Account A goes offline
- [ ] Account B sees "Last seen X minutes ago"
- [ ] Verify timestamp accuracy

#### Tab Switching
- [ ] Account A switches tabs
- [ ] Verify status updates to away
- [ ] Account A returns to tab
- [ ] Verify status updates to online

#### Idle Detection
- [ ] Account A inactive for 5 minutes
- [ ] Verify auto-away triggers
- [ ] Account A moves mouse
- [ ] Verify status returns to online

---

### 6. PROFILE SYSTEM TESTING

#### Profile Editing
- [ ] Navigate to profile
- [ ] Click "Edit Profile"
- [ ] Change display name
- [ ] Change bio
- [ ] Change interests
- [ ] Change languages
- [ ] Save changes
- [ ] Verify changes persist
- [ ] Refresh page
- [ ] Verify changes still there

#### Profile Image Upload
- [ ] Click profile avatar
- [ ] Select image file
- [ ] Verify upload progress
- [ ] Verify image updates
- [ ] Verify image persists

#### Invalid Cases - Profile
- [ ] Try name < 2 characters → Error
- [ ] Try non-image file → Error
- [ ] Try file > 5MB → Error

---

### 7. DISCOVERY SYSTEM TESTING

#### Filters
- [ ] Navigate to Discover
- [ ] Click "Deep Mode" filter
- [ ] Verify only deep mode users shown
- [ ] Click "Language" filter
- [ ] Verify users with languages shown
- [ ] Click "Interest" filter
- [ ] Verify users with interests shown
- [ ] Click "Country" filter
- [ ] Verify users with country shown

#### Search
- [ ] Search by display name
- [ ] Search by username
- [ ] Search by interest
- [ ] Search by language
- [ ] Search by country
- [ ] Test typo tolerance (e.g., "Jhon" for "John")

#### Match Scoring
- [ ] Verify users sorted by match score
- [ ] Verify match percentage displays

---

### 8. MOBILE QA

#### Viewport Testing
Test at these widths (use Chrome DevTools device simulation):

**320px (iPhone SE)**
- [ ] No horizontal overflow
- [ ] Chat input visible
- [ ] Navigation accessible
- [ ] No clipped text
- [ ] Buttons clickable

**360px (Android small)**
- [ ] No horizontal overflow
- [ ] Chat input visible
- [ ] Navigation accessible
- [ ] No clipped text
- [ ] Buttons clickable

**390px (iPhone 12/13)**
- [ ] No horizontal overflow
- [ ] Chat input visible
- [ ] Navigation accessible
- [ ] No clipped text
- [ ] Buttons clickable

**412px (iPhone 14 Pro Max)**
- [ ] No horizontal overflow
- [ ] Chat input visible
- [ ] Navigation accessible
- [ ] No clipped text
- [ ] Buttons clickable

**768px (Tablet)**
- [ ] No horizontal overflow
- [ ] Chat input visible
- [ ] Navigation accessible
- [ ] No clipped text
- [ ] Buttons clickable

#### Keyboard Testing
- [ ] Open chat on mobile
- [ ] Tap message input
- [ ] Verify keyboard opens
- [ ] Verify input remains visible
- [ ] Verify send button accessible
- [ ] Verify no UI overlap

#### Touch Testing
- [ ] Verify all buttons tapable
- [ ] Verify swipe gestures work
- [ ] Verify scroll smooth
- [ ] Verify no accidental taps

---

### 9. DATABASE VALIDATION

#### Firestore Verification
Use Firebase Console to verify:

**Users Collection**
- [ ] Check user documents created
- [ ] Verify schema matches specification
- [ ] Verify all fields present
- [ ] Verify no malformed data

**FriendRequests Collection**
- [ ] Check request documents created
- [ ] Verify status field correct
- [ ] Verify timestamps present

**Friends Collection**
- [ ] Check friendship documents created
- [ ] Verify participants array correct
- [ ] Verify category field present

**Chats Collection**
- [ ] Check chat documents created
- [ ] Verify participants array correct
- [ ] Verify unread object correct

**Messages Collection**
- [ ] Check message documents created
- [ ] Verify sender field correct
- [ ] Verify timestamp present
- [ ] Verify read field works

**Notifications Collection**
- [ ] Check notification documents created
- [ ] Verify userId field correct
- [ ] Verify type field correct
- [ ] Verify read field works

**UserStats Collection**
- [ ] Check stats documents created
- [ ] Verify counters increment correctly

---

### 10. PERFORMANCE TESTING

#### Loading Performance
- [ ] Initial page load < 3 seconds
- [ ] Auth login < 2 seconds
- [ ] Profile load < 1 second
- [ ] Chat load < 1 second
- [ ] Discovery load < 2 seconds

#### Chat Performance
- [ ] Message send < 500ms
- [ ] Message receive < 500ms
- [ ] Typing indicator < 300ms
- [ ] No lag spikes during chat

#### Console Errors
- [ ] Check browser console for errors
- [ ] Verify no Firebase errors
- [ ] Verify no JavaScript errors
- [ ] Verify no network errors

#### Memory Leaks
- [ ] Monitor memory usage in DevTools
- [ ] Verify no memory growth over time
- [ ] Verify listeners cleaned up on logout

---

## Final Report Template

After completing testing, fill out this report:

### Working Features
- List all features that passed testing

### Broken Features
- List all features that failed testing with details

### Bugs Found
- List all bugs discovered with severity (Critical/High/Medium/Low)

### Screenshots
- Attach screenshots of any issues

### Production Readiness Score
- Rate overall readiness /100

### Recommendations
- List any fixes needed before production

---

## Testing Notes

1. **Test in order**: Start with auth, then friends, then messaging, then notifications
2. **Use multiple browsers**: Test in Chrome, Firefox, Safari
3. **Test on actual devices**: If possible, test on real phones/tablets
4. **Document everything**: Take screenshots of issues
5. **Test edge cases**: Test network failures, rapid actions, concurrent users
6. **Clean up between tests**: Clear cache, logout, reset data between test sessions
