# AegisComply — Multi-Agent AI Compliance Platform

A modern, multi-agent AI compliance and regulatory intelligence platform built with **FastAPI** (Python backend) and **React + Vite** (Tailwind CSS UI).  
AegisComply automates regulatory tracking (SEBI & RBI), document ingestion, compliance obligation extraction, gap analysis, evidence audits, and regulatory inspection simulations using Google Gemini and RAG.

---

## Key Features

- **Live Regulatory Intelligence Feed:** Real-time synchronization with official **SEBI** (`sebirss.xml`) and **RBI** (`notifications_rss.xml`, `pressreleases_rss.xml`) RSS feeds, featuring auto-refresh, smart XML cleaning, and an official fallback catalog.
- **Automated Obligation Extraction:** Ingests regulatory PDFs, circulars, and directives to parse compliance requirements into an interactive obligation matrix.
- **AI Gap Analysis & Checklist Generation:** Evaluates organizational policies against regulations to identify compliance gaps, compute risk scores, and generate audit checklists.
- **RAG-Powered Compliance Assistant:** Context-aware Q&A agent over uploaded circulars using vector embeddings and Gemini 2.0.
- **Regulator Audit Simulator:** Simulates rigorous scrutiny from regulatory inspectors with simulated cross-examinations and risk assessments.
- **Evidence & Audit Vault:** Upload, track, and verify documentary evidence against regulatory obligations with status tracking.
- **Executive Reporting & PDF Export:** One-click compliance audit report generation with PDF downloading.

---

## Project Structure

```text
agentic-compliance/
├── backend/
│   ├── app/
│   │   ├── agents/          # Multi-agent engines (applicability, gap analysis, audit sim)
│   │   ├── api/             # REST endpoints (auth, reg_feed, chat, obligations, etc.)
│   │   ├── database/        # SQLAlchemy models, CRUD operations, seed data
│   │   ├── parsers/         # PDF text extraction, OCR, and metadata parsers
│   │   ├── rag/             # Vector retrieval, semantic chunking, prompt templates
│   │   ├── services/        # AI orchestration service (Gemini + local fallback)
│   │   ├── storage/         # File uploads, evidence docs, generated reports
│   │   └── main.py          # FastAPI application entrypoint
│   ├── .env                 # Environment configurations (API keys, DB, JWT)
│   ├── compliance.db        # Local SQLite database (automatic fallback)
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components (Sidebar, Navbar, Layout)
│   │   ├── pages/           # Pages (Dashboard, RegulatoryFeed, GapAnalysis, Chat, etc.)
│   │   └── services/        # API client & auth handlers
│   ├── index.html           # HTML entrypoint & typography configuration
│   ├── package.json         # Node scripts and dependencies
│   └── vite.config.js       # Vite configuration
└── README.md
```

---

## Prerequisites

