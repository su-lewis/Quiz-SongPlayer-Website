const headerContent = `
<header class="header-green">
    <div class="header-top">
        <div class="nav-container">
            <div class="logo">
                <a href="index.html" id="logo-link">
                    <img src="images/my-logo.webp" alt="Lewis' logo">
                </a>
            </div>
            <nav class="header-menu">
                <div class="dropdown">
                    <a class="dropdown-toggle" href="#" id="menu-link" data-translate="menu">Menu&nbsp;<i class="bi bi-chevron-down"></i></a>
                    <div class="dropdown-menu">
                        <div class="language-menu-item">
                            <a href="#">
                                <span data-translate="language">Language</span> <i class="bi bi-chevron-right"></i>
                            </a>
                            <div class="language-submenu">
                                <a href="#" data-lang="en"><span>English</span><span class="lang-english-name">(English)</span></a>
                                <a href="#" data-lang="zh"><span>中文</span><span class="lang-english-name">(Chinese)</span></a>
                                <a href="#" data-lang="hi"><span>हिन्दी</span><span class="lang-english-name">(Hindi)</span></a>
                                <a href="#" data-lang="es"><span>Español</span><span class="lang-english-name">(Spanish)</span></a>
                                <a href="#" data-lang="fr"><span>Français</span><span class="lang-english-name">(French)</span></a>
                                <a href="#" data-lang="ar"><span>العربية</span><span class="lang-english-name">(Arabic)</span></a>
                                <a href="#" data-lang="pt"><span>Português</span><span class="lang-english-name">(Portuguese)</span></a>
                                <a href="#" data-lang="ru"><span>Русский</span><span class="lang-english-name">(Russian)</span></a>
                                <a href="#" data-lang="de"><span>Deutsch</span><span class="lang-english-name">(German)</span></a>
                                <a href="#" data-lang="ja"><span>日本語</span><span class="lang-english-name">(Japanese)</span></a>
                                <a href="#" data-lang="ko"><span>한국어</span><span class="lang-english-name">(Korean)</span></a>
                                <a href="#" data-lang="it"><span>Italiano</span><span class="lang-english-name">(Italian)</span></a>
                                <a href="#" data-lang="el"><span>Ελληνικά</span><span class="lang-english-name">(Greek)</span></a>
                                <a href="#" data-lang="af"><span>Afrikaans</span><span class="lang-english-name">(Afrikaans)</span></a>
                                <a href="#" data-lang="haw"><span>ʻŌlelo Hawaiʻi</span><span class="lang-english-name">(Hawaiian)</span></a>
                                <a href="#" data-lang="la"><span>Latina</span><span class="lang-english-name">(Latin)</span></a>
                            </div>
                        </div>
                        <a href="#">Option 2</a>
                        <a href="#">Option 3</a>

                        <label class="dropdown-item-label" for="dark-mode-toggle">
                            <span data-translate="darkMode">Dark Mode</span>
                            <input type="checkbox" id="dark-mode-toggle" class="dark-mode-checkbox">
                        </label>
                    </div>
                </div>
                <a href="/create.html" id="create-link" data-translate="create">Create</a>
                <a href="#" id="random-link" data-translate="random">Random</a>
            </nav>
            <div class="search-bar">
                <div class="search-container">
                    <input type="text" placeholder="Search..." data-translate-placeholder="searchPlaceholder">
                    <button type="submit">
                        <i class="bi bi-search"></i>
                    </button>
                </div>
            </div>

            <!-- Custom Auth Buttons/Status -->
            <div id="auth-buttons">
                <button id="signup-button" class="auth-button" data-translate="createAccount">Create Account</button>
                <button id="login-button" class="auth-button" data-translate="login">Login</button>
            </div>
            <div id="user-status" style="display: none;">
                <span id="user-email"></span>
                <button id="logout-button" class="auth-button" data-translate="logout">Log Out</button>
            </div>
        </div>
    </div>
</header>`;
