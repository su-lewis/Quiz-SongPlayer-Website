let dependencies = {};

export function initPosts(deps) {
    dependencies = deps; // Store dependencies for use within this module

    // --- NEW: Listen for on-page navigation via hash links ---
    // This handles clicking a second, third, etc., post link while already on the /posts page.
    window.addEventListener('hashchange', handleHashChange);

    // Listen for language changes to trigger a re-fetch.
    document.addEventListener('languageChanged', (event) => {
        console.log("Posts: 'languageChanged' event received. Re-fetching posts.");
        fetchAndDisplayPosts();
    });

    // Handle the create post form
    const createPostForm = document.getElementById('create-post-form');
    if (createPostForm) {
        createPostForm.addEventListener('submit', handleCreateSubmit);
        const titleInput = document.getElementById('post-title');
        const contentInput = document.getElementById('post-content');
        const titleCharCount = document.getElementById('title-char-count');
        const contentCharCount = document.getElementById('content-char-count');
        if (titleInput && titleCharCount) {
            const max = parseInt(titleInput.getAttribute('maxlength') || '300', 10);
            titleInput.addEventListener('input', () => updateCharCount(titleInput, titleCharCount, max));
        }
        if (contentInput && contentCharCount) {
            const max = parseInt(contentInput.getAttribute('maxlength') || '40000', 10);
            contentInput.addEventListener('input', () => updateCharCount(contentInput, contentCharCount, max));
        }
    }
    
    // Initial fetch if a container exists on the page
    if (document.getElementById('posts-container') || document.getElementById('full-posts-container')) {
        fetchAndDisplayPosts();
    }
}

/**
 * NEW: This function handles clicks on post links after the page has already loaded.
 */
function handleHashChange() {
    // We only care about this event on the full posts page.
    if (!document.getElementById('full-posts-container')) {
        return;
    }

    if (location.hash && location.hash.startsWith('#post-')) {
        console.log("Hash changed to a post link. Applying highlight and cleaning URL.");
        
        // Remove highlight from any previously highlighted post.
        document.querySelector('.highlight-post')?.classList.remove('highlight-post');

        const el = document.querySelector(location.hash);
        if (el) {
            // The browser scrolls automatically, but this ensures it's smooth.
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            el.classList.add('highlight-post');
            setTimeout(() => el.classList.remove('highlight-post'), 2000);
        }

        // Clean the URL.
        history.replaceState(null, '', window.location.pathname);
    }
}

