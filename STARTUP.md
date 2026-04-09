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