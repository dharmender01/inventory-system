from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerRead
router = APIRouter(prefix='/customers', tags=['customers'])

def _get_or_404(db: Session, customer_id: int) -> Customer:
    customer = db.get(Customer, customer_id)
    if customer is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=f'Customer {customer_id} not found')
    return customer

@router.post('', response_model=CustomerRead, status_code=status.HTTP_201_CREATED)
def create_customer(payload: CustomerCreate, db: Session=Depends(get_db)) -> Customer:
    email = str(payload.email)
    if db.scalar(select(Customer).where(Customer.email == email)) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=f"Email '{email}' already exists")
    customer = Customer(full_name=payload.full_name, email=email, phone=payload.phone)
    db.add(customer)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, detail='Email must be unique')
    db.refresh(customer)
    return customer

@router.get('', response_model=list[CustomerRead])
def list_customers(db: Session=Depends(get_db)) -> list[Customer]:
    return list(db.scalars(select(Customer).order_by(Customer.id)).all())

@router.get('/{customer_id}', response_model=CustomerRead)
def get_customer(customer_id: int, db: Session=Depends(get_db)) -> Customer:
    return _get_or_404(db, customer_id)

@router.delete('/{customer_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(customer_id: int, db: Session=Depends(get_db)) -> None:
    customer = _get_or_404(db, customer_id)
    db.delete(customer)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, detail='Cannot delete a customer who has existing orders')
