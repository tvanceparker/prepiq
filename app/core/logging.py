import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path


LOG_DIR = Path(__file__).resolve().parent.parent.parent / "logs"
LOG_DIR.mkdir(exist_ok=True)

def setup_logger():
    logger = logging.getLogger("app")
    logger.setLevel(logging.INFO)

    ch = logging.StreamHandler()
    ch.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
    logger.addHandler(ch)

    fh = RotatingFileHandler(LOG_DIR / "app.log", maxBytes=10_000_000, backupCount=5)
    fh.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
    logger.addHandler(fh)

    return logger

logger = setup_logger()
