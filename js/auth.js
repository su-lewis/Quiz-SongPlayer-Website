let dependencies = {};

/**
 * Initializes the Netlify Identity widget and all related UI updates.
 * @param {object} deps - An object containing dependencies.
 */
export function initAuth(deps) {
    dependencies = deps;

    if (window.netlifyIdentity) {
        console.log("Auth: Netlify Identity script is loaded.");
        
        netlifyIdentity.on("init", handleIdentityInit);
        netlifyIdentity.on("login", handleIdentityLogin);
        netlifyIdentity.on("logout", handleIdentityLogout);
        netlifyIdentity.on("error", handleIdentityError);
    } else {
        console.error("CRITICAL ERROR: `window.netlifyIdentity` object not found.");
        updateUserStatusUI(); // Show logged out state as a fallback
    }
}

function handleIdentityInit(user) {
    console.log("Auth: 'init' event fired!");
    updateUserStatusUI();

    const signupButton = document.getElementById('signup-button');
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');

    console.log("Auth: Attaching click listeners to login/signup buttons.");
    signupButton?.addEventListener('click', () => netlifyIdentity.open('signup'));
    loginButton?.addEventListener('click', () => netlifyIdentity.open('login'));
    logoutButton?.addEventListener('click', () => netlifyIdentity.logout());
}

function handleIdentityLogin(user) {
    console.log("Auth: User logged in.");
    updateUserStatusUI();
    netlifyIdentity.close();
    if (dependencies.fetchAndDisplayPosts) {
        dependencies.fetchAndDisplayPosts(dependencies.getCurrentLanguage);
    }
}

function handleIdentityLogout() {
    console.log("Auth: User logged out.");
    updateUserStatusUI();
    if (dependencies.fetchAndDisplayPosts) {
        dependencies.fetchAndDisplayPosts(dependencies.getCurrentLanguage);
    }
}

function handleIdentityError(err) {
    console.error("Auth: Netlify Identity widget reported an error:", err);
    updateUserStatusUI();
}

/**
 * Updates the UI based on the current user's login status.
 */
function updateUserStatusUI() {
    const user = window.netlifyIdentity?.currentUser();
    
    const createLink = document.getElementById('create-link');
    const loginPrompt = document.getElementById('login-prompt');
    const createPostForm = document.getElementById('create-post-form');
    const submitButton = document.getElementById('submit-button');
    const authButtonsDiv = document.getElementById('auth-buttons');
    const userStatusDiv = document.getElementById('user-status');
    const userEmailSpan = document.getElementById('user-email');
    const formMessage = document.getElementById('form-message');

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