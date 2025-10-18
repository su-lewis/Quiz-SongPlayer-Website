let currentLang = 'en';
const translationCache = {};

// We use a Map to store the original text of each element.
// This is more robust than data attributes.
const originalTextMap = new WeakMap();

export function initTranslation(dependencies) {
    dependencies.getCurrentLanguage = () => currentLang;

    document.querySelectorAll('[data-lang]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const selectedLang = link.getAttribute('data-lang');
            applyTranslations(selectedLang, dependencies.fetchAndDisplayPosts);
        });
    });

    document.addEventListener('contentUpdated', () => {
        if (currentLang !== 'en') {
            autoTranslate(currentLang);
        }
    });

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
        fetchPostsCallback();
    }
}

async function autoTranslate(lang) {
    console.log(`--- Starting autoTranslate for '${lang}' ---`);
    const elementsToTranslate = document.querySelectorAll('[data-translate], [data-translate-placeholder]');

    // --- STEP 1: CAPTURE & RESTORE ---
    // This combined loop is the core of the fix.
    elementsToTranslate.forEach(el => {
        // A) CAPTURE: If we haven't seen this element before, store its original English text.
        if (!originalTextMap.has(el)) {
            if (el.hasAttribute('data-translate-placeholder')) {
                originalTextMap.set(el, { type: 'placeholder', text: el.placeholder });
            } else {
                const textNode = Array.from(el.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
                if (textNode) {
                    originalTextMap.set(el, { type: 'textNode', text: textNode.textContent });
                }
            }
        }
        
        // B) RESTORE: Always revert the element to its stored original English text.
        const original = originalTextMap.get(el);
        if (original) {
            if (original.type === 'placeholder') {
                el.placeholder = original.text;
            } else if (original.type === 'textNode') {
                const textNode = Array.from(el.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
                if (textNode) {
                    textNode.textContent = original.text;
                }
            }
        }
    });

    // If the target language is English, our job is done.
    if (lang === 'en') {
        console.log("Translation: Reverted to English.");
        return;
    }

    // --- STEP 2: TRANSLATE ---
    const cacheKey = `translation_cache_${lang}`;
    try {
        const cachedData = localStorage.getItem(cacheKey);
        // Clear and load fresh from cache to prevent mixing languages
        for (const key in translationCache) delete translationCache[key];
        if (cachedData) Object.assign(translationCache, JSON.parse(cachedData));
    } catch (e) { console.warn('Could not load translation cache.', e); }

    for (const el of elementsToTranslate) {
        const original = originalTextMap.get(el);
        if (!original?.text) continue;

        const originalText = original.text.trim();
        if (!originalText) continue;

        let translatedText = translationCache[originalText];

        if (!translatedText) {
            try {
                const response = await fetch('/.netlify/functions/translate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: originalText, target_lang: lang }),
                });
                if (!response.ok) throw new Error(`API error ${response.status}`);
                const data = await response.json();
                translatedText = data.translatedText;
                translationCache[originalText] = translatedText;
            } catch (error) {
                console.error(`Failed to translate "${originalText}":`, error);
                continue;
            }
        }

        if (original.type === 'placeholder') {
            el.placeholder = translatedText;
        } else if (original.type === 'textNode') {
            const textNode = Array.from(el.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
            if (textNode) {
                textNode.textContent = translatedText;
            }
        }
    }

    try {
        localStorage.setItem(cacheKey, JSON.stringify(translationCache));
    } catch (e) { console.warn('Could not save translation cache.', e); }
    console.log(`--- Finished autoTranslate for '${lang}' ---`);
}