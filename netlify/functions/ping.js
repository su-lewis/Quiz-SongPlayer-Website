// FILE: netlify/functions/ping.js

export const handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Cache-Control': 'no-cache'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Helper: fetch with timeout
  const fetchWithTimeout = async (url, ms = 4000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    try {
      const res = await fetch(url, { method: 'GET', signal: controller.signal });
      return { ok: res.ok, status: res.status };
    } catch (e) {
      return { ok: false, error: (e && e.message) || 'fetch failed' };
    } finally {
      clearTimeout(id);
    }
  };

  const envReport = {
    YOUTUBE_API_KEY: !!process.env.YOUTUBE_API_KEY,
    YOUTUBE_PLAYLIST_ID: !!process.env.YOUTUBE_PLAYLIST_ID,
    FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY
  };

  const probe = await fetchWithTimeout('https://www.googleapis.com/discovery/v1/apis?name=youtube&preferred=true');

  const payload = {
    ok: true,
    node: process.version,
    region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'unknown',
    timestamp: new Date().toISOString(),
    env: envReport,
    outboundProbe: probe
  };

  return { statusCode: 200, headers, body: JSON.stringify(payload) };
};
