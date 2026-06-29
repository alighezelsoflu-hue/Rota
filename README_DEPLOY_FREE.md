# Rota MVP: Free Test Deployment

This setup is for testing the MVP with friends. It keeps Rota as a coordination-only app: members pay each other outside the app, and Rota stores group records, contribution status, proof references, and confirmations.

## Recommended free stack

- Backend server: Render free web service
- Frontend: Render free static site
- Database: Neon free Postgres

Notes:
- Free Render web services may sleep when inactive, so the first request can be slow.
- Uploaded proof files are saved on the backend filesystem. On free deployments, local uploads may not be permanent after restarts/redeploys. For friend testing, use payment reference numbers/notes, or later add S3/Supabase Storage for permanent files.

## 1. Create a free Postgres database on Neon

1. Go to Neon and create a free project.
2. Copy the connection string.
3. Use the pooled connection string if Neon offers one.
4. Make sure the URL starts with `postgresql://` or `postgres://`. The backend accepts both.

Example shape:

```txt
postgresql://user:password@host.neon.tech/dbname?sslmode=require
```

## 2. Push this project to GitHub

From the project root:

```bash
git init
git add .
git commit -m "Prepare Rota MVP for free deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/rota-mvp.git
git push -u origin main
```

## 3. Deploy backend on Render

Option A: Use `render.yaml` as a Render Blueprint.

Option B: Create the services manually. For the backend:

- Service type: Web Service
- Environment: Docker
- Root directory: `backend`
- Plan: Free
- Health check path: `/health`

Set environment variables:

```txt
DATABASE_URL=your Neon Postgres URL
JWT_SECRET=generate a long random string
CORS_ORIGINS=http://localhost:5173,https://YOUR-FRONTEND-URL.onrender.com
UPLOAD_DIR=uploads
```

After deploy, test:

```txt
https://YOUR-BACKEND-URL.onrender.com/health
https://YOUR-BACKEND-URL.onrender.com/docs
```

## 4. Deploy frontend on Render

Create a Static Site:

- Root directory: `frontend`
- Build command: `npm install && npm run build`
- Publish directory: `dist`

Set environment variable:

```txt
VITE_API_BASE=https://YOUR-BACKEND-URL.onrender.com
```

After deploy, open your frontend URL and create a test account.

## 5. Update backend CORS after frontend URL is known

Go back to the backend service environment variables and set:

```txt
CORS_ORIGINS=http://localhost:5173,https://YOUR-FRONTEND-URL.onrender.com
```

Redeploy the backend.

## 6. Local development still works

Backend:

```bash
conda activate rota
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Frontend:

```bash
conda activate rota
cd frontend
npm install
npm run dev
```

Open:

```txt
http://localhost:5173
```

## 7. What to change later before real users

Before a public launch, add:

- Real email verification
- Password reset
- Permanent file storage for proof uploads
- Database migrations with Alembic
- Better logging and error tracking
- Legal review before adding any payment rails
