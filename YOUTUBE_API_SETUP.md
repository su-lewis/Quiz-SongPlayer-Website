# YouTube Data API v3 Setup Guide

This guide will help you set up the YouTube Data API to fetch all 946 videos from your playlist.

## Step 1: Get a YouTube API Key

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create a new project** (or select existing):
   - Click "Select a project" at the top
   - Click "New Project"
   - Name it something like "QuizSongPlayer Music Player"
   - Click "Create"

3. **Enable YouTube Data API v3**:
   - In the left sidebar, go to "APIs & Services" > "Library"
   - Search for "YouTube Data API v3"
   - Click on it and click "Enable"

4. **Create API credentials**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy your API key (it will look like: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`)

5. **Restrict your API key (IMPORTANT for security)**:
   - Click on your new API key to edit it
   - Under "API restrictions", select "Restrict key"
   - Choose "YouTube Data API v3"
   - Under "Website restrictions", add your domains:
     - `https://QuizSongPlayer.com/*`
     - `http://localhost:8888/*` (for local development)
   - Click "Save"

## Step 2: Add Environment Variables

### For Local Development (netlify dev):

Create or update `.env` file in your project root:

```bash
YOUTUBE_API_KEY=YOUR_API_KEY_HERE
YOUTUBE_PLAYLIST_ID=PLC1tH2RPEXpQqF8cQvQYGy1Z6JwpLyG3a
```

**IMPORTANT**: Make sure `.env` is in your `.gitignore` file!

### For Netlify Production:

1. Go to your Netlify dashboard: https://app.netlify.com/
2. Select your site (QuizSongPlayer)
3. Go to "Site settings" > "Environment variables"
4. Click "Add a variable"
5. Add two variables:
   - Key: `YOUTUBE_API_KEY`, Value: `YOUR_API_KEY_HERE`
   - Key: `YOUTUBE_PLAYLIST_ID`, Value: `PLC1tH2RPEXpQqF8cQvQYGy1Z6JwpLyG3a`
6. Click "Save"

## Step 3: Understanding API Quotas

YouTube Data API has daily quotas:
- **Free tier**: 10,000 units per day
- **Fetching playlist items**: 1 unit per request
- **Your playlist**: 946 videos ÷ 50 per request = ~19 requests = 19 units

**This means:**
- You can fetch your full playlist ~526 times per day (10,000 ÷ 19)
- Each visitor loads the playlist once = supports ~500 visitors/day
- After that, playlist will show cached data or fallback to first 200 videos

**To optimize:**
- Cache playlist data in sessionStorage/localStorage (24 hours)
- Only refetch if cache is expired
- Most users will load from cache = no API calls

## Step 4: Deploy and Test

1. **Test locally**:
   ```bash
   netlify dev
   ```
   - Visit http://localhost:8888
   - Check browser console for playlist loading messages
   - Verify all 946 videos appear with real titles

2. **Deploy to production**:
   ```bash
   git add .
   git commit -m "Add YouTube Data API integration for full playlist support"
   git push
   ```
   - Netlify will auto-deploy
   - Wait 2-3 minutes for deployment
   - Visit https://QuizSongPlayer.com and test

## Troubleshooting

### "API key not valid" error:
- Double-check your API key is copied correctly
- Make sure YouTube Data API v3 is enabled
- Check API key restrictions allow your domain

### "Quota exceeded" error:
- You've hit the daily limit (10,000 units)
- Wait until tomorrow (resets at midnight Pacific Time)
- Implement caching to reduce API calls

### Videos still not loading beyond 200:
- Check browser console for error messages
- Make sure Netlify environment variables are set
- Verify the function deployed: https://QuizSongPlayer.com/.netlify/functions/youtube-playlist
- Check Netlify function logs in dashboard

## Next Steps

Once the API key is set up, the frontend code will automatically:
1. Call the Netlify function to fetch all 946 videos
2. Cache the data for 24 hours
3. Display all videos with real titles in the playlist dropdown
4. Allow clicking any video to play it

The changes are ready to deploy - you just need to add the API key!
