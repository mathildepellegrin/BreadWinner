import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

# Use the provided Neon DB URL as default, overridden by DATABASE_URL env var
NEON_DATABASE_URL = "postgresql://neondb_owner:npg_os1k6LFdgZVp@ep-spring-cell-aevjgnt8-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", NEON_DATABASE_URL)

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,  # Test connections before use
    poolclass=NullPool   # Recommended for serverless environments like Lambda
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency to get DB session in FastAPI routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()