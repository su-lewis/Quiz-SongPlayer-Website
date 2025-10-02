# 🔑 Your Firebase Environment Variables for Netlify

## ✅ What You've Done So Far

1. ✅ Created Firebase project: `QuizSongPlayer`
2. ✅ Downloaded service account key
3. ✅ Updated `js/firebaseclient.js` with web config

## 🚀 Next Step: Add to Netlify

Go to: **Netlify Dashboard → Your Site → Site settings → Environment variables**

Click "**Add a variable**" and add these **3 variables**:

---

### Variable 1: FIREBASE_PROJECT_ID

**Key:**
```
FIREBASE_PROJECT_ID
```

**Value:**
```
QuizSongPlayer
```

---

### Variable 2: FIREBASE_CLIENT_EMAIL

**Key:**
```
FIREBASE_CLIENT_EMAIL
```

**Value:**
```
firebase-adminsdk-fbsvc@QuizSongPlayer.iam.gserviceaccount.com
```

---

### Variable 3: FIREBASE_PRIVATE_KEY

**Key:**
```
FIREBASE_PRIVATE_KEY
```

**Value:** (Copy this EXACTLY, including quotes and all \n characters)
```
"-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC7ziBjxZZ6F1VO\nsv/h8zijN/dWjp5TSbezsvpPwc70IXNKFmb5xQ+o1JI/xjDMn73uJV9DY2R05n9e\n1TwCJKZzijkv7TSwRYryYZFpM0QLvc1Z2Tyz3K8T1mSb5mjyg8gCaSGRHLSmrxg3\nRFAgstbRXQT6oZ6kzFuGL5UlE/DYqrUrbl/E5E1BNzZXNk8ol7TDWAEOI6Vr/8T7\nNOv3mT8d13A9Byt6nGA6hUr4eoEZ8iANI/1Z1y79D8okiMAHsDvysXcV+gqPm/fY\nhS5nK0h0FEKtfYcEQoZw784OssErQitnAYJusYXFcGH/Fs6/tr3dr5K3zUpvpp/z\nngQ/49UrAgMBAAECggEAD2viKf8wF49x8FfvfhjQRkrSsxdb9d/gR0/DkSgLe+2B\nP4yuYQUm/4iRB86Y9DyLxpHoDCsNtTG2NM3SsyRaTLOFdaOHR5A2VCfh3l8Yz9QC\nmEWn3+cXs0vQECMv6/YZRuVmHbnbNbK8DNG9uKmmzSNTxNbfpY2oWFDw8M394XSi\nwa00OtRX8kApqsImLfkG7j1n/0tW3Mhvi9tpAVSiThTfnCiNVnIGAbKd2/NM7Z5j\nwoFVXHvZq39X5L06HDquiDyBiO1pCZbfIfvcqwT0Ve7Fe35hkwGS2/XrBr27OvBy\ng39KaaRk9AZlaOZL/N9Kjqmf7B+YQQYwcIv7KdTKuQKBgQD5zy060lJrkqVBnJW5\nzHjWeq0uQKDxrvdC0Iau58Y3I/nm1enckbPmZ5FVfg1jmpRBqJr+3jjSm2j/ctV0\n0tQiS6YRAQ/p4XcSwlNmHcPmX0vWu5dAJav9BjxLY+yaQDlYGlVaKGhlAwZvZU2U\nSTbEzMgMd0JNf2d6AgrphHlScwKBgQDAdZZrLwEoy48hI8Q9igQjaioiYOQwrRtU\nptdkuVvKH9Frw9JKOWdfROz8tKsnHE9dk76Kd6kCYrKL/hGiDF0NEvTEIaqBAqIp\nMMlbsG96HA5aqg0LIF7u9EL1oxpaW3t++8/pJt/l0tUyvD2vnuXM+HHOtrsQUVcs\nSHc32qXsaQKBgFdeXzpIXu0in8ufwTn3Snfw9erMTb3ZbL8ggUpg45FbcsaKID21\nc87sgAb/jB0+7gU8u+DRxdva4NEez4sJRYotHQqrbW5mHagg8NwxItfKkpKqj06v\nHkTjTmkrrI+SULwAkcNziHdzpGeHbaekJ5SS7pB1kWnbWkxwtHJRk8EDAoGAS033\nNCspLfgwIcxn3ZhiNCU3JUp6Ht2s4vuBLgUk+Dpo69ysLKS3YNyMSfi7O0tldnz3\nwiA9/hP2PraD2b8yrYnsQc3WdDI+lxVixECN7d6Kc0k0X1UkMCVdCdXu2soO0Ung\nOR8f3kIXb4meLVhkHEZd6X8wRJs/G7GjDDS+VXkCgYAq2q0znodF4101rS0GqLkL\nA7LKOzHHilVvXilrNWFAD5Ac5Kip0/ixOQX/GRQTQRylxclgf/HKFGmuGH7GXGAH\nTzh1rZLg5UkG/Hq1YWvnqSbf2LqOilqcQAufWGsbAMkdmm9gvjIxsNe6ZR7IKkav\nFPs7km/SBQOX8e7dFNEJQA==\n-----END PRIVATE KEY-----\n"
```

⚠️ **IMPORTANT for FIREBASE_PRIVATE_KEY:**
- Include the double quotes at the start and end
- Keep all the `\n` characters (they represent line breaks)
- Copy the ENTIRE value exactly as shown above

---

## 📋 Step-by-Step in Netlify

1. Log in to Netlify: https://app.netlify.com/
2. Click on your site
3. Go to **Site settings** (in the top navigation)
4. Click **Environment variables** (in the left sidebar)
5. Click **Add a variable**
6. For each variable:
   - Enter the **Key** (e.g., `FIREBASE_PROJECT_ID`)
   - Paste the **Value**
   - Click **Create variable** or **Add**
7. Repeat for all 3 variables

## ✅ After Adding Variables

Once all 3 variables are added:

```powershell
git add .
git commit -m "Migrate from Supabase to Firebase"
git push
```

Netlify will automatically redeploy with your new Firebase configuration!

## 🧪 Test After Deployment

1. Visit your deployed site
2. Log in with Netlify Identity
3. Try creating a post
4. Check if it appears on the homepage

## 🔐 Security Note

⚠️ **DO NOT commit the service account JSON file to git!**

The file `QuizSongPlayer-firebase-adminsdk-fbsvc-365d032f1c.json` contains sensitive credentials.

- Keep it in a secure location on your computer
- Don't add it to your repository
- It's already in `.gitignore` as `firebase-adminsdk-*.json`

---

## 🎉 You're Almost Done!

1. Add the 3 environment variables to Netlify ← **Do this now**
2. Run `git push` ← **Then do this**
3. Test your site ← **Finally verify it works**

Good luck! 🚀
