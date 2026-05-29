# Firebase Setup Guide for Bondly

## Prerequisites

- A Google account
- Firebase Console access (console.firebase.google.com)

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name: `bondly-app`
4. Accept Firebase terms
5. Choose Google Analytics account (optional, can skip for now)
6. Click "Create project"
7. Wait for project creation (may take a minute)

## Step 2: Enable Required Firebase Services

### 2.1 Authentication

1. In Firebase Console, go to your project
2. Click "Authentication" in the left sidebar
3. Click "Get Started"
4. Enable "Email/Password" sign-in method:
   - Click "Email/Password"
   - Enable it
   - Click "Save"
5. Enable "Google" sign-in method:
   - Click "Google"
   - Enable it
   - Enter project support email
   - Click "Save"

### 2.2 Firestore Database

1. Click "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose a location (select one closest to your users)
4. Choose "Start in test mode" (we'll update rules later)
5. Click "Create"

### 2.3 Realtime Database

1. Click "Realtime Database" in the left sidebar
2. Click "Create database"
3. Choose a location (same as Firestore)
4. Choose "Start in test mode"
5. Click "Create"

### 2.4 Firebase Storage

1. Click "Storage" in the left sidebar
2. Click "Get Started"
3. Choose "Start in test mode"
4. Choose a location (same as Firestore)
5. Click "Done"

### 2.5 Cloud Messaging (for Notifications)

1. Click "Cloud Messaging" in the left sidebar
2. Click "Get Started"
3. Follow the setup wizard
4. Note down the Server Key and Sender ID

## Step 3: Get Firebase Configuration

1. Click the gear icon (⚙️) next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon (</>)
5. Register the app:
   - App nickname: `Bondly Web`
   - Check "Also set up Firebase Hosting for this app" (optional)
6. Click "Register app"
7. Copy the Firebase configuration code
8. Paste it into `app/firebase.js` replacing the placeholder config

## Step 4: Configure Firebase in Bondly

Open `app/firebase.js` and replace the placeholder config with your actual config:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_ACTUAL_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID",
    databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com"
};
```

## Step 5: Apply Firestore Security Rules

1. Go to Firestore Database in Firebase Console
2. Click the "Rules" tab
3. Copy the rules from `firestore.rules` file
4. Paste them into the rules editor
5. Click "Publish"

## Step 6: Enable Google Sign-In for Web

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Go to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth client ID"
5. Choose "Web application"
6. Name it: `Bondly Web`
7. Add authorized JavaScript origins:
   - `http://localhost:8000` (for local development)
   - Your production domain when deployed
8. Click "Create"
9. Copy the Client ID
10. In Firebase Console > Authentication > Sign-in method > Google
11. Add the Client ID to the authorized domains

## Step 7: Test Firebase Connection

1. Open `app/index.html` in a browser
2. Check browser console - you should see "Firebase initialized successfully"
3. The demo banner should disappear
4. You should be able to access Firebase services

## Step 8: Create Indexes for Firestore

After the app is running, Firestore will automatically create indexes as needed when you perform queries. You may see index creation errors in the console - click the provided link to create the index in Firebase Console.

## Firestore Database Schema

The following collections will be created automatically by the app:

### `users`
- Document ID: User's Firebase Auth UID
- Fields:
  - `uid` (string): User's Firebase Auth UID
  - `displayName` (string): Display name
  - `username` (string): Unique username
  - `email` (string): Email address
  - `bio` (string): User bio
  - `avatar` (string): Profile image URL
  - `country` (string): Country name
  - `timezone` (string): Timezone identifier
  - `languages` (array): Languages user speaks
  - `learning` (array): Languages user is learning
  - `interests` (array): User interests
  - `personality` (array): Personality tags
  - `goals` (array): Friendship goals
  - `deepMode` (boolean): Deep mode enabled
  - `showOnlineStatus` (boolean): Show online status
  - `allowMessagesFromNonFriends` (boolean): Allow messages from non-friends
  - `showInDiscover` (boolean): Show in discover
  - `allowSearch` (boolean): Allow search
  - `createdAt` (timestamp): Account creation time
  - `lastActive` (timestamp): Last active time
  - `suspended` (boolean): Account suspended
  - `suspensionReason` (string): Reason for suspension

