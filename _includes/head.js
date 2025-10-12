function generateHead(pageTitle) {
    const siteTitle = 'QuizSongPlayer';
    // Create the full title. If a page-specific title is provided, format it, otherwise use the site title.
    const fullTitle = pageTitle ? `${pageTitle} - ${siteTitle}` : siteTitle;

    // The HTML content for the head. The title is now dynamic.
    const headContent = `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${fullTitle}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="icon" href="/images/favicon.svg" type="image/svg+xml">
    <link rel="icon" href="/images/favicon.ico" sizes="any">
    <link rel="apple-touch-icon" href="/images/apple-touch-icon.png">
    <link rel="manifest" href="/images/site.webmanifest">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.8.1/font/bootstrap-icons.min.css">
    <link rel="stylesheet" href="css/styles.css">
    <link href="https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&display=swap" rel="stylesheet">
    <script src="https://identity.netlify.com/v1/netlify-identity-widget.js" defer></script>
    <meta name="apple-mobile-web-app-title" content="QuizSongPlayer">`;

    document.head.innerHTML = headContent;
}