# Bondly 💙🌍

**"Find Your People."**

A premium friendship and messaging mobile app focused on real connections, meaningful conversations, and safe friendships.

---

## 🌟 Features

### Core Features
- **🏠 Home Dashboard** - Personalized greeting, activity overview, daily conversation prompts, and smart recommendations
- **👤 Beautiful Profiles** - Rich user profiles with interests, personality tags, languages, and friendship goals
- **🫂 Friend System** - Send, accept, decline requests with categories (Close Friends, Language Partners, Study Friends)
- **💬 Real-time Messaging** - Premium chat with typing indicators, read receipts, reactions, and message search
- **🔍 Discovery System** - Find new people with smart filters (country, language, interests, timezone, deep mode)
- **🤖 Smart Matching** - AI-powered compatibility scoring based on shared interests, languages, and personality
- **🌍 Language Exchange** - Practice languages with native speakers, vocabulary tracking, and language badges
- **🧠 Conversation Starters** - Deep questions, fun questions, casual questions, and language-specific prompts
- **🌙 Deep Mode** - Enable meaningful conversations mode for deeper connections
- **🛡️ Safety & Moderation** - Block, report, mute users with community guidelines
- **🔔 Notifications** - In-app notifications for messages, friend requests, and matches
- **🏆 Achievements** - Gentle achievement system to celebrate milestones
- **🔎 Search** - Typo-tolerant search across friends, messages, and interests
- **⚙️ Settings** - Dark mode, chat themes, privacy controls, and more

---

## 🎨 Design Philosophy

Bondly is designed to feel:
- **Warm & Cozy** - Soft colors, gentle gradients, glassmorphism effects
- **Safe & Trustworthy** - No toxic metrics, no follower obsession
- **Premium & Modern** - Smooth animations, native-feeling interactions
- **Emotionally Comfortable** - Focus on quality over quantity

### Color Palette
- **Soft Blue**: #7BAFD4
- **Warm Cream**: #F8F4EE
- **Lavender**: #C2B5E2
- **Soft Teal**: #7CB8A6
- **Midnight Blue**: #324D6E
- **Accent Gold**: #D8B97A

---

## 📱 Mobile-First Design

Optimized for all screen sizes:
- 320px, 360px, 390px, 412px (phones)
- 768px (tablets)
- Large touch targets
- Smooth gestures
- One-hand usability
- No clipped UI or overflow issues

---

## 🛠️ Tech Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Custom properties, flexbox, grid, animations
- **Vanilla JavaScript** - No frameworks, pure JS

### Backend
- **Firebase Authentication** - Email/password, Google login
- **Firebase Firestore** - User profiles, chats, messages
- **Firebase Realtime Database** - Typing indicators, online status
- **Firebase Storage** - Image uploads
- **Firebase Cloud Messaging** - Push notifications

---

## 📁 File Structure

```
Bondly/
├── app/
│   ├── index.html          # Main HTML file
│   ├── styles.css          # Premium design system
│   ├── app.js              # Main app controller
│   ├── firebase.js         # Firebase configuration
│   ├── utils.js            # Helper functions
│   ├── mobile.js           # Touch gestures & animations
│   ├── auth.js             # Authentication
│   ├── home.js             # Home dashboard
│   ├── profile.js          # User profiles
│   ├── friends.js          # Friend system
│   ├── chats.js            # Chat list
│   ├── messaging.js        # Real-time messaging
│   ├── discover.js         # Discovery system
│   ├── matching.js         # Smart matching algorithm
│   ├── language.js         # Language exchange
│   ├── deepmode.js         # Deep mode
│   ├── safety.js           # Safety features
│   ├── moderation.js       # Content moderation
│   ├── notifications.js    # Notifications
│   ├── settings.js         # Settings
│   ├── search.js           # Search system
│   └── achievements.js     # Achievement system
├── assets/
│   └── data/               # Sample data
└── README.md               # This file
```

---

