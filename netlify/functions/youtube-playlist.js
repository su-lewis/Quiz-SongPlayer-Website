// FILE: netlify/functions/youtube-playlist.js

/**
 * Netlify Function to fetch YouTube playlist items using YouTube Data API v3
 * This bypasses the 200-video limit of the iframe API
 */

export const handler = async (event, context) => {
    console.log('[youtube-playlist] handler invoked', { method: event.httpMethod, path: event.path });
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Cache-Control': 'public, max-age=86400' // Cache for 24 hours (matches client-side cache)
    };

    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    const playlistId = process.env.YOUTUBE_PLAYLIST_ID || 'PLC1tH2RPEXpQqF8cQvQYGy1Z6JwpLyG3a';

    if (!apiKey) {
        console.error('YOUTUBE_API_KEY environment variable not set');
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Server configuration error' })
        };
    }

    try {
        // Helper: fetch with timeout to avoid long hangs
        const fetchWithTimeout = async (url, options = {}, ms = 6000) => {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), ms);
            try {
                const res = await fetch(url, { ...options, signal: controller.signal });
                return res;
            } finally {
                clearTimeout(id);
            }
        };
        const allVideos = [];
        let pageToken = null;
        let pageCount = 0;
        const maxPages = 20; // Safety limit (50 videos per page = 1000 max)
    const deadlineMs = 8000; // ~8s overall budget to stay within function limits
    const startTs = Date.now();
    let partial = false;

        // Fetch all pages of playlist items
        do {
            const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
            url.searchParams.append('part', 'snippet,contentDetails');
            url.searchParams.append('playlistId', playlistId);
            url.searchParams.append('maxResults', '50'); // Max allowed per request
            url.searchParams.append('key', apiKey);
            
            if (pageToken) {
                url.searchParams.append('pageToken', pageToken);
            }

            console.log(`Fetching page ${pageCount + 1}...`);
            const response = await fetchWithTimeout(url.toString());

            if (!response.ok) {
                const errorData = await response.json();
                console.error('YouTube API error:', errorData);
                
                // Check for quota exceeded
                if (errorData.error?.errors?.[0]?.reason === 'quotaExceeded') {
                    return {
                        statusCode: 429,
                        headers,
                        body: JSON.stringify({ 
                            error: 'YouTube API quota exceeded. Please try again later.',
                            quotaExceeded: true
                        })
                    };
                }
                
                throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            // Extract video information
            if (data.items && data.items.length > 0) {
                data.items.forEach(item => {
                    // Some videos might be private/deleted and have missing data
                    if (item.contentDetails && item.contentDetails.videoId && item.snippet) {
                        allVideos.push({
                            videoId: item.contentDetails.videoId,
                            title: item.snippet.title || 'Untitled Video',
                            thumbnail: item.snippet.thumbnails?.default?.url || '',
                            position: item.snippet.position
                        });
                    }
                });
            }

            pageToken = data.nextPageToken;
            pageCount++;

            // Safety check to prevent infinite loops
            if (pageCount >= maxPages) {
                console.warn('Reached maximum page limit');
                break;
            }

            // Overall deadline check
            if (Date.now() - startTs > deadlineMs) {
                console.warn('Reached overall time budget; returning partial results');
                partial = true;
                break;
            }

        } while (pageToken);

        console.log(`Successfully fetched ${allVideos.length} videos from playlist`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                playlistId,
                totalVideos: allVideos.length,
                videos: allVideos,
                partial
            })
        };

    } catch (error) {
        const isAbort = (error && (error.name === 'AbortError' || /aborted|timeout/i.test(error.message || '')));
        console.error('Error fetching playlist:', error);
        return {
            statusCode: isAbort ? 504 : 500,
            headers,
            body: JSON.stringify({ 
                error: isAbort ? 'Upstream timeout fetching YouTube API' : 'Failed to fetch playlist data',
                message: error.message 
            })
        };
    }
};
