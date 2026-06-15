from __future__ import annotations

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    db_url: str = "sqlite:///week2/data/app.db"
    llm_model: str = "llama3.1:8b"
    ollama_host: str = "http://localhost:11434"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
