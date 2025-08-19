"""
Apply migration 0002: add latitude/longitude to restaurants table if missing.

Run this inside the project's venv (so python has DB deps installed):
    source .venv/bin/activate && python scripts/apply_migration_0002.py

It uses DB_USER/DB_PASSWORD/DB_HOST/DB_PORT/DB_NAME env vars (same as app/db/session.py)
"""
import os
import pymysql

DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "root")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_NAME = os.getenv("DB_NAME", "prepiq")

conn = None
try:
    conn = pymysql.connect(host=DB_HOST, user=DB_USER, password=DB_PASSWORD, port=DB_PORT, database=DB_NAME)
    cursor = conn.cursor()
    sql = """
    ALTER TABLE restaurants
      ADD COLUMN IF NOT EXISTS latitude DECIMAL(9,6) NULL,
      ADD COLUMN IF NOT EXISTS longitude DECIMAL(9,6) NULL;
    """
    cursor.execute(sql)
    conn.commit()
    print("Migration applied: latitude/longitude columns ensured.")
except Exception as e:
    print("Failed to apply migration:", e)
finally:
    if conn:
        conn.close()
