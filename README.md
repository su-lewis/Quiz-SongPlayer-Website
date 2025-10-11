# QuizSongPlayer

## Serverless functions configuration

Set these environment variables in Netlify (Site settings → Environment variables):

- YOUTUBE_API_KEY: YouTube Data API v3 key
- YOUTUBE_PLAYLIST_ID (optional): Override the default playlist ID
- FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY: For posts function (Firebase Admin)

After setting variables, trigger a deploy. Then verify the playlist function:

- Open /.netlify/functions/youtube-playlist in your browser.
- In Netlify UI: Site → Functions → youtube-playlist → Logs for request results.

The function times out upstream calls after ~6 seconds to prevent hangs and falls back to the YouTube Iframe in the client.
