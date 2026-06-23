import logging
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, OperationalError
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine
from app.models import Customer, Order, OrderItem, Product
from app.routers import customers, dashboard, orders, products
logger = logging.getLogger('uvicorn.error')

def _init_db(retries: int=10, delay: float=2.0) -> None:
    last_err: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            with engine.connect() as conn:
                conn.execute(text('SELECT 1'))
            Base.metadata.create_all(bind=engine)
            logger.info('Database ready; schema ensured.')
            return
        except OperationalError as exc:
            last_err = exc
            logger.warning('DB not ready (attempt %s/%s); retrying in %ss', attempt, retries, delay)
            time.sleep(delay)
    raise RuntimeError(f'Could not connect to the database after {retries} attempts') from last_err

@asynccontextmanager
async def lifespan(_: FastAPI):
    _init_db()
    yield
app = FastAPI(title=settings.PROJECT_NAME, version=settings.API_VERSION, lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins_list, allow_credentials=True, allow_methods=['*'], allow_headers=['*'])

@app.exception_handler(IntegrityError)
async def integrity_error_handler(_: Request, exc: IntegrityError) -> JSONResponse:
    logger.warning('IntegrityError: %s', exc)
    return JSONResponse(status_code=409, content={'detail': 'Resource conflict / constraint violation'})

@app.get('/health', tags=['meta'])
def health() -> dict[str, str]:
    return {'status': 'ok'}

@app.get('/', tags=['meta'])
def root() -> dict[str, str]:
    return {'name': settings.PROJECT_NAME, 'version': settings.API_VERSION, 'docs': '/docs', 'health': '/health'}
app.include_router(products.router)
app.include_router(customers.router)
app.include_router(orders.router)
app.include_router(dashboard.router)