## 🚀 Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Bondly
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable the following services:
   - **Authentication** (Email/Password, Google)
   - **Firestore Database**
   - **Realtime Database**
   - **Storage**
   - **Cloud Messaging**

### 3. Configure Firebase

Open `app/firebase.js` and replace the placeholder config with your Firebase project config:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID",
    databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com"
};
```

### 4. Set Firestore Security Rules

Copy the rules from `firestore.rules` (see below) to your Firebase Console > Firestore Database > Rules.

### 5. Run the App

Simply open `app/index.html` in a web browser, or use a local server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve

# Or use VS Code Live Server extension
```

For mobile testing, use your browser's device emulation or deploy to a hosting service.

---

## 🔐 Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
      
      // User subcollections
      match /{subcollection}/{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // Friend requests
    match /friendRequests/{requestId} {
      allow read: if request.auth != null && 
        (resource.data.to == request.auth.uid || resource.data.from == request.auth.uid);
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
        (resource.data.to == request.auth.uid || resource.data.from == request.auth.uid);
    }
    
    // Friends
    match /friends/{friendId} {
      allow read: if request.auth != null && 
        request.auth.uid in resource.data.participants;
      allow create: if request.auth != null && 
        request.auth.uid in request.resource.data.participants;
      allow update, delete: if request.auth != null && 
        request.auth.uid in resource.data.participants;
    }
    
    // Chats
    match /chats/{chatId} {
      allow read: if request.auth != null && 
        request.auth.uid in resource.data.participants;
      allow create: if request.auth != null && 
        request.auth.uid in request.resource.data.participants;
      allow update: if request.auth != null && 
        request.auth.uid in resource.data.participants;
      
      // Messages subcollection
      match /messages/{messageId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null && 
          request.auth.uid == request.resource.data.sender;
        allow update, delete: if request.auth != null && 
          request.auth.uid == resource.data.sender;
      }
    }
    
    // Reports
    match /reports/{reportId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null && request.auth.uid == resource.data.reporter;
    }
    
    // Flagged content
    match /flaggedContent/{contentId} {
      allow create: if request.auth != null;
    }
    
    // User violations
    match /userViolations/{violationId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
    }
  }
}
```

---

## 📱 Testing on Mobile

### Using Browser DevTools
1. Open Chrome DevTools (F12)
2. Click the device toolbar icon
3. Select a device or enter custom dimensions
4. Test on various screen sizes (320px, 375px, 414px, etc.)

### Using Real Devices
1. Deploy to a hosting service (GitHub Pages, Netlify, Vercel)
2. Open on your mobile device
3. Add to home screen for PWA-like experience

---

## 🎯 Key Features Explained

### Smart Matching Algorithm
The matching system considers:
- Shared interests (30% weight)
- Language compatibility (25% weight)
- Timezone proximity (20% weight)
- Shared personality traits (15% weight)
- Deep mode compatibility (10% weight)

### Deep Mode
Users can enable Deep Mode to:
- Signal preference for meaningful conversations
- Get matched with other Deep Mode users
- Access deep conversation prompts
- Filter discovery results

### Language Exchange
- Track vocabulary words
- Set daily practice goals
- Earn language badges
- Find language exchange partners

### Safety Features
- Block users from contacting you
- Report inappropriate behavior
- Mute users temporarily
- Hide profile from specific users
- Content moderation with auto-filtering

---

## 🚧 Future Enhancements

- [ ] Voice messages
- [ ] Voice rooms
- [ ] Video calls
- [ ] Sticker pack
- [ ] Shared memory space for friends
- [ ] PWA support
- [ ] Native iOS and Android apps
- [ ] Integration with language learning apps

---

## 📄 License

This project is open source and available under the MIT License.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 💙 Philosophy

Bondly exists for:
- Real friendships
- Meaningful conversations
- Language exchange
- Study buddies
- Global friendships
- Safe connections
- Shared interests
- Low-pressure socializing

**NOT another toxic social media app.**
**NOT follower-based.**
**NOT dopamine-scrolling content addiction.**

---

## 📞 Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

**Made with 💙 for meaningful connections**
