// FILE: netlify/functions/posts.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Use Service Key

// --- Rate Limiting Configuration ---
const POST_LIMIT = 5; // Max posts allowed
const TIME_WINDOW_MS = 60 * 60 * 1000; // 1 hour in milliseconds

export const handler = async (event, context) => {
    // Ensure environment variables are set
    if (!supabaseUrl || !supabaseKey) {
        console.error("FATAL ERROR: Supabase URL or Service Key environment variable is not set.");
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Server configuration error." }),
            headers: { 'Content-Type': 'application/json', 'Allow': 'GET, POST' },
        };
    }

    // Initialize Supabase client *inside* the handler
    // Using Service Key bypasses RLS by default
    const supabase = createClient(supabaseUrl, supabaseKey);
    const method = event.httpMethod;

    // --- Handle GET request (Fetch Posts - No Changes Needed Here) ---
    if (method === 'GET') {
        try {
                  
// Inside GET handler in netlify/functions/posts.js
const { data, error } = await supabase
.from('posts')
// Select columns from posts AND the username from the related profiles table
.select(`
    id,
    title,
    content,
    created_at,
    user_id,
    profiles ( username )
`) // Assumes Supabase can link posts.user_id to profiles.id
.order('created_at', { ascending: false });

if (error) {
console.error('Supabase GET (with join) error:', error);
// Check if error is due to relationship ambiguity
throw new Error(`Database query failed: ${error.message}`);
}
// ... rest of GET handler ...
// 'data' will now look like:
// [ { id: ..., title: ..., ..., user_id: ..., profiles: { username: 'JohnDoe'} }, ... ]
// Or profiles might be null if no matching profile exists yet for a post's user_id



            return {
                statusCode: 200,
                body: JSON.stringify(data || []), // Ensure it's always an array
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
                return { statusCode: 401, body: JSON.stringify({ error: 'Authentication required to create a post.' }), headers: { 'Content-Type': 'application/json', 'Allow': 'GET, POST' } };
            }
            const netlifyUserId = user.sub;
            if (!netlifyUserId) {
                 console.error("Netlify user context present but missing 'sub' ID:", user);
                 return { statusCode: 400, body: JSON.stringify({ error: 'Invalid user identity provided.'}), headers: {'Content-Type': 'application/json', 'Allow': 'GET, POST'} };
            }

            // 2. Check and parse request body
            if (!event.body) {
                return { statusCode: 400, body: JSON.stringify({ error: 'Missing request body' }), headers: { 'Content-Type': 'application/json', 'Allow': 'GET, POST' } };
            }
            let payload;
            try {
                payload = JSON.parse(event.body);
            } catch (parseError) {
                 return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON format in request body.' }), headers: { 'Content-Type': 'application/json', 'Allow': 'GET, POST' } };
            }
            const { title, content } = payload;
            if (!title || typeof title !== 'string' || title.trim() === '' || !content || typeof content !== 'string' || content.trim() === '') {
                 return { statusCode: 400, body: JSON.stringify({ error: 'Title and content are required and cannot be empty.' }), headers: { 'Content-Type': 'application/json', 'Allow': 'GET, POST' } };
            }

            // --- START: Rate Limiting Check ---
            const timeWindowStart = new Date(Date.now() - TIME_WINDOW_MS).toISOString();

            // Query Supabase to count recent posts by this user
            const { count, error: countError } = await supabase
                .from('posts')
                .select('*', { count: 'exact', head: true }) // Efficiently get only the count
                .eq('user_id', netlifyUserId)           // Filter by the specific user
                .gte('created_at', timeWindowStart);    // Filter posts within the time window

            if (countError) {
                console.error('Supabase rate limit count error:', countError);
                // Don't expose detailed DB error to client, but log it
                throw new Error('Could not verify posting limits.');
            }

            console.log(`User ${netlifyUserId} has created ${count} posts in the last hour.`); // Optional: for logging/debugging

            // Enforce the limit
            if (count >= POST_LIMIT) {
                console.warn(`Rate limit exceeded for user ${netlifyUserId}. Count: ${count}`);
                return {
                    statusCode: 429, // Too Many Requests
                    body: JSON.stringify({ error: `Rate limit exceeded. You can create a maximum of ${POST_LIMIT} posts per hour.` }),
                    headers: { 'Content-Type': 'application/json', 'Allow': 'GET, POST' },
                };
            }
            // --- END: Rate Limiting Check ---


            // 4. Insert into Supabase (only if rate limit not exceeded)
            // Ensure 'user_id' column exists in your Supabase 'posts' table
            const { data: insertedData, error: insertError } = await supabase
                .from('posts')
                .insert([{
                    title: title.trim(),
                    content: content.trim(),
                    user_id: netlifyUserId // Store the Netlify User ID
                }])
                .select('id, title, content, created_at, user_id') // Select data to return
                .single(); // Expecting one row back

            if (insertError) {
                console.error('Supabase POST insert error:', insertError);
                throw new Error(`Database insert failed: ${insertError.message}`);
            }

            // 5. Return Success
            console.log(`Post created successfully for user ${netlifyUserId}`);
            return {
                statusCode: 201, // Created
                body: JSON.stringify(insertedData),
                headers: { 'Content-Type': 'application/json', 'Allow': 'GET, POST' },
            };

        } catch (error) {
            console.error('Error in POST /posts:', error);
            // Determine status code based on error type if possible
            const statusCode = error.message.includes("Database") || error.message.includes("posting limits") ? 500 : 400;
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