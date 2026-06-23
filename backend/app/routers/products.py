from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductRead, ProductUpdate
router = APIRouter(prefix='/products', tags=['products'])

def _get_or_404(db: Session, product_id: int) -> Product:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=f'Product {product_id} not found')
    return product

@router.post('', response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductCreate, db: Session=Depends(get_db)) -> Product:
    if db.scalar(select(Product).where(Product.sku == payload.sku)) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=f"SKU '{payload.sku}' already exists")
    product = Product(**payload.model_dump())
    db.add(product)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, detail='SKU must be unique')
    db.refresh(product)
    return product

@router.get('', response_model=list[ProductRead])
def list_products(db: Session=Depends(get_db)) -> list[Product]:
    return list(db.scalars(select(Product).order_by(Product.id)).all())

@router.get('/{product_id}', response_model=ProductRead)
def get_product(product_id: int, db: Session=Depends(get_db)) -> Product:
    return _get_or_404(db, product_id)

@router.put('/{product_id}', response_model=ProductRead)
def update_product(product_id: int, payload: ProductUpdate, db: Session=Depends(get_db)) -> Product:
    product = _get_or_404(db, product_id)
    data = payload.model_dump(exclude_unset=True)
    new_sku = data.get('sku')
    if new_sku and new_sku != product.sku:
        if db.scalar(select(Product).where(Product.sku == new_sku)) is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, detail=f"SKU '{new_sku}' already exists")
    for field, value in data.items():
        setattr(product, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, detail='SKU must be unique')
    db.refresh(product)
    return product

@router.delete('/{product_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: Session=Depends(get_db)) -> None:
    product = _get_or_404(db, product_id)
    db.delete(product)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, detail='Cannot delete a product that is referenced by existing orders')
