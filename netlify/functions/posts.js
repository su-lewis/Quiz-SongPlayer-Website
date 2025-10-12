// FILE: netlify/functions/posts.js

import admin from 'firebase-admin';
import fetch from 'node-fetch'; // Import node-fetch for API calls

// --- Rate Limiting Configuration ---
const POST_LIMIT = 5; // Max posts allowed
const TIME_WINDOW_MS = 60 * 60 * 1000; // 1 hour in milliseconds

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
    try {
        // For Netlify, you'll need to set environment variables:
        // FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
            })
        });
    } catch (error) {
        console.error("Firebase Admin initialization error:", error);
    }
}

const db = admin.firestore();

// --- Server-Side Translation Helper ---
async function translateText(text, targetLang, cacheCollection) {
    if (!text || targetLang === 'en') {
        return text;
    }

    // Use a simple hash of the text as the document ID for caching
    const crypto = await import('crypto');
    const hash = crypto.createHash('md5').update(text).digest('hex');
    const cacheRef = cacheCollection.doc(hash);

    const doc = await cacheRef.get();
    if (doc.exists && doc.data()[targetLang]) {
        return doc.data()[targetLang]; // Return cached translation
    }

    // If not in cache, call the DeepL API
    const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
    const api_url = DEEPL_API_KEY.endsWith(':fx') ? 'https://api-free.deepl.com/v2/translate' : 'https://api.deepl.com/v2/translate';

    const response = await fetch(api_url, {
        method: 'POST',
        headers: { 'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: [text], target_lang: targetLang.toUpperCase(), source_lang: 'EN' }),
    });

    if (!response.ok) throw new Error('DeepL API request failed');

    const data = await response.json();
    const translatedText = data.translations[0].text;

    // Save the new translation to the cache
    await cacheRef.set({ [targetLang]: translatedText }, { merge: true });
    return translatedText;
}

export const handler = async (event, context) => {
    // Ensure Firebase is initialized
    if (!admin.apps.length) {
        console.error("FATAL ERROR: Firebase Admin is not initialized.");
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Server configuration error." }),
            headers: { 'Content-Type': 'application/json', 'Allow': 'GET, POST' },
        };
    }

    const method = event.httpMethod;

    // --- Handle GET request (Fetch Posts) ---
    if (method === 'GET') {
        try {
            const lang = event.queryStringParameters?.lang || 'en';
            const translationCache = db.collection('translations'); // Firestore collection for caching

            const postsRef = db.collection('posts');
            const snapshot = await postsRef.orderBy('created_at', 'desc').get();
            
            const posts = await Promise.all(snapshot.docs.map(async (doc) => {
                const postData = doc.data();
                
                // Translate title and content if a language is specified
                const translatedTitle = lang !== 'en' ? await translateText(postData.title, lang, translationCache) : postData.title;
                const translatedContent = lang !== 'en' ? await translateText(postData.content, lang, translationCache) : postData.content;

                return {
                    id: doc.id,
                    ...postData,
                    title: translatedTitle,
                    content: translatedContent,
                    created_at: postData.created_at?.toDate().toISOString() || new Date().toISOString()
                };
            }));

            return {
                statusCode: 200,
                body: JSON.stringify(posts),
                headers: { 'Content-Type': 'application/json', 'Allow': 'GET, POST' },
            };
        } catch (error) {
            console.error('Error in GET /posts:', error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: error.message || 'Failed to fetch posts.' }),
                headers: { 'Content-Type': 'application/json', 'Allow': 'GET, POST' },
            };
        }
    }

    // --- Handle POST request (Create Post with Rate Limiting) ---
    if (method === 'POST') {
        try {
            // 1. Check for Netlify Identity user context
            const user = context.clientContext?.user;
            if (!user) {
                return { 
                    statusCode: 401, 
                    body: JSON.stringify({ error: 'Authentication required to create a post.' }), 
                    headers: { 'Content-Type': 'application/json', 'Allow': 'GET, POST' } 
                };
            }
            const netlifyUserId = user.sub;
            if (!netlifyUserId) {
                console.error("Netlify user context present but missing 'sub' ID:", user);
                return { 
                    statusCode: 400, 
                    body: JSON.stringify({ error: 'Invalid user identity provided.'}), 
                    headers: {'Content-Type': 'application/json', 'Allow': 'GET, POST'} 
                };
            }

            // 2. Check and parse request body
            if (!event.body) {
                return { 
                    statusCode: 400, 
                    body: JSON.stringify({ error: 'Missing request body' }), 
                    headers: { 'Content-Type': 'application/json', 'Allow': 'GET, POST' } 
                };
            }
            let payload;
            try {
                payload = JSON.parse(event.body);
            } catch (parseError) {
                return { 
                    statusCode: 400, 
                    body: JSON.stringify({ error: 'Invalid JSON format in request body.' }), 
                    headers: { 'Content-Type': 'application/json', 'Allow': 'GET, POST' } 
                };
            }
            const { title, content } = payload;
            if (!content || typeof content !== 'string' || content.trim() === '') {
                return { 
                    statusCode: 400, 
                    body: JSON.stringify({ error: 'Content is required and cannot be empty.' }), 
                    headers: { 'Content-Type': 'application/json', 'Allow': 'GET, POST' } 
                };
            }

            // --- START: Rate Limiting Check ---
            const timeWindowStart = new Date(Date.now() - TIME_WINDOW_MS);

            // Query Firestore to count recent posts by this user
            const recentPostsSnapshot = await db.collection('posts')
                .where('user_id', '==', netlifyUserId)
                .where('created_at', '>=', admin.firestore.Timestamp.fromDate(timeWindowStart))
                .get();

            const count = recentPostsSnapshot.size;

            console.log(`User ${netlifyUserId} has created ${count} posts in the last hour.`);

            // Enforce the limit
            if (count >= POST_LIMIT) {
                console.warn(`Rate limit exceeded for user ${netlifyUserId}. Count: ${count}`);
                return {
                    statusCode: 429, // Too Many Requests
                    body: JSON.stringify({ 
                        error: `Rate limit exceeded. You can create a maximum of ${POST_LIMIT} posts per hour.` 
                    }),
                    headers: { 'Content-Type': 'application/json', 'Allow': 'GET, POST' },
                };
            }
            // --- END: Rate Limiting Check ---

            // Get user metadata for username
            const username = user.user_metadata?.username || 
                           user.user_metadata?.full_name || 
                           user.email?.split('@')[0] || 
                           'Anonymous';

            // 4. Insert into Firestore
            const newPost = {
                title: (typeof title === 'string' ? title.trim() : ''),
                content: content.trim(),
                user_id: netlifyUserId,
                username: username, // Store username directly in post
                created_at: admin.firestore.FieldValue.serverTimestamp()
            };

            const docRef = await db.collection('posts').add(newPost);
            
            // Get the created document to return
            const createdDoc = await docRef.get();
            const createdData = {
                id: docRef.id,
                ...createdDoc.data(),
                created_at: createdDoc.data().created_at?.toDate().toISOString() || new Date().toISOString()
            };

            // 5. Return Success
            console.log(`Post created successfully for user ${netlifyUserId}`);
            return {
                statusCode: 201, // Created
                body: JSON.stringify(createdData),
                headers: { 'Content-Type': 'application/json', 'Allow': 'GET, POST' },
            };

        } catch (error) {
            console.error('Error in POST /posts:', error);
            // Determine status code based on error type if possible
            const statusCode = error.message.includes("Database") || 
                             error.message.includes("posting limits") ? 500 : 400;
            return {
                statusCode: statusCode,
                body: JSON.stringify({ error: error.message || 'Failed to create post.' }),
                headers: { 'Content-Type': 'application/json', 'Allow': 'GET, POST' },
            };
        }
    }

    // --- Handle other methods ---
    return {
        statusCode: 405, // Method Not Allowed
        body: JSON.stringify({ error: `Method ${method} Not Allowed` }),
        headers: { 'Allow': 'GET, POST', 'Content-Type': 'application/json' },
    };
};