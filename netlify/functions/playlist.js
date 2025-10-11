// FILE: netlify/functions/playlist.js
// Alias endpoint to avoid client-side blockers that match 'youtube' in paths
import { handler as youtubeHandler } from './youtube-playlist.js';
export const handler = (event, context) => youtubeHandler(event, context);