### `friendRequests`
- Document ID: Auto-generated
- Fields:
  - `from` (string): Sender's UID
  - `to` (string): Recipient's UID
  - `status` (string): "pending" | "accepted" | "declined" | "cancelled"
  - `createdAt` (timestamp): Request creation time
  - `respondedAt` (timestamp): Response time

### `friends` (friendships)
- Document ID: Auto-generated
- Fields:
  - `participants` (array): [uid1, uid2]
  - `category` (string): "close" | "language" | "study" | "new"
  - `favorite` (boolean): Is favorite friend
  - `nickname` (string): Custom nickname
  - `createdAt` (timestamp): Friendship start time

### `chats` (conversations)
- Document ID: Auto-generated
- Fields:
  - `participants` (array): [uid1, uid2]
  - `lastMessage` (string): Last message text
  - `lastMessageTime` (timestamp): Last message time
  - `unread` (object): { uid: count }
  - `createdAt` (timestamp): Chat creation time

### `messages` (subcollection of chats)
- Document ID: Auto-generated
- Fields:
  - `sender` (string): Sender's UID
  - `text` (string): Message text
  - `timestamp` (timestamp): Message time
  - `reactions` (array): [{ emoji, count }]
  - `edited` (boolean): Is edited
  - `deleted` (boolean): Is deleted
  - `read` (boolean): Is read

### `notifications`
- Document ID: Auto-generated
- Fields:
  - `userId` (string): Recipient's UID
  - `type` (string): "message" | "friend_request" | "friend_accepted" | "match"
  - `title` (string): Notification title
  - `message` (string): Notification message
  - `data` (object): Additional data
  - `read` (boolean): Is read
  - `createdAt` (timestamp): Creation time

### `achievements`
- Document ID: Auto-generated
- Fields:
  - `userId` (string): User's UID
  - `achievementId` (string): Achievement ID
  - `earnedAt` (timestamp): Earned time

### `userStats`
- Document ID: User's UID
- Fields:
  - `friendsCount` (number): Number of friends
  - `messagesCount` (number): Number of messages sent
  - `achievements` (array): Array of achievement IDs

### `blockedUsers` (subcollection of users)
- Document ID: Blocked user's UID
- Fields:
  - `blockedUserId` (string): Blocked user's UID
  - `blockedAt` (timestamp): Block time

### `mutedUsers` (subcollection of users)
- Document ID: Muted user's UID
- Fields:
  - `mutedUserId` (string): Muted user's UID
  - `mutedAt` (timestamp): Mute time
  - `unmuteAt` (timestamp): Auto-unmute time

### `presence` (Realtime Database)
- Path: `/users/{uid}/online`
- Fields:
  - `online` (boolean): Online status
  - `lastSeen` (timestamp): Last seen time

### `typing` (Realtime Database)
- Path: `/typing/{chatId}/{uid}`
- Fields:
  - `typing` (boolean): Is typing

## Next Steps

After completing Firebase setup:

1. Test email signup
2. Test email login
3. Test Google authentication
4. Test profile creation
5. Test friend requests
6. Test messaging
7. Test notifications

## Troubleshooting

### Firebase not initializing
- Check that all config values are correct
- Ensure Firebase services are enabled
- Check browser console for specific errors

### Authentication errors
- Ensure Email/Password sign-in is enabled
- Check Google sign-in configuration
- Verify OAuth client ID is correct

### Firestore permission denied
- Check security rules
- Ensure user is authenticated
- Verify collection names match exactly

### Realtime Database not working
- Ensure Realtime Database is created
- Check database URL in config
- Verify rules allow writes

---

**Important**: Never commit your Firebase configuration with real API keys to public repositories. Use environment variables or Firebase App Check in production.
