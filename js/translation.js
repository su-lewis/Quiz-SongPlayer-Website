let currentLang = 'en';
const translationCache = {};
const originalTextMap = new WeakMap();

export function initTranslation(dependencies) {
    dependencies.getCurrentLanguage = () => currentLang;

    document.querySelectorAll('[data-lang]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const selectedLang = link.getAttribute('data-lang');
            // THE FIX IS HERE: No longer pass arguments
            applyTranslations(selectedLang, dependencies.fetchAndDisplayPosts);
        });
    });

    document.addEventListener('contentUpdated', retranslateDynamicContent);

    try {
        currentLang = localStorage.getItem('preferredLang') || 'en';
    } catch (_) {}
    
    applyTranslations(currentLang, dependencies.fetchAndDisplayPosts);
}

async function applyTranslations(lang, fetchPostsCallback) {
    currentLang = lang;
    document.documentElement.lang = lang;
    try { localStorage.setItem('preferredLang', lang); } catch (_) {}
    
    await autoTranslate(lang);
    
    if (typeof fetchPostsCallback === 'function') {
        console.log(`Translation: Language changed to '${lang}', triggering post fetch.`);
        // THE FIX IS HERE: No longer pass arguments
        fetchPostsCallback();
    }
}

// ... (retranslateDynamicContent and autoTranslate functions remain the same)
function retranslateDynamicContent() {
    if (currentLang !== 'en') {
        autoTranslate(currentLang);
    }
}

async function autoTranslate(lang) {
    if (!originalTextMap.has(document.body)) {
        document.querySelectorAll('[data-translate], [data-translate-placeholder]').forEach(el => {
            if (el.hasAttribute('data-translate-placeholder')) {
                originalTextMap.set(el, el.placeholder);
            } else {
                originalTextMap.set(el, el.innerHTML);
            }
        });
        originalTextMap.set(document.body, true);
    }
    document.querySelectorAll('[data-translate], [data-translate-placeholder]').forEach(el => {
        if (originalTextMap.has(el)) {
            if (el.hasAttribute('data-translate-placeholder')) {
                el.placeholder = originalTextMap.get(el);
            } else {
                el.innerHTML = originalTextMap.get(el);
            }
        }
    });
    if (lang === 'en') return;
    const cacheKey = `translation_cache_${lang}`;
    try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) Object.assign(translationCache, JSON.parse(cached));
    } catch (e) { console.warn('Could not load translation cache.', e); }
    for (const el of document.querySelectorAll('[data-translate], [data-translate-placeholder]')) {
        const isPlaceholder = el.hasAttribute('data-translate-placeholder');
        const originalText = (isPlaceholder ? el.placeholder : el.textContent).trim();
        if (!originalText) continue;
        let translatedText = translationCache[originalText];
        if (!translatedText) {
            try {
                const response = await fetch('/.netlify/functions/translate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: originalText, target_lang: lang }),
                });
                if (!response.ok) throw new Error(`API error: ${response.status}`);
                const data = await response.json();
                translatedText = data.translatedText;
                translationCache[originalText] = translatedText;
            } catch (error) {
                console.error(`Failed to translate "${originalText}":`, error);
                continue;
            }
        }
        if (isPlaceholder) {
            el.placeholder = translatedText;
        } else {
            const textNode = Array.from(el.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
            if (textNode) {
                textNode.textContent = translatedText;
            } else {
                el.textContent = translatedText;
            }
        }
    }
    try {
        localStorage.setItem(cacheKey, JSON.stringify(translationCache));
    } catch (e) { console.warn('Could not save translation cache.', e); }
}