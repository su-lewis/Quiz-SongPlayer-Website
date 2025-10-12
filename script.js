// FILE: script.js (Consolidated Logic)

function initializePage() {
    // --- Shared Component Loading ---
    // Load the shared header if placeholder exists
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (headerPlaceholder && typeof headerContent !== 'undefined') {
        headerPlaceholder.innerHTML = headerContent;
    }

    // Load the shared footer if placeholder exists
    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (footerPlaceholder && typeof footerContent !== 'undefined') {
        footerPlaceholder.innerHTML = footerContent;
    }

    // Load the sidebar content into its placeholder
    const sidebarPlaceholder = document.getElementById('sidebar-placeholder');
    if (sidebarPlaceholder && typeof sidebarContent !== 'undefined') {
        sidebarPlaceholder.innerHTML = sidebarContent;
    } else if (sidebarPlaceholder) {
        console.error("Error loading shared sidebar: The 'sidebarContent' variable was not found. Ensure '_includes/sidebar.js' is loaded before 'script.js' in your HTML.");
        sidebarPlaceholder.innerHTML = "<p>Error loading sidebar content.</p>";
    }

    // Wire up header dropdown toggle consistently (works for injected header or static)
    const headerMenuLink = document.getElementById('menu-link');
    if (headerMenuLink) {
        headerMenuLink.addEventListener('click', function(event) {
            event.preventDefault();
            document.querySelector('.dropdown-menu')?.classList.toggle('show');
        });
        window.addEventListener('click', function(event) {
            if (!event.target?.closest('.dropdown-toggle')) {
                document.querySelectorAll('.dropdown-menu').forEach(dd => dd.classList.remove('show'));
                    // Clear any persisted hover state when closing
                    const openMenu = document.querySelector('.dropdown-menu');
                    openMenu?.querySelectorAll('.persist-hover').forEach(el => el.classList.remove('persist-hover'));
                    // Also deactivate the language submenu active state
                    const langItem = document.querySelector('.language-menu-item');
                    langItem?.classList.remove('language-active');
                }
            });
    }

    // --- Translation System ---
    // --- Language Submenu Persistent Activation Logic ---
    const dropdownMenu = document.querySelector('.dropdown-menu');
    const languageMenuItem = document.querySelector('.language-menu-item');
    const languageSubmenu = document.querySelector('.language-submenu');
    let submenuActive = false;

    if (dropdownMenu && languageMenuItem && languageSubmenu) {
        // Persist last hovered item within dropdown
        function setPersistHover(el) {
            if (!dropdownMenu || !el) return;
            dropdownMenu.querySelectorAll('.persist-hover').forEach(n => n.classList.remove('persist-hover'));
            el.classList.add('persist-hover');
        }

        // Helper: deactivate submenu
        function deactivateLanguageSubmenu() {
            submenuActive = false;
            languageMenuItem?.classList.remove('language-active');
        }

        // Helper: activate submenu
        function activateLanguageSubmenu() {
            submenuActive = true;
            languageMenuItem?.classList.add('language-active');
        }

        // Mouse enter/leave for persistent submenu
        // Activate on hover over parent; track hover state on parent link
        languageMenuItem.addEventListener('mouseenter', (e) => { activateLanguageSubmenu(); const link = languageMenuItem.querySelector('a'); if (link) setPersistHover(link); });

            // On mobile (no hover), toggle submenu on click of the parent link
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
            languageMenuItem.addEventListener('mouseleave', (e) => {
                // Intentionally no-op; submenu remains active
            });
            languageSubmenu.addEventListener('mouseleave', (e) => {
                // Intentionally no-op; submenu remains active
            });

            // Add hover listeners to all direct children of dropdown-menu
            const children = Array.from(dropdownMenu.children);
            for (const child of children) {
                if (child.tagName !== 'A' && child.tagName !== 'LABEL') continue;
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
            // Do not clear persisted hover on mouseleave; keep the last hovered
            // Item highlighted and submenu state intact until explicit close
    }
    // --- Automatic Translation System ---
    const translationCache = {}; // In-memory cache for the current page session
    const originalTextMap = new WeakMap(); // Stores original English text for elements

    // Attribute-driven translation for stability
    async function autoTranslate(lang) {
        // Store original text on first run
        if (!originalTextMap.has(document.body)) {
            document.querySelectorAll('[data-translate], [data-translate-placeholder]').forEach(el => {
                if (el.hasAttribute('data-translate-placeholder')) {
                    originalTextMap.set(el, el.placeholder);
                } else {
                    originalTextMap.set(el, el.innerHTML); // Store innerHTML to preserve icons etc.
                }
            });
            originalTextMap.set(document.body, true); // Mark as initialized
        }

        // Restore all elements to their original English text first
        document.querySelectorAll('[data-translate], [data-translate-placeholder]').forEach(el => {
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

        const elementsToTranslate = document.querySelectorAll('[data-translate], [data-translate-placeholder]');

        for (const el of elementsToTranslate) {
            const isPlaceholder = el.hasAttribute('data-translate-placeholder');
            // For elements with children (like icons), we only want the text content.
            const originalText = (isPlaceholder ? el.placeholder : el.textContent).trim();

            if (!originalText) continue;

            let translatedText = translationCache[originalText];

            if (!translatedText) {
                try {
                    const response = await fetch('/.netlify/functions/translate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: originalText, target_lang: lang }),
                    });
                    if (!response.ok) throw new Error(`API error: ${response.status}`);
                    const data = await response.json();
                    translatedText = data.translatedText;
                    translationCache[originalText] = translatedText; // Save to in-memory cache
                } catch (error) {
                    console.error(`Failed to translate "${originalText}":`, error);
                    continue; // Skip this element on error
                }
            }

            if (isPlaceholder) {
                el.placeholder = translatedText;
            } else {
                // To preserve icons, find the first text node and replace its content.
                const textNode = Array.from(el.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
                if (textNode) {
                    textNode.textContent = translatedText;
                } else {
                    el.textContent = translatedText; // Fallback for simple elements
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
            // Apply the selected language. The function handles reverting to original text.
            applyTranslations(selectedLang);
            document.documentElement.lang = selectedLang;
            try { localStorage.setItem('preferredLang', selectedLang); } catch (_) {}
        });
    });

    // Helper: re-apply translations after posts or nav items are loaded/changed
    function retranslateDynamicContent() {
        if (currentLang !== 'en') {
            applyTranslations(currentLang);
        }
    }

    // Small helper to fetch translated strings safely
    async function t(key) {
        try {
            // This function is now more complex, as it would need to be async.
            // For simplicity, we will translate elements directly via data-translate attributes.
            // If you need to get a translated string in JS, you'd call the translation function.
            return key; // Placeholder, direct translation is now preferred.
        } catch (_) {
            return key;
        }
    }

    // Map app language to a locale for date formatting
    function mapLangToLocale(lang) {
        const map = {
            en: 'en-US', fr: 'fr-FR', de: 'de-DE', es: 'es-ES', it: 'it-IT', pt: 'pt-PT',
            ja: 'ja-JP', ru: 'ru-RU', zh: 'zh-CN', ko: 'ko-KR', el: 'el-GR', ar: 'ar',
            af: 'af-ZA', haw: 'en-US', hi: 'hi-IN', la: 'en-US'
        };
        return map[lang] || undefined;
    }

    // Example: If you load posts dynamically, call retranslateDynamicContent() after loading
    // If you update nav bar dropdown items dynamically, call retranslateDynamicContent() after updating

    // --- Example hooks for posts (replace with your actual post loading logic) ---
    // If you use fetch or AJAX to load posts:
    // fetch('/api/posts').then(...).then(() => { retranslateDynamicContent(); });

    // If you use innerHTML or DOM manipulation to update posts:
    // postsContainer.innerHTML = ...; retranslateDynamicContent();

    // If you update nav bar dropdown items:
    // dropdownMenu.innerHTML = ...; retranslateDynamicContent();

    // --- Global DOM Element References ---
    const signupButton = document.getElementById('signup-button');
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const authButtonsDiv = document.getElementById('auth-buttons');
    const userStatusDiv = document.getElementById('user-status');
    const userEmailSpan = document.getElementById('user-email');
    const createLink = document.getElementById('create-link');
    const createPostContainer = document.getElementById('create-post-container');
    const createPostArea = document.getElementById('create-post-area');
    const createPostForm = document.getElementById('create-post-form');
    const titleInput = document.getElementById('post-title'); // Element for title input/textarea
    const contentInput = document.getElementById('post-content'); // Element for content textarea

    // --- HTML5 Video Embed References ---
    const videoEmbedContainer = document.getElementById('video-embed-container'); // Container for the video
    const videoTriggerInfo = document.getElementById('video-trigger-info');       // The <span> triggering the video

    // --- State for Video Player ---
    let videoElementRef = null; // Reference to the <video> element
    let isVideoActive = false; // Flag to prevent multiple clicks/plays

    // --- Page-Specific Element References (initialized after sidebar load) ---
    const loginPrompt = document.getElementById('login-prompt');
    const formMessage = document.getElementById('form-message');
    const submitButton = document.getElementById('submit-button');
    const postsContainer = document.getElementById('posts-container');
    const fullPostsContainer = document.getElementById('full-posts-container');
    const viewPostsArea = document.getElementById('view-posts-area');
    const titleCharCount = document.getElementById('title-char-count');
    const contentCharCount = document.getElementById('content-char-count');
    const quickLinksToggle = document.querySelector('.quick-links-toggle');
    const quickLinksList = document.getElementById('quick-links-list');
    const musicPlayerContainer = document.querySelector('.mini-music-player');





    // --- Netlify Identity & UI Updates ---
    function updateUserStatusUI() {
        const user = window.netlifyIdentity?.currentUser();
        // console.log("Updating UI. Current User:", user ? user.email : 'None');

        if (user) {
            // --- LOGGED IN STATE ---
            if (authButtonsDiv) authButtonsDiv.style.display = 'none';
            if (userStatusDiv) userStatusDiv.style.display = 'flex';
            if (userEmailSpan) { const username = user.user_metadata?.username || user.user_metadata?.full_name || user.email; userEmailSpan.textContent = username; userEmailSpan.title = user.email; }
            if (createLink) createLink.style.display = 'inline-block';
            // Create Page Specific
            if (loginPrompt) loginPrompt.style.display = 'none';
            if (createPostForm) createPostForm.style.display = 'block';
            if (createPostArea) createPostArea.style.display = 'block';
            if (createPostContainer) createPostContainer.style.display = 'block';
            if (submitButton) submitButton.disabled = false;
            if (formMessage) { formMessage.textContent = ''; formMessage.className = 'message'; }

        } else {
            // --- LOGGED OUT STATE ---
            if (authButtonsDiv) authButtonsDiv.style.display = 'flex';
            if (userStatusDiv) userStatusDiv.style.display = 'none';
            if (userEmailSpan) { userEmailSpan.textContent = ''; userEmailSpan.title = ''; }
            if (createLink) createLink.style.display = 'inline-block'; // Keep create link visible generally
            // Create Page Specific
            if (loginPrompt) { loginPrompt.textContent = "Please log in to create a post."; loginPrompt.style.display = 'block'; }
            if (createPostForm) createPostForm.style.display = 'none';
            if (submitButton) submitButton.disabled = true;
            if (createPostArea) createPostArea.style.display = 'block'; // Keep area visible for prompt
            if (createPostContainer) createPostContainer.style.display = 'block';
             if (formMessage) { formMessage.textContent = ''; formMessage.className = 'message'; }
        }
    }

    if (window.netlifyIdentity) {
        // console.log("Netlify Identity found. Setting up listeners...");
        updateUserStatusUI(); // Initial check
        netlifyIdentity.on("init", user => { updateUserStatusUI(); if (postsContainer) fetchAndDisplayPosts(); });
        netlifyIdentity.on("login", user => { updateUserStatusUI(); netlifyIdentity.close(); if (postsContainer) fetchAndDisplayPosts(); });
        netlifyIdentity.on("logout", () => { updateUserStatusUI(); if (postsContainer) fetchAndDisplayPosts(); });
        netlifyIdentity.on("error", err => { console.error("NI Event: error:", err); updateUserStatusUI(); if(loginPrompt && loginPrompt.style.display !== 'none') { loginPrompt.textContent = "Auth error."; } else if (formMessage && createPostForm?.style.display !== 'none') { formMessage.textContent = `Auth Error: ${err.message || 'Unknown'}`; formMessage.className = 'message error'; } });
        // Custom button listeners
        signupButton?.addEventListener('click', () => netlifyIdentity.open('signup'));
        loginButton?.addEventListener('click', () => netlifyIdentity.open('login'));
        logoutButton?.addEventListener('click', () => netlifyIdentity.logout());
    } else {
        console.error("Netlify Identity widget script not loaded.");
        updateUserStatusUI(); // Show logged out state
        if(loginPrompt) { loginPrompt.textContent = "Error: Auth system failed."; loginPrompt.style.display = 'block'; }
        if(createPostForm) createPostForm.style.display = 'none';
    }
    // --- End Netlify Identity ---


    // --- Create Post Form Logic ---
    const handleCreateSubmit = async (event) => {
        event.preventDefault();
        const user = window.netlifyIdentity?.currentUser();
        if (!user) { updateUserStatusUI(); if (formMessage) { formMessage.textContent = 'Authentication required.'; formMessage.className = 'message error'; } console.error("Create submit failed: User not authenticated."); return; }
        
    const title = titleInput?.value.trim();
        const content = contentInput?.value.trim();
        const titleMaxLength = parseInt(titleInput?.getAttribute('maxlength') || '300', 10);
        const contentMaxLength = parseInt(contentInput?.getAttribute('maxlength') || '40000', 10);

        if (!content) { if (formMessage) { formMessage.textContent = "Content is required."; formMessage.className = 'message error'; } return; }
        if (title && title.length > titleMaxLength) { if (formMessage) { formMessage.textContent = `Title exceeds maximum length of ${titleMaxLength}.`; formMessage.className = 'message error'; } return; }
        if (content.length > contentMaxLength) { if (formMessage) { formMessage.textContent = `Content exceeds maximum length of ${contentMaxLength}.`; formMessage.className = 'message error'; } return; }

        if (submitButton) submitButton.disabled = true;
        if (formMessage) { formMessage.textContent = "Submitting..."; formMessage.className = 'message info'; }
        try {
            const token = await user.jwt(true); // Force refresh token if needed
            const response = await fetch('/.netlify/functions/posts', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ title, content }) });
            if (!response.ok) { let errorMsg = `HTTP error! status: ${response.status}`; try { const errorData = await response.json(); errorMsg = errorData.error || errorMsg; } catch (e) { /* Ignore parsing error */ } throw new Error(errorMsg); }
            const createdPost = await response.json(); console.log('Post created:', createdPost.id);
            if (formMessage) { formMessage.textContent = "Post created! Redirecting..."; formMessage.className = 'message success'; }
            if (titleInput) titleInput.value = ''; if (contentInput) contentInput.value = '';
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
        // console.log("Attaching create form submit listener and char counters.");
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
        contentInput?.addEventListener('input', clearFormMessageOnInput);
    }
    // --- End Character Counting ---


    // --- Fetch and Display Posts Logic ---
    async function fetchAndDisplayPosts() {
        if (!postsContainer && !fullPostsContainer) { return; }
            if (postsContainer) postsContainer.innerHTML = '<p data-translate="loadingPosts">Loading posts...</p>';
        try {
            const response = await fetch('/.netlify/functions/posts');
            if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error(`Fetch failed: ${errorData.error || response.statusText} (${response.status})`); }
            const posts = await response.json();
            // Sort newest first
            if (posts && posts.length > 0) {
                posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                // Render into sidebar/truncated list (latest 4)
                if (postsContainer) {
                    postsContainer.innerHTML = '';
                    posts.slice(0, 4).forEach(post => {
                        const postElement = document.createElement('article');
                        postElement.className = 'post';
                        postElement.id = `post-${post.id}`;

                        const titleElement = document.createElement('h3');
                        const titleLink = document.createElement('a');
                        titleLink.href = `/posts#post-${post.id}`;
                        const safeTitle = (post.title || '').trim();
                        titleLink.textContent = safeTitle.length > 0 ? safeTitle : '.';
                        titleLink.className = 'post-title-link';
                        titleElement.appendChild(titleLink);

                        const contentElement = document.createElement('p');
                        // Truncate to 220 chars for sidebar
                        const plain = post.content;
                        const limit = 220;
                        const needsMore = plain.length > limit;
                        const preview = needsMore ? plain.slice(0, limit).trim() + '… ' : plain;
                        contentElement.innerHTML = preview.replace(/\n/g, '<br>');

                        // [more] link (translated now; also marked for translation updates)
                        if (needsMore) {
                            const moreLink = document.createElement('a');
                            moreLink.href = `/posts#post-${post.id}`;;
                            moreLink.textContent = '[more]';
                            moreLink.setAttribute('data-translate', 'readMore');
                            moreLink.className = 'read-more-link';
                            contentElement.appendChild(moreLink);
                        }

                        const username = post.username || 'Anonymous';
                        const postDate = new Date(post.created_at);
                        let formattedDateTime = '';
                        try {
                            const loc = mapLangToLocale(currentLang);
                            formattedDateTime = postDate.toLocaleString(loc, { dateStyle: 'medium', timeStyle: 'short' });
                        } catch (_) {
                            formattedDateTime = postDate.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
                        }
                        const metadataElement = document.createElement('small');
                        metadataElement.className = 'post-metadata';
                        metadataElement.textContent = `${username} • ${formattedDateTime}`;

                        postElement.appendChild(titleElement);
                        postElement.appendChild(contentElement);
                        postElement.appendChild(metadataElement);
                        postsContainer.appendChild(postElement);
                    });
                }

                // Render full posts on posts.html
                if (fullPostsContainer) {
                    fullPostsContainer.innerHTML = '';
                    posts.forEach(post => {
                        const postElement = document.createElement('article');
                        postElement.className = 'post full';
                        postElement.id = `post-${post.id}`;

                        const titleElement = document.createElement('h3');
                        const safeTitle = (post.title || '').trim();
                        titleElement.textContent = safeTitle.length > 0 ? safeTitle : '.';

                        const contentElement = document.createElement('p');
                        contentElement.innerHTML = post.content.replace(/\n/g, '<br>');

                        const username = post.username || 'Anonymous';
                        const postDate = new Date(post.created_at);
                        let formattedDateTime = '';
                        try {
                            const loc = mapLangToLocale(currentLang);
                            formattedDateTime = postDate.toLocaleString(loc, { dateStyle: 'medium', timeStyle: 'short' });
                        } catch (_) {
                            formattedDateTime = postDate.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
                        }
                        const metadataElement = document.createElement('small');
                        metadataElement.className = 'post-metadata';
                        metadataElement.textContent = `${username} • ${formattedDateTime}`;

                        postElement.appendChild(titleElement);
                        postElement.appendChild(contentElement);
                        postElement.appendChild(metadataElement);
                        fullPostsContainer.appendChild(postElement);
                    });

                    // Translate any new dynamic nodes
                    retranslateDynamicContent();

                    // If URL has a hash to a post id, scroll to it
                    if (location.hash) {
                        const el = document.querySelector(location.hash);
                        if (el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            el.classList.add('highlight-post');
                            setTimeout(() => el.classList.remove('highlight-post'), 2000);
                        }
                    }
                }
            } else {
                if (postsContainer) postsContainer.innerHTML = `<p data-translate="noPostsFound">No posts found.</p>`;
                if (fullPostsContainer) fullPostsContainer.innerHTML = `<p data-translate="noPostsFound">No posts found.</p>`;
                retranslateDynamicContent();
            }
        } catch (error) {
            console.error("Error fetching/displaying posts:", error);
            if (postsContainer) postsContainer.innerHTML = `<p style="color: red;"><span data-translate="errorLoadingPosts">Error loading posts:</span> ${error.message}</p>`;
            if (fullPostsContainer) fullPostsContainer.innerHTML = `<p style=\"color: red;\"><span data-translate=\"errorLoadingPosts\">Error loading posts:</span> ${error.message}</p>`;
            retranslateDynamicContent();
        }
    }
    fetchAndDisplayPosts(); // Call the function to fetch posts

    // --- Random Link Logic ---
    const randomLink = document.getElementById('random-link');
    if (randomLink) {
        randomLink.addEventListener('click', async (e) => {
            e.preventDefault();
            // Static pages in the site
            const staticPages = [
                '/',
                '/create',
                '/posts'
            ];
            let candidates = [...staticPages];
            const normalizePath = (p) => {
                if (!p || p === '/') return '/';
                if (p === '/index.html' || p === '/index') return '/';
                return p;
            };
            const currentPath = normalizePath(location.pathname);
            try {
                const resp = await fetch('/.netlify/functions/posts');
                if (resp.ok) {
                    const posts = await resp.json();
                    if (Array.isArray(posts) && posts.length > 0) {
                        // Optionally limit to a reasonable number to avoid huge arrays
                        posts.forEach(p => {
                            if (p && p.id) candidates.push(`/posts#post-${p.id}`);
                        });
                    }
                }
            } catch (err) {
                // ignore and fallback to static pages only
            }
            // Filter out current page; allow posts anchors on posts page (but avoid same anchor)
            candidates = candidates.filter(target => {
                const [path, hashPart] = target.split('#');
                const normalized = normalizePath(path);
                if (hashPart) {
                    // It's an anchor (likely a post). Always allowed, except avoid same anchor when already on posts page.
                    if (normalized === '/posts' && currentPath === '/posts') {
                        return ('#' + hashPart) !== (location.hash || '');
                    }
                    return true;
                }
                // No hash: exclude if same page
                return normalized !== currentPath;
            });
            if (candidates.length === 0) {
                // Fallback: go to posts page to show something
                candidates = ['/posts'];
            }
            // Pick a random target
            const target = candidates[Math.floor(Math.random() * candidates.length)];
            window.location.href = target;
        });
    }



    // --- Mini Music Player Logic ---
    let player; // Holds the YT.Player instance for the music player - make it accessible outside the block if needed
    let isPlayerReady = false; // Make accessible for random button
    let playlistLoaded = false; // Make accessible for shuffle button
    let playedVideos = []; // Track played videos for shuffle functionality
    let shuffleHistory = []; // Track played videos for "previous" functionality in shuffle
    let shuffleMode = true; // Track if shuffle is active - DEFAULT: ON
    let shuffleButton = null; // Reference to shuffle button
    let updatePlaylistActiveState = () => {}; // Placeholder for playlist dropdown update
    let internalIsPlaying = false; // Music player's internal state
    let clearPendingRestoreFlags = () => {}; // Placeholder accessible function
    let fullPlaylistData = null; // Store full playlist data from API

    if (musicPlayerContainer) {
        // console.log('[Music Player] Initializing...');

        // --- Constants & Config ---
    const SESSION_STORAGE_KEY = 'musicPlayerState_v1';
    const LOCAL_STORAGE_KEY = 'musicPlayerState_v1'; // Fallback across some navigations/tabs
    const youtubePlaylistId = 'PLC1tH2RPEXpQqF8cQvQYGy1Z6JwpLyG3a'; // Your playlist (size can grow)
    const AUTOPLAY_ON_LOAD = true; // Enable muted autoplay on first page load
    const ALWAYS_RANDOM_AFTER_FIRST = true; // After first-ever visit, start a random song on each load
    const initialVolume = 100;
    // Default-first-track config: if you know the videoId, set it here; otherwise we'll try to match by title
    const DEFAULT_FIRST_VIDEO_ID = 'vIOSkVRSgWY';
    const DEFAULT_FIRST_VIDEO_TITLE_MATCH = /Like a Bird/i;

        // --- DOM Elements (Music Player Specific) ---
        const playPauseBtn = document.getElementById('player-play-pause');
        const prevBtn = document.getElementById('player-prev');
        const nextBtn = document.getElementById('player-next');
        const volumeIconBtn = document.getElementById('player-volume-icon');
        const volumeIcon = volumeIconBtn?.querySelector('i');
        const pauseIconClass = 'bi-pause-fill';
        const playIconClass = 'bi-play-fill';
        const volumeSlider = document.getElementById('player-volume-slider');
        const thumbnailImg = document.getElementById('player-video-thumbnail');
        const playerContainerId = 'youtube-player-container'; // ID for YT API target div
        const videoTitleElement = document.getElementById('player-video-title');
        const trackNumberElement = document.getElementById('player-track-number');
        const seekBarContainer = document.getElementById('player-seek-bar-container');
        const seekBarProgress = document.getElementById('player-seek-bar-progress');

        // --- State Variables (Music Player Specific - Local Scope) ---
        // player, isPlayerReady, playlistLoaded are declared outside
        // internalIsPlaying declared outside
        let internalIsMuted = false;
        let currentVolume = initialVolume;
        let seekBarInterval = null;
    let restoreAttempted = false;
    let didLoadSavedVideoById = false; // Ensure restore-by-videoId only happens once
        let pendingSeekTime = null;
        let pendingPlay = false;
        let currentPlaylistIndex = 738; // Default to track 739
    let applyDefaultOnFirstVisit = false; // Decide in onPlayerReady
    let defaultApplied = false; // Ensure we only force default once
    let chooseRandomOnLoad = false; // After first visit, pick a random track
    let randomApplied = false; // Ensure random is only applied once per load
    let hasMarkedPlayedFlag = false; // Ensure we set the hasPlayed flag once
    let wantAutoplayAfterDefault = false; // For first-ever visit, autoplay after default is applied

        // --- State Management ---
        function savePlayerState() {
            if (!isPlayerReady || !player || typeof player.getPlayerState !== 'function') { return; }
            try {
                const apiState = player.getPlayerState();
                const isCurrentlyPlaying = (apiState === YT.PlayerState.PLAYING || apiState === YT.PlayerState.BUFFERING);

                // Prefer mapping current videoId to our known playlist for stable index
                let playlistIndex = currentPlaylistIndex;
                let currentVideoId = null;
                try {
                    const vd = typeof player.getVideoData === 'function' ? player.getVideoData() : null;
                    currentVideoId = vd && vd.video_id ? vd.video_id : null;
                } catch (_) {}

                if (fullPlaylistData && fullPlaylistData.videos && currentVideoId) {
                    const foundIdx = fullPlaylistData.videos.findIndex(v => v.videoId === currentVideoId);
                    if (foundIdx >= 0) playlistIndex = foundIdx;
                } else {
                    try {
                        const apiIndex = player.getPlaylistIndex();
                        if (apiIndex !== -1 && apiIndex !== null && apiIndex !== undefined) {
                            playlistIndex = apiIndex;
                        }
                    } catch (_) {}
                }

                const state = {
                    playlistId: youtubePlaylistId,
                    index: playlistIndex,
                    videoId: currentVideoId || null,
                    time: (typeof player.getCurrentTime === 'function' ? (player.getCurrentTime() || 0) : 0),
                    duration: (typeof player.getDuration === 'function' ? (player.getDuration() || 0) : 0),
                    volume: (typeof player.getVolume === 'function' ? player.getVolume() : currentVolume),
                    muted: (typeof player.isMuted === 'function' ? player.isMuted() : false),
                    playing: isCurrentlyPlaying,
                    timestamp: Date.now(),
                };

                const json = JSON.stringify(state);
                try { sessionStorage.setItem(SESSION_STORAGE_KEY, json); } catch (_) {}
                try { localStorage.setItem(LOCAL_STORAGE_KEY, json); } catch (_) {}
            } catch (e) {
                console.error("[Music Player] Error saving state:", e);
            }
        }

        function loadPlayerState() {
            try {
                const s = sessionStorage.getItem(SESSION_STORAGE_KEY);
                if (s) return JSON.parse(s);
            } catch (e) {
                console.error("[Music Player] Error loading state (session):", e);
                try { sessionStorage.removeItem(SESSION_STORAGE_KEY); } catch (_) {}
            }
            try {
                const l = localStorage.getItem(LOCAL_STORAGE_KEY);
                if (l) return JSON.parse(l);
            } catch (e) {
                console.error("[Music Player] Error loading state (local):", e);
            }
            return null;
        }

        // --- Player Event Handlers ---
        function onPlayerReady(event) { 
            isPlayerReady = true; 
            player = event.target; 
            playlistLoaded = false; 
            restoreAttempted = false; 
            pendingSeekTime = null; 
            pendingPlay = false; 
            
            const savedState = loadPlayerState(); 
            // Treat any truthy 'true' string as played before
            const hasPlayedBefore = localStorage.getItem('musicPlayerHasPlayed') === 'true';
            
            // Determine the correct index to load
            // True first visit (no flag): index 738, Otherwise use saved index or 738
            if (!hasPlayedBefore) {
                // Genuine first visit - start with Like a Bird
                currentPlaylistIndex = 738;
                currentVolume = initialVolume;
                internalIsMuted = AUTOPLAY_ON_LOAD ? true : false;
                applyDefaultOnFirstVisit = true;
                // We'll handle autoplay after switching to default video explicitly
                wantAutoplayAfterDefault = !!AUTOPLAY_ON_LOAD;
            } else if (savedState && savedState.index !== null && savedState.index !== undefined) {
                // Has played before and we have saved state - use it
                currentPlaylistIndex = savedState.index;
                currentVolume = savedState.volume || initialVolume;
                internalIsMuted = savedState.muted || false;
            } else {
                // Has played before but no saved state - default to 738
                currentPlaylistIndex = 738;
                currentVolume = initialVolume;
                internalIsMuted = false;
            }

            // Policy: After first-ever visit, start random only when there is no session state (new session/tab)
            // If a session state exists (refresh or same-tab navigation), restore that instead.
            if (ALWAYS_RANDOM_AFTER_FIRST && hasPlayedBefore && !savedState) {
                chooseRandomOnLoad = true;
            } else {
                chooseRandomOnLoad = false;
            }
            
            if (savedState && !chooseRandomOnLoad) { 
                player.setVolume(currentVolume);
                if (internalIsMuted) player.mute();

                // Calculate if the song would have finished during page load
                const timeSinceSave = (Date.now() - savedState.timestamp) / 1000;
                const remainingTime = savedState.duration ? savedState.duration - savedState.time : Infinity;

                if (savedState.playing && timeSinceSave < remainingTime) {
                    // Song is still playing, resume from calculated time
                    pendingSeekTime = savedState.time + timeSinceSave; 
                    pendingPlay = true;
                } else if (savedState.playing) {
                    // Song would have ended, so just load the next one
                    pendingPlay = true; // Will trigger 'ended' state logic to play next
                } else {
                    // It was paused, so restore the exact time and keep it paused
                    pendingSeekTime = savedState.time;
                    pendingPlay = false;
                }
                internalIsPlaying = pendingPlay;
                updatePlayPauseIcon();
            } else { 
                // First time or we are intentionally ignoring saved state (random on load)
                if (applyDefaultOnFirstVisit) {
                    // Defer autoplay until after we switch to the default video by ID
                    player.setVolume(initialVolume);
                    if (AUTOPLAY_ON_LOAD) {
                        try { player.mute(); } catch (_) {}
                        internalIsMuted = true;
                    } else {
                        try { player.unMute(); } catch (_) {}
                        internalIsMuted = false;
                    }
                    internalIsPlaying = false;
                    pendingPlay = false;
                    pendingSeekTime = null;
                } else if (AUTOPLAY_ON_LOAD) {
                    // To satisfy autoplay policies, start muted and playing
                    internalIsMuted = true;
                    try { player.mute(); } catch (_) {}
                    player.setVolume(initialVolume);
                    internalIsPlaying = true;
                    pendingPlay = true;
                    pendingSeekTime = null;
                } else {
                    // Start paused and unmuted
                    player.setVolume(initialVolume);
                    try { player.unMute(); } catch (_) {}
                    internalIsMuted = false; 
                    internalIsPlaying = false;
                    pendingPlay = false;
                    pendingSeekTime = null; 
                }
                // When we plan to pick a random track on load, do not auto-play the cued playlist first item
                if (chooseRandomOnLoad) {
                    pendingPlay = false;
                    internalIsPlaying = false;
                }
                updatePlayPauseIcon(); 
            } 
            
            if (volumeSlider) volumeSlider.value = internalIsMuted ? 0 : currentVolume; 
            updateVolumeIcon(internalIsMuted ? 0 : currentVolume); 
            updateVideoTitle("Loading..."); 
            updateThumbnail(null); 
            
            // Cue the playlist (paused) for both first and returning visits so iframe API fallback is available
            try {
                player.cuePlaylist({
                    list: youtubePlaylistId,
                    listType: 'playlist',
                    index: 0
                });
                // Ensure we remain paused until we pick/load our intended item
                internalIsPlaying = false;
            } catch (_) { /* ignore */ }
            
            // Add click listener to start playing on first interaction (only if never played before)
            if (!hasPlayedBefore && !AUTOPLAY_ON_LOAD) {
                const startPlayingOnInteraction = () => {
                    if (localStorage.getItem('musicPlayerHasPlayed') !== 'true') {
                        localStorage.setItem('musicPlayerHasPlayed', 'true');
                        if (player && isPlayerReady && !internalIsPlaying) {
                            player.playVideo();
                        }
                        // Remove listeners after first interaction
                        document.removeEventListener('click', startPlayingOnInteraction);
                        document.removeEventListener('keydown', startPlayingOnInteraction);
                    }
                };
                document.addEventListener('click', startPlayingOnInteraction);
                document.addEventListener('keydown', startPlayingOnInteraction);
            }

            // If autoplay is enabled (muted), unmute on the first user interaction anywhere on the page
            if (AUTOPLAY_ON_LOAD) {
                const unmuteOnInteraction = () => {
                    try {
                        if (player && isPlayerReady && internalIsMuted) {
                            // If user hasn't manually set a volume, unmute to 100%
                            if (typeof currentVolume !== 'number' || currentVolume <= 0) {
                                currentVolume = 100;
                            }
                            if (volumeSlider) volumeSlider.value = currentVolume;
                            player.unMute();
                            player.setVolume(currentVolume);
                            internalIsMuted = false;
                            updateVolumeIcon(currentVolume);
                            savePlayerState();
                        }
                    } catch (_) { /* ignore */ }
                    document.removeEventListener('click', unmuteOnInteraction, true);
                    document.removeEventListener('keydown', unmuteOnInteraction, true);
                };
                // Capture phase to catch clicks on any element
                document.addEventListener('click', unmuteOnInteraction, true);
                document.addEventListener('keydown', unmuteOnInteraction, true);
            }
            
            setupPlayerEventListeners();

            // Immediately load default video on true first visit
            if (applyDefaultOnFirstVisit && DEFAULT_FIRST_VIDEO_ID) {
                try {
                    player.loadVideoById(DEFAULT_FIRST_VIDEO_ID);
                    if (AUTOPLAY_ON_LOAD) {
                        try { player.mute(); } catch (_) {}
                        internalIsMuted = true;
                        internalIsPlaying = true;
                    } else {
                        try { player.unMute(); } catch (_) {}
                        internalIsMuted = false;
                        internalIsPlaying = false;
                    }
                    defaultApplied = true;
                    updateThumbnail(DEFAULT_FIRST_VIDEO_ID);
                    updateTrackNumber(DEFAULT_FIRST_VIDEO_ID);
                    // Prompt early title/details refresh
                    setTimeout(() => { try { updateVideoDetails(); } catch(_){} }, 200);
                    savePlayerState();
                } catch (e) {
                    console.warn('[Music Player] Could not load default video immediately:', e);
                }
            }

            // Populate playlist data immediately to enable random selection or track number updates
            try { populatePlaylist(); } catch (_) {}
            // Event listeners are now set up in initializeAndLoadPlayer
        }

        function onPlayerStateChange(event) {
            const state = event.data;
            // const stateNames = { '-1': 'UNSTARTED', 0: 'ENDED', 1: 'PLAYING', 2: 'PAUSED', 3: 'BUFFERING', 5: 'CUED' };
            // console.log(`[Music Player] Event: onStateChange - ${stateNames[state] || state}`);

            if (!isPlayerReady) return;

            // This block handles restoring the player's state (e.g., after a page reload)
            if (!restoreAttempted && (state === YT.PlayerState.CUED || state === YT.PlayerState.BUFFERING || state === YT.PlayerState.PLAYING)) {
                playlistLoaded = true;
                restoreAttempted = true;

                // Load full playlist data immediately for track numbers and shuffle
                if (!isPlaylistLoaded) {
                    populatePlaylist();
                }

                const savedState = loadPlayerState();
                // Restore sequence: switch to saved video (if needed) with start time, then play if needed
                if (!chooseRandomOnLoad && savedState) {
                    try {
                        const vd = typeof player.getVideoData === 'function' ? player.getVideoData() : null;
                        const currentId = vd && vd.video_id ? vd.video_id : null;
                        // Compute target start time if we had a pendingSeekTime or can derive from timestamp
                        let targetStart = null;
                        if (pendingSeekTime !== null && pendingSeekTime > 0.1) {
                            targetStart = pendingSeekTime;
                        } else if (typeof savedState.time === 'number') {
                            // Adjust by elapsed time if it was playing when saved
                            const timeSinceSave = (Date.now() - (savedState.timestamp || Date.now())) / 1000;
                            if (savedState.playing && typeof savedState.duration === 'number' && savedState.duration > 0) {
                                const maybe = savedState.time + timeSinceSave;
                                targetStart = Math.min(Math.max(maybe, 0), savedState.duration - 0.2);
                            } else {
                                targetStart = savedState.time;
                            }
                        }

                        // If different video, switch using startSeconds
                        if (savedState.videoId && currentId !== savedState.videoId) {
                            if (fullPlaylistData && fullPlaylistData.videos) {
                                const idx = fullPlaylistData.videos.findIndex(v => v.videoId === savedState.videoId);
                                if (idx >= 0) currentPlaylistIndex = idx;
                            } else if (typeof savedState.index === 'number') {
                                currentPlaylistIndex = savedState.index;
                            }
                            if (pendingPlay) {
                                player.loadVideoById({ videoId: savedState.videoId, startSeconds: Math.max(0, targetStart || 0) });
                            } else {
                                player.cueVideoById({ videoId: savedState.videoId, startSeconds: Math.max(0, targetStart || 0) });
                            }
                            didLoadSavedVideoById = true;
                            pendingSeekTime = null;
                        } else if (targetStart !== null && targetStart > 0.1) {
                            // Same video, just seek
                            player.seekTo(targetStart, true);
                            pendingSeekTime = null;
                        }
                    } catch (e) {
                        console.warn('[Music Player] Restore by video/time encountered an issue:', e);
                    }

                    // Finally, play if needed (and not choosing random)
                    if (pendingPlay) {
                        setTimeout(() => {
                            if (player && isPlayerReady) {
                                try { player.playVideo(); } catch (e) { console.error('[Music Player] Error calling playVideo during restore:', e); }
                            }
                        }, 120);
                    } else {
                        setTimeout(updateSeekBar, 150);
                    }
                }
                pendingSeekTime = null;
                pendingPlay = false;
            }

            // Update internal state and UI based on player's actual state
            const actualPlayerState = player.getPlayerState();
            internalIsPlaying = (actualPlayerState === YT.PlayerState.PLAYING || actualPlayerState === YT.PlayerState.BUFFERING);

            // On first successful PLAYING event, mark that the user has played before
            if (actualPlayerState === YT.PlayerState.PLAYING && !hasMarkedPlayedFlag) {
                try {
                    if (localStorage.getItem('musicPlayerHasPlayed') !== 'true') {
                        localStorage.setItem('musicPlayerHasPlayed', 'true');
                    }
                } catch (_) { /* ignore */ }
                hasMarkedPlayedFlag = true;
            }
            updatePlayPauseIcon();

            // When the video changes, update details and save state
            if (state === YT.PlayerState.CUED || state === YT.PlayerState.PLAYING || state === YT.PlayerState.BUFFERING) {
                let computedIndex = null;
                try {
                    const vd = typeof player.getVideoData === 'function' ? player.getVideoData() : null;
                    const vid = vd && vd.video_id ? vd.video_id : null;
                    if (vid && fullPlaylistData && fullPlaylistData.videos) {
                        const idx = fullPlaylistData.videos.findIndex(v => v.videoId === vid);
                        if (idx >= 0) computedIndex = idx;
                    }
                } catch (_) {}
                if (computedIndex === null) {
                    try {
                        const apiIndex = player.getPlaylistIndex();
                        if (apiIndex !== -1 && apiIndex !== null && apiIndex !== undefined) computedIndex = apiIndex;
                    } catch (_) {}
                }
                if (computedIndex !== null && (computedIndex !== currentPlaylistIndex || (videoTitleElement && videoTitleElement.textContent.includes("Loading")))) {
                    currentPlaylistIndex = computedIndex;
                    updateVideoDetails();
                    savePlayerState();
                } else {
                    // Even if we don't know the index yet, update the title/thumbnail when available
                    if (videoTitleElement && (videoTitleElement.textContent.includes("Loading") || !videoTitleElement.getAttribute('data-title'))) {
                        updateVideoDetails();
                    }
                }
            }

            // Manage the seek bar updates
            if (internalIsPlaying) {
                startSeekBarUpdate();
            } else {
                if (seekBarInterval) clearInterval(seekBarInterval);
                seekBarInterval = null;
                if (state === YT.PlayerState.PAUSED || state === YT.PlayerState.ENDED) {
                    setTimeout(updateSeekBar, 50); // Final update
                    savePlayerState();
                }
            }

            // When a track ends, play the next one (shuffled or in order)
            if (state === YT.PlayerState.ENDED) {
                if (seekBarProgress) seekBarProgress.style.width = '0%';
                // Add the just-finished song to shuffle history if shuffle is on
                if (shuffleMode && fullPlaylistData && fullPlaylistData.videos) {
                    if (currentPlaylistIndex >= 0 && !shuffleHistory.includes(currentPlaylistIndex)) {
                        shuffleHistory.push(currentPlaylistIndex);
                    }
                }
                internalIsPlaying = false;
                updatePlayPauseIcon();
                savePlayerState();

                const delayMs = 120; // Shorter delay to reduce visible gap
                if (shuffleMode && playlistLoaded) {
                    setTimeout(() => {
                        if (shuffleMode && player && isPlayerReady) {
                            playShuffledVideo();
                        }
                    }, delayMs);
                } else {
                    setTimeout(() => {
                        if (player && isPlayerReady) {
                            playNextVideo();
                        }
                    }, delayMs);
                }
            }
        }
        function onPlayerError(event) { console.error(`[Music Player] Event: onPlayerError. Code: ${event.data}`); const errorMessages = { 2: "Invalid parameter", 5: "HTML5 player error", 100: "Video not found", 101: "Playback disallowed", 150: "Playback disallowed" }; console.error(`[Music Player] Error: ${errorMessages[event.data] || 'Unknown error.'}`); 
        
        // For deleted/unavailable videos (100, 101, 150), skip to next
        if (event.data === 100 || event.data === 101 || event.data === 150) {
            updateVideoTitle('Video Unavailable - Skipping...');
            setTimeout(() => {
                if (player && isPlayerReady && playlistLoaded) {
                    try {
                        if (shuffleMode) {
                            playShuffledVideo();
                        } else {
                            player.nextVideo();
                        }
                    } catch(e) {
                        console.error('[Music Player] Error skipping:', e);
                    }
                }
            }, 1000);
            return;
        }
        
        // For critical errors, disable player
        isPlayerReady = false; internalIsPlaying = false; playlistLoaded = false; pendingSeekTime = null; pendingPlay = false; restoreAttempted = true; updatePlayPauseIcon(); updateVideoTitle("Player Error"); if (seekBarInterval) { clearInterval(seekBarInterval); seekBarInterval = null; } disablePlayerControls(); if (thumbnailImg) { thumbnailImg.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'%3E%3Crect width='16' height='9' fill='%23ccc'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='1.5px' fill='%23555'%3EError%3C/text%3E%3C/svg%3E"; } try { sessionStorage.removeItem(SESSION_STORAGE_KEY); } catch (e) {} }

        // --- Player Control Functions ---
        function setupPlayerEventListeners() { playPauseBtn?.addEventListener('click', togglePlayPause); prevBtn?.addEventListener('click', playPreviousVideo); nextBtn?.addEventListener('click', playNextVideo); volumeIconBtn?.addEventListener('click', toggleMute); volumeSlider?.addEventListener('input', handleVolumeChange); seekBarContainer?.addEventListener('click', handleSeekBarClick); window.addEventListener('beforeunload', savePlayerState); window.addEventListener('pagehide', savePlayerState); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { savePlayerState(); } }); 
        
        // Save state when clicking navigation links
        document.querySelectorAll('a[href]').forEach(link => {
            link.addEventListener('click', () => {
                // Save state immediately before navigation
                savePlayerState();
            });
        });
        }
        function disablePlayerControls() { console.warn("[Music Player] Disabling player controls."); const controls = [playPauseBtn, prevBtn, nextBtn, volumeIconBtn, volumeSlider, seekBarContainer]; controls.forEach(control => { if(control) { control.disabled = true; if(control === seekBarContainer) control.style.cursor = 'default'; } }); if(thumbnailImg) thumbnailImg.style.opacity = 0.6; }
        // Make clearPendingRestoreFlags accessible outside this block
        clearPendingRestoreFlags = () => { if (pendingSeekTime !== null || pendingPlay) { /* console.log("[Music Player] User interaction detected, clearing pending restore flags."); */ } pendingSeekTime = null; pendingPlay = false; restoreAttempted = true; };
        function togglePlayPause() { if (!isPlayerReady || !player || !playlistLoaded) { console.warn("[Music Player] togglePlayPause: Player not ready/loaded."); return; } clearPendingRestoreFlags(); try { const currentState = player.getPlayerState(); if (currentState === YT.PlayerState.PLAYING || currentState === YT.PlayerState.BUFFERING) { player.pauseVideo(); } else { player.playVideo(); } } catch (e) { console.error("[Music Player] Error toggling play/pause:", e); } }
        function playPreviousVideo() { 
            if (!isPlayerReady || !player || !playlistLoaded) return; 
            clearPendingRestoreFlags(); 
            try { 
                if (shuffleMode && shuffleHistory.length > 0) { 
                    // In shuffle mode, go to the last song in history 
                    const prevIndex = shuffleHistory.pop(); // Get and remove the last played index 
                    const prevVideo = fullPlaylistData.videos[prevIndex]; 
                    if (prevVideo) { 
                        player.loadVideoById(prevVideo.videoId); 
                        currentPlaylistIndex = prevIndex; 
                        updateVideoTitle(prevVideo.title); 
                        updateThumbnail(prevVideo.videoId); 
                        updateTrackNumber(prevVideo.videoId); 
                        savePlayerState(); 
                    } 
                } else if (fullPlaylistData && fullPlaylistData.videos) { 
                    // Normal (non-shuffle) behavior using the full playlist data 
                    const currentVideoData = player.getVideoData(); 
                    const currentVideoId = currentVideoData ? currentVideoData.video_id : null; 
                    const totalVideos = fullPlaylistData.videos.length; 
 
                    // Find current index in our full playlist 
                    let currentIndex = fullPlaylistData.videos.findIndex(v => v.videoId === currentVideoId); 
                    if (currentIndex === -1) currentIndex = 0; // Fallback to start 
 
                    const prevIndex = (currentIndex - 1 + totalVideos) % totalVideos; 
                    const prevVideo = fullPlaylistData.videos[prevIndex]; 
                    if (prevVideo) {
                        player.loadVideoById(prevVideo.videoId); 
                        currentPlaylistIndex = prevIndex; 
                        updateVideoTitle(prevVideo.title);
                        updateThumbnail(prevVideo.videoId);
                        updateTrackNumber(prevVideo.videoId);
                        savePlayerState();
                    }
                } else { 
                    player.previousVideo(); // Fallback to the default player method 
                }
            } catch (e) {
                console.error("Error in playPreviousVideo:", e);
                // Fallback to simple previous in case of error
                try { player.previousVideo(); } catch (e2) { console.error("Fallback player.previousVideo() also failed:", e2); }
            } 
        }
        function playNextVideo() { 
            if (!isPlayerReady || !player || !playlistLoaded) return; 
            clearPendingRestoreFlags(); 
            try { 
                if (shuffleMode) { 
                    playShuffledVideo(); 
                } else if (fullPlaylistData && fullPlaylistData.videos) {
                    // Get current video ID
                    const currentVideoData = player.getVideoData();
                    const currentVideoId = currentVideoData ? currentVideoData.video_id : null;
                    
                    // Find current index in our full playlist
                    const currentIndex = fullPlaylistData.videos.findIndex(v => v.videoId === currentVideoId);
                    
                    if (currentIndex >= 0 && currentIndex < fullPlaylistData.videos.length - 1) {
                        const nextIndex = currentIndex + 1;
                        const nextVideo = fullPlaylistData.videos[nextIndex];
                        player.loadVideoById(nextVideo.videoId);
                        currentPlaylistIndex = nextIndex;
                        updateVideoTitle(nextVideo.title);
                        updateThumbnail(nextVideo.videoId);
                        updateTrackNumber(nextVideo.videoId);
                        savePlayerState();
                    } else {
                        // Wrap to first video
                        const firstVideo = fullPlaylistData.videos[0];
                        player.loadVideoById(firstVideo.videoId);
                        currentPlaylistIndex = 0;
                        updateVideoTitle(firstVideo.title);
                        updateThumbnail(firstVideo.videoId);
                        updateTrackNumber(firstVideo.videoId);
                        savePlayerState();
                    }
                } else { 
                    player.nextVideo(); 
                }
            } catch(e){ 
                console.error("Err Next:", e); 
            } 
        }
        function handleVolumeChange() { if (!isPlayerReady || !player || !volumeSlider) return; currentVolume = parseInt(volumeSlider.value, 10); internalIsMuted = player.isMuted(); try { player.setVolume(currentVolume); if (internalIsMuted && currentVolume > 0) { player.unMute(); internalIsMuted = false; } else if (!internalIsMuted && currentVolume === 0) { player.mute(); internalIsMuted = true; } } catch (e) { console.error("[Music Player] Error handling volume change:", e); } updateVolumeIcon(internalIsMuted ? 0 : currentVolume); savePlayerState(); }
        function toggleMute() { if (!isPlayerReady || !player) return; internalIsMuted = player.isMuted(); try { if (internalIsMuted) { player.unMute(); internalIsMuted = false; if (currentVolume === 0) currentVolume = 50; if (volumeSlider) volumeSlider.value = currentVolume; player.setVolume(currentVolume); } else { player.mute(); internalIsMuted = true; } } catch (e) { console.error("[Music Player] Error toggling mute:", e); } updateVolumeIcon(internalIsMuted ? 0 : currentVolume); savePlayerState(); }
        function handleSeekBarClick(event) { if (!isPlayerReady || !player || !seekBarContainer || !playlistLoaded) return; clearPendingRestoreFlags(); let duration; try { duration = player.getDuration(); } catch (e) { return; } if (typeof duration !== 'number' || duration <= 0) return; const barWidth = seekBarContainer.offsetWidth; const clickPositionX = event.offsetX; if (typeof barWidth !== 'number' || barWidth <= 0) return; const seekFraction = Math.max(0, Math.min(1, clickPositionX / barWidth)); const seekTime = seekFraction * duration; try { player.seekTo(seekTime, true); if(seekBarProgress) seekBarProgress.style.width = (seekFraction * 100) + '%'; savePlayerState(); } catch(e) { console.error("[Music Player] Error seeking:", e); } }

        // --- Player UI Update Functions ---
        function updatePlayPauseIcon() { if (!playPauseBtn) return; const iconElement = playPauseBtn.querySelector('i'); if (!iconElement) return; iconElement.classList.remove(playIconClass, pauseIconClass); if (internalIsPlaying) { iconElement.classList.add(pauseIconClass); playPauseBtn.title = "Pause"; } else { iconElement.classList.add(playIconClass); playPauseBtn.title = "Play"; } }
        function updateVolumeIcon(volume) { if (!volumeIcon || !volumeIconBtn) return; volumeIcon.classList.remove('bi-volume-up-fill', 'bi-volume-down-fill', 'bi-volume-mute-fill'); if (internalIsMuted || volume === 0) { volumeIcon.classList.add('bi-volume-mute-fill'); volumeIconBtn.title = "Unmute"; } else if (volume < 50) { volumeIcon.classList.add('bi-volume-down-fill'); volumeIconBtn.title = "Mute"; } else { volumeIcon.classList.add('bi-volume-up-fill'); volumeIconBtn.title = "Mute"; } }
        function updateThumbnail(videoId) {
            if (!thumbnailImg) return;
            if (videoId) {
                const newSrc = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
                if (thumbnailImg.src === newSrc) return;
                const img = new Image();
                img.onload = () => {
                    thumbnailImg.src = newSrc;
                    thumbnailImg.alt = 'Thumbnail';
                    thumbnailImg.style.opacity = 1;
                };
                img.src = newSrc;
            } else {
                // Avoid clearing to a placeholder during transitions to prevent grey flash
                // Keep the previous thumbnail until the next one is ready
            }
        }
        function updateTrackNumber(videoId) { if (!trackNumberElement) return; if (!fullPlaylistData || !fullPlaylistData.videos) { trackNumberElement.textContent = ''; return; } const index = fullPlaylistData.videos.findIndex(v => v.videoId === videoId); if (index !== -1) { trackNumberElement.textContent = `${index + 1}.`; } else { trackNumberElement.textContent = ''; } }
        function updateVideoTitle(title) { 
            if (videoTitleElement) { 
                const displayTitle = title || "---"; 
                videoTitleElement.textContent = displayTitle; 
                videoTitleElement.title = displayTitle; 
                videoTitleElement.setAttribute('data-title', displayTitle); 
                videoTitleElement.classList.remove('scrolling'); 
                
                // Reset any custom animation settings
                videoTitleElement.style.animationDuration = '';
                videoTitleElement.style.setProperty('--title-gap', '4em');
                
                setTimeout(() => { 
                    const parentWidth = videoTitleElement.parentElement ? videoTitleElement.parentElement.offsetWidth : 0; 
                    const titleWidth = videoTitleElement.scrollWidth; 
                    
                    if (titleWidth > parentWidth && parentWidth > 0) { 
                        // For continuous scrolling, gap needs to be at least the container width
                        // to ensure the duplicate doesn't appear until the original is fully scrolled out
                        // Use pixels for more precise control
                        const minGap = parentWidth * 1.2; // 120% of container width for safe spacing
                        videoTitleElement.style.setProperty('--title-gap', `${minGap}px`);
                        
                        // Calculate duration: the title + gap needs to scroll completely
                        const totalScrollDistance = titleWidth + minGap;
                        const scrollSpeed = 50; // pixels per second
                        const duration = totalScrollDistance / scrollSpeed;
                        
                        videoTitleElement.style.animationDuration = `${duration}s`;
                        videoTitleElement.classList.add('scrolling');
                    } 
                }, 100); 
            } 
        }
        function updateVideoDetails() {
            if (!isPlayerReady || !player || typeof player.getVideoData !== 'function') return;
            try {
                const videoData = player.getVideoData();
                if (videoData && videoData.title) {
                    updateThumbnail(videoData.video_id);
                    updateTrackNumber(videoData.video_id);
                    updateVideoTitle(videoData.title);
                    updatePlaylistActiveState();
                } else {
                    // Retry shortly without clearing current UI to avoid flicker
                    setTimeout(() => {
                        try {
                            const freshVideoData = player.getVideoData();
                            if (freshVideoData && freshVideoData.title){
                                updateThumbnail(freshVideoData.video_id);
                                updateTrackNumber(freshVideoData.video_id);
                                updateVideoTitle(freshVideoData.title);
                                updatePlaylistActiveState();
                            }
                        } catch(e) { /* ignore */ }
                    }, 200);
                }
            } catch (error) {
                // Keep current UI on transient errors
            }
        }

        // --- Seek Bar Update ---
        function startSeekBarUpdate() { if (!isPlayerReady || !player || !seekBarProgress) return; if (seekBarInterval) clearInterval(seekBarInterval); updateSeekBar(); seekBarInterval = setInterval(() => { updateSeekBar(); savePlayerState(); }, 1000); }
        function updateSeekBar() { if (!isPlayerReady || !player || typeof player.getCurrentTime !== 'function' || typeof player.getDuration !== 'function') { if (seekBarInterval) { clearInterval(seekBarInterval); seekBarInterval = null; } return; } let currentTime = 0; let duration = 0; try { currentTime = player.getCurrentTime(); duration = player.getDuration(); } catch (e) { if (seekBarInterval) { clearInterval(seekBarInterval); seekBarInterval = null; } return; } if (duration && duration > 0) { const progressPercentage = (currentTime / duration) * 100; if (seekBarProgress) { seekBarProgress.style.width = Math.min(100, Math.max(0, progressPercentage)) + '%'; } } else { if (seekBarProgress) { seekBarProgress.style.width = '0%'; } } }

        // --- YouTube API Loading and Player Creation ---
        function createYouTubePlayer() {
            const playerDiv = document.getElementById(playerContainerId);
            if (!playerDiv) { console.error(`[Music Player] ERROR: Player container div '#${playerContainerId}' not found!`); return; }
            if (!youtubePlaylistId) { console.warn("[Music Player] No Playlist ID configured."); updateVideoTitle("No Playlist"); disablePlayerControls(); return; }
            try {
                // Determine if we've played before to control initial autoplay
                let hasPlayedBefore = false;
                try { hasPlayedBefore = localStorage.getItem('musicPlayerHasPlayed') === 'true'; } catch (_) {}
                /* Use the global 'player' variable */
                player = new YT.Player(playerContainerId, {
                    height: '1',
                    width: '1',
                    playerVars: {
                        playsinline: 1,
                        // Disable autoplay on true first visit to prevent track #1 from starting
                        autoplay: 0, // We will control autoplay manually to avoid track #1 starting
                        mute: 0
                    },
                    events: { 'onReady': onPlayerReady, 'onStateChange': onPlayerStateChange, 'onError': onPlayerError }
                });
            } catch (error) {
                console.error("[Music Player] CRITICAL ERROR creating YT.Player:", error);
                disablePlayerControls();
            }
        }

        // Store the original (if any) onYouTubeIframeAPIReady function
        const existingApiReadyCallback = window.onYouTubeIframeAPIReady;

        window.onYouTubeIframeAPIReady = function() {
             // Call the original callback if it exists
             if (existingApiReadyCallback && typeof existingApiReadyCallback === 'function') {
                 try { existingApiReadyCallback(); } catch (e) { console.error("Error calling existing onYouTubeIframeAPIReady:", e); }
             }
            // Now specifically create the Music Player if its container exists
            if (document.querySelector('.mini-music-player')) {
                 createYouTubePlayer();
            }
        };

        // Initiate API loading if not already loaded
        if (typeof YT === 'undefined' || typeof YT.Player === 'undefined') {
             const tag = document.createElement('script'); tag.src = "https://www.youtube.com/iframe_api"; const firstScriptTag = document.getElementsByTagName('script')[0]; if (firstScriptTag && firstScriptTag.parentNode) { firstScriptTag.parentNode.insertBefore(tag, firstScriptTag); } else { document.body.appendChild(tag); }
        } else {
            // API is already loaded, directly create the player
            createYouTubePlayer();
        }

        // --- Initial UI setup ---
        if (volumeSlider) volumeSlider.value = initialVolume;
        updateVolumeIcon(initialVolume);
        updatePlayPauseIcon();
        updateThumbnail(null);
        updateVideoTitle("Initializing...");
        if (seekBarProgress) seekBarProgress.style.width = '0%';

        // Set up the click listener for play/pause
        playPauseBtn?.addEventListener('click', togglePlayPause);
    } else {
        // console.log("Music player container not found on this page.");
    }
    // --- End Mini Music Player ---


    // --- HTML5 Video Embed Logic (Modified for Click-to-Play) ---

    function resetVideoState() {
        // console.log('Resetting video state.'); // Debug log
        if (videoElementRef) {
            videoElementRef.removeEventListener('ended', handleVideoEnd);
            videoElementRef.removeEventListener('error', handleVideoError);
             // Check if parent exists before removing
            if (videoElementRef.parentNode) {
                videoElementRef.parentNode.removeChild(videoElementRef);
            }
        }
        if (videoEmbedContainer) {
            videoEmbedContainer.innerHTML = ''; // Clear any remnants (like overlay)
            videoEmbedContainer.style.display = 'none'; // Hide container
        }
        if (videoTriggerInfo) {
            // Localize ANSI Art label
            videoTriggerInfo.textContent = "ANSI Art (Click to play)";
            videoTriggerInfo.style.cursor = 'pointer';
            videoTriggerInfo.setAttribute('aria-disabled', 'false');
            videoTriggerInfo.classList.remove('video-active'); // Remove styling class
            // videoTriggerInfo.focus(); // Optional: return focus after video ends - can be annoying
        }
        videoElementRef = null;
        isVideoActive = false;
    }

    function handleVideoEnd() {
        // console.log('Local video finished playing.'); // Debug log
        resetVideoState();
    }

    function handleVideoError(e) {
        let errorMsg = 'Video Error';
        // Extract error message logic
        if (e && e.name) { errorMsg = e.name; } // e.g., NotAllowedError
        else if (videoElementRef && videoElementRef.error) {
            const MediaErr = window.MediaError || { MEDIA_ERR_ABORTED: 1, MEDIA_ERR_NETWORK: 2, MEDIA_ERR_DECODE: 3, MEDIA_ERR_SRC_NOT_SUPPORTED: 4 };
            switch (videoElementRef.error.code) {
                case MediaErr.MEDIA_ERR_ABORTED: errorMsg = 'Playback aborted.'; break;
                case MediaErr.MEDIA_ERR_NETWORK: errorMsg = 'Network error.'; break;
                case MediaErr.MEDIA_ERR_DECODE: errorMsg = 'Decoding error.'; break;
                case MediaErr.MEDIA_ERR_SRC_NOT_SUPPORTED: errorMsg = 'Format not supported.'; break;
                default: errorMsg = `Unknown Error (Code ${videoElementRef.error.code})`; break;
            }
        } else if (e && e.message) { errorMsg = e.message; }
        else if (typeof e === 'string') { errorMsg = e; }

        console.error(`Video Playback/Load Error: ${errorMsg}`, e); // Log detailed error

        // Show error briefly in the trigger text before resetting
        if (videoTriggerInfo) {
            videoTriggerInfo.textContent = `ANSI Art (Error: ${errorMsg})`;
            videoTriggerInfo.style.cursor = 'default';
            videoTriggerInfo.classList.add('video-active');
             // Use resetVideoState after a delay to clean up
            setTimeout(() => {
                 // Check if we are still in the error state before resetting
                 if (isVideoActive && videoTriggerInfo.textContent.includes('Error:')) {
                     resetVideoState();
                 }
             }, 4000); // Show error for 4 seconds
        } else {
             resetVideoState(); // Reset immediately if trigger info not found
        }
         // Still set isVideoActive to false immediately on error to potentially allow retry?
         // Or keep it true until timeout? Let's set it false after timeout via resetVideoState.
    }

    function playAnsiVideo() {
        if (isVideoActive || !videoEmbedContainer || !videoTriggerInfo) {
            // console.log('Video play request ignored (already active or elements missing).');
            return;
        }

    // console.log('Attempting to play ANSI video.');
        isVideoActive = true;
    videoTriggerInfo.textContent = "ANSI Art (Loading...)";
        videoTriggerInfo.style.cursor = 'default';
        videoTriggerInfo.setAttribute('aria-disabled', 'true');
        videoTriggerInfo.classList.add('video-active');
    try { localStorage.setItem('ansiArtVisited', '1'); } catch(e) {}
    videoTriggerInfo.classList.add('visited');

        // Clear container and ensure it's visible
        videoEmbedContainer.innerHTML = '';
        videoEmbedContainer.style.display = 'block';

        const video = document.createElement('video');
        // *** VERIFY THIS PATH IS CORRECT FOR YOUR DEPLOYMENT ***
        video.src = '/videos/art.mp4';
        video.muted = true;
        video.playsInline = true;
        video.loop = false;

        video.addEventListener('error', handleVideoError);
        video.addEventListener('ended', handleVideoEnd);

        videoElementRef = video; // Store reference

        // Optional overlay
        const overlay = document.createElement('div');
        overlay.className = 'video-overlay';

        videoEmbedContainer.appendChild(video);
        videoEmbedContainer.appendChild(overlay);

        // Explicit Play Call
        const playPromise = video.play();

        if (playPromise !== undefined) {
            playPromise.then(() => {
                // Playback started
                // console.log("Video playback started.");
             if (videoTriggerInfo && isVideoActive) { // Check isVideoActive in case of rapid events
                 videoTriggerInfo.textContent = "ANSI Art (Playing...)";
                }
            }).catch(error => {
                // Playback failed
                handleVideoError(error);
            });
        } else {
             // Fallback for older browsers
             handleVideoError("Playback promise not supported");
        }
    }

    // Add Listeners for the Video Trigger
    if (videoTriggerInfo) {
        videoTriggerInfo.addEventListener('click', playAnsiVideo);
        videoTriggerInfo.addEventListener('keypress', (e) => {
            // Trigger on Enter or Spacebar
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault(); // Prevent page scroll on space
                playAnsiVideo();
            }
        });
        // Set initial text on load if not already active
        if (!isVideoActive) {
            videoTriggerInfo.textContent = "ANSI Art (Click to play)";
            try { if (localStorage.getItem('ansiArtVisited') === '1') videoTriggerInfo.classList.add('visited'); } catch(e) {}
        }
    } else {
        // console.warn("Element #video-trigger-info not found, local video feature inactive.");
    }
    // --- End HTML5 Video Embed Logic ---


    
