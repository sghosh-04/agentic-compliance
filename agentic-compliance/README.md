# AegisComply — Agentic Compliance System

A multi-agent AI compliance platform built with **FastAPI** (backend) and **React + Vite** (frontend).  
Uses Google Gemini for AI agents, SQLite as a local database fallback, and Tailwind CSS v4 for UI.

---

## Project Structure

```
agentic-compliance/
├── backend/          # FastAPI Python backend
│   ├── app/
│   │   ├── agents/   # AI compliance agents (orchestrator, gap analysis, etc.)
│   │   ├── api/      # REST API route handlers
│   │   ├── database/ # SQLAlchemy models, CRUD, seed data
│   │   ├── parsers/  # PDF parsing, OCR, text cleaning
│   │   ├── rag/      # RAG pipeline (chunking, embeddings, vector store)
│   │   └── main.py   # FastAPI app entry point
│   ├── .env          # Environment variables (API keys, DB URL, JWT secret)
│   └── requirements.txt
└── frontend/         # React + Vite frontend
    ├── src/
    │   ├── components/  # Sidebar, Navbar
    │   ├── pages/       # All page components
    │   └── services/    # API fetch utility
    ├── index.html
    └── package.json
```

---

## Prerequisites

Make sure the following are installed before you begin:

| Tool | Version | Download |
|------|---------|----------|
| Python | 3.11 or 3.12 (NOT 3.13/3.14) | https://www.python.org/downloads/ |
| Node.js | 18+ | https://nodejs.org/ |
| npm | comes with Node.js | — |
| Git | any | https://git-scm.com/ |

> **Important:** Use Python 3.11 or 3.12. Python 3.13 and 3.14 cannot build `pydantic-core` from source and will fail during `pip install`.

---

## Step 1 — Clone / Open the Project

```cmd
cd C:\path\to\where\you\want\it
```

If you are opening an existing folder, just `cd` into `agentic-compliance`.

---

## Step 2 — Backend Setup

### 2a. Create a virtual environment

Open a terminal (Command Prompt or PowerShell) inside the `backend` folder:

```cmd
cd agentic-compliance\backend
python -m venv venv
```

### 2b. Activate the virtual environment

**Command Prompt:**
```cmd
venv\Scripts\activate.bat
```

**PowerShell:**
```powershell
venv\Scripts\Activate.ps1
```

> If PowerShell blocks activation with a script execution error, run this first:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

You should see `(venv)` appear at the start of your prompt.

### 2c. Install Python dependencies

```cmd
pip install -r requirements.txt
```

> `psycopg2-binary` may fail if PostgreSQL is not installed — that is fine. The app automatically falls back to SQLite. If it errors, install without it:
> ```cmd
> pip install fastapi uvicorn sqlalchemy python-dotenv python-multipart pydantic email-validator pdfplumber jinja2 "bcrypt>=4.0.1" "python-jose[cryptography]" cryptography google-generativeai chromadb sentence-transformers
> ```

### 2d. Configure environment variables

The `.env` file is already present at `backend/.env`. Open it and set your Google Gemini API key:

```
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash
```

Everything else can stay as-is for a local SQLite run. The full `.env` looks like this:

```env
# Database — SQLite fallback is automatic if PostgreSQL is not running
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/compliance

# Vector store path
CHROMA_DB_PATH=../chroma_db

# Google Gemini
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.0-flash

# JWT Auth
JWT_SECRET=compliance_system_super_secret_token_key_987654321
JWT_ALGORITHM=HS256
JWT_EXPIRY_MINUTES=1440

# Storage directories
UPLOAD_DIR=./app/storage/uploads
EVIDENCE_DIR=./app/storage/evidence
REPORTS_DIR=./app/storage/generated_reports
```

### 2e. Run the backend server

```cmd
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

You should see:

```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Application startup complete.
Seeded default users (username: officer / admin, password: password123)
```

Backend is live at: **http://localhost:8000**  
API docs (Swagger UI): **http://localhost:8000/docs**

---

## Step 3 — Frontend Setup

Open a **second terminal** (keep the backend terminal running).

### 3a. Navigate to the frontend folder

```cmd
cd agentic-compliance\frontend
```

### 3b. Install Node dependencies

```cmd
npm install
```

> If you are moving this project from another machine (macOS/Linux → Windows), delete `node_modules` and `package-lock.json` first, then run `npm install` fresh. Native binaries are OS-specific.
> ```cmd
> rmdir /s /q node_modules
> del package-lock.json
> npm install
> ```

### 3c. Run the frontend dev server

```cmd
npm run dev
```

You should see:

```
  VITE v8.x.x  ready in Xms
  ➜  Local:   http://localhost:5173/
```

Frontend is live at: **http://localhost:5173**

---

## Step 4 — Login

Open **http://localhost:5173** in your browser.

Two default accounts are seeded automatically on first run:

| Username | Password | Role |
|----------|----------|------|
| `officer` | `password123` | Compliance Officer |
| `admin` | `password123` | Admin |

---

## Running Commands Summary

Every time you want to run the project, open **two terminals**:

**Terminal 1 — Backend:**
```cmd
cd agentic-compliance\backend
venv\Scripts\activate.bat
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 — Frontend:**
```cmd
cd agentic-compliance\frontend
npm run dev
```

---

## Known Issues & Fixes

### White screen on frontend
Caused by an invalid lucide-react icon import. Already fixed in `Sidebar.jsx` (`GitCompare2` → `GitCompareArrows`). If it happens again after a dependency update, check that all icon names in `src/components/Sidebar.jsx` are valid exports from the installed `lucide-react` version.

### PostCSS @import error in CSS
Google Fonts `@import` must come before `@import "tailwindcss"` in any `.css` file, or better — load fonts via `<link>` tags in `index.html` (already done).

### psycopg2 install failure
PostgreSQL client libraries are not required. The app auto-detects the missing module and falls back to SQLite (`compliance.db` in the backend folder). You can safely ignore the `psycopg2` install error or skip it.

### Python 3.13 / 3.14 pydantic-core build failure
`pydantic-core` cannot build from source on Python 3.13+. Use **Python 3.11 or 3.12** to avoid this entirely.

### PowerShell script execution blocked
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### ChromaDB readonly database warning
The vector store falls back to an in-memory NumPy store automatically. This does not affect core functionality — AI features still work via mock embeddings if the SentenceTransformer model also fails to load.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, Tailwind CSS v4 |
| Backend | FastAPI, Uvicorn, SQLAlchemy |
| Database | PostgreSQL (primary), SQLite (auto-fallback) |
| AI / LLM | Google Gemini 2.0 Flash |
| Embeddings | sentence-transformers / NumPy fallback |
| Vector Store | ChromaDB / NumPy fallback |
| Auth | JWT (python-jose) + bcrypt |
| PDF Parsing | pdfplumber |
