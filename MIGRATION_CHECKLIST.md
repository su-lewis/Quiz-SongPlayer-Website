# Migration Checklist

## ✅ Completed Steps

- [x] Updated `package.json` to use Firebase instead of Supabase
- [x] Updated `netlify/functions/package.json` to use firebase-admin
- [x] Created new `js/firebaseclient.js` file
- [x] Updated `netlify/functions/posts.js` to use Firebase Firestore
- [x] Updated `script.js` to handle username field correctly
- [x] Added Firebase SDK scripts to `index.html` and `create.html`
- [x] Created `FIREBASE_SETUP.md` with detailed setup instructions

## 📋 Next Steps (You Need to Do These)

1. **Create Firebase Project**
   - [ ] Go to Firebase Console and create a new project
   - [ ] Enable Firestore Database
   - [ ] Set up Firestore security rules

2. **Configure Client-Side Firebase**
   - [ ] Get your Firebase web config from Firebase Console
   - [ ] Update `js/firebaseclient.js` with your actual config values
   
3. **Configure Server-Side Firebase (Netlify Functions)**
   - [ ] Generate a Firebase service account key
   - [ ] Add environment variables to Netlify:
     - `FIREBASE_PROJECT_ID`
     - `FIREBASE_CLIENT_EMAIL`
     - `FIREBASE_PRIVATE_KEY`

4. **Install Dependencies**
   - [ ] Run `npm install` in root directory
   - [ ] Run `npm install` in `netlify/functions` directory

5. **Update .gitignore**
   - [ ] Make sure sensitive files are not committed (see below)

6. **Deploy**
   - [ ] Commit and push changes
   - [ ] Verify Netlify deployment succeeds
   - [ ] Test creating and viewing posts

## 🔒 Security Checklist

- [ ] Never commit Firebase service account JSON files
- [ ] Never commit `.env` files with credentials
- [ ] Verify Firebase security rules are properly configured
- [ ] Keep your Firebase private key in Netlify environment variables only

## 🧪 Testing

After deployment, test these features:
- [ ] View posts on homepage
- [ ] Log in with Netlify Identity
- [ ] Create a new post
- [ ] Verify rate limiting (try creating 6 posts in an hour)
- [ ] Check that usernames display correctly

## 📚 Resources

- Full setup guide: See `FIREBASE_SETUP.md`
- Firebase Console: https://console.firebase.google.com/
- Netlify Dashboard: https://app.netlify.com/

---

**Current Status**: Code migration complete. Firebase setup required.
