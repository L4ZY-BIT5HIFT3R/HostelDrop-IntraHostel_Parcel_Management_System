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