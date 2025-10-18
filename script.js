import { initAuth, attachAuthButtonListeners } from './js/auth.js';
import { initPosts, fetchAndDisplayPosts } from './js/posts.js';
import { initTranslation } from './js/translation.js';
import { initMusicPlayer } from './js/musicPlayer.js';
import { initUI, initInjectedUI } from './js/ui.js';

function initializePage() {
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

    // --- 2. Initialize Modules in the Correct Order ---
    const dependencies = {
        fetchAndDisplayPosts: fetchAndDisplayPosts,
        getCurrentLanguage: () => 'en' 
    };

    // Initialize core widget event listeners FIRST.
    // This allows the widget to start initializing in the background.
    initAuth(dependencies); 

    // Initialize all other modules that don't depend on the auth buttons themselves.
    initTranslation(dependencies);
    initPosts(dependencies);
    initMusicPlayer();
    initUI();
    initInjectedUI();
    
    // --- THIS IS THE CRITICAL FIX ---
    // NOW that all components are on the page and all other scripts have run,
    // we explicitly tell the auth module to find the buttons and make them clickable.
    attachAuthButtonListeners();
    
    console.log("All modules initialized.");
}

document.addEventListener('DOMContentLoaded', initializePage);