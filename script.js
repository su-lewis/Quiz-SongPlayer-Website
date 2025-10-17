// FILE: script.js (Consolidated Logic - Fixed and Improved)

/**
 * Encapsulates all page initialization logic.
 * This function runs once the DOM is fully loaded.
 */
function initializePage() {
    // --- Shared Component Loading ---
    const headerPlaceholder = document.getElementById('header-placeholder');
    // Ensure headerContent is defined before attempting to use it
    if (headerPlaceholder && typeof headerContent !== 'undefined') {
        headerPlaceholder.innerHTML = headerContent;
    }

    const footerPlaceholder = document.getElementById('footer-placeholder');
    // Ensure footerContent is defined before attempting to use it
    if (footerPlaceholder && typeof footerContent !== 'undefined') {
        footerPlaceholder.innerHTML = footerContent;
    }

    const sidebarPlaceholder = document.getElementById('sidebar-placeholder');
    if (sidebarPlaceholder) {
        if (typeof sidebarContent !== 'undefined') {
            sidebarPlaceholder.innerHTML = sidebarContent;
        } else {
            console.error("Error loading shared sidebar: The 'sidebarContent' variable was not found. Ensure '_includes/sidebar.js' is loaded before 'script.js' in your HTML.");
            sidebarPlaceholder.innerHTML = "<p>Error loading sidebar content.</p>";
        }
    }

    // Wire up header dropdown toggle consistently (works for injected header or static)
    const headerMenuLink = document.getElementById('menu-link');
    if (headerMenuLink) {
        headerMenuLink.addEventListener('click', function(event) {
            event.preventDefault();
            // Use optional chaining for dropdown-menu as it might not always exist
            document.querySelector('.dropdown-menu')?.classList.toggle('show');
        });
        window.addEventListener('click', function(event) {
            // Check if the click target or any of its ancestors is not a dropdown-toggle
            if (!event.target?.closest('.dropdown-toggle')) {
                document.querySelectorAll('.dropdown-menu').forEach(dd => dd.classList.remove('show'));
                // Clear any persisted hover state when closing
                const openMenu = document.querySelector('.dropdown-menu'); // This might be null if no menu is open
                openMenu?.querySelectorAll('.persist-hover').forEach(el => el.classList.remove('persist-hover'));
                // Also deactivate the language submenu active state
                const langItem = document.querySelector('.language-menu-item');
                langItem?.classList.remove('language-active');
            }
        });
    }

    // --- Translation System ---
    const dropdownMenu = document.querySelector('.dropdown-menu');
    const languageMenuItem = document.querySelector('.language-menu-item');
    const languageSubmenu = document.querySelector('.language-submenu');
    let submenuActive = false; // Tracks if the language submenu is currently active

    if (dropdownMenu && languageMenuItem && languageSubmenu) {
        // Persist last hovered item within dropdown
        function setPersistHover(el) {
            if (!dropdownMenu || !el) return;
            dropdownMenu.querySelectorAll('.persist-hover').forEach(n => n.classList.remove('persist-hover'));
            el.classList.add('persist-hover');
        }

        function deactivateLanguageSubmenu() {
            submenuActive = false;
            languageMenuItem?.classList.remove('language-active');
        }

        function activateLanguageSubmenu() {
            submenuActive = true;
            languageMenuItem?.classList.add('language-active');
        }

        // Mouse enter/leave for persistent submenu
        languageMenuItem.addEventListener('mouseenter', () => {
            activateLanguageSubmenu();
            const link = languageMenuItem.querySelector('a');
            if (link) setPersistHover(link);
        });

        const langParentLink = languageMenuItem.querySelector('a');
        if (langParentLink) {
            langParentLink.addEventListener('click', (e) => {
                if (window.matchMedia('(max-width: 768px)').matches) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (submenuActive) {
                        deactivateLanguageSubmenu();
                    } else {
                        activateLanguageSubmenu();
                        setPersistHover(langParentLink);
                    }
                }
            });
        }

        // Keep submenu active when moving between parent and submenu or whitespace
        // These are intentionally no-ops; submenu remains active until another item is hovered or dropdown is closed
        languageMenuItem.addEventListener('mouseleave', () => { /* no-op */ });
        languageSubmenu.addEventListener('mouseleave', () => { /* no-op */ });

        // Add hover listeners to all direct children of dropdown-menu
        Array.from(dropdownMenu.children).forEach(child => {
            // Only consider interactive elements like links or labels for hover states
            if (child.tagName === 'A' || child.tagName === 'LABEL' || child.classList.contains('dropdown-item')) {
                child.addEventListener('mouseenter', () => {
                    setPersistHover(child);
                    // If the hovered item is NOT the language menu, deactivate the submenu
                    if (!languageMenuItem.contains(child)) {
                        deactivateLanguageSubmenu();
                    }
                });
                // When leaving the item into whitespace inside the dropdown, keep highlight
                child.addEventListener('mouseleave', (e) => {
                    // If moving to an element inside the dropdown (whitespace or container), don't clear
                    if (dropdownMenu.contains(e.relatedTarget)) {
                        // do nothing; persist-hover stays
                    }
                });
            }
        });
    }

    // --- Automatic Translation System ---
    const translationCache = {}; // In-memory cache for the current page session
    const originalTextMap = new WeakMap(); // Stores original English text for elements

    async function autoTranslate(lang) {
        const elementsToTranslate = document.querySelectorAll('[data-translate], [data-translate-placeholder]');

        // Store original text on first run for all relevant elements
        if (!originalTextMap.has(document.body)) {
            elementsToTranslate.forEach(el => {
                if (el.hasAttribute('data-translate-placeholder')) {
                    originalTextMap.set(el, el.placeholder);
                } else {
                    // Store innerHTML to preserve icons etc. but only if it's not empty
                    if (el.innerHTML.trim() !== '') {
                        originalTextMap.set(el, el.innerHTML);
                    }
                }
            });
            originalTextMap.set(document.body, true); // Mark as initialized
        }

        // Restore all elements to their original English text first
        elementsToTranslate.forEach(el => {
            if (originalTextMap.has(el)) {
                if (el.hasAttribute('data-translate-placeholder')) {
                    el.placeholder = originalTextMap.get(el);
                } else {
                    el.innerHTML = originalTextMap.get(el);
                }
            }
        });

        // If target is English, we're done.
        if (lang === 'en') {
            return;
        }

        // Load cache for the target language from localStorage
        const cacheKey = `translation_cache_${lang}`;
        try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                Object.assign(translationCache, JSON.parse(cached));
            }
        } catch (e) {
            console.warn('Could not load translation cache from localStorage.', e);
        }

        for (const el of elementsToTranslate) {
            const isPlaceholder = el.hasAttribute('data-translate-placeholder');
            const originalValue = originalTextMap.get(el); // Get original value from map

            if (!originalValue) continue; // Skip if no original content was stored

            let translatedText = translationCache[originalValue];

            if (!translatedText) {
                try {
                    const response = await fetch('/.netlify/functions/translate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: originalValue, target_lang: lang }),
                    });
                    if (!response.ok) throw new Error(`API error: ${response.status}`);
                    const data = await response.json();
                    translatedText = data.translatedText;
                    translationCache[originalValue] = translatedText; // Save to in-memory cache
                } catch (error) {
                    console.error(`Failed to translate "${originalValue}":`, error);
                    continue; // Skip this element on error
                }
            }

            if (translatedText) {
                if (isPlaceholder) {
                    el.placeholder = translatedText;
                } else {
                    // Find the first text node and replace its content to preserve child elements (like icons).
                    const textNode = Array.from(el.childNodes).find(
                        node => node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0
                    );
                    if (textNode) {
                        textNode.textContent = translatedText;
                    } else {
                        // Fallback for simple elements or when no direct text node is found
                        // This might overwrite icons if the original value stored was entire innerHTML
                        el.innerHTML = translatedText;
                    }
                }
            }
        }

        // Save the updated cache to localStorage
        try {
            localStorage.setItem(cacheKey, JSON.stringify(translationCache));
        } catch (e) {
            console.warn('Could not save translation cache to localStorage.', e);
        }
    }


    // Track the current language (persist across pages)
    let currentLang = 'en';
    async function applyTranslations(lang) {
        currentLang = lang;
        await autoTranslate(lang);
        // Keep site layout LTR for all languages (do not flip layout for Arabic)
        document.documentElement.setAttribute('dir', 'ltr');
    }

    // Load preferred language from localStorage if available
    try {
        const savedLang = localStorage.getItem('preferredLang');
        if (savedLang) {
            applyTranslations(savedLang);
            document.documentElement.lang = savedLang; // Set HTML lang attribute
        } else {
            applyTranslations('en');
        }
    } catch (_) {
        applyTranslations('en');
    }

    // Add click listeners to language links
    document.querySelectorAll('[data-lang]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const selectedLang = link.getAttribute('data-lang');
            applyTranslations(selectedLang);
            document.documentElement.lang = selectedLang;
            try { localStorage.setItem('preferredLang', selectedLang); } catch (e) { console.warn("Could not save language preference:", e); }
        });
    });

    // Helper: re-apply translations after posts or nav items are loaded/changed
    function retranslateDynamicContent() {
        if (currentLang !== 'en') {
            applyTranslations(currentLang);
        }
    }

    // Map app language to a locale for date formatting
    function mapLangToLocale(lang) {
        const map = {
            en: 'en-US', fr: 'fr-FR', de: 'de-DE', es: 'es-ES', it: 'it-IT', pt: 'pt-PT',
            ja: 'ja-JP', ru: 'ru-RU', zh: 'zh-CN', ko: 'ko-KR', el: 'el-GR', ar: 'ar',
            af: 'af-ZA', haw: 'en-US', hi: 'hi-IN', la: 'en-US' // 'haw' and 'la' fallback to 'en-US'
        };
        return map[lang] || 'en-US'; // Default to 'en-US' if no match
    }

    // --- Global DOM Element References ---
    const createLink = document.getElementById('create-link');
    const createPostContainer = document.getElementById('create-post-container');
    const createPostArea = document.getElementById('create-post-area');
    const createPostForm = document.getElementById('create-post-form');
    const titleInput = document.getElementById('post-title');
    const contentInput = document.getElementById('post-content');

    // --- HTML5 Video Embed References ---
    const videoEmbedContainer = document.getElementById('video-embed-container');
    const videoTriggerInfo = document.getElementById('video-trigger-info');

    // --- State for Video Player ---
    let videoElementRef = null;
    let isVideoActive = false;

    // --- Page-Specific Element References (initialized after sidebar load) ---
    const loginPrompt = document.getElementById('login-prompt');
    const formMessage = document.getElementById('form-message');
    const submitButton = document.getElementById('submit-button');
    const postsContainer = document.getElementById('posts-container');
    const fullPostsContainer = document.getElementById('full-posts-container');
    const quickLinksToggle = document.querySelector('.quick-links-toggle');
    const quickLinksList = document.getElementById('quick-links-list');
    const musicPlayerContainer = document.querySelector('.mini-music-player');
    const titleCharCount = document.getElementById('title-char-count');
    const contentCharCount = document.getElementById('content-char-count');


    // --- Auth Button References (must be after header injection) ---
    const signupButton = document.getElementById('signup-button');
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const authButtonsDiv = document.getElementById('auth-buttons');
    const userStatusDiv = document.getElementById('user-status');
    const userEmailSpan = document.getElementById('user-email');

    // --- Netlify Identity & UI Updates ---
    function updateUserStatusUI() {
        const user = window.netlifyIdentity?.currentUser();

        if (user) {
            // --- LOGGED IN STATE ---
            if (authButtonsDiv) authButtonsDiv.style.display = 'none';
            if (userStatusDiv) userStatusDiv.style.display = 'flex';
            if (userEmailSpan) {
                const username = user.user_metadata?.username || user.user_metadata?.full_name || user.email;
                userEmailSpan.textContent = username;
                userEmailSpan.title = user.email;
            }
            if (createLink) createLink.style.display = 'inline-block';
            if (loginPrompt) loginPrompt.style.display = 'none';
            if (createPostForm) createPostForm.style.display = 'block';
            if (createPostArea) createPostArea.style.display = 'block'; // Keep area visible for form
            if (createPostContainer) createPostContainer.style.display = 'block';
            if (submitButton) submitButton.disabled = false;
            if (formMessage) { formMessage.textContent = ''; formMessage.className = 'message'; }

        } else {
            // --- LOGGED OUT STATE ---
            if (authButtonsDiv) authButtonsDiv.style.display = 'flex';
            if (userStatusDiv) userStatusDiv.style.display = 'none';
            if (userEmailSpan) { userEmailSpan.textContent = ''; userEmailSpan.title = ''; }
            if (createLink) createLink.style.display = 'inline-block'; // Keep create link visible generally
            if (loginPrompt) { loginPrompt.textContent = "Please log in to create a post."; loginPrompt.style.display = 'block'; }
            if (createPostForm) createPostForm.style.display = 'none';
            if (submitButton) submitButton.disabled = true;
            if (createPostArea) createPostArea.style.display = 'block'; // Keep area visible for prompt
            if (createPostContainer) createPostContainer.style.display = 'block';
            if (formMessage) { formMessage.textContent = ''; formMessage.className = 'message'; }
        }
    }

    if (window.netlifyIdentity) {
        netlifyIdentity.on("init", user => {
            updateUserStatusUI();
            if (postsContainer || fullPostsContainer) fetchAndDisplayPosts();

            signupButton?.addEventListener('click', () => netlifyIdentity.open('signup'));
            loginButton?.addEventListener('click', () => netlifyIdentity.open('login'));
            logoutButton?.addEventListener('click', () => netlifyIdentity.logout());
        });

        netlifyIdentity.on("login", user => {
            updateUserStatusUI();
            netlifyIdentity.close();
            if (postsContainer || fullPostsContainer) fetchAndDisplayPosts();
        });
        netlifyIdentity.on("logout", () => {
            updateUserStatusUI();
            if (postsContainer || fullPostsContainer) fetchAndDisplayPosts();
        });
        netlifyIdentity.on("error", err => {
            console.error("Netlify Identity Event: error:", err);
            updateUserStatusUI();
            if (loginPrompt && loginPrompt.style.display !== 'none') {
                loginPrompt.textContent = "Auth error.";
            } else if (formMessage && createPostForm?.style.display !== 'none') {
                formMessage.textContent = `Auth Error: ${err.message || 'Unknown'}`;
                formMessage.className = 'message error';
            }
        });

    } else {
        console.error("Netlify Identity widget script not loaded.");
        updateUserStatusUI(); // Show logged out state
        if (loginPrompt) { loginPrompt.textContent = "Error: Auth system failed."; loginPrompt.style.display = 'block'; }
        if (createPostForm) createPostForm.style.display = 'none';
    }
    // --- End Netlify Identity ---


    // --- Create Post Form Logic ---
    const handleCreateSubmit = async (event) => {
        event.preventDefault();
        const user = window.netlifyIdentity?.currentUser();
        if (!user) {
            updateUserStatusUI();
            if (formMessage) { formMessage.textContent = 'Authentication required.'; formMessage.className = 'message error'; }
            console.error("Create submit failed: User not authenticated.");
            return;
        }

        // Use optional chaining for titleInput and contentInput
        const title = titleInput?.value.trim() || '';
        const content = contentInput?.value.trim() || '';

        // Ensure elements exist before accessing attributes
        const titleMaxLength = parseInt(titleInput?.getAttribute('maxlength') || '300', 10);
        const contentMaxLength = parseInt(contentInput?.getAttribute('maxlength') || '40000', 10);

        if (!content) {
            if (formMessage) { formMessage.textContent = "Content is required."; formMessage.className = 'message error'; }
            return;
        }
        if (title.length > titleMaxLength) {
            if (formMessage) { formMessage.textContent = `Title exceeds maximum length of ${titleMaxLength}.`; formMessage.className = 'message error'; }
            return;
        }
        if (content.length > contentMaxLength) {
            if (formMessage) { formMessage.textContent = `Content exceeds maximum length of ${contentMaxLength}.`; formMessage.className = 'message error'; }
            return;
        }

        if (submitButton) submitButton.disabled = true;
        if (formMessage) { formMessage.textContent = "Submitting..."; formMessage.className = 'message info'; }
        try {
            const token = await user.jwt(true); // Force refresh token if needed
            const response = await fetch('/.netlify/functions/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ title, content })
            });
            if (!response.ok) {
                let errorMsg = `HTTP error! status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error || errorMsg;
                } catch (e) { /* Ignore parsing error */ }
                throw new Error(errorMsg);
            }
            const createdPost = await response.json();
            console.log('Post created:', createdPost.id);
            if (formMessage) { formMessage.textContent = "Post created! Redirecting..."; formMessage.className = 'message success'; }
            if (titleInput) titleInput.value = '';
            if (contentInput) contentInput.value = '';
            if (titleInput && titleCharCount) updateCharCount(titleInput, titleCharCount, titleMaxLength);
            if (contentInput && contentCharCount) updateCharCount(contentInput, contentCharCount, contentMaxLength);
            setTimeout(() => { window.location.href = '/'; }, 1500);
        } catch (error) {
            console.error("Error creating post:", error);
            if (formMessage) { formMessage.textContent = `Error: ${error.message}`; formMessage.className = 'message error'; }
            if (submitButton && window.netlifyIdentity?.currentUser()) { submitButton.disabled = false; } else { updateUserStatusUI(); }
        }
    };
    // --- End Create Post Form Logic ---


    // --- Character Counting Logic (Conditional Visibility) ---
    function updateCharCount(inputElement, counterElement, maxLength) {
        if (!inputElement || !counterElement) return;
        const currentLength = inputElement.value.length;
        // Show counter only when nearing or exceeding limit
        if (currentLength > maxLength * 0.9 || currentLength >= maxLength) {
            counterElement.textContent = `${currentLength} / ${maxLength}`;
            counterElement.style.display = 'block'; // Make visible
            if (currentLength >= maxLength) {
                if (!counterElement.classList.contains('limit-reached')) { counterElement.classList.add('limit-reached'); }
            } else {
                if (counterElement.classList.contains('limit-reached')) { counterElement.classList.remove('limit-reached'); }
            }
        } else {
            counterElement.style.display = 'none'; // Hide if far from limit
            if (counterElement.classList.contains('limit-reached')) { counterElement.classList.remove('limit-reached'); }
        }
    }


    // Attach listeners and initialize counters if on create page
    if (createPostForm) {
        createPostForm.addEventListener('submit', handleCreateSubmit);
        if (titleInput && titleCharCount) {
            const titleMaxLength = parseInt(titleInput.getAttribute('maxlength') || '300', 10);
            titleInput.addEventListener('input', () => { updateCharCount(titleInput, titleCharCount, titleMaxLength); });
            updateCharCount(titleInput, titleCharCount, titleMaxLength); // Initial check
        }
        if (contentInput && contentCharCount) {
            const contentMaxLength = parseInt(contentInput.getAttribute('maxlength') || '40000', 10);
            contentInput.addEventListener('input', () => { updateCharCount(contentInput, contentCharCount, contentMaxLength); });
            updateCharCount(contentInput, contentCharCount, contentMaxLength); // Initial check
        }
        const clearFormMessageOnInput = () => { if (formMessage && formMessage.textContent) { formMessage.textContent = ''; formMessage.className = 'message'; } };
        titleInput?.addEventListener('input', clearFormMessageOnInput);
        contentInput?.addEventListener('input', clearForm