export function initUI() {
    console.log("Module Loaded: ui.js"); // ADD THIS LINE
    // These functions can be called after the DOM is generally ready,
    // but before specific components like the header are injected.
    initDarkMode();
    initRandomLink();
    initAnsiVideo();
}

/**
 * Initializes UI elements that are injected dynamically, like the header menu.
 * This function should be called AFTER the header has been added to the DOM.
 */
export function initInjectedUI() {
    // --- Dropdown Menu Logic ---
    const headerMenuLink = document.getElementById('menu-link');
    if (headerMenuLink) {
        console.log("UI: Found menu link, attaching click listener.");
        headerMenuLink.addEventListener('click', function(event) {
            event.preventDefault();
            const dropdownMenu = document.querySelector('.dropdown-menu');
            if (!dropdownMenu) return;

            const isVisible = dropdownMenu.classList.toggle('show');

            if (isVisible) {
                const allItems = dropdownMenu.querySelectorAll('a, .dropdown-item-label');

                allItems.forEach(item => {
                    item.addEventListener('mouseover', () => {
                        const submenu = item.closest('.language-submenu');
                        if (submenu) {
                            // Hover is inside a submenu
                            submenu.querySelectorAll('a').forEach(i => i.classList.remove('persist-hover'));
                            item.classList.add('persist-hover');
                        } else {
                            // Hover is on a top-level item
                            // Clear all top-level items
                            dropdownMenu.querySelectorAll(':scope > a, :scope > .dropdown-item-label, :scope > .language-menu-item > a').forEach(i => i.classList.remove('persist-hover'));
                            // Clear all submenu items
                            dropdownMenu.querySelectorAll('.language-submenu a').forEach(i => i.classList.remove('persist-hover'));
                            // Highlight the current top-level item
                            item.classList.add('persist-hover');
                        }
                    });
                });
            }
        });

        // Add a global click listener to close the dropdown when clicking elsewhere
        window.addEventListener('click', function(event) {
            if (!event.target?.closest('.dropdown')) { // More robust check
                document.querySelectorAll('.dropdown-menu.show').forEach(dd => dd.classList.remove('show'));
            }
        });
    } else {
        console.error("UI Error: Could not find '#menu-link' to attach dropdown listener.");
    }
}


// --- All other UI functions from your original script ---

function initDarkMode() {
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (!darkModeToggle) return;

    const DARK_MODE_KEY = 'darkModePreference_v1';
    const bodyElement = document.body;

    const applyDarkMode = (isDark) => {
        bodyElement.classList.toggle('dark-mode', isDark);
        darkModeToggle.checked = isDark;
    };

    const savedPreference = localStorage.getItem(DARK_MODE_KEY);
    const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyDarkMode(savedPreference === 'dark' || (savedPreference === null && systemPrefersDark));

    darkModeToggle.addEventListener('change', () => {
        const isDark = darkModeToggle.checked;
        applyDarkMode(isDark);
        try { localStorage.setItem(DARK_MODE_KEY, isDark ? 'dark' : 'light'); } catch (e) {}
    });

    const darkModeLabel = document.querySelector('.dropdown-item-label[for="dark-mode-toggle"]');
    darkModeLabel?.addEventListener('click', e => e.stopPropagation());
}

function initRandomLink() {
    const randomLink = document.getElementById('random-link');
    if (!randomLink) return;

    randomLink.addEventListener('click', async (e) => {
        e.preventDefault();
        const staticPages = ['/', '/create', '/posts'];
        let candidates = [...staticPages];
        try {
            const resp = await fetch('/.netlify/functions/posts');
            if (resp.ok) {
                const posts = await resp.json();
                if (Array.isArray(posts)) {
                    posts.forEach(p => { if (p && p.id) candidates.push(`/posts#post-${p.id}`); });
                }
            }
        } catch (err) { /* ignore */ }
        
        const currentPath = (window.location.pathname.replace(/\/$/, "") || "/").split('#')[0];
        candidates = candidates.filter(target => (target.split('#')[0] || '/') !== currentPath);
        if (candidates.length === 0) candidates.push('/');
        
        window.location.href = candidates[Math.floor(Math.random() * candidates.length)];
    });
}

function initAnsiVideo() {
    const videoTriggerInfo = document.getElementById('video-trigger-info');
    const videoEmbedContainer = document.getElementById('video-embed-container');
    let videoElementRef = null;
    let isVideoActive = false;

    if (!videoTriggerInfo || !videoEmbedContainer) return;

    function resetVideoState() {
        if (videoElementRef?.parentNode) {
            videoElementRef.parentNode.removeChild(videoElementRef);
            videoElementRef = null;
        }
        videoEmbedContainer.style.display = 'none';
        videoTriggerInfo.textContent = "ANSI Art (Click to play)";
        videoTriggerInfo.classList.remove('video-active');
        isVideoActive = false;
    }

    function playAnsiVideo() {
        if (isVideoActive) return;
        isVideoActive = true;
        
        videoTriggerInfo.textContent = "ANSI Art (Loading...)";
        localStorage.setItem('ansiArtVisited', '1');
        videoTriggerInfo.classList.add('visited', 'video-active');
        videoEmbedContainer.style.display = 'block';
        videoEmbedContainer.innerHTML = '';

        videoElementRef = document.createElement('video');
        videoElementRef.src = '/videos/art.mp4';
        videoElementRef.muted = true;
        videoElementRef.playsInline = true;
        videoElementRef.onended = resetVideoState;
        videoElementRef.onerror = () => {
            console.error("Failed to play ANSI art video.");
            resetVideoState();
        };

        videoEmbedContainer.appendChild(videoElementRef);
        videoElementRef.play().then(() => {
            if (isVideoActive) videoTriggerInfo.textContent = "ANSI Art (Playing...)";
        }).catch(resetVideoState);
    }

    videoTriggerInfo.addEventListener('click', playAnsiVideo);
    if (localStorage.getItem('ansiArtVisited')) {
        videoTriggerInfo.classList.add('visited');
    }
}