import os
import json
from pathlib import Path
from typing import List, Union, Optional
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Base directory of the repository (root)
BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """
    Application configuration loaded securely from:
    1. System environment variables (Highest priority)
    2. Private git-ignored secrets files:
       - secrets/secrets.env
       - secrets/credentials.env
       - secrets/.env
       - secrets/credentials.json
    3. Root .env file (Default development values)
    """
    model_config = SettingsConfigDict(
        env_file=(
            str(BASE_DIR / ".env"),
            str(BASE_DIR / "secrets" / ".env"),
            str(BASE_DIR / "secrets" / "credentials.env"),
            str(BASE_DIR / "secrets" / "secrets.env")
        ),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False
    )

    # Server settings
    APP_ENV: str = "development"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Meta WhatsApp Cloud API credentials
    WHATSAPP_TOKEN: str = "dev_token_placeholder"
    PHONE_NUMBER_ID: str = "dev_phone_number_id_placeholder"
    META_API_VERSION: str = "v21.0"

    # Webhook Verification Token
    VERIFY_TOKEN: str = "blackbox_inventory_token_2026"

    # Authorized WhatsApp phone numbers (e.g. ["+1234567890"] or "*")
    OWNER_PHONE_NUMBERS: Union[str, List[str]] = "*"

    # Database
    DATABASE_PATH: str = str(BASE_DIR / "inventory.db")
    DEFAULT_MIN_ALERT_QTY: int = 5

    # Directory for private secrets (never committed to git)
    SECRETS_DIR: str = str(BASE_DIR / "secrets")

    @field_validator("OWNER_PHONE_NUMBERS", mode="before")
    @classmethod
    def parse_owner_numbers(cls, v):
        if isinstance(v, str):
            if v.strip() == "*":
                return ["*"]
            return [num.strip() for num in v.split(",") if num.strip()]
        return v

    def model_post_init(self, __context):
        """
        After standard env loading, check if a JSON credentials file exists
        in the secrets folder (e.g. secrets/credentials.json or secrets/keys.json).
        If present, overlay non-default values.
        """
        secrets_path = Path(self.SECRETS_DIR)
        json_candidates = [
            secrets_path / "credentials.json",
            secrets_path / "keys.json"
        ]
        for p in json_candidates:
            if p.exists():
                try:
                    with open(p, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    if "whatsapp_token" in data and (self.WHATSAPP_TOKEN == "dev_token_placeholder" or not self.WHATSAPP_TOKEN):
                        self.WHATSAPP_TOKEN = data["whatsapp_token"]
                    if "phone_number_id" in data and (self.PHONE_NUMBER_ID == "dev_phone_number_id_placeholder" or not self.PHONE_NUMBER_ID):
                        self.PHONE_NUMBER_ID = str(data["phone_number_id"])
                    if "verify_token" in data and self.VERIFY_TOKEN == "blackbox_inventory_token_2026":
                        self.VERIFY_TOKEN = data["verify_token"]
                    if "owner_phone_numbers" in data:
                        raw_phones = data["owner_phone_numbers"]
                        if isinstance(raw_phones, list):
                            self.OWNER_PHONE_NUMBERS = [str(x).strip() for x in raw_phones]
                        elif isinstance(raw_phones, str):
                            self.OWNER_PHONE_NUMBERS = [x.strip() for x in raw_phones.split(",") if x.strip()]
                    if "meta_api_version" in data:
                        self.META_API_VERSION = data["meta_api_version"]
                except Exception:
                    pass

    @property
    def active_secrets_files(self) -> List[str]:
        """List any private secrets files found on disk."""
        found = []
        secrets_path = Path(self.SECRETS_DIR)
        checks = [
            secrets_path / "secrets.env",
            secrets_path / "credentials.env",
            secrets_path / ".env",
            secrets_path / "credentials.json",
            BASE_DIR / ".env"
        ]
        for c in checks:
            if c.exists():
                found.append(str(c))
        return found

    def is_authorized(self, phone_number: str) -> bool:
        """
        Check if a given phone number is authorized to execute inventory and order commands.
        If '*' is present in OWNER_PHONE_NUMBERS, all numbers are authorized (useful for dev/test).
        """
        if not phone_number:
            return False

        allowed = self.OWNER_PHONE_NUMBERS
        if isinstance(allowed, list):
            if "*" in allowed:
                return True
            clean_target = phone_number.strip().lstrip("+")
            for num in allowed:
                if clean_target == num.strip().lstrip("+"):
                    return True
        elif isinstance(allowed, str):
            if allowed.strip() == "*":
                return True
            clean_target = phone_number.strip().lstrip("+")
            clean_allowed = allowed.strip().lstrip("+")
            if clean_target == clean_allowed:
                return True

        return False

    @property
    def is_live_meta_configured(self) -> bool:
        """Check if real Meta credentials have been provided."""
        return (
            self.WHATSAPP_TOKEN not in ("dev_token_placeholder", "", None) and
            not self.WHATSAPP_TOKEN.startswith("EAAG...YOUR") and
            self.PHONE_NUMBER_ID not in ("dev_phone_number_id_placeholder", "", None) and
            self.PHONE_NUMBER_ID != "123456789012345"
        )


# Global settings singleton
settings = Settings()
