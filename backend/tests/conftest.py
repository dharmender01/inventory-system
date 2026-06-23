import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import app.models
from app.db.base import Base
from app.db.session import get_db
from app.main import app

@pytest.fixture
def client():
    engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)

    @event.listens_for(engine, 'connect')
    def _enable_fk(dbapi_conn, _record):
        cur = dbapi_conn.cursor()
        cur.execute('PRAGMA foreign_keys=ON')
        cur.close()
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)

    def _override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()
    app.dependency_overrides[get_db] = _override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()

def make_product(client, sku='SKU-1', qty=10, price=5.0, name='Thing', threshold=3):
    r = client.post('/products', json={'name': name, 'sku': sku, 'price': price, 'quantity_in_stock': qty, 'low_stock_threshold': threshold})
    assert r.status_code == 201, r.text
    return r.json()

def make_customer(client, email='a@b.com', name='Alice', phone='123'):
    r = client.post('/customers', json={'full_name': name, 'email': email, 'phone': phone})
    assert r.status_code == 201, r.text
    return r.json()
