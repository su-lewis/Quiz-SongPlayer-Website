// FILE: netlify/functions/identity-signup.js (Simplified & Guaranteed to Work)

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

export const handler = async (event) => {
    // --- Initial validation ---
    if (!supabaseUrl || !supabaseKey) {
        const missing = [
            !supabaseUrl && 'SUPABASE_URL',
            !supabaseKey && 'SUPABASE_SERVICE_KEY'
        ].filter(Boolean).join(', ');
        console.error(`FATAL: Missing required environment variables: ${missing}`);
        return { statusCode: 500, body: JSON.stringify({ error: "Server configuration error." }) };
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        const { user } = JSON.parse(event.body);
        const netlifyUserId = user.id || user.sub;
        const userEmail = user.email;

        if (!netlifyUserId) throw new Error("User ID missing in signup event payload.");
        
        // --- Determine Username ---
        const rawUsername = user.user_metadata?.full_name;
        let usernameToStore = rawUsername?.trim();
        
        // Generate a username if 'full_name' is not provided
        if (!usernameToStore) {
            console.warn(`WARN: Username from 'full_name' is falsy. Generating default username.`);
            usernameToStore = userEmail 
                ? userEmail.split('@')[0] + '_' + Math.random().toString(36).substring(2, 7) 
                : 'user_' + Math.random().toString(36).substring(2, 9);
        }
        
        if (usernameToStore.length < 3) {
            throw new Error(`Username '${usernameToStore}' must be at least 3 characters long.`);
        }

        // --- Create Profile in Supabase ---
        console.log(`INFO: Creating Supabase profile for user ${netlifyUserId} with username: ${usernameToStore}`);
        const { data: profileData, error: supabaseError } = await supabase
            .from('profiles')
            .insert({ id: netlifyUserId, username: usernameToStore })
            .select()
            .single();

        // Handle potential database errors
        if (supabaseError) {
            console.error('FATAL: Supabase insert error:', supabaseError.message);
            // Check for specific error codes if needed
            if (supabaseError.code === '23505') { // Unique constraint violation
                 throw new Error(`Username '${usernameToStore}' is already taken or user profile exists.`);
            }
            throw new Error(`Database error: ${supabaseError.message}`);
        }
        
        console.log(`INFO: Supabase profile created successfully for user ${netlifyUserId}.`);
        
        // Return the profile data from Supabase. No call to Netlify Identity is made.
        return { 
            statusCode: 200, 
            body: JSON.stringify(profileData) 
        };

    } catch (error) {
        console.error('FATAL: Unhandled error in identity-signup handler:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Failed to process signup: ${error.message}` })
        };
    }
};