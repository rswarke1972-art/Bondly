// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCppXibueU0BFvrj9KlHgPWGN9gY-wlrxY",
  authDomain: "bondly-e23ca.firebaseapp.com",
  projectId: "bondly-e23ca",
  storageBucket: "bondly-e23ca.firebasestorage.app",
  messagingSenderId: "814931658554",
  appId: "1:814931658554:web:6c9ff1e390195c62abb203",
  measurementId: "G-2VZ9RPCM2K",
  databaseURL: "https://bondly-e23ca-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firebase Services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
const rtdb = firebase.database();

// Global Firebase Service
window.FirebaseService = {
    auth,
    db,
    storage,
    rtdb,

    // Auth getter
    getAuth() {
        return auth;
    },

    // Firestore getter
    getDb() {
        return db;
    },

    // Storage getter
    getStorage() {
        return storage;
    },

    // Realtime Database getter
    getRtdb() {
        return rtdb;
    },

    // Status helpers
    isInitialized() {
        return true;
    },

    isDemoMode() {
        return false;
    }
};

console.log("✅ Bondly Firebase Connected");