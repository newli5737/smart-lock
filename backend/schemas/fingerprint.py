from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class FingerprintBase(BaseModel):
    fingerprint_id: int  # ID in AS608 sensor (1-127)
    user_name: str
    finger_position: int  # 1-10

class FingerprintEnrollRequest(FingerprintBase):
    pass

class FingerprintResponse(FingerprintBase):
    id: int
    user_id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class FingerprintVerifyRequest(BaseModel):
    fingerprint_id: int

class FingerprintVerifyResponse(BaseModel):
    success: bool
    user_name: Optional[str] = None
    message: str
