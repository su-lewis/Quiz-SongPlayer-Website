# Environment Variables Setup

## Netlify Environment Variables

You need to add these environment variables in your Netlify dashboard:

**Go to:** Netlify Dashboard → Your Site → Site settings → Environment variables

### Required Variables

| Variable Name | Description | How to Get It |
|--------------|-------------|---------------|
| `FIREBASE_PROJECT_ID` | Your Firebase project ID | Firebase Console → Project Settings → General |
| `FIREBASE_CLIENT_EMAIL` | Service account email | Firebase Console → Project Settings → Service Accounts → Generate new private key (see email in JSON) |
| `FIREBASE_PRIVATE_KEY` | Service account private key | Same as above (copy the entire `private_key` value including quotes and `\n` characters) |

### Example Values (DO NOT USE THESE - GET YOUR OWN)

```
FIREBASE_PROJECT_ID=QuizSongPlayer-12345

FIREBASE_CLIENT_EMAIL=firebase-adminsdk-abc123@QuizSongPlayer-12345.iam.gserviceaccount.com

FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhki...(very long string)...==\n-----END PRIVATE KEY-----\n"
```

### Important Notes

1. **FIREBASE_PRIVATE_KEY** must include:
   - The quotes at the beginning and end
   - All `\n` characters (they represent newlines)
   - The entire key from `-----BEGIN PRIVATE KEY-----` to `-----END PRIVATE KEY-----`

2. Don't wrap the value in additional quotes in Netlify UI - paste it as-is

3. After adding variables, you need to trigger a new deployment for them to take effect

## Local Development (Optional)

If testing locally with `netlify dev`, create a `.env` file in the root directory:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-key-here\n-----END PRIVATE KEY-----\n"
```

**Important:** The `.env` file is in `.gitignore` - never commit it to git!

## Verifying Setup

After adding environment variables and deploying:

1. Check Netlify Function logs for "Firebase Admin initialized"
2. Try creating a post - if it works, the setup is correct
3. If you see "Server configuration error", check your environment variables

## Troubleshooting

### "Firebase Admin not initialized"
- Check that all three environment variables are set
- Check for typos in variable names
- Redeploy after adding variables

### "Error: Invalid PEM formatted message"
- Your private key is malformed
- Make sure you copied the entire key including `-----BEGIN/END-----`
- Make sure `\n` characters are present (don't remove them)

### "Error: Cannot find module 'firebase-admin'"
- Run `npm install` in `netlify/functions` directory
- Commit and push the updated `package-lock.json`
