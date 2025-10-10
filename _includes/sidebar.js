const sidebarContent = `
<!-- Mini Music Player -->
<div class="mini-music-player content-box">
    <h4 data-translate="musicPlayer">Music Player</h4>
    <div class="player-thumbnail">
        <img id="player-video-thumbnail" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'%3E%3Crect width='16' height='9' fill='%23e0e0e0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='1.5px' fill='%23999'%3EWaiting...%3C/text%3E%3C/svg%3E" alt="Video Thumbnail Loading">
        <div id="youtube-player-container"></div>
    </div>
    <div class="player-controls">
        <div class="playlist-dropdown-container">
            <button id="player-playlist-btn" title="Show Playlist" class="player-btn"><i class="bi bi-list"></i></button>
            <div id="player-playlist-dropdown" class="playlist-dropdown" style="display: none;">
                <div class="playlist-dropdown-content">
                    <p class="playlist-loading" data-translate="loadingPlaylist">Loading playlist...</p>
                </div>
            </div>
        </div>
        <button id="player-prev" title="Previous" class="player-btn"><i class="bi bi-skip-backward-fill"></i></button>
        <button id="player-play-pause" title="Play" class="player-btn"><i class="bi bi-play-fill"></i></button>
        <button id="player-next" title="Next" class="player-btn"><i class="bi bi-skip-forward-fill"></i></button>
        <button id="player-shuffle" title="Shuffle" class="player-btn"><i class="bi bi-shuffle"></i></button>
        <div class="volume-control">
            <button id="player-volume-icon" title="Mute" class="player-btn"><i class="bi bi-volume-up-fill"></i></button>
            <input type="range" id="player-volume-slider" min="0" max="100" value="100" title="Volume">
        </div>
    </div>
    <div class="player-info">
        <span id="player-track-number" class="track-number">1.</span>
        <div class="title-container">
            <p id="player-video-title" title="Current Video Title" data-translate="loadingTitle">Loading title...</p>
        </div>
    </div>
    <div id="player-seek-bar-container" class="seek-bar-container" title="Seek">
        <div id="player-seek-bar-progress" class="seek-bar-progress"></div>
    </div>
</div>
<!-- End Mini Music Player -->

<!-- ========== START: Recent Posts Section ========== -->
<div class="recent-posts-container content-box">
    <h4>
        <a href="/posts.html" class="recent-posts-title-link" data-translate="recentPosts">Recent Posts</a>
    </h4>
    <div id="posts-container">
        <p data-translate="loadingPosts">Loading posts...</p>
    </div>
</div>
<!-- ========== END: Recent Posts Section ========== -->

<!-- ========== START: Quick Links Section ========== -->
<div class="quick-links-container content-box">
    <h4 data-translate="quickLinks">Quick Links</h4>
    <div id="quick-links-list" class="quick-links-list">
        <ul>
            <li><a href="https://x.com/lollipop1110111" target="_blank" data-translate="myX">My X</a></li>
            <li><a href="https://simpcity.cr/threads/alquis13.1195439/" target="_blank" data-translate="simpCity">SimpCity</a></li>
            <li><a href="https://www.mega.nz" target="_blank" data-translate="megaFolder"><s>Mega Folder</s></a></li>
            <li>
                <span id="video-trigger-info" role="button" tabindex="0" style="cursor: pointer;" data-translate="ansiArt">ANSI Art (Click to play)</span>
                <div id="video-embed-container" style="display: none;"></div>
            </li>
        </ul>
    </div>
</div>
<!-- ========== END: Quick Links Section ========== -->
`;
