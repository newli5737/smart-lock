from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    name: str

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: int
    created_at: datetime
    has_face: bool
    
    class Config:
        from_attributes = True

class FaceRegisterRequest(BaseModel):
    name: str
    # image will be sent as multipart/form-data

class FaceVerifyRequest(BaseModel):
    # image will be sent as multipart/form-data
    pass

class FaceVerifyResponse(BaseModel):
    success: bool
    user_name: Optional[str] = None
    similarity: float
    message: str
