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
                                <a href="#" data-lang="en">English</a>
                                <a href="#" data-lang="fr">Français</a>
                                <a href="#" data-lang="de">Deutsch</a>
                                <a href="#" data-lang="es">Español</a>
                                <a href="#" data-lang="it">Italiano</a>
                                <a href="#" data-lang="pt">Português</a>
                                <a href="#" data-lang="ja">日本語</a>
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
            </nav>
            <div class="search-bar">
                <div class="search-container">
                    <input type="text" placeholder="Search...">
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
                <button id="logout-button" class="auth-button">Log Out</button>
            </div>
        </div>
    </div>
</header>`;
