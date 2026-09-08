import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("database")

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/compliance")

engine = None

# If running locally without docker-compose active, try Postgres first, then fallback to SQLite
if DATABASE_URL.startswith("postgresql"):
    try:
        logger.info(f"Attempting connection to PostgreSQL at {DATABASE_URL}...")
        # Check connection with a short timeout (3 seconds)
        engine = create_engine(DATABASE_URL, connect_args={"connect_timeout": 3})
        # Force a test connection
        with engine.connect() as conn:
            logger.info("Successfully connected to PostgreSQL database!")
    except Exception as e:
        logger.warning(f"PostgreSQL connection failed: {e}. Falling back to SQLite compliance.db")
        DATABASE_URL = "sqlite:///./compliance.db"
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    logger.info("Using configured database (non-postgresql)")
    # SQLite need check_same_thread = False
    connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
    engine = create_engine(DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
