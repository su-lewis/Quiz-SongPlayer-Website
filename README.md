# Quiz SongPlayer Website

A Netlify-hosted personal website that combines a blog with a YouTube-based music player and on-page translation.

## What this project does

- Serves a multi-page website (`/`, `/create`, `/posts`, and `darkasadungeon.html`)
- Shows a mini music player with:
  - YouTube iframe playback controls (play/pause, next/previous, shuffle, seek, volume)
  - Playlist dropdown loaded from YouTube Data API
  - Persistent playback state via `localStorage`/`sessionStorage`
- Displays recent posts in the sidebar and full posts on `/posts`
- Allows authenticated users to create posts on `/create`
- Supports UI translation using DeepL through serverless functions
- Supports theme and UI utilities:
  - Dark mode toggle
  - Random navigation link
  - Optional ANSI art video playback

## Tech stack

### Frontend

- **Core:** HTML, CSS, JavaScript (ES modules)
- **UI assets:** Bootstrap Icons, Google Fonts
- **Client integrations:**
  - Netlify Identity widget (authentication UI)
  - Firebase client SDK (config fetched from serverless endpoint)
  - YouTube Iframe API

### Backend

- **Platform:** Netlify Functions (`netlify/functions`)
- **Runtime:** Node.js serverless functions
- **Function bundling:** Netlify `esbuild` bundler (`netlify.toml`)

### Database / Data services

- **Primary database:** Google Firestore (via Firebase Admin SDK in functions)
  - `posts` collection for user posts
  - `translations` collection for translation cache
- **External APIs:**
  - DeepL API for text translation
  - YouTube Data API v3 for playlist retrieval

### Language / code type

- Frontend and backend are written in **JavaScript**
- Serverless function modules are a mix of ESM (`export const handler`) and CommonJS (`exports.handler`)

## Repository structure

- `/index.html` – home page
- `/create.html` – post creation page
- `/posts.html` – full post listing page
- `/darkasadungeon.html` – media page
- `/css/styles.css` – site styles
- `/js/*.js` – frontend modules (auth, posts, translation, music player, UI)
- `/_includes/*.js` – injected shared layout fragments (header, footer, sidebar, head title helper)
- `/netlify/functions/*.js` – serverless backend endpoints
- `/netlify.toml` – Netlify build/function/redirect config
- `/build.sh` – installs function dependencies during Netlify build

## Serverless API endpoints

Functions are exposed under `/.netlify/functions/*`, with a friendly redirect from `/api/*`.

- `posts` (`GET`, `POST`)
  - `GET`: returns posts, optionally translated via `?lang=`
  - `POST`: creates posts for authenticated Netlify Identity users
  - Includes server-side rate limiting (max 5 posts/hour per user)
- `translate` (`POST`)
  - Translates text through DeepL
  - Uses Firestore caching
- `youtube-playlist` (`GET`)
  - Fetches playlist items from YouTube Data API (paged)
- `playlist` (`GET`)
  - Alias to `youtube-playlist`
- `firebase-config` (`GET`)
  - Returns public Firebase config values for client initialization
- `ping` (`GET`)
  - Health/debug endpoint with environment and outbound probe information

## Authentication and authorization

- Netlify Identity is used for login/signup/logout UI.
- Post creation requires authenticated identity context in the serverless function.
- Displayed username is derived from user metadata, then email fallback.

## Local development

### Prerequisites

- Node.js and npm
- Netlify CLI (recommended for local functions):
  - `npm i -g netlify-cli`

### Install dependencies

Project root dependencies:

```bash
npm install
```

Function dependencies:

```bash
cd netlify/functions
npm install
```

### Run locally

From repo root:

```bash
netlify dev
```

This runs the static site and Netlify Functions together.

## Required environment variables

Set these in Netlify (or local env for `netlify dev`):

### Firebase Admin (server-side)

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

### Firebase Public config (client-side, served by `firebase-config`)

- `PUBLIC_FIREBASE_API_KEY`
- `PUBLIC_FIREBASE_AUTH_DOMAIN`
- `PUBLIC_FIREBASE_PROJECT_ID`
- `PUBLIC_FIREBASE_STORAGE_BUCKET`
- `PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `PUBLIC_FIREBASE_APP_ID`
- `PUBLIC_FIREBASE_MEASUREMENT_ID` (optional depending on setup)

### Translation

- `DEEPL_API_KEY`

### YouTube playlist

- `YOUTUBE_API_KEY`
- `YOUTUBE_PLAYLIST_ID` (optional; defaults in code if omitted)

## Build and deployment

- Netlify build command: `chmod +x build.sh && ./build.sh`
- `build.sh` installs function dependencies with `npm ci` inside `netlify/functions`
- Publish directory is repository root (`.`)

## Notes

- There are no automated tests currently configured (`npm test` is a placeholder).
- Translation and playlist responses are cached (Firestore and browser local cache) to reduce repeated API calls.
