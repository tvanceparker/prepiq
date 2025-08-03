# app/db/session.py

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from typing import AsyncGenerator
import os
import logging
from app.core.logging import logger

# Read environment variables or use defaults
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "root")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "prepiq")

# Async database URL using aiomysql
DATABASE_URL = f"mysql+aiomysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Create async engine
async_engine = create_async_engine(
    DATABASE_URL,
    echo=False,  # Enable SQL logging for debugging
    future=True,  # Use SQLAlchemy 2.0 style
    pool_pre_ping=True,
)

# Async session maker
AsyncSessionLocal = sessionmaker(
    bind=async_engine,
    expire_on_commit=False,
    class_=AsyncSession,
)

# Base class for models
Base = declarative_base()


# Dependency for getting DB session in async context
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error(f"Database session error:{e}", exc_info=True)
            raise
        finally:
            await session.close()
