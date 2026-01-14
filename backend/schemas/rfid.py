from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class RFIDCardBase(BaseModel):
    card_uid: str
    user_name: str

class RFIDCardCreate(RFIDCardBase):
    pass

class RFIDCardResponse(RFIDCardBase):
    id: int
    user_id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class RFIDVerifyRequest(BaseModel):
    card_uid: str

class RFIDVerifyResponse(BaseModel):
    success: bool
    user_name: Optional[str] = None
    message: str
