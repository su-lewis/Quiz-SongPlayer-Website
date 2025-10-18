export function initMusicPlayer() {
    console.log("Module Loaded: musicPlayer.js"); // ADD THIS LINE
    const musicPlayerContainer = document.querySelector('.mini-music-player');
    if (!musicPlayerContainer) {
        return; // Don't run any music player code if it's not on the page
    }

    // --- All variables and functions are now scoped to this module ---
    let player;
    let isPlayerReady = false;
    let isPlaylistLoaded = false;

    let playedVideos = []; // Track played videos for shuffle functionality
    let shuffleHistory = []; // Track played videos for "previous" functionality in shuffle
    let shuffleMode = true;
    let playHistory = []; // Stores the indices of songs as they are played
    let historyIndex = -1; // Points to the current position in the playHistory

    let internalIsPlaying = false;
    let fullPlaylistData = null;
    let updatePlaylistActiveState = () => { }; // THE FIX IS HERE

    const SESSION_STORAGE_KEY = 'musicPlayerState_v1';
    const LOCAL_STORAGE_KEY = 'musicPlayerState_v1';
    const youtubePlaylistId = 'PLC1tH2RPEXpQqF8cQvQYGy1Z6JwpLyG3a';
    const AUTOPLAY_ON_LOAD = true;
    const initialVolume = 100;
    const DEFAULT_FIRST_VIDEO_ID = 'vIOSkVRSgWY';

    // DOM Elements
    const playPauseBtn = document.getElementById('player-play-pause');
    const prevBtn = document.getElementById('player-prev');
    const nextBtn = document.getElementById('player-next');
    const shuffleButton = document.getElementById('player-shuffle');
    const volumeIconBtn = document.getElementById('player-volume-icon');
    const volumeSlider = document.getElementById('player-volume-slider');
    const thumbnailImg = document.getElementById('player-video-thumbnail');
    const playerContainerId = 'youtube-player-container';
    const videoTitleElement = document.getElementById('player-video-title');
    const trackNumberElement = document.getElementById('player-track-number');
    const seekBarContainer = document.getElementById('player-seek-bar-container');
    const seekBarProgress = document.getElementById('player-seek-bar-progress');
    const playlistBtn = document.getElementById('player-playlist-btn');
    const playlistDropdown = document.getElementById('player-playlist-dropdown');

    // State Variables
    let currentVolume = initialVolume;
    let seekBarInterval = null;
    let currentPlaylistIndex = 738;
    let volumeBeforeMute = initialVolume;

    function savePlayerState() {
        if (!isPlayerReady || !player || typeof player.getPlayerState !== 'function') return;
        try {
            const apiState = player.getPlayerState();
            const isPlaying = apiState === 1 || apiState === 3;
            const videoData = player.getVideoData();
            const currentVideoId = videoData?.video_id;
            let playlistIndex = currentPlaylistIndex;
            if (fullPlaylistData?.videos && currentVideoId) {
                const foundIdx = fullPlaylistData.videos.findIndex(v => v.videoId === currentVideoId);
                if (foundIdx >= 0) playlistIndex = foundIdx;
            }
            const state = {
                index: playlistIndex, videoId: currentVideoId,
                time: player.getCurrentTime() || 0, duration: player.getDuration() || 0,
                volume: player.getVolume(), muted: player.isMuted(), playing: isPlaying,
                timestamp: Date.now(),
            };
            sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state));
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
        } catch (e) { console.error("[Music Player] Error saving state:", e); }
    }

    function loadPlayerState() {
        try {
            const s = sessionStorage.getItem(SESSION_STORAGE_KEY);
            if (s) return JSON.parse(s);
        } catch (e) { }
        try {
            const l = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (l) return JSON.parse(l);
        } catch (e) { }
        return null;
    }

    function onPlayerReady(event) {
        isPlayerReady = true;
        player = event.target;

        const savedState = loadPlayerState();
        const hasPlayedBefore = localStorage.getItem('musicPlayerHasPlayed') === 'true';

        let startMuted = false;
        let startPlaying = false;
        let pendingSeekTime = null;

        if (savedState) {
            currentVolume = savedState.volume;
            startMuted = savedState.muted;
            const timeSinceSave = (Date.now() - (savedState.timestamp || Date.now())) / 1000;
            if (savedState.playing && timeSinceSave < (savedState.duration - savedState.time)) {
                startPlaying = true;
                pendingSeekTime = savedState.time + timeSinceSave;
            } else {
                startPlaying = false;
                pendingSeekTime = savedState.time;
            }
        } else {
            currentVolume = initialVolume;
            if (AUTOPLAY_ON_LOAD) {
                startMuted = true;
                startPlaying = true;
            }
        }

        player.setVolume(currentVolume);
        if (startMuted) player.mute();

        const videoToLoad = savedState?.videoId || DEFAULT_FIRST_VIDEO_ID;
        player.cueVideoById({ videoId: videoToLoad, startSeconds: pendingSeekTime || 0 });

        if (startPlaying) {
            setTimeout(() => { if (player) player.playVideo(); }, 250);
        }

        updatePlayerUI();
        setupPlayerEventListeners();
        populatePlaylist();
    }

    function onPlayerStateChange(event) {
        const state = event.data;
        internalIsPlaying = (state === YT.PlayerState.PLAYING || state === YT.PlayerState.BUFFERING);

        if (state === YT.PlayerState.PLAYING) {
            if (!localStorage.getItem('musicPlayerHasPlayed')) {
                localStorage.setItem('musicPlayerHasPlayed', 'true');
            }
            // --- CRITICAL HISTORY UPDATE ---
            // When a new song starts playing, update the history.
            const currentVideoId = player.getVideoData()?.video_id;
            if (fullPlaylistData?.videos && currentVideoId) {
                const newIndex = fullPlaylistData.videos.findIndex(v => v.videoId === currentVideoId);
                // Only update history if the song is different from the current one
                if (newIndex !== -1 && newIndex !== playHistory[historyIndex]) {
                    // If we were in the middle of history, clear the "future"
                    if (historyIndex < playHistory.length - 1) {
                        playHistory.splice(historyIndex + 1);
                    }
                    playHistory.push(newIndex);
                    historyIndex++;
                }
            }
        }

        updatePlayerUI();
        savePlayerState();

        if (internalIsPlaying) {
            startSeekBarUpdate();
        } else {
            clearInterval(seekBarInterval);
        }

        if (state === YT.PlayerState.ENDED) {
            playNextVideo();
        }
    }

    function onPlayerError(event) {
        console.error(`[Music Player] Error code: ${event.data}`);
        if ([100, 101, 150].includes(event.data)) {
            updatePlayerUI({ title: 'Video Unavailable - Skipping...' });
            setTimeout(playNextVideo, 1500);
        }
    }

    function setupPlayerEventListeners() {
        playPauseBtn?.addEventListener('click', togglePlayPause);
        prevBtn?.addEventListener('click', playPreviousVideo);
        nextBtn?.addEventListener('click', playNextVideo);
        shuffleButton?.addEventListener('click', toggleShuffle);
        volumeIconBtn?.addEventListener('click', toggleMute);
        volumeSlider?.addEventListener('input', handleVolumeChange);
        seekBarContainer?.addEventListener('click', handleSeekBarClick);
        window.addEventListener('beforeunload', savePlayerState);
    }

    function togglePlayPause() {
        if (!isPlayerReady) return;
        const state = player.getPlayerState();
        if (state === YT.PlayerState.PLAYING || state === YT.PlayerState.BUFFERING) {
            player.pauseVideo();
        } else {
            player.playVideo();
        }
    }

    function playPreviousVideo() {
        if (!isPlayerReady || !fullPlaylistData?.videos) return;

        // Instantly reset the seek bar for better UX
        const seekBarProgress = document.getElementById('player-seek-bar-progress');
        if (seekBarProgress) seekBarProgress.style.width = '0%';
        
        player.setVolume(currentVolume);

        if (shuffleMode) {
            // Navigate backwards in history if possible
            if (historyIndex > 0) {
                historyIndex--;
                const prevIndex = playHistory[historyIndex];
                const prevVideo = fullPlaylistData.videos[prevIndex];
                if (prevVideo) player.loadVideoById(prevVideo.videoId);
            }
            // If at the start of history, do nothing.
        } else {
            // Sequential logic
            const currentVideoId = player.getVideoData()?.video_id;
            let currentIndex = -1;
            if (currentVideoId) {
                currentIndex = fullPlaylistData.videos.findIndex(v => v.videoId === currentVideoId);
            }
            if (currentIndex === -1) currentIndex = 0; // Fallback

            const prevIndex = (currentIndex - 1 + fullPlaylistData.videos.length) % fullPlaylistData.videos.length;
            const prevVideo = fullPlaylistData.videos[prevIndex];
            if (prevVideo) player.loadVideoById(prevVideo.videoId);
        }
    }

    // AFTER THE FIX
    function playNextVideo() {
        if (!isPlayerReady || !fullPlaylistData?.videos) return;

        // Instantly reset the seek bar for better UX
        const seekBarProgress = document.getElementById('player-seek-bar-progress');
        if (seekBarProgress) seekBarProgress.style.width = '0%';

        player.setVolume(currentVolume);

        if (shuffleMode) {
            // If we are in the middle of history, navigate forward
            if (historyIndex < playHistory.length - 1) {
                historyIndex++;
                const nextIndex = playHistory[historyIndex];
                const nextVideo = fullPlaylistData.videos[nextIndex];
                if (nextVideo) player.loadVideoById(nextVideo.videoId);
            } else {
                // Otherwise, get a new random song
                generateNewRandomSong();
            }
        } else {
            // Sequential logic
            const currentVideoId = player.getVideoData()?.video_id;
            let currentIndex = -1;
            if (currentVideoId) {
                currentIndex = fullPlaylistData.videos.findIndex(v => v.videoId === currentVideoId);
            }
            if (currentIndex === -1) currentIndex = 0; // Fallback

            const nextIndex = (currentIndex + 1) % fullPlaylistData.videos.length;
            const nextVideo = fullPlaylistData.videos[nextIndex];
            if (nextVideo) player.loadVideoById(nextVideo.videoId);
        }
    }

    function playShuffledVideo() {
        if (!fullPlaylistData?.videos?.length) return;

        const videoData = player.getVideoData();
        const currentVideoId = videoData?.video_id;
        const currentIdx = fullPlaylistData.videos.findIndex(v => v.videoId === currentVideoId);

        if (currentIdx !== -1 && (shuffleHistory.length === 0 || shuffleHistory[shuffleHistory.length - 1] !== currentIdx)) {
            shuffleHistory.push(currentIdx);
        }

        let available = fullPlaylistData.videos.map((_, i) => i).filter(i => !playedVideos.includes(i));
        if (available.length === 0) {
            playedVideos = [currentIdx].filter(i => i !== -1);
            available = fullPlaylistData.videos.map((_, i) => i).filter(i => !playedVideos.includes(i));
        }

        const randomIndex = available[Math.floor(Math.random() * available.length)];
        playedVideos.push(randomIndex);
        player.loadVideoById(fullPlaylistData.videos[randomIndex].videoId);
    }

    function toggleShuffle() {
        shuffleMode = !shuffleMode;
        shuffleButton?.classList.toggle('shuffle-active', shuffleMode);

        // When turning shuffle on, clear old history and start fresh with the current song
        if (shuffleMode) {
            console.log("Shuffle ON: History reset.");
            const currentVideoId = player.getVideoData()?.video_id;
            const currentIndex = fullPlaylistData.videos.findIndex(v => v.videoId === currentVideoId);
            playHistory = [currentIndex].filter(i => i !== -1); // Start history with current song if found
            historyIndex = playHistory.length - 1;
        } else {
            console.log("Shuffle OFF.");
        }
    }
    function generateNewRandomSong() {
        if (!fullPlaylistData?.videos?.length) return;

        const currentIdx = playHistory[historyIndex];

        // To make it truly random but avoid repeats, we can track session plays
        // For simplicity here, we just pick a random song that isn't the current one.
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * fullPlaylistData.videos.length);
        } while (fullPlaylistData.videos.length > 1 && randomIndex === currentIdx);

        player.loadVideoById(fullPlaylistData.videos[randomIndex].videoId);
    }

    function toggleMute() {
        if (!isPlayerReady || !player) return;

        const isCurrentlyMuted = player.isMuted();

        if (isCurrentlyMuted) {
            player.unMute();
            player.setVolume(volumeBeforeMute);
            currentVolume = volumeBeforeMute;
        } else {
            volumeBeforeMute = player.getVolume();
            player.mute();
        }

        // Update UI after a short delay
        setTimeout(updateVolumeUI, 50);
    }

    // NEW, SIMPLER VERSION
    function handleVolumeChange() {
        if (!isPlayerReady || !player || !volumeSlider) return;

        const newVolume = parseInt(volumeSlider.value, 10);
        currentVolume = newVolume;
        player.setVolume(newVolume);

        // Also tell the player to mute/unmute based on the slider position.
        // The UI will update itself via the event listener.
        if (newVolume === 0 && !player.isMuted()) {
            player.mute();
        } else if (newVolume > 0 && player.isMuted()) {
            player.unMute();
        }
    }

    function handleSeekBarClick(event) {
        if (!isPlayerReady || !seekBarContainer) return;
        const duration = player.getDuration();
        if (!duration) return;

        // Calculate the percentage where the user clicked
        const barWidth = seekBarContainer.offsetWidth;
        const clickPositionX = event.offsetX;
        const seekFraction = Math.max(0, Math.min(1, clickPositionX / barWidth));

        // --- THIS IS THE FIX ---
        // Update the UI immediately for an instant feel
        const seekBarProgress = document.getElementById('player-seek-bar-progress');
        if (seekBarProgress) {
            seekBarProgress.style.width = (seekFraction * 100) + '%';
        }
        // ----------------------

        // Now, tell the player to actually seek to that time
        const seekTime = seekFraction * duration;
        player.seekTo(seekTime, true);
    }

    function updatePlayerUI(overrideData = {}) {
        if (!player || typeof player.getVideoData !== 'function') return;

        let videoData, videoId, title;
        try {
            videoData = player.getVideoData();
        } catch (e) { return; }

        videoId = overrideData.videoId === null ? null : overrideData.videoId || videoData?.video_id;
        title = overrideData.title || videoData?.title;

        if (videoTitleElement) {
            videoTitleElement.textContent = title || "---";
            videoTitleElement.title = title || "";
            videoTitleElement.classList.toggle('scrolling', videoTitleElement.scrollWidth > videoTitleElement.clientWidth);
        }

        if (videoId) {
            if (thumbnailImg) thumbnailImg.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
            if (trackNumberElement && fullPlaylistData?.videos) {
                const index = fullPlaylistData.videos.findIndex(v => v.videoId === videoId);
                currentPlaylistIndex = index;
                trackNumberElement.textContent = index !== -1 ? `${index + 1}.` : '';
            }
        } else {
            if (thumbnailImg) thumbnailImg.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'%3E%3Crect width='16' height='9' fill='%23e0e0e0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='1.5px' fill='%23999'%3EWaiting...%3C/text%3E%3C/svg%3E";
            if (trackNumberElement) trackNumberElement.textContent = '';
        }

        updateVolumeUI();
        updatePlayPauseIcon();
        updatePlaylistActiveState(videoId);
    }

    function updateVolumeUI() {
        if (!isPlayerReady) return;
        const isMuted = player.isMuted();
        const volume = player.getVolume();
        const icon = volumeIconBtn?.querySelector('i');
        if (!icon) return;

        let iconClass = 'bi-volume-up-fill';
        if (isMuted || volume === 0) iconClass = 'bi-volume-mute-fill';
        else if (volume < 50) iconClass = 'bi-volume-down-fill';

        icon.className = `bi ${iconClass}`;
        if (volumeSlider) volumeSlider.value = isMuted ? 0 : volume;
    }

    function updatePlayPauseIcon() {
        const icon = playPauseBtn?.querySelector('i');
        if (!icon) return;
        icon.className = internalIsPlaying ? 'bi bi-pause-fill' : 'bi bi-play-fill';
    }

    function startSeekBarUpdate() { clearInterval(seekBarInterval); seekBarInterval = setInterval(updateSeekBar, 1000); }
    function updateSeekBar() {
        if (!isPlayerReady) return;
        try {
            const progress = (player.getCurrentTime() / player.getDuration()) * 100;
            if (seekBarProgress) seekBarProgress.style.width = `${progress}%`;
        } catch (e) { clearInterval(seekBarInterval); }
    }

    async function populatePlaylist() {
        if (isPlaylistLoaded) return;
        const dropdownContent = playlistDropdown?.querySelector('.playlist-dropdown-content');
        if (!dropdownContent) return;
        dropdownContent.innerHTML = '<p class="playlist-loading">Loading playlist...</p>';
        try {
            const cacheKey = 'youtube_playlist_cache';
            let data = JSON.parse(localStorage.getItem(cacheKey));
            const ts = localStorage.getItem(`${cacheKey}_ts`);
            if (!data || !ts || Date.now() - parseInt(ts) > 86400000) {
                const response = await fetch('/.netlify/functions/youtube-playlist');
                if (!response.ok) throw new Error('API fetch failed');
                data = await response.json();
                localStorage.setItem(cacheKey, JSON.stringify(data));
                localStorage.setItem(`${cacheKey}_ts`, Date.now().toString());
            }
            fullPlaylistData = data;
            dropdownContent.innerHTML = '';
            fullPlaylistData.videos.forEach((video, index) => {
                const item = document.createElement('div');
                item.className = 'playlist-item'; item.dataset.videoId = video.videoId;
                item.innerHTML = `<span class="playlist-item-title">${index + 1}. ${video.title || 'Loading...'}</span>`;
                item.addEventListener('click', () => {
                    // --- THIS IS THE FIX ---
                    const seekBarProgress = document.getElementById('player-seek-bar-progress');
                    if (seekBarProgress) {
                        seekBarProgress.style.width = '0%';
                    }
                    // ----------------------

                    player.loadVideoById(video.videoId);
                    playlistDropdown.style.display = 'none';
                });
                dropdownContent.appendChild(item);
            });
            isPlaylistLoaded = true;
            updatePlayerUI();
        } catch (e) {
            dropdownContent.innerHTML = '<p class="playlist-error">Failed to load playlist.</p>';
        }
    }

    updatePlaylistActiveState = (currentVideoId) => {
        if (!isPlaylistLoaded) return;
        playlistDropdown.querySelectorAll('.playlist-item').forEach(item => {
            item.classList.toggle('active', item.dataset.videoId === currentVideoId);
        });
    };

    if (playlistBtn) {
        playlistBtn.addEventListener('click', e => {
            e.stopPropagation();
            const isOpen = playlistDropdown.style.display === 'block';
            playlistDropdown.style.display = isOpen ? 'none' : 'block';
            if (!isOpen && !isPlaylistLoaded) populatePlaylist();
        });
        document.addEventListener('click', e => {
            if (playlistDropdown && !playlistBtn.contains(e.target) && !playlistDropdown.contains(e.target)) {
                playlistDropdown.style.display = 'none';
            }
        });
    }

    function createYouTubePlayer() {
        if (!document.getElementById(playerContainerId)) return;
        try {
            player = new YT.Player(playerContainerId, {
                height: '1', width: '1',
                playerVars: { playsinline: 1, autoplay: 0, mute: 0 },
                events: { 'onReady': onPlayerReady, 'onStateChange': onPlayerStateChange, 'onError': onPlayerError }
            });
        } catch (e) { console.error("YT.Player creation failed:", e); }
    }

    if (typeof YT === 'undefined' || typeof YT.Player === 'undefined') {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScript = document.getElementsByTagName('script')[0];
        firstScript.parentNode.insertBefore(tag, firstScript);
        window.onYouTubeIframeAPIReady = createYouTubePlayer;
    } else {
        createYouTubePlayer();
    }
}
