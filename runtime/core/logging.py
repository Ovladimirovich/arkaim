from pathlib import Path
from observability.logging import setup_logger

LOG_DIR = Path(__file__).resolve().parent.parent / "logs"
log = setup_logger("hermes.core", log_file=str(LOG_DIR / "core.log"))
