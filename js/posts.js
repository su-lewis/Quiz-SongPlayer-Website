let dependencies = {};

export function initPosts(deps) {
    dependencies = deps; // Store dependencies for use within this module

    // Listen for language changes to update language and trigger a re-fetch.
    document.addEventListener('languageChanged', (event) => {
        console.log("Posts: 'languageChanged' event received. Re-fetching posts.");
        fetchAndDisplayPosts(); // This will now have access to the stored `dependencies`
    });

    // Handle the create post form
    const createPostForm = document.getElementById('create-post-form');
    if (createPostForm) {
        createPostForm.addEventListener('submit', handleCreateSubmit);
        // ... (char counter logic remains the same)
    }
    
    // Initial fetch if a container exists on the page
    if (document.getElementById('posts-container') || document.getElementById('full-posts-container')) {
        fetchAndDisplayPosts();
    }
}

// THE FIX IS HERE: fetchAndDisplayPosts now uses the module-scoped `dependencies`
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
            // If there are no posts, show the "No posts found" message in both potential containers
            const fullContainer = document.getElementById('full-posts-container');
            const sidebarContainer = document.getElementById('posts-container');
            if (fullContainer) fullContainer.innerHTML = `<p data-translate="noPostsFound">No posts found.</p>`;
            if (sidebarContainer) sidebarContainer.innerHTML = `<p data-translate="noPostsFound">No posts found.</p>`;
            document.dispatchEvent(new CustomEvent('contentUpdated'));
            return;
        }

        posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // --- NEW LOGIC: HANDLE EACH CONTAINER SEPARATELY ---

        // 1. Handle the Full Posts Page Container
        const fullPostsContainer = document.getElementById('full-posts-container');
        if (fullPostsContainer) {
            console.log("Posts: Rendering ALL posts into #full-posts-container.");
            fullPostsContainer.innerHTML = ''; // Clear it
            posts.forEach(post => {
                const postElement = renderPostElement(post, currentLang, false); // isTruncated = false
                fullPostsContainer.appendChild(postElement);
            });

            // Handle scrolling to a specific post if a hash is in the URL
            if (location.hash) {
                const el = document.querySelector(location.hash);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    el.classList.add('highlight-post');
                    setTimeout(() => el.classList.remove('highlight-post'), 2000);
                }
            }
        }

        // 2. Handle the Sidebar Posts Container
        const sidebarPostsContainer = document.getElementById('posts-container');
        if (sidebarPostsContainer) {
            console.log("Posts: Rendering sidebar posts into #posts-container.");
            sidebarPostsContainer.innerHTML = ''; // Clear it
            const postsToRender = posts.slice(0, 4); // Get the latest 4 posts
            postsToRender.forEach(post => {
                const postElement = renderPostElement(post, currentLang, true); // isTruncated = true
                sidebarPostsContainer.appendChild(postElement);
            });
        }
        
        // --- END OF NEW LOGIC ---

        document.dispatchEvent(new CustomEvent('contentUpdated'));

    } catch (error) {
        console.error("Error fetching/displaying posts:", error);
        // Show an error message in both potential containers
        const fullContainer = document.getElementById('full-posts-container');
        const sidebarContainer = document.getElementById('posts-container');
        const errorMessage = `<p style="color: red;">Error loading posts: ${error.message}</p>`;
        if (fullContainer) fullContainer.innerHTML = errorMessage;
        if (sidebarContainer) sidebarContainer.innerHTML = errorMessage;
    }
}


// ... (All other helper functions like handleCreateSubmit, renderPostElement, etc., remain here unchanged)
// You do not need to change the helper functions below this line.
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