// --- Quick Links Toggle Logic ---
if (quickLinksToggle && quickLinksList) {

    // --- START: NEW INITIALIZATION CODE ---
    // 1. Read the initial state directly from your HTML attribute.
    const isInitiallyExpanded = quickLinksToggle.getAttribute('aria-expanded') === 'true';

    // 2. Set the list's visibility to match the initial state.
    //    If HTML says expanded (true), this sets hidden to false (visible).
    //    If HTML says collapsed (false), this sets hidden to true (hidden).
    quickLinksList.hidden = !isInitiallyExpanded;
    // --- END: NEW INITIALIZATION CODE ---


    // 3. Your original click listener logic is preserved below.
    //    It will now work correctly for both opening and closing.
    quickLinksToggle.addEventListener('click', () => {
        const isExpanded = quickLinksToggle.getAttribute('aria-expanded') === 'true';
        
        quickLinksToggle.setAttribute('aria-expanded', String(!isExpanded));
        quickLinksList.hidden = isExpanded;

        // If collapsing the quick links while video is playing, reset the video
        // This part is unchanged and will still work.
        if (isExpanded && typeof resetVideoState === 'function') { // Check if we are collapsing
             resetVideoState();
        }
    });
}
// --- End Quick Links Toggle ---


    // --- Shuffle Button Logic ---
    shuffleButton = document.getElementById('player-shuffle');
    
    // Set shuffle button as active by default since shuffleMode starts as true
    if (shuffleButton) {
        shuffleButton.classList.add('shuffle-active');
        console.log('[Shuffle] Shuffle mode enabled by default');
    }
    
    // Helper function to play a shuffled video
    function playShuffledVideo() {
        if (typeof player !== 'undefined' && player && isPlayerReady && playlistLoaded) {
            clearPendingRestoreFlags(); // Ensure state is cleared
            try {
                // Use fullPlaylistData for all 946 videos
                if (fullPlaylistData && fullPlaylistData.videos && fullPlaylistData.videos.length > 0) {
                    const playlist = fullPlaylistData.videos;
                    let randomIndex;
                    
                    // Get current video ID to track it
                    const currentVideoData = player.getVideoData();
                    const currentVideoId = currentVideoData ? currentVideoData.video_id : null;
                    const currentIdx = playlist.findIndex(v => v.videoId === currentVideoId);

                    // Add current song to history before playing next, if it's not already the last one
                    if (currentIdx >= 0 && shuffleHistory[shuffleHistory.length - 1] !== currentIdx) {
                        shuffleHistory.push(currentIdx);
                    }
                    
                    // If all videos have been played, reset the played list
                    if (playedVideos.length >= playlist.length - 1) {
                        playedVideos = currentIdx >= 0 ? [currentIdx] : []; // Keep current video in played list
                    }
                    
                    // Find an unplayed video
                    const unplayedIndices = [];
                    for (let i = 0; i < playlist.length; i++) {
                        if (!playedVideos.includes(i)) {
                            unplayedIndices.push(i);
                        }
                    }
                    
                    if (unplayedIndices.length > 0) {
                        // Pick a random unplayed video
                        randomIndex = unplayedIndices[Math.floor(Math.random() * unplayedIndices.length)];
                        playedVideos.push(randomIndex); // Mark as played
                        
                        const video = playlist[randomIndex];
                        player.loadVideoById(video.videoId);
                        updateVideoTitle(video.title);
                        updateThumbnail(video.videoId);
                        updateTrackNumber(video.videoId);
                    } else {
                        // Fallback: just play a different song if something goes wrong
                        if (playlist.length > 1) {
                            do {
                                randomIndex = Math.floor(Math.random() * playlist.length);
                            } while (randomIndex === currentIdx);
                            
                            const video = playlist[randomIndex];
                            player.loadVideoById(video.videoId);
                            updateVideoTitle(video.title);
                            updateThumbnail(video.videoId);
                            updateTrackNumber(video.videoId);
                        }
                    }
                } else { 
                    console.error("[Shuffle] Full playlist data not available!");
                    console.log(`[Shuffle] fullPlaylistData:`, fullPlaylistData);
                    console.log("[Shuffle] Trying to load playlist data...");
                    // Try to populate if not available
                    if (!isPlaylistLoaded) {
                        populatePlaylist();
                    }
                }
            } catch (e) { console.error("[Shuffle] Error shuffling video:", e); }
        } else { 
            console.warn("[Shuffle] Player not ready. player:", !!player, "isPlayerReady:", isPlayerReady, "playlistLoaded:", playlistLoaded); 
        }
    }
    
    if (shuffleButton) {
        shuffleButton.addEventListener('click', () => {
            // Toggle shuffle mode
            shuffleMode = !shuffleMode;
            
            if (shuffleMode) {
                // Enable shuffle mode - turn button blue
                shuffleButton.classList.add('shuffle-active');
                console.log('[Shuffle] Shuffle mode enabled - will shuffle on next track or when current ends');
            } else {
                // Disable shuffle mode - return to normal color
                shuffleButton.classList.remove('shuffle-active');
                playedVideos = []; // Reset played videos list
                shuffleHistory = []; // Also reset shuffle history
                console.log('[Shuffle] Shuffle mode disabled');
            }
        });
    }
    // --- End Shuffle Button ---


    // --- Playlist Dropdown Logic ---
    const playlistBtn = document.getElementById('player-playlist-btn');
    const playlistDropdown = document.getElementById('player-playlist-dropdown');
    let isPlaylistLoaded = false;
    let lastPlaylistSource = null; // 'api' | 'iframe'

    async function populatePlaylist() { // Allow populate to run even if player is not yet ready; API fetch doesn't depend on the iframe
        if (isPlaylistLoaded) return;
        try {
            if (!playlistDropdown) {
                console.warn('[Playlist] Dropdown element not found. Skipping populate.');
                return;
            }
            let dropdownContent = playlistDropdown.querySelector('.playlist-dropdown-content');
            if (!dropdownContent) { // Create the content container if it doesn't exist
                dropdownContent = document.createElement('div');
                dropdownContent.className = 'playlist-dropdown-content';
                playlistDropdown.appendChild(dropdownContent);
            }
            dropdownContent.innerHTML = '<p class="playlist-loading">Loading playlist...</p>';

            // Check for cached playlist data (24 hour cache)
            const cacheKey = 'youtube_playlist_cache';
            const cacheTimestampKey = 'youtube_playlist_cache_timestamp';
            const cachedData = localStorage.getItem(cacheKey);
            const cacheTimestamp = localStorage.getItem(cacheTimestampKey);
            const cacheMaxAge = 24 * 60 * 60 * 1000; // 24 hours
            let playlistData = null;

            // Use cached data if available and not expired
            if (cachedData && cacheTimestamp) {
                const age = Date.now() - parseInt(cacheTimestamp);
                if (age < cacheMaxAge) {
                    playlistData = JSON.parse(cachedData);
                    fullPlaylistData = playlistData; // Store globally
                }
            }

            // Fetch fresh data if no cache or expired
            if (!playlistData) {
                try {
                    const response = await fetch('/.netlify/functions/youtube-playlist');
                    if (!response.ok) {
                        throw new Error(`API error: ${response.status}`);
                    }
                    const data = await response.json();
                    if (data.error) {
                        console.error('[Playlist] API error:', data.error);
                        throw new Error(data.error);
                    }
                    playlistData = data;
                    // Store globally for track number display
                    fullPlaylistData = data;
                    // Cache the data
                    localStorage.setItem(cacheKey, JSON.stringify(data));
                    localStorage.setItem(cacheTimestampKey, Date.now().toString());
                } catch (apiError) {
                    console.error('[Playlist] Failed to fetch from API (or timed out), falling back to iframe API:', apiError);
                    // Fallback to old method using iframe API (limited to first 200)
                    const playlist = player.getPlaylist();
                    if (!playlist || playlist.length === 0) {
                        dropdownContent.innerHTML = '<p class="playlist-error">Failed to load playlist</p>';
                        return;
                    }
                    playlistData = {
                        videos: playlist.map((videoId, index) => ({
                            videoId,
                            title: null, // Will fetch titles individually
                            position: index
                        })),
                        totalVideos: playlist.length
                    };
                }
            }

            // Clear loading message
            dropdownContent.innerHTML = '';

            // Create playlist items from fetched data
            playlistData.videos.forEach((video, index) => {
                const item = document.createElement('div');
                item.className = 'playlist-item';
                item.dataset.index = index;
                item.dataset.videoId = video.videoId;
                
                // Create title element
                const titleSpan = document.createElement('span');
                titleSpan.className = 'playlist-item-title';
                titleSpan.textContent = video.title 
                    ? `${index + 1}. ${video.title}`
                    : `${index + 1}. Loading...`;
                
                item.appendChild(titleSpan);

                // Add click handler
                item.addEventListener('click', () => {
                    if (player && isPlayerReady) {
                        clearPendingRestoreFlags();
                        try {
                            // Use loadVideoById instead of playVideoAt for better compatibility with large playlists
                            player.loadVideoById(video.videoId);
                            playlistDropdown.style.display = 'none';
                            
                            // Update UI immediately with cached data
                            if (video.title) {
                                updateVideoTitle(video.title);
                                updateThumbnail(video.videoId);
                                updateTrackNumber(video.videoId);
                            }
                            
                            // Then update playlist active state and fetch fresh details
                            setTimeout(() => {
                                updatePlaylistActiveState();
                                updateVideoDetails();
                            }, 100);
                        } catch(e) {
                            console.error('[Playlist] Error playing video:', e);
                        }
                    }
                });

                dropdownContent.appendChild(item);

                // If title is missing (fallback mode), fetch it via oEmbed
                if (!video.title && video.videoId) {
                    setTimeout(() => {
                        fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${video.videoId}&format=json`)
                            .then(response => response.ok ? response.json() : null)
                            .then(data => {
                                if (data?.title) {
                                    titleSpan.textContent = `${index + 1}. ${data.title}`;
                                }
                            })
                            .catch(() => {
                                titleSpan.textContent = `${index + 1}. Track ${index + 1}`;
                            });
                    }, index * 10); // Stagger requests to avoid rate limiting
                }
            });

            isPlaylistLoaded = true;
            updatePlaylistActiveState();

            // Update track number for currently playing video now that fullPlaylistData is available
            if (player && isPlayerReady) {
                try {
                    const currentVideoData = player.getVideoData();
                    if (currentVideoData && currentVideoData.video_id) {
                        updateTrackNumber(currentVideoData.video_id);
                    }
                } catch (e) {
                    // Silently fail
                }
            }
            
        } catch (e) {
            console.error('[Playlist] Error populating:', e);
            const dropdownContent = playlistDropdown.querySelector('.playlist-dropdown-content');
            dropdownContent.innerHTML = '<p class="playlist-error">Failed to load playlist. Please refresh.</p>';
        }
    }

    // Assign to global variable so it can be called from updateVideoDetails
    updatePlaylistActiveState = function() {
        if (!player || !isPlayerReady || !playlistDropdown || !isPlaylistLoaded) return;
        
        const items = playlistDropdown.querySelectorAll('.playlist-item');
        const currentIndex = player.getPlaylistIndex();
        
        items.forEach((item, index) => {
            if (index === currentIndex) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    };

    if (playlistBtn && playlistDropdown) {
        playlistBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Toggle dropdown visibility
            if (playlistDropdown.style.display === 'none' || !playlistDropdown.style.display) {
                // Try to populate if not already done
                if (!isPlaylistLoaded) {
                    try { populatePlaylist(); } catch(_) {}
                }
                playlistDropdown.style.display = 'block';

                // --- START: Reposition Dropdown ---
                // Position the dropdown to open upwards from the music player
                const playerHeight = musicPlayerContainer.offsetHeight;
                if (playerHeight > 0) {
                    playlistDropdown.style.bottom = `${playerHeight}px`;
                }
                // --- END: Reposition Dropdown ---

                updatePlaylistActiveState();
            } else {
                playlistDropdown.style.display = 'none';
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (playlistDropdown && playlistDropdown.style.display === 'block') {
                if (!playlistDropdown.contains(e.target) && e.target !== playlistBtn && !playlistBtn.contains(e.target)) {
                    playlistDropdown.style.display = 'none';
                }
            }
        });

        // Populate playlist when it becomes ready
        if (typeof window.onYouTubeIframeAPIReady === 'function') {
            const originalReady = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = function() {
                originalReady();
                setTimeout(() => {
                    if (player && isPlayerReady && playlistLoaded && !isPlaylistLoaded) {
                        populatePlaylist();
                    }
                }, 2000);
            };
        }
    }
    // --- End Playlist Dropdown ---


    // --- Prefetch playlist data in the background to improve first-click UX ---
    try {
        if (playlistDropdown && !isPlaylistLoaded) {
            // Delay slightly to avoid competing with initial UI work
            setTimeout(() => { try { populatePlaylist(); } catch(_) {} }, 500);
        }
    } catch(_) {}


    // --- INITIALIZE FEATURES ON LOAD ---

    // Netlify Identity UI updates are triggered by its own events/initial check.
    // Post fetching is triggered if postsContainer exists (handled above).
    // Music Player initializes itself if musicPlayerContainer exists (handled above).
    // Create Form listeners are added if createPostForm exists (handled above).
    // Quick Links listener is added if elements exist (handled above).
    // Random Song listener is added if button exists (handled above).
    // Video trigger listeners added if element exists (handled above).

    // Initial setup for video trigger text (redundant safety check)
    // Initial setup for video trigger text
    if (videoTriggerInfo && !isVideoActive) {
         videoTriggerInfo.textContent = "ANSI Art (Click to play)";
         videoTriggerInfo.style.cursor = 'pointer';
         videoTriggerInfo.setAttribute('aria-disabled', 'false');
         videoTriggerInfo.classList.remove('video-active');
    }

    function applyDarkMode(isDark) {
        // ... (applyDarkMode function remains the same) ...
        if (isDark) {
            bodyElement.classList.add('dark-mode');
        } else {
            bodyElement.classList.remove('dark-mode');
        }
        if (darkModeToggle) {
           darkModeToggle.checked = isDark;
        }
    }

    function handleDarkModeToggleChange() {
        // ... (handleDarkModeToggleChange function remains the same) ...
         if (!darkModeToggle) return;
        const isDark = darkModeToggle.checked;
        applyDarkMode(isDark);
        try {
            localStorage.setItem(DARK_MODE_KEY, isDark ? 'dark' : 'light');
        } catch (e) {
            console.warn("Could not save dark mode preference to localStorage:", e);
        }
    }

    // --- Dark Mode Logic ---
    const darkModeToggle = document.getElementById('dark-mode-toggle'); // Keep this one
    const bodyElement = document.body;
    const DARK_MODE_KEY = 'darkModePreference_v1';

    // Initialize Dark Mode on Load
    if (darkModeToggle) {
        let savedPreference = null;
        try {
            savedPreference = localStorage.getItem(DARK_MODE_KEY);
        } catch (e) {
            console.warn("Could not read dark mode preference from localStorage:", e);
        }

        // Default to light mode unless 'dark' is explicitly saved.
        const initialDarkMode = savedPreference === 'dark';
        applyDarkMode(initialDarkMode);

        // Add the change listener
        darkModeToggle.addEventListener('change', handleDarkModeToggleChange);

        // Prevent dropdown from closing when clicking the dark mode label/switch
        const darkModeLabel = document.querySelector('.dropdown-item-label[for="dark-mode-toggle"]');
        if (darkModeLabel) {
            darkModeLabel.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

    } else {
         // console.log("Dark mode toggle element not found.");
    }
    // --- End Dark Mode Logic --


    // --- End Language Submenu Logic ---


    console.log("Consolidated script.js: DOM Content Loaded setup finished.");


}

// --- Main Entry Point ---
document.addEventListener('DOMContentLoaded', initializePage);