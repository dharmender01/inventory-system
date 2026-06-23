from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')
    PROJECT_NAME: str = 'Inventory & Order Management API'
    API_VERSION: str = '1.0.0'
    DATABASE_URL: str = 'postgresql+psycopg2://inventory:inventory@db:5432/inventory'
    CORS_ORIGINS: str = 'http://localhost:5173,http://localhost:3000'
    LOW_STOCK_THRESHOLD: int = 10

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(',') if o.strip()]

@lru_cache
def get_settings() -> Settings:
    return Settings()
settings = get_settings()
