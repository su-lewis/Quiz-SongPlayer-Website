// netlify/functions/translate.js
const fetch = require('node-fetch');
const admin = require('firebase-admin');
const crypto = require('crypto');

// Initialize Firebase Admin (only once per function invocation)
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
            })
        });
    } catch (error) {
        console.error("Firebase Admin initialization error in translate.js:", error);
    }
}

exports.handler = async function(event) {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { text, target_lang } = JSON.parse(event.body);
    const DEEPL_API_KEY = process.env.DEEPL_API_KEY; // Securely stored in Netlify build settings

    // Ensure Firebase is initialized before proceeding
    if (!admin.apps.length) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Server configuration error: Firebase not initialized.' }),
        };
    }
    const db = admin.firestore();

    if (!text || !target_lang || !DEEPL_API_KEY) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Missing required parameters: text, target_lang, or API key.' }),
        };
    }

    // --- Check Firestore Cache First ---
    const cacheCollection = db.collection('translations');
    const hash = crypto.createHash('md5').update(text).digest('hex');
    const cacheRef = cacheCollection.doc(hash);

    try {
        const doc = await cacheRef.get();
        if (doc.exists && doc.data()[target_lang]) {
            return { statusCode: 200, body: JSON.stringify({ translatedText: doc.data()[target_lang] }) };
        }
    } catch (e) { console.warn("Firestore cache check failed:", e); }

    // Use the free API endpoint or the pro one based on your key
    const api_url = DEEPL_API_KEY.endsWith(':fx')
        ? 'https://api-free.deepl.com/v2/translate'
        : 'https://api.deepl.com/v2/translate';

    try {
        const response = await fetch(api_url, {
            method: 'POST',
            headers: {
                'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: [text], // DeepL API expects an array of strings
                target_lang: target_lang.toUpperCase(),
                source_lang: 'EN', // Assuming your site's base language is English
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('DeepL API Error:', errorBody);
            return { statusCode: response.status, body: JSON.stringify({ error: `DeepL API error: ${errorBody}` }) };
        }

        const data = await response.json();
        const translatedText = data.translations[0].text;

        // --- Save to Firestore Cache ---
        try { await cacheRef.set({ [target_lang]: translatedText, source_en: text }, { merge: true }); } catch (e) { console.warn("Firestore cache write failed:", e); }

        return {
            statusCode: 200,
            body: JSON.stringify({ translatedText }),
        };

    } catch (error) {
        console.error('Error calling DeepL API:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch translation.' }),
        };
    }
};
