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
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
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

    const DEEPL_API_KEY = process.env.DEEPL_API_KEY;

    // --- NEW: Better Logging and Validation ---
    console.log("Translate function invoked.");

    if (!DEEPL_API_KEY) {
        console.error("FATAL: DEEPL_API_KEY environment variable is not set.");
        return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error: Missing API key.' }) };
    }

    let payload;
    try {
        if (!event.body) {
            throw new Error("Request body is missing.");
        }
        payload = JSON.parse(event.body);
    } catch (e) {
        console.error("Error parsing request body:", e.message);
        console.log("Received body:", event.body); // Log what we actually received
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON format in request body.' }) };
    }

    const { text, target_lang } = payload;

    if (!text || !target_lang) {
        console.error("Missing 'text' or 'target_lang' in payload.");
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Missing required parameters: text, target_lang.' }),
        };
    }
    // --- END: Better Logging and Validation ---


    // Ensure Firebase is initialized before proceeding for caching
    const db = admin.apps.length ? admin.firestore() : null;
    if (!db) {
        console.error("Firebase not initialized, cannot use cache.");
        // We can proceed without cache, but it's good to know.
    }

    // --- Check Firestore Cache First ---
    if (db) {
        const cacheCollection = db.collection('translations');
        const hash = crypto.createHash('md5').update(text).digest('hex');
        const cacheRef = cacheCollection.doc(hash);
        try {
            const doc = await cacheRef.get();
            if (doc.exists && doc.data()[target_lang]) {
                console.log(`Serving translation for "${text}" from cache.`);
                return { statusCode: 200, body: JSON.stringify({ translatedText: doc.data()[target_lang] }) };
            }
        } catch (e) { console.warn("Firestore cache check failed:", e); }
    }


    const api_url = DEEPL_API_KEY.endsWith(':fx')
        ? 'https://api-free.deepl.com/v2/translate'
        : 'https://api.deepl.com/v2/translate';

    try {
        console.log(`Calling DeepL API for text: "${text}" to lang: "${target_lang}"`);
        const response = await fetch(api_url, {
            method: 'POST',
            headers: {
                'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: [text],
                target_lang: target_lang.toUpperCase(),
                source_lang: 'EN',
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('DeepL API Error:', errorBody);
            // Don't expose the full error to the client for security
            return { statusCode: response.status, body: JSON.stringify({ error: `Translation service failed.` }) };
        }

        const data = await response.json();
        const translatedText = data.translations[0].text;

        // --- Save to Firestore Cache ---
        if (db) {
            const hash = crypto.createHash('md5').update(text).digest('hex');
            const cacheRef = db.collection('translations').doc(hash);
            try { await cacheRef.set({ [target_lang]: translatedText, source_en: text }, { merge: true }); } catch (e) { console.warn("Firestore cache write failed:", e); }
        }

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