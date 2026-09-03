import os
from pathlib import Path
from dotenv import load_dotenv

# Load the repo-root .env regardless of cwd, then fall back to dotenv's
# normal cwd-relative lookup (so an apps/ai-service/.env still works too).
load_dotenv(Path(__file__).resolve().parents[3] / ".env")
load_dotenv()


class Settings:
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4o")
    ai_mode: str = os.getenv("AI_MODE", "mock")  # "mock" or "live"
    database_url: str = os.getenv(
        "DATABASE_URL", "postgresql://postgres:postgres@localhost:54329/retainai"
    )
    port: int = int(os.getenv("AI_SERVICE_PORT", "8000"))

    @property
    def is_live(self) -> bool:
        return self.ai_mode == "live" and bool(self.openai_api_key)


settings = Settings()
