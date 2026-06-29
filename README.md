# Rota MVP

Rota is a coordination-only MVP for ROSCA/tontine/susu/tanda groups. It does **not** hold money, move money, keep balances, process payments, provide credit, or act as a wallet. Members pay the current receiver outside the app, then Rota records proof, confirmation, and the group ledger.

## What this first version includes

- Email/password registration and login
- Create an invite-only contribution group
- Join a group using an invite code
- Fixed-rotation cycle creation
- Automatic contribution rows for every payer in a cycle
- Member flow: mark contribution as paid and upload proof
- Receiver/organizer flow: confirm contribution or open dispute
- Group ledger and audit log
- Basic trust score calculation
- Mobile-friendly React web app
- FastAPI backend with SQLite for local development

## What this version deliberately excludes

- In-app deposits
- Wallets or balances
- Escrow
- Bank or card payments
- Money transfer
- Lending or credit
- Payment fees
- Open marketplace for strangers

## Project structure

```txt
rota-mvp/
  backend/
    app/
      main.py
      models.py
      schemas.py
      auth.py
      database.py
    requirements.txt
    Dockerfile
  frontend/
    src/
      App.tsx
      api.ts
      main.tsx
      styles.css
    package.json
    Dockerfile
  docker-compose.yml
```

## Run locally without Docker

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will run at:

```txt
http://localhost:8000
```

API docs:

```txt
http://localhost:8000/docs
```

### 2. Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend will run at:

```txt
http://localhost:5173
```

## Run with Docker

```bash
docker compose up --build
```

Then open:

```txt
http://localhost:5173
```

## First manual test

1. Register user A.
2. Create a group.
3. Copy the invite code.
4. Register user B in another browser/incognito window.
5. Join the group using the invite code.
6. Log back in as user A.
7. Create the first cycle.
8. The app chooses the receiver by fixed rotation.
9. The payer marks their contribution as paid and uploads proof.
10. The receiver confirms receipt.
11. Check the ledger and audit log.

## Important next steps before real users

- Replace the default JWT secret.
- Move from SQLite to PostgreSQL.
- Add proper email/phone verification.
- Add stronger file validation and malware scanning for uploads.
- Add role-based approval for new members.
- Add overdue jobs and notification jobs.
- Add immutable/tamper-evident audit log hashing.
- Add legal review before adding any payment rails.
