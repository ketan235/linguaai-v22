# 🌐 LinguaAI v2 — Setup Guide

Multilingual AI chat app with voice, file translation, Google Sign-In, and password reset.

---

## What's New in This Update

| Feature | Status |
|---|---|
| 🔊 TTS speaks in ALL 37 languages | ✅ Fixed |
| 🔑 Forgot Password flow | ✅ Added |
| 🔒 Reset Password via email link | ✅ Added |
| 👁 Show/hide password toggle | ✅ Added |
| 🗄️ MongoDB user + conversation storage | ✅ Working |
| 🔐 Google Sign-In (OAuth 2.0) | ✅ Working (needs keys) |

---

## Quick Start

```bash
# 1. Install backend deps
cd backend && npm install

# 2. Fill in backend/.env with your real keys (see sections below)

# 3. Start backend
npm run dev

# 4. In a new terminal — install and start frontend
cd frontend && npm install && npm run dev

# 5. Open http://localhost:5173
```

---

## 🗄️ MongoDB Setup

### Option A — MongoDB Atlas (Free Cloud, Recommended)

1. Sign up free at https://mongodb.com/atlas
2. Create a free M0 cluster (512MB, always free)
3. Database Access → Add user: username + password, role = "Read and write to any database"
4. Network Access → Add IP → Allow Access from Anywhere (0.0.0.0/0)
5. Connect → Drivers → copy the URI string
6. Replace <password> in the URI, paste into backend/.env:

```
MONGODB_URI=mongodb+srv://linguaai:yourpassword@cluster0.xxxxx.mongodb.net/linguaai
```

### Option B — Local MongoDB

```bash
# macOS
brew tap mongodb/brew && brew install mongodb-community && brew services start mongodb-community

# Ubuntu
sudo apt-get install -y mongodb && sudo systemctl start mongodb
```

Then set: MONGODB_URI=mongodb://localhost:27017/linguaai

---

## 🔐 Google OAuth Setup

Enables the "Continue with Google" button. Skip if you only want email/password — the button hides automatically when keys are missing.

1. Go to https://console.cloud.google.com
2. Create a new project → APIs & Services → OAuth consent screen
   - User Type: External → fill in App name + email → Save
3. APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
4. Application type: Web application
5. Authorized redirect URIs — add:
     http://localhost:5000/api/auth/google/callback
6. Copy Client ID and Client Secret → paste into backend/.env:

```
GOOGLE_CLIENT_ID=123456789-abc....apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxx
```

7. While in Google Cloud "Testing" mode, add your Gmail under OAuth consent screen → Test users.

---

## 📧 SMTP Setup (Forgot Password Emails)

### Option A — Gmail App Password (Easiest)

1. Enable 2-Step Verification: https://myaccount.google.com/security
2. Create App Password: https://myaccount.google.com/apppasswords
   → Select app: Mail → Other → name it "LinguaAI" → Generate
3. Copy the 16-char password → paste into backend/.env:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=youremail@gmail.com
SMTP_PASS=abcd efgh ijkl mnop
```

### Option B — Resend.com (Recommended for Production)

Free 100 emails/day, excellent deliverability.
Sign up at https://resend.com → create API key → use:

```
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=re_xxxxxxxxxxxxxxxxxxxx
```

---

## 🔊 TTS Fix Explained

The Web Speech API's SpeechSynthesisUtterance is used for text-to-speech.

Problem: The old code only set u.voice when a matching browser voice was found.
For Hindi, Tamil, Bengali, Marathi, etc., no named voice existed → silent failure.

Fix: Always set u.lang (e.g. "hi-IN", "ta-IN") regardless of whether a named voice
exists. The browser's built-in phoneme engine handles speech using u.lang alone.
Also fixed the voiceschanged event to use addEventListener instead of the
onvoiceschanged property assignment which could be overwritten.

Browser recommendation: Chrome or Edge for best multilingual voice coverage.
For richer voices, install the language pack in your OS settings.

---

## Full .env Reference

```
GROQ_API_KEY=your_groq_api_key_here
MONGODB_URI=mongodb://localhost:27017/linguaai
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password_here
PORT=5000
JWT_SECRET=change-this-long-random-string-in-production
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

---

## Troubleshooting

MongoDB won't connect:
  Atlas → check Network Access has 0.0.0.0/0 and password in URI is correct
  Local → run "mongosh" to verify MongoDB is running

Google button doesn't appear:
  Check GOOGLE_CLIENT_ID in .env is filled in (not the placeholder)
  Restart the backend after changing .env

Forgot password email not sending:
  Gmail → use App Password (not your real password), 2FA must be enabled
  Check backend logs for the exact SMTP error message

TTS not speaking in some languages:
  Use Chrome or Edge (best multilingual support)
  Install OS language packs:
    Windows: Settings → Time & Language → Language → Add a language → download Speech pack
    macOS: System Settings → Accessibility → Spoken Content → Manage Voices
