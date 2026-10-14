# TaskFlow — React + FastAPI + SQL Server

## 1. Database (CMD)

You already have SQL Server Express at `localhost\SQLEXPRESS`. Connect with:

```bat
sqlcmd -S "localhost\SQLEXPRESS" -E -C
```

At the `1>` prompt type:

```sql
IF DB_ID('TodoDB') IS NULL CREATE DATABASE TodoDB;
GO
```

Type `EXIT` to leave sqlcmd. The Python backend will create the `todos` table automatically.

## 2. Backend (new CMD terminal)

From the extracted project folder:

```bat
cd backend
py -m venv .venv
.venv\Scripts\activate.bat
pip install -r requirements.txt
copy .env.example .env
python -m uvicorn main:app --reload
```

Backend: http://127.0.0.1:8000/docs

The local `.env` uses Windows integrated authentication and trusts the local SQL Server certificate. Do not use this trust setting as a production security default. The Windows account running Python must have permission to access `TodoDB`.

## 3. Frontend (another CMD terminal)

From the extracted project folder:

```bat
cd frontend
npm install
copy .env.example .env
npm run dev
```

Frontend: http://127.0.0.1:5173

## 4. Test

Add, edit, complete, search, filter, and delete a task. Refresh the page to verify data remains in SQL Server.

## Deployment

The frontend can be deployed as a Vite static build (`npm run build`, output `dist/`). The backend requires a Python host with the SQL Server ODBC driver and a database reachable by that host. **Localhost SQL Server Express on your laptop is not reachable from a cloud backend.** For a public deployment, first choose a hosted SQL Server-compatible database and configure secure credentials, TLS certificate validation, a production `CORS_ORIGINS`, and the frontend's `VITE_API_URL`. The sample backend currently uses Windows integrated authentication; it must be adapted to the hosting environment before public deployment. Do not expose your laptop SQL Server directly to the internet.
