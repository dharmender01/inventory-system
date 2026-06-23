from decimal import Decimal
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models.customer import Customer
from app.models.order import Order, OrderItem
from app.models.product import Product

def run() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(Product).count() > 0:
            print('Data already present — skipping seed.')
            return
        products = [Product(name='Wireless Mouse', sku='WM-001', price=Decimal('24.99'), quantity_in_stock=120, low_stock_threshold=20), Product(name='Mechanical Keyboard', sku='KB-014', price=Decimal('89.50'), quantity_in_stock=8, low_stock_threshold=10), Product(name='USB-C Hub', sku='HUB-7P', price=Decimal('39.00'), quantity_in_stock=45, low_stock_threshold=15), Product(name='27" Monitor', sku='MON-27Q', price=Decimal('219.00'), quantity_in_stock=3, low_stock_threshold=5)]
        customers = [Customer(full_name='Ava Thompson', email='ava@example.com', phone='+1-555-0101'), Customer(full_name='Liam Patel', email='liam@example.com', phone='+1-555-0102')]
        db.add_all(products + customers)
        db.flush()
        order = Order(customer_id=customers[0].id, status='PLACED', total_amount=Decimal('0.00'))
        db.add(order)
        db.flush()
        line_qty = 2
        prod = products[0]
        unit = Decimal(str(prod.price))
        prod.quantity_in_stock -= line_qty
        db.add(OrderItem(order_id=order.id, product_id=prod.id, quantity=line_qty, unit_price=unit, line_total=unit * line_qty))
        order.total_amount = unit * line_qty
        db.commit()
        print('Seed complete.')
    finally:
        db.close()
if __name__ == '__main__':
    run()
