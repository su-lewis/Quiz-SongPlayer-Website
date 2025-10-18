import { initAuth } from './js/auth.js';
import { initPosts, fetchAndDisplayPosts } from './js/posts.js';
import { initTranslation } from './js/translation.js';
import { initMusicPlayer } from './js/musicPlayer.js';
import { initUI, initInjectedUI } from './js/ui.js';

/**
 * Main function to initialize all page logic after the DOM is ready.
 */
function initializePage() {
    console.log("DOM is ready. Loading components...");

    // --- 1. Load Shared HTML Content ---
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (headerPlaceholder && typeof headerContent !== 'undefined') {
        headerPlaceholder.innerHTML = headerContent;
    }
    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (footerPlaceholder && typeof footerContent !== 'undefined') {
        footerPlaceholder.innerHTML = footerContent;
    }
    const sidebarPlaceholder = document.getElementById('sidebar-placeholder');
    if (sidebarPlaceholder && typeof sidebarContent !== 'undefined') {
        sidebarPlaceholder.innerHTML = sidebarContent;
    }

    // --- THE FIX IS HERE ---
    // We use a setTimeout with a delay of 0. This is a common trick to ensure
    // that the browser has finished processing the innerHTML changes from above
    // before we try to find and interact with the new elements.
    setTimeout(() => {
        console.log("Components loaded. Initializing modules...");

        // --- 2. Initialize All Modules ---
        const dependencies = {
            fetchAndDisplayPosts: fetchAndDisplayPosts,
            getCurrentLanguage: () => 'en' // Default getter
        };

        // Initialize modules in the correct order
        initTranslation(dependencies); // Initializes first, provides language info
        initPosts(dependencies);       // Now has access to the language getter
        initMusicPlayer();             // Self-contained
        initUI();                      // General UI that doesn't depend on injected content
        initInjectedUI();              // UI for injected content like the header menu
        initAuth(dependencies);        // Auth runs last, needs injected header buttons
        
        console.log("All modules initialized.");
    }, 0); // A delay of 0 is all that's needed.
}

// --- Main Entry Point ---
document.addEventListener('DOMContentLoaded', initializePage);