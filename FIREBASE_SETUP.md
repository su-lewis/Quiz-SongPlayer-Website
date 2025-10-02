# Firebase Setup Guide

Your application has been migrated from Supabase to Firebase Firestore. Follow these steps to complete the setup.

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter a project name (e.g., "QuizSongPlayer")
4. Follow the setup wizard (you can disable Google Analytics if you don't need it)

## 2. Enable Firestore Database

1. In your Firebase project, click "Firestore Database" in the left sidebar
2. Click "Create database"
3. Start in **production mode** (we'll configure rules later)
4. Choose a location (preferably closest to your users)

## 3. Get Firebase Configuration

### For Client-Side (Web App):

1. In Firebase Console, go to Project Settings (gear icon)
2. Scroll down to "Your apps" section
3. Click the Web icon (`</>`)
4. Register your app (e.g., "QuizSongPlayer Web")
5. Copy the `firebaseConfig` object

### Update `js/firebaseclient.js`:

Replace the placeholder values with your actual Firebase config:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_ACTUAL_API_KEY",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};
```

## 4. Setup Firebase Admin (for Netlify Functions)

### Generate Service Account Key:

1. In Firebase Console, go to Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save the JSON file securely (DON'T commit this to git!)

### Add Environment Variables to Netlify:

Go to your Netlify site dashboard → Site settings → Environment variables

Add these three variables:

- `FIREBASE_PROJECT_ID`: Your project ID (e.g., "QuizSongPlayer-12345")
- `FIREBASE_CLIENT_EMAIL`: The client_email from your service account JSON
- `FIREBASE_PRIVATE_KEY`: The entire private_key value from the JSON (including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` parts)

**Important:** For the private key, copy it exactly as it appears in the JSON file, with all the `\n` characters intact.

## 5. Configure Firestore Security Rules

In Firebase Console → Firestore Database → Rules, add these rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /posts/{postId} {
      // Allow anyone to read posts
      allow read: if true;
      
      // Allow authenticated users to create posts
      // (Authentication is handled by Netlify Functions)
      allow write: if false; // All writes go through Netlify Functions
    }
  }
}
```

Click "Publish" to apply the rules.

## 6. Update HTML Files

Add Firebase SDK before your scripts in all HTML files that need it (index.html, create.html, etc.):

Add these lines in the `<head>` section or before the closing `</body>` tag:

```html
<!-- Firebase SDK -->
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js"></script>
<!-- Your Firebase Client Config -->
<script src="js/firebaseclient.js"></script>
```

**Note:** Currently, your app doesn't use the client-side Firebase directly (all database operations go through Netlify Functions), but this setup is here for future enhancements.

## 7. Install Dependencies

Run these commands in your terminal:

```powershell
# Install client dependencies
npm install

# Install Netlify function dependencies
cd netlify/functions
npm install
cd ../..
```

## 8. Test Locally (Optional)

To test Netlify Functions locally:

1. Install Netlify CLI: `npm install -g netlify-cli`
2. Set environment variables in a `.env` file (DON'T commit this):
   ```
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=your-client-email
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```
3. Run: `netlify dev`

## 9. Deploy

1. Commit your changes to git
2. Push to your repository
3. Netlify will automatically deploy

## 10. Verify Everything Works

1. Visit your deployed site
2. Log in using Netlify Identity
3. Try creating a post
4. Check that posts appear on the home page

## Migration Notes

### What Changed:

- **Database**: Supabase → Firebase Firestore
- **Client File**: `js/supabaseclient.js` → `js/firebaseclient.js` (but currently unused)
- **Function Dependencies**: `@supabase/supabase-js` → `firebase-admin`
- **Data Structure**: Username is now stored directly in posts (no separate profiles table)

### Data Structure in Firestore:

Collection: `posts`

Document structure:
```json
{
  "id": "auto-generated-by-firestore",
  "title": "Post Title",
  "content": "Post content...",
  "user_id": "netlify-user-id",
  "username": "user123",
  "created_at": "Firestore Timestamp"
}
```

### Rate Limiting:

- Still limited to 5 posts per hour per user
- Implemented in the Netlify Function

## Troubleshooting

### Common Issues:

1. **"Firebase Admin not initialized"**: Check your environment variables in Netlify
2. **Private key errors**: Make sure the key includes `\n` characters and quotes are correct
3. **Permission denied**: Check your Firestore security rules
4. **Posts not showing**: Check browser console and Netlify Function logs

### Firebase Free Tier Limits:

- 50K reads/day
- 20K writes/day
- 1 GiB storage
- These limits should be more than enough for a personal blog

## Need Help?

- Firebase Documentation: https://firebase.google.com/docs/firestore
- Netlify Functions: https://docs.netlify.com/functions/overview/

---

Your migration from Supabase to Firebase is complete! 🎉
