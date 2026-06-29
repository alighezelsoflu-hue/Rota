# Rota complete replacement files

This package restores the full backend and frontend code.

## Apply to your project

From the folder that contains your current `backend` and `frontend` folders, run:

```bash
unzip -o ~/Downloads/rota-complete-ready-paste.zip
```

If the zip creates a `rota-mvp` folder, copy the content inside it into your project root, or run:

```bash
cd ~/Downloads
unzip -o rota-complete-ready-paste.zip
cd rota-mvp
cp -R . /path/to/your/Rota/project/
```

## Required backend files

- backend/app/__init__.py
- backend/app/auth.py
- backend/app/database.py
- backend/app/main.py
- backend/app/models.py
- backend/app/schemas.py
- backend/requirements.txt
- backend/Dockerfile
- backend/.env.example

## Required frontend files

- frontend/index.html
- frontend/package.json
- frontend/tsconfig.json
- frontend/vite.config.ts
- frontend/src/api.ts
- frontend/src/main.tsx
- frontend/src/App.tsx
- frontend/src/styles.css
- frontend/.env.example

## After copying

```bash
git add .
git commit -m "Restore complete Rota MVP app"
git push
```

Then on Render: Manual Deploy -> Clear build cache & deploy.
