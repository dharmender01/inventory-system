from collections import defaultdict
from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, selectinload
from app.models.customer import Customer
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.schemas.order import OrderCreate

def _load_order(db: Session, order_id: int) -> Order | None:
    return db.scalars(select(Order).options(joinedload(Order.customer), selectinload(Order.items).joinedload(OrderItem.product)).where(Order.id == order_id)).first()

def get_order(db: Session, order_id: int) -> Order:
    order = _load_order(db, order_id)
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=f'Order {order_id} not found')
    return order

def list_orders(db: Session) -> list[Order]:
    return list(db.scalars(select(Order).options(joinedload(Order.customer), selectinload(Order.items).joinedload(OrderItem.product)).order_by(Order.id.desc())).all())

def create_order(db: Session, payload: OrderCreate) -> Order:
    customer = db.get(Customer, payload.customer_id)
    if customer is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=f'Customer {payload.customer_id} not found')
    requested = defaultdict(int)
    for item in payload.items:
        requested[item.product_id] += item.quantity
    products = db.scalars(select(Product).where(Product.id.in_(requested.keys())).with_for_update()).all()
    product_map = {p.id: p for p in products}
    for product_id, total_qty in requested.items():
        product = product_map.get(product_id)
        if product is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail=f'Product {product_id} not found')
        if product.quantity_in_stock < total_qty:
            raise HTTPException(status.HTTP_409_CONFLICT, detail=f"Insufficient stock for '{product.name}': in stock {product.quantity_in_stock}, requested {total_qty}")
    order = Order(customer_id=customer.id, status='PLACED', total_amount=Decimal('0.00'))
    db.add(order)
    db.flush()
    total = Decimal('0.00')
    for item in payload.items:
        product = product_map[item.product_id]
        unit_price = Decimal(str(product.price))
        line_total = unit_price * item.quantity
        total += line_total
        product.quantity_in_stock -= item.quantity
        db.add(OrderItem(order_id=order.id, product_id=product.id, quantity=item.quantity, unit_price=unit_price, line_total=line_total))
    order.total_amount = total
    db.commit()
    return get_order(db, order.id)

def delete_order(db: Session, order_id: int) -> None:
    order = db.scalars(select(Order).options(selectinload(Order.items)).where(Order.id == order_id)).first()
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=f'Order {order_id} not found')
    for item in order.items:
        product = db.get(Product, item.product_id)
        if product is not None:
            product.quantity_in_stock += item.quantity
    db.delete(order)
    db.commit()
