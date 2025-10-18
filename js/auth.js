let dependencies = {};

/**
 * Initializes the Netlify Identity widget event listeners.
 * @param {object} deps - An object containing dependencies.
 */
export function initAuth(deps) {
    dependencies = deps;

    if (window.netlifyIdentity) {
        console.log("Auth: Netlify Identity script is loaded.");
        
        // Listen for the core events from the widget.
        netlifyIdentity.on("init", handleIdentityEvent);
        netlifyIdentity.on("login", handleIdentityEvent);
        netlifyIdentity.on("logout", handleIdentityEvent);
        netlifyIdentity.on("error", handleIdentityError);
    } else {
        console.error("CRITICAL ERROR: `window.netlifyIdentity` object not found.");
        updateUserStatusUI(); // Fallback to show logged out state.
    }
}

/**
 * Attaches click listeners to the auth buttons.
 * This function MUST be called AFTER the header is injected into the DOM.
 */
export function attachAuthButtonListeners() {
    const signupButton = document.getElementById('signup-button');
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');

    if (signupButton && loginButton && logoutButton) {
        console.log("Auth: Attaching click listeners to login/signup/logout buttons.");
        signupButton.addEventListener('click', () => netlifyIdentity.open('signup'));
        loginButton.addEventListener('click', () => netlifyIdentity.open('login'));
        logoutButton.addEventListener('click', () => netlifyIdentity.logout());
    } else {
        console.error("Auth Error: Could not find one or more auth buttons to attach listeners.");
    }
}

function handleIdentityEvent(user) {
    console.log("Auth: Identity event received (init, login, or logout).");
    updateUserStatusUI();
    
    // Refresh posts if the dependency exists
    if (dependencies.fetchAndDisplayPosts) {
        dependencies.fetchAndDisplayPosts();
    }
    
    // Close the widget modal after login
    if (user) {
        netlifyIdentity.close();
    }
}

function handleIdentityError(err) {
    console.error("Auth: Netlify Identity widget reported an error:", err);
    updateUserStatusUI();
}

function updateUserStatusUI() {
    const user = window.netlifyIdentity?.currentUser();
    
    const createLink = document.getElementById('create-link');
    const loginPrompt = document.getElementById('login-prompt');
    const createPostForm = document.getElementById('create-post-form');
    const submitButton = document.getElementById('submit-button');
    const authButtonsDiv = document.getElementById('auth-buttons');
    const userStatusDiv = document.getElementById('user-status');
    const userEmailSpan = document.getElementById('user-email');
    
    if (user) {
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
        if (submitButton) submitButton.disabled = false;
    } else {
        if (authButtonsDiv) authButtonsDiv.style.display = 'flex';
        if (userStatusDiv) userStatusDiv.style.display = 'none';
        if (userEmailSpan) { userEmailSpan.textContent = ''; userEmailSpan.title = ''; }
        if (createLink) createLink.style.display = 'inline-block';
        if (loginPrompt) { loginPrompt.textContent = "Please log in to create a post."; loginPrompt.style.display = 'block'; }
        if (createPostForm) createPostForm.style.display = 'none';
        if (submitButton) submitButton.disabled = true;
    }
}