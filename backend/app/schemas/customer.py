from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field

class CustomerBase(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=50)

class CustomerCreate(CustomerBase):
    pass

class CustomerRead(CustomerBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
