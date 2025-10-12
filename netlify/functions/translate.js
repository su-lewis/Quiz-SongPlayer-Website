// netlify/functions/translate.js
const fetch = require('node-fetch');

exports.handler = async function(event) {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { text, target_lang } = JSON.parse(event.body);
    const DEEPL_API_KEY = process.env.DEEPL_API_KEY; // Securely stored in Netlify build settings

    if (!text || !target_lang || !DEEPL_API_KEY) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Missing required parameters: text, target_lang, or API key.' }),
        };
    }

    // Use the free API endpoint or the pro one based on your key
    const api_url = DEEPL_API_KEY.endsWith(':fx')
        ? 'https://api-free.deepl.com/v2/translate'
        : 'https://api.deepl.com/v2/translate';

    try {
        const response = await fetch(api_url, {
            method: 'POST',
            headers: {
                'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: [text], // DeepL API expects an array of strings
                target_lang: target_lang.toUpperCase(),
                source_lang: 'EN', // Assuming your site's base language is English
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('DeepL API Error:', errorBody);
            return { statusCode: response.status, body: JSON.stringify({ error: `DeepL API error: ${errorBody}` }) };
        }

        const data = await response.json();
        const translatedText = data.translations[0].text;

        return {
            statusCode: 200,
            body: JSON.stringify({ translatedText }),
        };

    } catch (error) {
        console.error('Error calling DeepL API:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch translation.' }),
        };
    }
};
