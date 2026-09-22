from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os

# Import connection database components to auto-generate tables on startup
from .database.connection import engine, Base
from .database.connection import SessionLocal
from .database import models
from .api import auth, upload, regulations, obligations, compliance, evidence, reports, analytics, chat
from .api import conflicts, diff, regulator_sim, reg_feed, export, reminders
from .main_deps import get_ai_service

# Automatically create tables (safe for both Postgres and SQLite fallback)
Base.metadata.create_all(bind=engine)

# Auto seed default users on start if SQLite is used and tables are empty
def seed_sqlite_defaults():
    db = SessionLocal()
    try:
        from .api.auth import get_password_hash
        hashed = get_password_hash("password123")
        defaults = [
            ("officer", "officer@compliance.com", "Compliance_Officer"),
            ("admin", "admin@compliance.com", "Admin"),
        ]
        seeded = False
        for username, email, role in defaults:
            user = db.query(models.User).filter(models.User.username == username).first()
            if user is None:
                db.add(models.User(
                    username=username,
                    email=email,
                    password_hash=hashed,
                    role=role,
                ))
                seeded = True
            else:
                # Ensure default credentials work after auth library upgrades
                user.password_hash = hashed
                seeded = True
        if seeded:
            db.commit()
            print("Seeded default users (username: officer / admin, password: password123)")
    except Exception as e:
        print(f"Failed default seeding: {e}")
    finally:
        db.close()

seed_sqlite_defaults()

from .database.seed_data import seed_demo_data
seed_demo_data()

app = FastAPI(
    title="Agentic Compliance System API", 
    description="Backend services powering multi-agent regulatory parsing, RAG query pipelines, and gap analysis logs.",
    version="1.0.0"
)

# CORS configurations for cross-origin frontend queries
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth.router, prefix="/api")
app.include_router(upload.router, prefix="/api")
app.include_router(regulations.router, prefix="/api")
app.include_router(obligations.router, prefix="/api")
app.include_router(compliance.router, prefix="/api")
app.include_router(evidence.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(conflicts.router, prefix="/api")
app.include_router(diff.router, prefix="/api")
app.include_router(regulator_sim.router, prefix="/api")
app.include_router(reg_feed.router, prefix="/api")
app.include_router(export.router, prefix="/api")
app.include_router(reminders.router, prefix="/api")

# Dynamic Settings Override schema
class SettingsUpdate(BaseModel):
    gemini_api_key: str

@app.post("/api/settings/config", tags=["settings"])
def update_settings(settings: SettingsUpdate):
    """
    Updates the active Google Gemini API Key dynamically on the server instance.
    """
    ai = get_ai_service()
    success = ai.update_api_key(settings.gemini_api_key)
    return {
        "success": success, 
        "mode": "Live (Gemini API Enabled)" if success else "Mock (Simulated Compliance Mode)"
    }

@app.get("/api/health", tags=["health"])
def health_check():
    """
    Standard server health status checklist.
    """
    ai = get_ai_service()
    return {
        "status": "healthy",
        "api_mode": "Live" if ai.enabled else "Mock",
        "gemini_model": ai.model_name,
        "database": engine.name
    }