export async function fetchAndDisplayPosts() {
    try {
        const currentLang = dependencies.getCurrentLanguage();
        const response = await fetch(`/.netlify/functions/posts?lang=${currentLang}`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Fetch failed: ${response.statusText}`);
        }
        const posts = await response.json();
        
        if (!posts || posts.length === 0) {
            const fullContainer = document.getElementById('full-posts-container');
            const sidebarContainer = document.getElementById('posts-container');
            if (fullContainer) fullContainer.innerHTML = `<p data-translate="noPostsFound">No posts found.</p>`;
            if (sidebarContainer) sidebarContainer.innerHTML = `<p data-translate="noPostsFound">No posts found.</p>`;
            document.dispatchEvent(new CustomEvent('contentUpdated'));
            return;
        }

        posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // --- Handle BOTH containers separately ---

        // 1. Handle the Full Posts Page Container
        const fullPostsContainer = document.getElementById('full-posts-container');
        if (fullPostsContainer) {
            fullPostsContainer.innerHTML = '';
            posts.forEach(post => {
                const postElement = renderPostElement(post, currentLang, false);
                fullPostsContainer.appendChild(postElement);
            });

            // This logic now ONLY runs on the initial page load. Subsequent clicks are handled by hashchange.
            if (location.hash && location.hash.startsWith('#post-')) {
                // Use a timeout to ensure the DOM is fully rendered before we try to scroll.
                setTimeout(() => {
                    const el = document.querySelector(location.hash);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        el.classList.add('highlight-post');
                        setTimeout(() => el.classList.remove('highlight-post'), 2000);
                        
                        // Clean the URL after the initial scroll.
                        history.replaceState(null, '', window.location.pathname);
                    }
                }, 100); // A small delay is robust.
            }
        }

        // 2. Handle the Sidebar Posts Container
        const sidebarPostsContainer = document.getElementById('posts-container');
        if (sidebarPostsContainer) {
            sidebarPostsContainer.innerHTML = '';
            const postsToRender = posts.slice(0, 4);
            postsToRender.forEach(post => {
                const postElement = renderPostElement(post, currentLang, true);
                sidebarPostsContainer.appendChild(postElement);
            });
        }
        
        document.dispatchEvent(new CustomEvent('contentUpdated'));

    } catch (error) {
        console.error("Error fetching/displaying posts:", error);
        const fullContainer = document.getElementById('full-posts-container');
        const sidebarContainer = document.getElementById('posts-container');
        const errorMessage = `<p style="color: red;">Error loading posts: ${error.message}</p>`;
        if (fullContainer) fullContainer.innerHTML = errorMessage;
        if (sidebarContainer) sidebarContainer.innerHTML = errorMessage;
    }
}

async function handleCreateSubmit(event) {
    event.preventDefault();
    const user = window.netlifyIdentity?.currentUser();
    const formMessage = document.getElementById('form-message');
    const submitButton = document.getElementById('submit-button');

    if (!user) {
        if (formMessage) { formMessage.textContent = 'Authentication required.'; formMessage.className = 'message error'; }
        return;
    }
    const title = document.getElementById('post-title').value.trim();
    const content = document.getElementById('post-content').value.trim();
    if (!content) {
        if (formMessage) { formMessage.textContent = "Content is required."; formMessage.className = 'message error'; }
        return;
    }
    if (submitButton) submitButton.disabled = true;
    if (formMessage) { formMessage.textContent = "Submitting..."; formMessage.className = 'message info'; }
    try {
        const token = await user.jwt(true);
        const response = await fetch('/.netlify/functions/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ title, content })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        if (formMessage) { formMessage.textContent = "Post created! Redirecting..."; formMessage.className = 'message success'; }
        event.target.reset();
        setTimeout(() => { window.location.href = '/posts'; }, 1500);
    } catch (error) {
        console.error("Error creating post:", error);
        if (formMessage) { formMessage.textContent = `Error: ${error.message}`; formMessage.className = 'message error'; }
        if (submitButton) submitButton.disabled = false;
    }
}

function updateCharCount(inputElement, counterElement, maxLength) {
    if (!inputElement || !counterElement) return;
    const currentLength = inputElement.value.length;
    if (currentLength > maxLength * 0.9 || currentLength >= maxLength) {
        counterElement.textContent = `${currentLength} / ${maxLength}`;
        counterElement.style.display = 'block';
        counterElement.classList.toggle('limit-reached', currentLength >= maxLength);
    } else {
        counterElement.style.display = 'none';
    }
}

function renderPostElement(post, currentLang, isTruncated = false) {
    const postElement = document.createElement('article');
    postElement.className = isTruncated ? 'post' : 'post full';
    postElement.id = `post-${post.id}`;
    const titleElement = document.createElement('h3');
    const safeTitle = (post.title || '').trim();
    if (isTruncated) {
        const titleLink = document.createElement('a');
        titleLink.href = `/posts#post-${post.id}`;
        titleLink.textContent = safeTitle.length > 0 ? safeTitle : 'Untitled Post';
        titleLink.className = 'post-title-link';
        titleElement.appendChild(titleLink);
    } else {
        titleElement.textContent = safeTitle.length > 0 ? safeTitle : 'Untitled Post';
    }
    const contentElement = document.createElement('p');
    if (isTruncated) {
        const plain = post.content || '';
        const limit = 220;
        const needsMore = plain.length > limit;
        const preview = needsMore ? plain.slice(0, limit).trim() + '… ' : plain;
        contentElement.innerHTML = preview.replace(/\n/g, '<br>');
        if (needsMore) {
            const moreLink = document.createElement('a');
            moreLink.href = `/posts#post-${post.id}`;
            moreLink.textContent = '[more]';
            moreLink.setAttribute('data-translate', 'readMore');
            moreLink.className = 'read-more-link';
            contentElement.appendChild(moreLink);
        }
    } else {
        contentElement.innerHTML = (post.content || '').replace(/\n/g, '<br>');
    }
    const username = post.username || 'Anonymous';
    const formattedDateTime = formatPostDate(post.created_at, currentLang);
    const metadataElement = document.createElement('small');
    metadataElement.className = 'post-metadata';
    metadataElement.textContent = `${username} • ${formattedDateTime}`;
    postElement.appendChild(titleElement);
    postElement.appendChild(contentElement);
    postElement.appendChild(metadataElement);
    return postElement;
}

function formatPostDate(dateString, lang) {
    const postDate = new Date(dateString);
    const map = { en: 'en-US', fr: 'fr-FR', de: 'de-DE', es: 'es-ES', it: 'it-IT', pt: 'pt-PT', ja: 'ja-JP', ru: 'ru-RU', zh: 'zh-CN', ko: 'ko-KR', el: 'el-GR', ar: 'ar', af: 'af-ZA', haw: 'en-US', hi: 'hi-IN', la: 'en-US' };
    try {
        return postDate.toLocaleString(map[lang] || 'en-US', { dateStyle: 'medium', timeStyle: 'short' });
    } catch (_) {
        return postDate.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    }
}