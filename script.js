// FILE: script.js (Consolidated Logic)

document.addEventListener('DOMContentLoaded', () => {
    // console.log("Consolidated script.js: DOM Content Loaded.");

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
    const loginPrompt = document.getElementById('login-prompt');
    const formMessage = document.getElementById('form-message');
    const submitButton = document.getElementById('submit-button');
    const postsContainer = document.getElementById('posts-container');
    const viewPostsArea = document.getElementById('view-posts-area');
    const randomSongButton = document.getElementById('random-song');

    // --- Character Counter References ---
    const titleCharCount = document.getElementById('title-char-count'); // Span for title count
    const contentCharCount = document.getElementById('content-char-count'); // Span for content count

    // --- HTML5 Video Embed References ---
    const videoEmbedContainer = document.getElementById('video-embed-container'); // Container for the video
    const videoTriggerInfo = document.getElementById('video-trigger-info');       // The <span> triggering the video

    // --- State for Video Player ---
    let videoElementRef = null; // Reference to the <video> element
    let isVideoActive = false; // Flag to prevent multiple clicks/plays

    // --- Quick Links References ---
    const quickLinksToggle = document.querySelector('.quick-links-toggle');
    const quickLinksList = document.getElementById('quick-links-list');
    // ---------------------------------

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
        if (!user || !user.token?.access_token) { updateUserStatusUI(); if (formMessage) { formMessage.textContent = 'Auth required.'; formMessage.className = 'message error'; } console.error("Create submit failed: User not authenticated."); return; }
        const token = user.token.access_token;
        const title = titleInput?.value.trim();
        const content = contentInput?.value.trim();
        const titleMaxLength = parseInt(titleInput?.getAttribute('maxlength') || '300', 10);
        const contentMaxLength = parseInt(contentInput?.getAttribute('maxlength') || '40000', 10);

        if (!title || !content) { if (formMessage) { formMessage.textContent = "Title and content required."; formMessage.className = 'message error'; } return; }
        if (title.length > titleMaxLength) { if (formMessage) { formMessage.textContent = `Title exceeds maximum length of ${titleMaxLength}.`; formMessage.className = 'message error'; } return; }
        if (content.length > contentMaxLength) { if (formMessage) { formMessage.textContent = `Content exceeds maximum length of ${contentMaxLength}.`; formMessage.className = 'message error'; } return; }

        if (submitButton) submitButton.disabled = true;
        if (formMessage) { formMessage.textContent = "Submitting..."; formMessage.className = 'message info'; }
        try {
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
        if (!postsContainer) { return; }
        // console.log("Fetching and displaying posts...");
        postsContainer.innerHTML = '<p>Loading posts...</p>';
        try {
            const response = await fetch('/.netlify/functions/posts');
            if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error(`Fetch failed: ${errorData.error || response.statusText} (${response.status})`); }
            const posts = await response.json();
            postsContainer.innerHTML = '';
            if (posts && posts.length > 0) {
                posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                posts.forEach(post => {
                    const postElement = document.createElement('article'); postElement.className = 'post';
                    const titleElement = document.createElement('h3'); titleElement.textContent = post.title;
                    const contentElement = document.createElement('p');
                    const sanitizedContent = post.content.replace(/</g, "<").replace(/>/g, ">"); 
					contentElement.innerHTML = sanitizedContent.replace(/\n/g, '<br>');
                    const username = post.profiles?.username || 'Anonymous';
                    const postDate = new Date(post.created_at);
                    const formattedDateTime = postDate.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
                    const metadataElement = document.createElement('small'); metadataElement.className = 'post-metadata';
                    metadataElement.textContent = `${username} · ${formattedDateTime}`;
                    postElement.appendChild(titleElement); postElement.appendChild(contentElement); postElement.appendChild(metadataElement);
                    postsContainer.appendChild(postElement);
                });
            } else { postsContainer.innerHTML = '<p>No posts found.</p>'; }
        } catch (error) { console.error("Error fetching/displaying posts:", error); postsContainer.innerHTML = `<p style="color: red;">Error loading posts: ${error.message}</p>`; }
    }
    if (postsContainer) {
        fetchAndDisplayPosts(); // Initial fetch
    }
    // --- End Fetch and Display Posts ---


    // --- Mini Music Player Logic ---
    const musicPlayerContainer = document.querySelector('.mini-music-player');
    let player; // Holds the YT.Player instance for the music player - make it accessible outside the block if needed
    let isPlayerReady = false; // Make accessible for random button
    let playlistLoaded = false; // Make accessible for random button
    let internalIsPlaying = false; // Music player's internal state
    let clearPendingRestoreFlags = () => {}; // Placeholder accessible function

    if (musicPlayerContainer) {
        // console.log('[Music Player] Initializing...');

        // --- Constants & Config ---
        const SESSION_STORAGE_KEY = 'musicPlayerState_v1';
        const youtubePlaylistId = 'PLC1tH2RPEXpS58v3v7HX2P75jw1M1vCW6'; // Your playlist ID
        const initialVolume = 75;

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
        const seekBarContainer = document.getElementById('player-seek-bar-container');
        const seekBarProgress = document.getElementById('player-seek-bar-progress');

        // --- State Variables (Music Player Specific - Local Scope) ---
        // player, isPlayerReady, playlistLoaded are declared outside
        // internalIsPlaying declared outside
        let internalIsMuted = false;
        let currentVolume = initialVolume;
        let seekBarInterval = null;
        let restoreAttempted = false;
        let pendingSeekTime = null;
        let pendingPlay = false;
        let currentPlaylistIndex = 0;

        // --- State Management ---
        function savePlayerState() { if (!isPlayerReady || !player || typeof player.getPlayerState !== 'function') { return; } try { let apiState = player.getPlayerState(); let isCurrentlyPlaying = (apiState === YT.PlayerState.PLAYING || apiState === YT.PlayerState.BUFFERING); const state = { playlistId: youtubePlaylistId, index: player.getPlaylistIndex(), time: player.getCurrentTime() || 0, volume: player.getVolume(), muted: player.isMuted(), playing: isCurrentlyPlaying, timestamp: Date.now() }; sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state)); } catch (e) { console.error("[Music Player] Error saving state:", e); } }
        function loadPlayerState() { try { const savedStateString = sessionStorage.getItem(SESSION_STORAGE_KEY); if (savedStateString) { return JSON.parse(savedStateString); } } catch (e) { console.error("[Music Player] Error loading state:", e); sessionStorage.removeItem(SESSION_STORAGE_KEY); } return null; }

        // --- Player Event Handlers ---
        function onPlayerReady(event) { console.log("[Music Player] Event: onPlayerReady"); isPlayerReady = true; player = event.target; playlistLoaded = false; restoreAttempted = false; pendingSeekTime = null; pendingPlay = false; const savedState = loadPlayerState(); currentVolume = savedState ? savedState.volume : initialVolume; internalIsMuted = savedState ? savedState.muted : false; currentPlaylistIndex = savedState ? savedState.index : 0; player.setVolume(currentVolume); if (internalIsMuted) player.mute(); if (volumeSlider) volumeSlider.value = currentVolume; updateVolumeIcon(internalIsMuted ? 0 : currentVolume); updateVideoTitle("Loading Playlist..."); updateThumbnail(null); if (savedState) { pendingSeekTime = savedState.time; pendingPlay = savedState.playing; internalIsPlaying = pendingPlay; updatePlayPauseIcon(); } else { internalIsPlaying = false; updatePlayPauseIcon(); } player.cuePlaylist({ list: youtubePlaylistId, listType: 'playlist', index: currentPlaylistIndex }); setupPlayerEventListeners(); }
        function onPlayerStateChange(event) { const state = event.data; const stateNames = { '-1': 'UNSTARTED', 0: 'ENDED', 1: 'PLAYING', 2: 'PAUSED', 3: 'BUFFERING', 5: 'CUED' }; /* console.log(`[Music Player] Event: onStateChange - ${stateNames[state] || state}`); */ if (!isPlayerReady) return; if (!restoreAttempted && (state === YT.PlayerState.CUED || state === YT.PlayerState.BUFFERING || state === YT.PlayerState.PLAYING)) { playlistLoaded = true; restoreAttempted = true; if (pendingSeekTime !== null && pendingSeekTime > 0.1) { player.seekTo(pendingSeekTime, true); } if (pendingPlay) { setTimeout(() => { if (player && isPlayerReady) { try { player.playVideo(); } catch (e) { console.error("[Music Player] Error calling playVideo during restore:", e); } } }, 100); } else { if (pendingSeekTime !== null && pendingSeekTime > 0.1) { setTimeout(updateSeekBar, 150); } } pendingSeekTime = null; pendingPlay = false; } const actualPlayerState = player.getPlayerState(); internalIsPlaying = (actualPlayerState === YT.PlayerState.PLAYING || actualPlayerState === YT.PlayerState.BUFFERING); updatePlayPauseIcon(); if (state === YT.PlayerState.CUED || state === YT.PlayerState.PLAYING || state === YT.PlayerState.BUFFERING) { let newIndex = player.getPlaylistIndex(); if (newIndex !== currentPlaylistIndex || videoTitleElement.textContent.includes("Loading") || videoTitleElement.textContent.includes("Initializing")) { currentPlaylistIndex = newIndex; updateVideoDetails(); } } if (internalIsPlaying) { startSeekBarUpdate(); } else { if (seekBarInterval) clearInterval(seekBarInterval); seekBarInterval = null; if (state === YT.PlayerState.PAUSED || state === YT.PlayerState.ENDED) { setTimeout(updateSeekBar, 50); savePlayerState(); } } if (state === YT.PlayerState.ENDED) { if(seekBarProgress) seekBarProgress.style.width = '0%'; internalIsPlaying = false; updatePlayPauseIcon(); savePlayerState(); } }
        function onPlayerError(event) { console.error(`[Music Player] Event: onPlayerError. Code: ${event.data}`); const errorMessages = { 2: "Invalid parameter", 5: "HTML5 player error", 100: "Video not found", 101: "Playback disallowed", 150: "Playback disallowed" }; console.error(`[Music Player] Error: ${errorMessages[event.data] || 'Unknown error.'}`); isPlayerReady = false; internalIsPlaying = false; playlistLoaded = false; pendingSeekTime = null; pendingPlay = false; restoreAttempted = true; updatePlayPauseIcon(); updateVideoTitle("Player Error"); if (seekBarInterval) { clearInterval(seekBarInterval); seekBarInterval = null; } disablePlayerControls(); if (thumbnailImg) { thumbnailImg.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'%3E%3Crect width='16' height='9' fill='%23ccc'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='1.5px' fill='%23555'%3EError%3C/text%3E%3C/svg%3E"; } try { sessionStorage.removeItem(SESSION_STORAGE_KEY); } catch (e) {} }

        // --- Player Control Functions ---
        function setupPlayerEventListeners() { playPauseBtn?.addEventListener('click', togglePlayPause); prevBtn?.addEventListener('click', playPreviousVideo); nextBtn?.addEventListener('click', playNextVideo); volumeIconBtn?.addEventListener('click', toggleMute); volumeSlider?.addEventListener('input', handleVolumeChange); seekBarContainer?.addEventListener('click', handleSeekBarClick); window.addEventListener('beforeunload', savePlayerState); }
        function disablePlayerControls() { console.warn("[Music Player] Disabling player controls."); const controls = [playPauseBtn, prevBtn, nextBtn, volumeIconBtn, volumeSlider, seekBarContainer]; controls.forEach(control => { if(control) { control.disabled = true; if(control === seekBarContainer) control.style.cursor = 'default'; } }); if(thumbnailImg) thumbnailImg.style.opacity = 0.6; }
        // Make clearPendingRestoreFlags accessible outside this block
        clearPendingRestoreFlags = () => { if (pendingSeekTime !== null || pendingPlay) { /* console.log("[Music Player] User interaction detected, clearing pending restore flags."); */ } pendingSeekTime = null; pendingPlay = false; restoreAttempted = true; };
        function togglePlayPause() { if (!isPlayerReady || !player || !playlistLoaded) { console.warn("[Music Player] togglePlayPause: Player not ready/loaded."); return; } clearPendingRestoreFlags(); try { const currentState = player.getPlayerState(); if (currentState === YT.PlayerState.PLAYING || currentState === YT.PlayerState.BUFFERING) { player.pauseVideo(); } else { player.playVideo(); } } catch (e) { console.error("[Music Player] Error toggling play/pause:", e); } }
        function playPreviousVideo() { if (!isPlayerReady || !player || !playlistLoaded) return; clearPendingRestoreFlags(); try { player.previousVideo(); } catch(e){ console.error("Err Prev:", e); } }
        function playNextVideo() { if (!isPlayerReady || !player || !playlistLoaded) return; clearPendingRestoreFlags(); try { player.nextVideo(); } catch(e){ console.error("Err Next:", e); } }
        function handleVolumeChange() { if (!isPlayerReady || !player || !volumeSlider) return; currentVolume = parseInt(volumeSlider.value, 10); internalIsMuted = player.isMuted(); try { player.setVolume(currentVolume); if (internalIsMuted && currentVolume > 0) { player.unMute(); internalIsMuted = false; } else if (!internalIsMuted && currentVolume === 0) { player.mute(); internalIsMuted = true; } } catch (e) { console.error("[Music Player] Error handling volume change:", e); } updateVolumeIcon(internalIsMuted ? 0 : currentVolume); savePlayerState(); }
        function toggleMute() { if (!isPlayerReady || !player) return; internalIsMuted = player.isMuted(); try { if (internalIsMuted) { player.unMute(); internalIsMuted = false; if (currentVolume === 0) currentVolume = 50; if (volumeSlider) volumeSlider.value = currentVolume; player.setVolume(currentVolume); } else { player.mute(); internalIsMuted = true; } } catch (e) { console.error("[Music Player] Error toggling mute:", e); } updateVolumeIcon(internalIsMuted ? 0 : currentVolume); savePlayerState(); }
        function handleSeekBarClick(event) { if (!isPlayerReady || !player || !seekBarContainer || !playlistLoaded) return; clearPendingRestoreFlags(); let duration; try { duration = player.getDuration(); } catch (e) { return; } if (typeof duration !== 'number' || duration <= 0) return; const barWidth = seekBarContainer.offsetWidth; const clickPositionX = event.offsetX; if (typeof barWidth !== 'number' || barWidth <= 0) return; const seekFraction = Math.max(0, Math.min(1, clickPositionX / barWidth)); const seekTime = seekFraction * duration; try { player.seekTo(seekTime, true); if(seekBarProgress) seekBarProgress.style.width = (seekFraction * 100) + '%'; savePlayerState(); } catch(e) { console.error("[Music Player] Error seeking:", e); } }

        // --- Player UI Update Functions ---
        function updatePlayPauseIcon() { if (!playPauseBtn) return; const iconElement = playPauseBtn.querySelector('i'); if (!iconElement) return; iconElement.classList.remove(playIconClass, pauseIconClass); if (internalIsPlaying) { iconElement.classList.add(pauseIconClass); playPauseBtn.title = "Pause"; } else { iconElement.classList.add(playIconClass); playPauseBtn.title = "Play"; } }
        function updateVolumeIcon(volume) { if (!volumeIcon || !volumeIconBtn) return; volumeIcon.classList.remove('bi-volume-up-fill', 'bi-volume-down-fill', 'bi-volume-mute-fill'); if (internalIsMuted || volume === 0) { volumeIcon.classList.add('bi-volume-mute-fill'); volumeIconBtn.title = "Unmute"; } else if (volume < 50) { volumeIcon.classList.add('bi-volume-down-fill'); volumeIconBtn.title = "Mute"; } else { volumeIcon.classList.add('bi-volume-up-fill'); volumeIconBtn.title = "Mute"; } }
        function updateThumbnail(videoId) { if (thumbnailImg && videoId) { thumbnailImg.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`; thumbnailImg.alt = `Thumbnail`; thumbnailImg.style.opacity = 1; } else if (thumbnailImg) { thumbnailImg.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'%3E%3Crect width='16' height='9' fill='%23e0e0e0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='1.5px' fill='%23999'%3EWaiting...%3C/text%3E%3C/svg%3E"; thumbnailImg.alt = 'Video Thumbnail Loading'; } }
        function updateVideoTitle(title) { if (videoTitleElement) { const displayTitle = title || "---"; videoTitleElement.textContent = displayTitle; videoTitleElement.title = displayTitle; } }
        function updateVideoDetails() { if (!isPlayerReady || !player || typeof player.getVideoData !== 'function') return; try { const videoData = player.getVideoData(); if (videoData && videoData.title) { updateThumbnail(videoData.video_id); updateVideoTitle(videoData.title); } else { setTimeout(() => { try { const freshVideoData = player.getVideoData(); if (freshVideoData && freshVideoData.title){ updateThumbnail(freshVideoData.video_id); updateVideoTitle(freshVideoData.title); } else { updateThumbnail(null); updateVideoTitle("Loading Info..."); } } catch(e) { /* ignore inner error */} }, 500); } } catch (error) { console.error("[Music Player] Error in updateVideoDetails:", error); updateThumbnail(null); updateVideoTitle("Error loading info"); } }

        // --- Seek Bar Update ---
        function startSeekBarUpdate() { if (!isPlayerReady || !player || !seekBarProgress) return; if (seekBarInterval) clearInterval(seekBarInterval); updateSeekBar(); seekBarInterval = setInterval(() => { updateSeekBar(); savePlayerState(); }, 500); }
        function updateSeekBar() { if (!isPlayerReady || !player || typeof player.getCurrentTime !== 'function' || typeof player.getDuration !== 'function') { if (seekBarInterval) { clearInterval(seekBarInterval); seekBarInterval = null; } return; } let currentTime = 0; let duration = 0; try { currentTime = player.getCurrentTime(); duration = player.getDuration(); } catch (e) { if (seekBarInterval) { clearInterval(seekBarInterval); seekBarInterval = null; } return; } if (duration && duration > 0) { const progressPercentage = (currentTime / duration) * 100; if (seekBarProgress) { seekBarProgress.style.width = Math.min(100, Math.max(0, progressPercentage)) + '%'; } } else { if (seekBarProgress) { seekBarProgress.style.width = '0%'; } } }

        // --- YouTube API Loading and Player Creation ---
        function createYouTubePlayer() { const playerDiv = document.getElementById(playerContainerId); if (!playerDiv) { console.error(`[Music Player] ERROR: Player container div '#${playerContainerId}' not found!`); return; } if (!youtubePlaylistId) { console.warn("[Music Player] No Playlist ID configured."); updateVideoTitle("No Playlist"); disablePlayerControls(); return; } try { /* Use the global 'player' variable */ player = new YT.Player(playerContainerId, { height: '1', width: '1', playerVars: { 'playsinline': 1 }, events: { 'onReady': onPlayerReady, 'onStateChange': onPlayerStateChange, 'onError': onPlayerError } }); } catch (error) { console.error("[Music Player] CRITICAL ERROR creating YT.Player:", error); disablePlayerControls(); } }

        // Store the original (if any) onYouTubeIframeAPIReady function
        const existingApiReadyCallback = window.onYouTubeIframeAPIReady;

        window.onYouTubeIframeAPIReady = function() {
            console.log("Global onYouTubeIframeAPIReady called (for Music Player).");
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
             console.log("[Music Player] YouTube API not found, initiating load...");
             const tag = document.createElement('script'); tag.src = "https://www.youtube.com/iframe_api"; const firstScriptTag = document.getElementsByTagName('script')[0]; if (firstScriptTag && firstScriptTag.parentNode) { firstScriptTag.parentNode.insertBefore(tag, firstScriptTag); } else { document.body.appendChild(tag); }
        } else {
            // API is already loaded, directly create the player
            console.log("[Music Player] YouTube API already loaded, creating player directly.");
            createYouTubePlayer();
        }

        // --- Initial UI setup ---
        if (volumeSlider) volumeSlider.value = initialVolume;
        updateVolumeIcon(initialVolume);
        updatePlayPauseIcon();
        updateThumbnail(null);
        updateVideoTitle("Initializing...");
        if (seekBarProgress) seekBarProgress.style.width = '0%';

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


    // --- Random Song Button Logic ---
    if (randomSongButton) {
        randomSongButton.addEventListener('click', () => {
            // Uses 'player', 'isPlayerReady', 'playlistLoaded', 'clearPendingRestoreFlags' from music player scope
            if (typeof player !== 'undefined' && player && isPlayerReady && playlistLoaded) {
                 clearPendingRestoreFlags(); // Ensure state is cleared
                 try {
                     const playlist = player.getPlaylist(); // Get the list of video IDs
                     if (playlist && playlist.length > 0) {
                         let randomIndex;
                         let currentIdx = player.getPlaylistIndex();
                         // Ensure the new random index is different from the current one, if possible
                         if (playlist.length > 1) {
                              do {
                                  randomIndex = Math.floor(Math.random() * playlist.length);
                              } while (randomIndex === currentIdx);
                         } else {
                              randomIndex = 0; // Only one song, just play it
                         }
                         player.playVideoAt(randomIndex); // Play the video at the random index
                     } else { console.warn("[Music Player] Playlist empty for random song."); /* alert("Playlist is empty."); */ }
                 } catch (e) { console.error("[Music Player] Error playing random video:", e); /* alert("Could not play random song."); */ }
            } else { /* alert("Music player is not ready yet."); */ console.warn("[Random Song] Music player not ready or accessible."); }
        });
    }
    // --- End Random Song Button ---


    // --- INITIALIZE FEATURES ON LOAD ---

    // Netlify Identity UI updates are triggered by its own events/initial check.
    // Post fetching is triggered if postsContainer exists (handled above).
    // Music Player initializes itself if musicPlayerContainer exists (handled above).
    // Create Form listeners are added if createPostForm exists (handled above).
    // Quick Links listener is added if elements exist (handled above).
    // Random Song listener is added if button exists (handled above).
    // Video trigger listeners added if element exists (handled above).

    // Initial setup for video trigger text (redundant safety check)
    if (videoTriggerInfo && !isVideoActive) {
         videoTriggerInfo.textContent = "ANSI Art (Click to play)";
         videoTriggerInfo.style.cursor = 'pointer';
         videoTriggerInfo.setAttribute('aria-disabled', 'false');
         videoTriggerInfo.classList.remove('video-active');
    }

// --- Dark Mode Logic ---
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const darkModeLabel = document.querySelector('.dropdown-item-label[for="dark-mode-toggle"]');
    const bodyElement = document.body;
    const DARK_MODE_KEY = 'darkModePreference_v1';

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

    // Initialize Dark Mode on Load
    if (darkModeToggle) {
        let savedPreference = null;
        try {
            savedPreference = localStorage.getItem(DARK_MODE_KEY);
        } catch (e) {
           console.warn("Could not read dark mode preference from localStorage:", e);
        }

        // Determine initial state: saved pref >>>> DEFAULT LIGHT <<<<
        let initialDarkMode = false; // Start assuming light mode is the default

        if (savedPreference === 'dark') {
            initialDarkMode = true; // Saved preference is dark, override default
        } else if (savedPreference === 'light') {
            initialDarkMode = false; // Saved preference is light, confirm default
        }
        // REMOVED/COMMENTED OUT: System Preference Check
        /*
        else {
             // If no saved preference, CHECK system preference (REMOVED THIS BEHAVIOR)
             if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                 initialDarkMode = true; // System prefers dark
                 // console.log("Using system preference: dark");
             } else {
                 // System prefers light or doesn't specify, stick with initialDarkMode = false
                 // console.log("Defaulting to light mode (no saved pref, system not dark)");
             }
        }
        */

        // console.log(`Applying initial dark mode state: ${initialDarkMode}`);
        applyDarkMode(initialDarkMode); // Apply the determined initial state (will be false/light if no 'dark' saved pref)

        // Add the change listener
        darkModeToggle.addEventListener('change', handleDarkModeToggleChange);

        // Prevent dropdown closing logic (remains the same)
        if (darkModeLabel) {
            // ... (event listener for label click) ...
        }

    } else {
         // console.log("Dark mode toggle element not found.");
    }
    // --- End Dark Mode Logic --

    console.log("Consolidated script.js: DOM Content Loaded setup finished.");


}); // --- END OF MASTER DOMContentLoaded LISTENER ---