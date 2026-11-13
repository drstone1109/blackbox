import os
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

# Base directory of the repository (root)
BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """
    Application configuration for Blackbox ERP loaded securely from:
    1. System environment variables (Highest priority)
    2. Private git-ignored secrets files:
       - secrets/secrets.env
       - secrets/.env
    3. Root .env file (Default development values)
    """
    model_config = SettingsConfigDict(
        env_file=(
            str(BASE_DIR / ".env"),
            str(BASE_DIR / "secrets" / ".env"),
            str(BASE_DIR / "secrets" / "secrets.env")
        ),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False
    )

    # Server settings
    APP_NAME: str = "Blackbox ERP"
    APP_ENV: str = "development"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Database
    DATABASE_PATH: str = str(BASE_DIR / "inventory.db")
    DEFAULT_MIN_ALERT_QTY: int = 5

    # Directory for private secrets (never committed to git)
    SECRETS_DIR: str = str(BASE_DIR / "secrets")

    @property
    def active_secrets_files(self) -> List[str]:
        """List any private secrets files found on disk."""
        found = []
        secrets_path = Path(self.SECRETS_DIR)
        checks = [
            secrets_path / "secrets.env",
            secrets_path / ".env",
            BASE_DIR / ".env"
        ]
        for c in checks:
            if c.exists():
                found.append(str(c))
        return found


# Global settings singleton
settings = Settings()
