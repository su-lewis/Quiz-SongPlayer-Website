// js/supabaseClient.js

// *** REPLACE WITH YOUR SUPABASE PROJECT URL AND ANON KEY ***
const SUPABASE_URL = 'https://tpfdfcsgdmfelnvhtmen.supabase.co'; // e.g., https://xyz.supabase.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwZmRmY3NnZG1mZWxudmh0bWVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwMjI2OTYsImV4cCI6MjA2MTU5ODY5Nn0.fdJab2VWdGWFGW0Iu5p5XpwdmoKlPfBaIXKf_AVrkwY'; // The LONG public key

let supabaseClient; // Use 'supabaseClient' consistently

try {
    // Basic validation
    if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL') throw new Error("Supabase URL not set.");
    if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') throw new Error("Supabase Anon Key not set.");

    // Check if the Supabase library's 'supabase' object and 'createClient' function exist
    if (typeof supabase === 'undefined' || typeof supabase.createClient !== 'function') {
        throw new Error("Supabase library (supabase-js@2) not loaded before supabaseClient.js");
    }

    // Initialize the client and assign it to supabaseClient
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Supabase client initialized as 'supabaseClient'");

} catch (error) {
    console.error("Error initializing Supabase client:", error);
    alert(`Failed to initialize Supabase: ${error.message}. Check console and js/supabaseClient.js`);
    supabaseClient = null; // Ensure it's null if init fails
}

// 'supabaseClient' is now globally available (if initialization succeeded)