| Tool | Recommended Version | Download / Notes |
|------|---------------------|------------------|
| **Python** | **3.10, 3.11, or 3.12** *(Avoid 3.13+)* | [python.org](https://www.python.org/downloads/) — *Python 3.13+ lacks prebuilt wheels for `pydantic-core`.* |
| **Node.js** | **18.x or 20.x+** | [nodejs.org](https://nodejs.org/) |
| **npm** | **9.x or 10.x+** | Included with Node.js |
| **Git** | Any recent version | [git-scm.com](https://git-scm.com/) |

---

## Quick Start Guide

Running the application requires two active terminal windows: one for the **FastAPI backend** and one for the **Vite frontend**.

### Step 1: Backend Setup

1. **Open a terminal** and navigate to the `backend` directory:
   ```cmd
   cd backend
   ```

2. **Create and activate a virtual environment:**
   - **Command Prompt (`cmd`):**
     ```cmd
     python -m venv .venv
     .venv\Scripts\activate.bat
     ```
   - **PowerShell:**
     ```powershell
     python -m venv .venv
     .\.venv\Scripts\Activate.ps1
     ```
     *(If blocked by execution policy, run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`)*
   - **macOS / Linux:**
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. **Install Python dependencies:**
   ```cmd
   pip install -r requirements.txt
   ```
   > **Note:** If `psycopg2-binary` fails to install because PostgreSQL development headers are missing, that is expected. AegisComply automatically detects this and falls back to local SQLite (`compliance.db`). You can install the remaining packages via:
   > ```cmd
   > pip install fastapi uvicorn sqlalchemy python-dotenv python-multipart pydantic email-validator pdfplumber jinja2 "bcrypt>=4.0.1" "python-jose[cryptography]" cryptography google-generativeai chromadb sentence-transformers
   > ```

4. **Configure Environment Variables:**
   A `.env` file is located in `backend/.env`. Add your Google Gemini API key:
   ```env
   # Database — SQLite fallback is automatic if PostgreSQL is not running
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/compliance

   # Vector Store
   CHROMA_DB_PATH=../chroma_db

   # AI / LLM Configuration
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-2.0-flash

   # Authentication
   JWT_SECRET=compliance_system_super_secret_token_key_987654321
   JWT_ALGORITHM=HS256
   JWT_EXPIRY_MINUTES=1440

   # Storage Directories
   UPLOAD_DIR=./app/storage/uploads
   EVIDENCE_DIR=./app/storage/evidence
   REPORTS_DIR=./app/storage/generated_reports
   ```

5. **Start the Backend Server:**
   ```cmd
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   - API Server: [http://localhost:8000](http://localhost:8000)
   - Swagger Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)
   - ReDoc Documentation: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

### Step 2: Frontend Setup

1. **Open a second terminal** and navigate to the `frontend` directory:
   ```cmd
   cd frontend
   ```

2. **Install Node dependencies:**
   ```cmd
   npm install
   ```

3. **Start the Vite Dev Server:**
   ```cmd
   npm run dev
   ```
   - Web App UI: [http://localhost:5173](http://localhost:5173)

---

## Default Login Credentials

On initial startup, default demo users are automatically seeded into the database:

| Username | Password | Role | Permissions |
|----------|----------|------|-------------|
| `officer` | `password123` | Compliance Officer | Gap Analysis, Evidence, Checklist Generation, Reports |
| `admin` | `password123` | Administrator | System Settings, User Management, Policy Configurations |

---

## Daily Operation Summary

Whenever you want to run AegisComply, open two terminals:

```text
Terminal 1 (Backend):
cd backend
.venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

Terminal 2 (Frontend):
cd frontend
npm run dev
```

---

## Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/feed/regulatory` | Fetches live SEBI & RBI announcements (supports `?refresh=true` to force sync). |
| `POST` | `/api/auth/token` | Authenticates user and returns JWT bearer token. |
| `POST` | `/api/upload/pdf` | Ingests regulatory PDF documents, extracts text, and indexes chunks into RAG. |
| `GET` | `/api/regulations/` | Lists all ingested regulatory frameworks and circulars. |
| `GET` | `/api/obligations/` | Returns parsed compliance obligations matrix. |
| `POST` | `/api/compliance/gap-analysis` | Runs AI gap analysis between organizational policies and regulations. |
| `POST` | `/api/chat/ask` | Queries RAG compliance assistant with source attribution. |
| `POST` | `/api/regulator-sim/simulate` | Simulates an adversarial regulatory compliance inspection audit. |
| `POST` | `/api/reports/generate` | Generates structured audit and compliance reports. |
| `POST` | `/api/settings/config` | Dynamically updates the active Gemini API key without server restart. |

---

## Troubleshooting & FAQ

### 1. Regulatory feed shows cached or fallback items
- Ensure your internet connection is active.
- Click the **Sync Live Feeds** icon in the UI or call `GET /api/feed/regulatory?refresh=true`.
- The live connectors query:
  - **SEBI:** `https://www.sebi.gov.in/sebirss.xml`
  - **RBI:** `https://rbi.org.in/notifications_rss.xml` & `https://rbi.org.in/pressreleases_rss.xml`
- If an authority portal is down, AegisComply automatically surfaces the latest cached items or official catalog fallback.

### 2. PowerShell script execution error when activating virtual environment
Run PowerShell as Administrator or execute for the current user:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 3. `pydantic-core` build failure during `pip install`
This occurs when running Python 3.13 or 3.14, as wheel binaries are not yet compiled for them. Install **Python 3.11 or 3.12** and recreate your `.venv`.

### 4. `psycopg2` build failure on Windows
If PostgreSQL is not installed locally, `psycopg2-binary` might fail. AegisComply seamlessly runs on SQLite (`backend/compliance.db`) out-of-the-box without requiring PostgreSQL.

### 5. Moving between operating systems (macOS/Linux/Windows)
Native Node packages are OS-specific. If transferring files across systems, delete existing builds before running:
```cmd
rmdir /s /q node_modules
del package-lock.json
npm install
```

### 6. ChromaDB SQLite warning
If ChromaDB reports a lock or read-only mode, the backend automatically falls back to an in-memory cosine similarity search so document RAG continues to function seamlessly.

---

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 19, Vite, Tailwind CSS v4, Lucide React, Recharts |
| **Backend** | FastAPI, Uvicorn, Pydantic v2, Python 3.10 - 3.12 |
| **Database** | PostgreSQL (Production) / SQLite (Local automatic fallback), SQLAlchemy ORM |
| **AI / Multi-Agent** | Google Gemini 2.0 Flash (`google-generativeai`), Jinja2 prompts |
| **RAG & Vector Search** | ChromaDB, Sentence-Transformers, NumPy vector fallback |
| **Document Parsing** | pdfplumber, regular expression extraction, ElementTree XML |
| **Authentication** | JWT (python-jose), Passlib / bcrypt |
