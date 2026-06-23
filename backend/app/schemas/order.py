from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(gt=0, description='Units ordered; must be > 0')

class OrderCreate(BaseModel):
    customer_id: int
    items: list[OrderItemCreate] = Field(min_length=1)

class OrderItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: int
    product_name: str | None = None
    product_sku: str | None = None
    quantity: int
    unit_price: float
    line_total: float

class OrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    customer_id: int
    customer_name: str | None = None
    total_amount: float
    status: str
    created_at: datetime
    items: list[OrderItemRead]
