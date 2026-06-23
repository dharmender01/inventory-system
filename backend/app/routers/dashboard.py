from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.customer import Customer
from app.models.order import Order
from app.models.product import Product
from app.schemas.dashboard import DashboardSummary
router = APIRouter(prefix='/dashboard', tags=['dashboard'])

@router.get('/summary', response_model=DashboardSummary)
def get_summary(db: Session=Depends(get_db)) -> DashboardSummary:
    total_products = db.scalar(select(func.count(Product.id))) or 0
    total_customers = db.scalar(select(func.count(Customer.id))) or 0
    total_orders = db.scalar(select(func.count(Order.id))) or 0
    low_stock = list(db.scalars(select(Product).where(Product.quantity_in_stock <= Product.low_stock_threshold).order_by(Product.quantity_in_stock.asc())).all())
    return DashboardSummary(total_products=total_products, total_customers=total_customers, total_orders=total_orders, low_stock_count=len(low_stock), low_stock_products=low_stock)
