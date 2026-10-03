# Astha Residency – Maintenance

Mobile-friendly web app to track building maintenance (income) and bills (expenses), wing by wing.
Gujarati / English, light / dark theme. Everyone can **view** without logging in; admins log in from the menu.
See **[PLAN.md](PLAN.md)** for features, roles and data model.

- **Website:** GitHub Pages (built automatically by GitHub Actions)
- **Database & login:** Firebase (Cloud Firestore + Authentication)

## Try it now (demo, no Firebase needed)
```bash
npm install
npm run demo
```
Log in with **admin** or **a101**, password **demo123** (sample data only, resets on reload).

## Run locally with real data
1. Copy `.env.example` to `.env` and fill in the Firebase web app settings and `SUPER_ADMIN_EMAIL`.
2. `npm install` then `npm run dev`

## Deploy

### Website → GitHub Pages
1. GitHub repo → **Settings → Pages → Source: GitHub Actions**.
2. GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `FIREBASE_CONFIG`
   - Value: the Firebase web config as one line of JSON:
     `{"apiKey":"…","authDomain":"…","projectId":"…","storageBucket":"…","messagingSenderId":"…","appId":"…"}`
3. Push to `main` (or run the workflow from the **Actions** tab). The site goes live at `https://<user>.github.io/<repo>/`.

### Database security rules → Firebase
```bash
firebase login
npm run deploy:rules
```
This fills in the Main Admin email from your local `.env` and deploys `firestore.rules`.

### Firebase one-time setup (Console)
1. **Authentication → Sign-in method → Email/Password → Enable**
2. **Authentication → Users → Add user**: the `SUPER_ADMIN_EMAIL` from `.env` + a strong password.
   Log in to the app with the part before `@` as the username. Do this right after step 1.
3. **Authentication → Settings → Authorized domains → Add**: `<user>.github.io`

## What is kept out of git
- `.env`, `.firebaserc`, generated rules, any `*.secret.*` file (see `.gitignore`).
- The Main Admin email is never in the code or the repo; it only goes into the deployed security rules.
- The Firebase *web* config ends up inside the public website (that is how Firebase web apps work and is safe).
  Data is protected by the security rules: anyone can read maintenance data, only admins can change it,
  and residents' phone numbers are readable only by logged-in admins.

## Passwords
- Every user can change their own password (menu → **Change password**).
- If a user was created with a real email, the Main Admin can send a reset link (Users → open user).
- If a username-only user forgets their password: delete their login in Firebase Console → Authentication, then add them again in **Users**.
