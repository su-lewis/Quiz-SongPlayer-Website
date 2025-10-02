// js/firebaseClient.js

// *** REPLACE WITH YOUR FIREBASE PROJECT CONFIG ***
const firebaseConfig = {

  apiKey: "AIzaSyC-HGt0QI_8ImWTAJTtOVo5DrVd3TBqATs",

  authDomain: "QuizSongPlayer.firebaseapp.com",

  projectId: "QuizSongPlayer",

  storageBucket: "QuizSongPlayer.firebasestorage.app",

  messagingSenderId: "1073260612637",

  appId: "1:1073260612637:web:e86d64c98bbe870a494af4",

  measurementId: "G-J2VHPDLWGM"

};

let db; // Firestore database reference

try {
    // Basic validation
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'YOUR_API_KEY') {
        throw new Error("Firebase API Key not set.");
    }
    if (!firebaseConfig.projectId || firebaseConfig.projectId === 'YOUR_PROJECT_ID') {
        throw new Error("Firebase Project ID not set.");
    }

    // Check if Firebase SDK is loaded
    if (typeof firebase === 'undefined') {
        throw new Error("Firebase SDK not loaded before firebaseClient.js");
    }

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    
    // Initialize Firestore
    db = firebase.firestore();
    
    console.log("Firebase initialized successfully");

} catch (error) {
    console.error("Error initializing Firebase:", error);
    alert(`Failed to initialize Firebase: ${error.message}. Check console and js/firebaseClient.js`);
    db = null; // Ensure it's null if init fails
}

// 'db' is now globally available (if initialization succeeded)
