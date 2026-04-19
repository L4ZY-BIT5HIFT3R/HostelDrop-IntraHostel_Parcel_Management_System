create envoiemenr: 
# From project root(in powerShell)
.\.venv\Scripts\Activate.ps1
.\.venv\Scripts\python.exe -m uvicorn backend.server:app --host 0.0.0.0 --port 8001 --reload 
   
uvicorn server:app --host 0.0.0.0 --port 8001  
npx cloudflared tunnel --url http://localhost:8001
npx expo start -c

:: From project root
.\.venv\Scripts\activate.bat
    python backend\seed_database.py
python backend\add_sample_parcels.py

## Android Maintenance Routine (Frontend)
- Open `document/ANDROID_DEPENDENCY_MAINTENANCE_PLAN.md` for weekly/monthly/quarterly schedule.
- Run from `frontend` directory:
    - `npm run deps:doctor`
    - `npm run deps:outdated`
    - `npm run maintenance:android`

## Environment Variable Security
- Never commit real secret values to Git (`.env`, `.env.local`, `.env.production`, etc.).
- Use committed templates only:
    - `backend/.env.example`
    - `frontend/.env.example`
- Local setup:
    - Copy `backend/.env.example` to `backend/.env` and fill values.
    - Copy `frontend/.env.example` to `frontend/.env` (only `EXPO_PUBLIC_*` values; no secrets).
- Production setup:
    - Do not rely on repository `.env` files.
    - Inject env vars from your deployment secret manager/CI/CD settings.
    - Keep `APP_ENV=production` and use a strong `JWT_SECRET_KEY` (at least `MIN_JWT_SECRET_LENGTH`).
- Before pushing code, verify no env files are tracked:
    - `git status --ignored`
    - `git ls-files | findstr /R "\\.env$ \\.env\\."`