# Quick Start Guide 🚀

Your app has been migrated from Supabase to **Firebase Firestore** (free forever!).

## 3 Steps to Get Running

### Step 1: Create Firebase Project (5 min)

1. Go to https://console.firebase.google.com/
2. Click "Add project" → Name it → Continue
3. Disable Google Analytics (optional) → Create project
4. Click "Firestore Database" → Create database → Start in production mode
5. Choose a location → Enable

### Step 2: Get Your Keys (5 min)

**For Web (Client-Side):**
1. Project Settings → Your apps → Web icon (`</>`)
2. Register app → Copy the `firebaseConfig` object
3. Open `js/firebaseclient.js` → Replace the placeholder config

**For Server (Netlify Functions):**
1. Project Settings → Service Accounts → Generate new private key
2. Save the JSON file (don't commit it!)
3. Go to Netlify: Site settings → Environment variables → Add:
   - `FIREBASE_PROJECT_ID` = your project ID
   - `FIREBASE_CLIENT_EMAIL` = the client_email from JSON
   - `FIREBASE_PRIVATE_KEY` = the entire private_key value from JSON

### Step 3: Deploy (1 min)

```powershell
git add .
git commit -m "Migrate to Firebase"
git push
```

Netlify will auto-deploy. Done! 🎉

## Set Firestore Rules

In Firebase Console → Firestore → Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /posts/{postId} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

Click "Publish"

## Test It

1. Visit your site
2. Log in
3. Create a post
4. See it on the homepage

## Need More Help?

- **Full guide**: See `FIREBASE_SETUP.md`
- **Environment vars**: See `ENV_VARIABLES.md`
- **What changed**: See `MIGRATION_SUMMARY.md`

## Troubleshooting

**"Server configuration error"**
→ Check your Netlify environment variables

**Posts not showing**
→ Check browser console for errors

**Firebase not initialized**
→ Update `js/firebaseclient.js` with your config

---

**Firebase Free Tier:** 50K reads & 20K writes per day - plenty for a personal blog!
