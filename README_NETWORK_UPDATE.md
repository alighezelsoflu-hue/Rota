# Rota Trust Network Update

This package adds a graph-based Trust Network UI and backend endpoint.

## What is added

- Backend endpoint: `GET /network`
- New frontend route: `/network`
- Dashboard link: **Trust Network**
- Graph UI showing:
  - People nodes
  - Group nodes
  - Membership links
  - Organizer links
  - Shared-member links between groups
  - Node details panel
- Auth fixes:
  - `bcrypt==4.0.1`
  - Password max length validation for bcrypt
- Backend root route `/` so Render does not show 404 on the primary URL

## Files changed

```txt
backend/app/auth.py
backend/app/main.py
backend/app/schemas.py
backend/requirements.txt
frontend/src/api.ts
frontend/src/App.tsx
frontend/src/styles.css
```

## Apply locally

From your Downloads folder:

```bash
cd /Users/ali/Downloads
unzip -o rota-network-graph-ready.zip
```

Then copy into your GitHub repo folder. If your local repo is `/Users/ali/Downloads/Rota`, run:

```bash
cp -R /Users/ali/Downloads/rota-mvp/* /Users/ali/Downloads/Rota/
cp -R /Users/ali/Downloads/rota-mvp/.[!.]* /Users/ali/Downloads/Rota/
```

## Test locally

Backend:

```bash
cd /Users/ali/Downloads/Rota/backend
conda activate rota
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Frontend:

```bash
cd /Users/ali/Downloads/Rota/frontend
conda activate rota
npm install
npm run dev
```

Open:

```txt
http://localhost:5173/network
```

## Deploy

Push the files:

```bash
cd /Users/ali/Downloads/Rota
git add .
git commit -m "Add trust network graph UI"
git push
```

Then in Render:

1. Backend: **Manual Deploy → Clear build cache & deploy**
2. Frontend: **Manual Deploy → Clear build cache & deploy**

Keep your existing environment variables:

Backend:

```txt
DATABASE_URL=your_neon_connection_string
JWT_SECRET=your_long_secret
CORS_ORIGINS=http://localhost:5173,https://rota-frontend.onrender.com
UPLOAD_DIR=uploads
```

Frontend:

```txt
VITE_API_BASE=https://rota-18a2.onrender.com
```

Replace the URLs above with your actual Render URLs when different.
