// js/firebaseClient.js

let db; // Firestore database reference

(async function initializeFirebase() {
    try {
        // Fetch the configuration from our secure serverless function
        const response = await fetch('/.netlify/functions/firebase-config');
        if (!response.ok) {
            throw new Error(`Failed to fetch Firebase config: ${response.statusText}`);
        }
        const firebaseConfig = await response.json();

        // Basic validation
        if (!firebaseConfig.apiKey) {
            throw new Error("Firebase API Key not found in fetched configuration.");
        }
        if (!firebaseConfig.projectId) {
            throw new Error("Firebase Project ID not found in fetched configuration.");
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
        alert(`Failed to initialize Firebase: ${error.message}. Check console for details.`);
        db = null; // Ensure it's null if init fails
    }
})();
// 'db' will become available globally once the async function completes.
