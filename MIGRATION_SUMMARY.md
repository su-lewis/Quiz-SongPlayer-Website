# Migration Summary: Supabase → Firebase

## What Was Changed

### 1. Dependencies Updated

**Root `package.json`:**
- Removed: `@supabase/supabase-js`
- Added: `firebase@^10.7.1`

**`netlify/functions/package.json`:**
- Removed: `@supabase/supabase-js`
- Added: `firebase-admin@^12.0.0`

### 2. New Files Created

- **`js/firebaseclient.js`**: Firebase client configuration (replaces `js/supabaseclient.js`)
- **`FIREBASE_SETUP.md`**: Complete setup guide with step-by-step instructions
- **`MIGRATION_CHECKLIST.md`**: Checklist of completed and pending tasks
- **`ENV_VARIABLES.md`**: Environment variables reference guide

### 3. Files Modified

**`netlify/functions/posts.js`:**
- Replaced Supabase client with Firebase Admin SDK
- Updated query logic for Firestore
- Usernames now stored directly in posts (no separate profiles table needed)
- Rate limiting updated to use Firestore queries
- Timestamps converted to ISO strings for JSON responses

**`script.js`:**
- Updated to read `username` directly from post object (instead of `post.profiles?.username`)

**`index.html` & `create.html`:**
- Added Firebase SDK scripts
- Added `js/firebaseclient.js` reference

**`.gitignore`:**
- Added Firebase service account files
- Added environment variables files
- Added comprehensive ignore patterns

### 4. Files Unchanged (Still Work)

- All authentication logic (Netlify Identity)
- UI components and styling
- Form validation
- Character counting
- Music player
- Rate limiting logic (5 posts/hour)

## Why Firebase?

**Pros:**
- ✅ Generous free tier (50K reads, 20K writes per day)
- ✅ No credit card required
- ✅ Simple setup and configuration
- ✅ Real-time capabilities (if needed in future)
- ✅ Google Cloud infrastructure
- ✅ Good documentation

**Free Tier Limits:**
- 1 GiB storage
- 50,000 document reads/day
- 20,000 document writes/day
- 20,000 document deletes/day
- Perfect for personal blogs and small projects

## Data Structure Comparison

### Old (Supabase)
```
posts table:
- id
- title
- content
- created_at
- user_id

profiles table:
- id (references user_id)
- username
```

### New (Firebase)
```
posts collection:
{
  id: "auto-generated"
  title: "string"
  content: "string"
  created_at: Timestamp
  user_id: "string"
  username: "string"  // Now stored directly in post
}
```

**Benefit:** Simpler data structure, no need for joins/relationships

## What You Need to Do

1. **Create Firebase Project** (5 minutes)
   - Go to Firebase Console
   - Create new project
   - Enable Firestore

2. **Configure Client** (2 minutes)
   - Get Firebase web config
   - Update `js/firebaseclient.js`

3. **Configure Server** (5 minutes)
   - Generate service account key
   - Add 3 environment variables to Netlify

4. **Deploy** (1 minute)
   - Commit and push
   - Netlify auto-deploys

**Total time: ~15 minutes**

Detailed instructions are in `FIREBASE_SETUP.md`

## Testing Plan

After setup:
1. Visit your site
2. Log in with Netlify Identity
3. Create a test post
4. Verify it appears on homepage
5. Check username displays correctly
6. Test rate limiting (optional)

## Rollback Plan

If you need to rollback to Supabase:
1. Revert commit: `git revert HEAD`
2. Push: `git push`
3. Netlify will auto-deploy previous version

## Support

- Firebase issues: Check `FIREBASE_SETUP.md` troubleshooting section
- Environment variables: See `ENV_VARIABLES.md`
- Progress tracking: Use `MIGRATION_CHECKLIST.md`

---

**Status**: ✅ Code migration complete. Firebase setup required to go live.
