# NepalBite — React + Firebase 🇳🇵

Nepal's Food-Tech Platform built with React 18 + Firebase 10.

## Run in VS Code

```bash
# 1. Open terminal in VS Code (Ctrl + `)
# 2. Install dependencies (first time only, ~2 mins)
npm install

# 3. Start development server
npm start
# Opens at http://localhost:3000
```

## Pages
| URL | Page |
|-----|------|
| `http://localhost:3000` | Customer site |
| `http://localhost:3000/admin` | Admin dashboard |
| `http://localhost:3000/table?table=3` | Table 3 QR ordering |

## Deploy to Vercel (GitHub)
1. Push this folder to GitHub
2. Go to vercel.com → Import project
3. Set Framework: **Create React App**
4. Build command: `npm run build`
5. Output directory: `build`
6. Deploy ✅

## Deploy to Netlify
```bash
npm run build
# Drag the build/ folder to app.netlify.com/drop
```

## Firebase Setup
Your project `nepalbite-30c26` is already connected in `src/firebase.js`.

### Create Admin Account
1. console.firebase.google.com → Authentication → Users → Add User
2. Email: admin@nepalbite.com | Password: Admin@123

### Firestore Rules
Paste in Firebase Console → Firestore → Rules → Publish:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /menu/{doc}     { allow read: if true; allow write: if request.auth != null; }
    match /orders/{doc}   { allow read, write: if request.auth != null; }
    match /stories/{doc}  { allow read: if true; allow write: if true; }
    match /feedback/{doc} { allow write: if true; allow read: if request.auth != null; }
    match /users/{doc}    { allow read, write: if request.auth != null; }
  }
}
```

## Edit Menu
Open `src/data/menu.js` — edit the MENU array.

## Tech Stack
- React 18, React Router v6
- Firebase 10 (Auth + Firestore + Storage)
- Pure CSS with variables (no Tailwind)
- Playfair Display + DM Sans fonts
