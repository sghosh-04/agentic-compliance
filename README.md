# AegisComply — Agentic Compliance System

A multi-agent AI compliance platform built with **FastAPI** (backend) and **React 19 + Vite 8** (frontend).
Uses Google Gemini for AI agents, SQLite as a local database fallback, and Tailwind CSS v4 for UI.

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [All 15 Platform Modules](#all-15-platform-modules)
3. [Prerequisites](#prerequisites)
4. [Windows-Specific Requirements](#windows-specific-requirements)
5. [Option A — Run Locally (Manual)](#option-a--run-locally-manual)
   - [macOS / Linux](#macos--linux)
   - [Windows](#windows)
6. [Option B — Run with Docker Compose](#option-b--run-with-docker-compose)
7. [Default Login Credentials](#default-login-credentials)
8. [Environment Variables Reference](#environment-variables-reference)
9. [REST API Quick Reference](#rest-api-quick-reference)
10. [Agent Pipeline — How PDF Ingestion Works](#agent-pipeline--how-pdf-ingestion-works)
11. [Database Tables](#database-tables)
12. [Running Tests](#running-tests)
13. [Additional Documentation](#additional-documentation)
14. [Troubleshooting](#troubleshooting)
15. [Tech Stack](#tech-stack)

---

## Project Structure

```
agentic-compliance/                  <- workspace root
├── README.md                        <- you are here
├── .venv/                           <- auto-created venv (macOS, ignore on Windows)
├── chroma_db/                       <- ChromaDB vector store (auto-created on first run)
└── agentic-compliance/              <- actual project source
    ├── docker-compose.yml           <- Docker full-stack setup
    ├── compliance.db                <- SQLite database (auto-created on first run)
    ├── .gitignore
    ├── LICENSE
    ├── app/                         <- shared storage
    │   └── storage/
    │       ├── uploads/             <- uploaded PDF regulations (auto-created)
    │       └── generated_reports/   <- compiled audit report files (auto-created)
    ├── postgres/
    │   ├── init.sql                 <- PostgreSQL schema (used by Docker)
    │   └── seed.sql                 <- PostgreSQL seed data (used by Docker)
    ├── docs/
    │   ├── api_documentation.md     <- Full API reference with request/response examples
    │   ├── architecture.md          <- Agent pipeline and RAG system architecture
    │   └── database_schema.md       <- All tables, columns, and relationships
    ├── backend/
    │   ├── app/
    │   │   ├── agents/              <- Multi-agent AI compliance orchestrators
    │   │   │   ├── orchestrator.py
    │   │   │   ├── document_reader.py
    │   │   │   ├── regulation_interpreter.py
    │   │   │   ├── applicability_agent.py
    │   │   │   ├── obligation_extractor.py
    │   │   │   ├── task_planner.py
    │   │   │   ├── gap_analysis.py
    │   │   │   ├── evidence_matcher.py
    │   │   │   ├── conflict_detector.py
    │   │   │   ├── diff_engine.py
    │   │   │   └── report_generator.py
    │   │   ├── api/                 <- FastAPI route handlers
    │   │   │   ├── auth.py
    │   │   │   ├── upload.py
    │   │   │   ├── regulations.py
    │   │   │   ├── obligations.py
    │   │   │   ├── compliance.py
    │   │   │   ├── evidence.py
    │   │   │   ├── reports.py
    │   │   │   ├── analytics.py
    │   │   │   ├── chat.py
    │   │   │   ├── conflicts.py
    │   │   │   ├── diff.py
    │   │   │   ├── regulator_sim.py
    │   │   │   ├── reg_feed.py
    │   │   │   └── export.py
    │   │   ├── database/
    │   │   │   ├── models.py
    │   │   │   ├── schemas.py
    │   │   │   ├── crud.py
    │   │   │   ├── connection.py    <- DB engine with Postgres + SQLite auto-fallback
    │   │   │   └── seed_data.py
    │   │   ├── parsers/             <- PDF parser, OCR fallback, text cleaner
    │   │   ├── rag/                 <- Chunking, embeddings, vector store
    │   │   │   ├── chunking.py
    │   │   │   ├── embeddings.py    <- SentenceTransformer; caches model in app/storage/.cache
    │   │   │   ├── vector_store.py  <- ChromaDB with NumPy JSON fallback
    │   │   │   ├── pipeline.py
    │   │   │   ├── retriever.py
    │   │   │   └── prompt_templates.py
    │   │   ├── services/
    │   │   │   └── ai_service.py    <- Google Gemini client with multi-model fallback
    │   │   ├── config.py            <- Storage directory auto-creation
    │   │   ├── main.py              <- FastAPI app entry point
    │   │   └── main_deps.py         <- Shared dependency injection
    │   ├── tests/
    │   │   └── test_ai_service.py
    │   ├── .env                     <- Environment config (edit this before running)
    │   └── requirements.txt
    └── frontend/
        ├── src/
        │   ├── components/
        │   │   ├── Sidebar.jsx
        │   │   └── Navbar.jsx
        │   ├── pages/               <- 15 page modules
        │   ├── services/
        │   │   └── api.js           <- Fetch wrapper; auto-proxies /api to localhost:8000
        │   ├── App.jsx
        │   └── index.css
        ├── index.html               <- Google Fonts loaded here as <link> tag
        ├── vite.config.js           <- Vite proxy: /api -> http://localhost:8000
        └── package.json
```

---

## All 15 Platform Modules

| # | Module | Page ID | Description |
|---|--------|---------|-------------|
| 1 | Dashboard | `dashboard` | KPI overview, compliance posture %, real-time charts |
| 2 | AI Compliance Chat | `chat` | RAG copilot with session history and evidence citations |
| 3 | Upload Regulations | `upload` | Upload PDFs, auto-parse and extract obligations |
| 4 | Regulations Catalog | `regulations` | Browse all regulations, gazette links, obligation counts |
| 5 | Obligations Matrix | `obligations` | Filter statutory mandates by risk level and category |
| 6 | Compliance Tasks | `tasks` | Kanban board (Pending → In Progress → Review → Done) |
| 7 | Gap Analysis | `gap` | Compare internal controls vs statutory requirements |
| 8 | Evidence Repository | `evidence` | Upload and tag audit proof (policies, logs, sign-offs) |
| 9 | Report Builder | `reports` | Live Markdown report preview + JSON audit package export |
| 10 | Analytics Insights | `analytics` | Compliance velocity, drift tracking, risk breakdowns |
| 11 | Conflict Detector | `conflicts` | Contradiction and overlap detection across regulations |
| 12 | Regulation Diff | `diff` | Semantic version comparison (obligations, deadlines, penalties) |
| 13 | Ask the Regulator | `regulator` | Simulated regulatory examination of internal SOPs |
| 14 | Regulatory Feed | `feed` | Live SEBI & RBI announcement stream with keyword search |
| 15 | Settings & Config | `settings` | API key management, environment status |

---

## Prerequisites

| Tool | Required Version | Download |
|------|-----------------|----------|
| Python | **3.11 or 3.12** — do NOT use 3.13/3.14 | https://www.python.org/downloads/ |
| Node.js | 18.x or 20.x+ | https://nodejs.org/ |
| npm | 9.x+ (bundled with Node.js) | — |
| Git | Any | https://git-scm.com/ |
| Docker + Docker Compose | Only for Option B | https://www.docker.com/products/docker-desktop/ |

> **Critical Python note:** `pydantic-core` has no pre-built wheels for Python 3.13 or 3.14.
> Always use Python **3.11 or 3.12**.

---

## Windows-Specific Requirements

Windows needs a few extra tools before `pip install` will succeed. Install all of these first.

### 1. Microsoft C++ Build Tools (REQUIRED)

Several Python packages (`cryptography`, `chromadb`, `pdfplumber`) compile C/C++ extensions during install.
Without Build Tools, `pip install` will fail with errors like `cl.exe not found` or `Microsoft Visual C++ 14.0 required`.

**Install steps:**
1. Go to https://visualstudio.microsoft.com/visual-cpp-build-tools/
2. Download and run `vs_BuildTools.exe`
3. In the installer, check **"Desktop development with C++"**
4. Click Install (downloads ~3–4 GB)
5. Restart your machine after install

### 2. Rust + Cargo (REQUIRED for cryptography package)

The `cryptography==42.0.5` package requires Rust to build on Windows.

```cmd
winget install Rustlang.Rustup
```

Or download from https://rustup.rs/ and run the installer.
After install, restart your terminal (Rust adds itself to PATH).

Verify:
```cmd
rustc --version
cargo --version
```

### 3. Python added to PATH (REQUIRED)

During Python install, check the box **"Add Python to PATH"** on the first screen.
If you missed it, re-run the Python installer → Modify → check "Add Python to environment variables".

Verify:
```cmd
python --version
pip --version
```

### 4. Node.js added to PATH

The Node.js installer does this automatically. Verify:
```cmd
node --version
npm --version
```

### 5. Windows Defender Firewall

When you first run `uvicorn`, Windows Firewall may pop up asking to allow access.
Click **"Allow access"** for both Private and Public networks.
Port 8000 (backend) and port 5173 (frontend) must be open for the app to work.

### 6. Edit .env with VS Code or Notepad++ only

Do NOT edit `backend\.env` with Windows Notepad.
Notepad saves files with a BOM (byte-order mark) which breaks `python-dotenv` — the API key will not load.
Use **VS Code**, **Notepad++**, or any code editor instead.

### 7. PyTorch for sentence-transformers on Windows

`sentence-transformers` depends on PyTorch. On Windows, install the CPU-only version explicitly
to avoid a massive CUDA download (~2 GB+):

```cmd
pip install torch --index-url https://download.pytorch.org/whl/cpu
```

Run this BEFORE `pip install -r requirements.txt` to ensure the CPU wheel is used.

### 8. Long Path support (optional but recommended)

Some ChromaDB and HuggingFace cache paths exceed the default 260-character Windows path limit.
Enable long paths to prevent obscure file-not-found errors:

Run as Administrator in PowerShell:
```powershell
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```

Or: Settings → System → For Developers → Enable "Long Paths".

---

## Option A — Run Locally (Manual)

The app auto-falls back to **SQLite** if PostgreSQL is not running.
Storage directories (`uploads/`, `generated_reports/`, `storage/.cache/`) are auto-created on first run.

### macOS / Linux

**Terminal 1 — Backend:**
```bash
cd agentic-compliance/backend

# Use python3.11 or python3.12 explicitly
python3.11 -m venv venv_mac
source venv_mac/bin/activate

pip install -r requirements.txt

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd agentic-compliance/frontend
npm install
npm run dev
```

---

### Windows

Follow these steps exactly in order.

**Step 1 — Open Command Prompt or PowerShell as normal user (not Admin)**

**Step 2 — Backend setup:**

```cmd
cd agentic-compliance\backend

python -m venv venv
venv\Scripts\activate.bat
```

PowerShell users:
```powershell
venv\Scripts\Activate.ps1
```

If PowerShell blocks activation:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Step 3 — Install PyTorch CPU version first (prevents 2 GB CUDA download):**
```cmd
pip install torch --index-url https://download.pytorch.org/whl/cpu
```

**Step 4 — Install all other dependencies:**
```cmd
pip install -r requirements.txt
```

If `psycopg2-binary` fails (no PostgreSQL installed), that is fine — skip it:
```cmd
pip install fastapi uvicorn sqlalchemy python-dotenv python-multipart pydantic email-validator pdfplumber jinja2 "bcrypt>=4.0.1" "python-jose[cryptography]" cryptography google-generativeai chromadb sentence-transformers watchfiles
```

**Step 5 — Set your Gemini API key in .env:**

Open `backend\.env` in VS Code or Notepad++ and set:
```
GEMINI_API_KEY=your_actual_key_here
GEMINI_MODEL=gemini-3.7-flash
```

Get a free key at: https://aistudio.google.com/app/apikey

**Step 6 — Start the backend:**
```cmd
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
Seeded default users (username: officer / admin, password: password123)
```

**Step 7 — Open a second terminal for the frontend:**
```cmd
cd agentic-compliance\frontend
npm install
npm run dev
```

You should see:
```
VITE v8.x.x  ready in Xms
  Local:   http://localhost:5173/
```

**URLs once running:**
| Service | URL |
|---------|-----|
| Frontend app | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Swagger API docs | http://localhost:8000/docs |

> The frontend Vite dev server automatically proxies all `/api/*` requests to `http://localhost:8000`.
> You do not need to configure the backend URL anywhere in the frontend.

---

## Option B — Run with Docker Compose

Requires Docker Desktop installed and running. This is the easiest way to run everything
including PostgreSQL without any manual setup.

```bash
cd agentic-compliance

# Set your Gemini API key first
# macOS / Linux:
export GEMINI_API_KEY=your_actual_key_here

# Windows Command Prompt:
set GEMINI_API_KEY=your_actual_key_here

# Windows PowerShell:
$env:GEMINI_API_KEY="your_actual_key_here"

# Build and start all containers
docker-compose up --build
```

To stop:
```bash
docker-compose down
```

Full reset (deletes all data):
```bash
docker-compose down -v
```

**Containers started:**
| Container | Port | Description |
|-----------|------|-------------|
| `compliance-postgres` | 5432 | PostgreSQL 15 (initialized from `postgres/init.sql` + `postgres/seed.sql`) |
| `compliance-backend` | 8000 | FastAPI backend |
| `compliance-frontend` | 5173 | React + Vite frontend |

---

## Default Login Credentials

Seeded automatically on first run (both SQLite and PostgreSQL):

| Username | Password | Role |
|----------|----------|------|
| `officer` | `password123` | Compliance_Officer |
| `admin` | `password123` | Admin |

A third role **`Auditor`** can be registered via `POST /api/auth/register`:
```json
{
  "username": "auditor1",
  "email": "auditor@firm.com",
  "password": "password123",
  "role": "Auditor"
}
```

---

## Environment Variables Reference

File: `backend/.env`

```env
# Database — auto SQLite fallback if PostgreSQL is unavailable
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/compliance
# Uncomment to force SQLite:
# DATABASE_URL=sqlite:///./compliance.db

# Vector store directory
CHROMA_DB_PATH=../chroma_db

# Google Gemini (required for all AI features)
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-3.7-flash

# JWT Authentication
JWT_SECRET=compliance_system_super_secret_token_key_987654321
JWT_ALGORITHM=HS256
JWT_EXPIRY_MINUTES=1440

# Storage directories (auto-created by config.py on startup)
UPLOAD_DIR=./app/storage/uploads
EVIDENCE_DIR=./app/storage/evidence
REPORTS_DIR=./app/storage/generated_reports
```

> The AI service also accepts `GOOGLE_API_KEY` as a fallback if `GEMINI_API_KEY` is not set.
>
> The Gemini API key can be updated live without restarting via `POST /api/settings/config`.

---

## REST API Quick Reference

Full request/response examples in `docs/api_documentation.md`.

All protected endpoints require header:
```
Authorization: Bearer <token_from_login>
```

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | No | Register new user |
| `POST` | `/api/auth/login` | No | Login, returns JWT token |
| `GET` | `/api/auth/me` | Yes | Get current user profile |
| `POST` | `/api/upload` | Yes | Upload PDF and trigger agent pipeline |
| `GET` | `/api/regulations` | Yes | List all regulations |
| `GET` | `/api/obligations` | Yes | List extracted obligations |
| `GET` | `/api/compliance/tasks` | Yes | Get Kanban tasks |
| `POST` | `/api/compliance/tasks` | Yes | Create new task |
| `GET` | `/api/evidence` | Yes | List evidence files |
| `POST` | `/api/chat` | Yes | RAG chatbot query |
| `GET` | `/api/conflicts/analyze` | Yes | Detect regulation conflicts |
| `GET` | `/api/diff/compare` | Yes | Semantic regulation diff |
| `POST` | `/api/regulator/simulate` | Yes | Regulatory exam simulation |
| `GET` | `/api/feed/regulatory` | Yes | Live SEBI/RBI feed |
| `GET` | `/api/analytics/dashboard` | Yes | Compliance metrics |
| `GET` | `/api/export/audit-package/{id}` | Yes | Download JSON audit bundle |
| `GET` | `/api/reports` | Yes | List compiled reports |
| `GET` | `/api/health` | No | Server health check |
| `POST` | `/api/settings/config` | Yes | Update Gemini API key live |

---

## Agent Pipeline — How PDF Ingestion Works

When a PDF is uploaded, the backend runs an async multi-agent pipeline:

1. **DocumentReaderAgent** — parses PDF page-by-page, cleans layout noise, runs OCR fallback if text is empty
2. **RAGPipeline** — splits text into overlapping chunks (800 chars, 150 overlap), computes embeddings via SentenceTransformer (`all-MiniLM-L6-v2`), stores in ChromaDB (or NumPy JSON fallback). Model is cached at `backend/app/storage/.cache/`
3. **RegulationInterpreterAgent** — generates executive summary, affected actors, and timelines via Gemini
4. **ApplicabilityAgent** — screens relevance; halts pipeline if non-applicable
5. **ObligationExtractorAgent** — scans for statutory directives, deadlines, and penalty clauses
6. **TaskPlannerAgent** — creates Kanban tasks mapped to each obligation
7. **GapAnalysisAgent** — compares obligations against existing tasks to flag control gaps
8. **ReportGeneratorAgent** — compiles findings into a Markdown audit report saved to `app/storage/generated_reports/`

Full diagram in `docs/architecture.md`.

---

## Database Tables

| Table | Description |
|-------|-------------|
| `users` | Accounts with roles: `Admin`, `Compliance_Officer`, `Auditor` |
| `regulations` | Ingested documents. Status: `Pending`, `Processing`, `Processed`, `Error` |
| `obligations` | Extracted mandates. Risk level: `High`, `Medium`, `Low` |
| `compliance_tasks` | Kanban tasks. Status: `Pending`, `In_Progress`, `Under_Review`, `Completed` |
| `evidence` | Audit proof files. Status: `Pending_Review`, `Approved`, `Rejected` |
| `gap_analyses` | Gap findings per regulation. Status: `Identified`, `Mitigated`, `In_Progress` |
| `audit_logs` | Immutable log of all user actions with timestamps |

Full schema in `docs/database_schema.md`.

---

## Running Tests

```bash
# macOS / Linux
cd agentic-compliance/backend
source venv_mac/bin/activate
python -m pytest tests/ -v
```

```cmd
rem Windows
cd agentic-compliance\backend
venv\Scripts\activate.bat
python -m pytest tests\ -v
```

Current test: `tests/test_ai_service.py` — verifies the AI service returns a valid non-empty response in mock/fallback mode (no Gemini key needed to run tests).

---

## Additional Documentation

| File | Contents |
|------|----------|
| `docs/api_documentation.md` | Every endpoint with full request payloads and response schemas |
| `docs/architecture.md` | Agent pipeline diagram, RAG flow, async ingestion sequence |
| `docs/database_schema.md` | All tables, column types, foreign key relationships, ER diagram |

---

## Troubleshooting

### `cl.exe not found` or `Microsoft Visual C++ 14.0 required`
Install Microsoft C++ Build Tools — see [Windows-Specific Requirements](#windows-specific-requirements) above.

### `cargo not found` or Rust build error during cryptography install
Install Rust from https://rustup.rs/ then restart terminal.

### `pip install` fails for `psycopg2-binary`
No PostgreSQL on your machine. Fine — app auto-falls back to SQLite. Install without it:
```cmd
pip install fastapi uvicorn sqlalchemy python-dotenv python-multipart pydantic email-validator pdfplumber jinja2 "bcrypt>=4.0.1" "python-jose[cryptography]" cryptography google-generativeai chromadb sentence-transformers watchfiles
```

### `pydantic-core` build fails
You are on Python 3.13 or 3.14. Use Python 3.11 or 3.12.

### SentenceTransformer downloading 400 MB+ CUDA PyTorch on Windows
Install CPU-only PyTorch first:
```cmd
pip install torch --index-url https://download.pytorch.org/whl/cpu
```

### White screen on frontend
An invalid lucide-react icon name crashes the React tree. Check icon imports in `src/components/Sidebar.jsx`.
Known bad name: `GitCompare2` — correct name is `GitCompareArrows`.

### PostCSS `@import` error in terminal
Google Fonts `@import` must come before `@import "tailwindcss"` in CSS files,
or load fonts via `<link>` in `index.html` (already done in this project).

### PowerShell script execution blocked
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### ChromaDB readonly database warning
Auto-falls back to NumPy JSON vector store. All AI features continue to work.

### `node_modules` native binding error after copying from another OS
```cmd
rmdir /s /q node_modules
del package-lock.json
npm install
```

### Gemini API returns errors / 404 model not found
Check `GEMINI_API_KEY` in `backend\.env`. Model: `gemini-3.7-flash`.
The service tries multiple fallback model names automatically.
Update key live: `POST /api/settings/config` with `{ "gemini_api_key": "new_key" }`.

### `.env` values not loading (API key is empty)
You edited `backend\.env` with Windows Notepad which added a BOM.
Open the file in VS Code, re-save it as UTF-8 without BOM (bottom-right in VS Code: click "UTF-8 with BOM" → save with encoding → UTF-8).

### Windows Firewall popup on first run
Click "Allow access" for both private and public networks when prompted for port 8000 and 5173.

### SentenceTransformer fails to load (JSON decode error)
Network issue during HuggingFace model download. App falls back to mock embeddings automatically.
Retry when you have a stable internet connection — model is cached after first successful download at `backend/app/storage/.cache/`.

### Frontend shows 401 / not loading data
Backend must be running on port 8000 before opening the frontend.
All frontend API calls proxy through Vite to `http://localhost:8000` automatically.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, Tailwind CSS v4 |
| Backend | FastAPI, Uvicorn, SQLAlchemy 2.0 |
| Database | PostgreSQL 15 (primary), SQLite (auto-fallback) |
| AI / LLM | Google Gemini 3.7 Flash (multi-model fallback chain) |
| Embeddings | sentence-transformers all-MiniLM-L6-v2 / NumPy mock fallback |
| Vector Store | ChromaDB / NumPy JSON file fallback |
| Auth | JWT via python-jose + bcrypt |
| PDF Parsing | pdfplumber + OCR fallback |
| Containerization | Docker Compose |
| Testing | Python unittest / pytest |
