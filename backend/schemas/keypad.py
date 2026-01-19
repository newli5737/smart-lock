from pydantic import BaseModel, Field
from typing import Optional

class KeypadSetPasswordRequest(BaseModel):
    password: str = Field(..., min_length=4, max_length=10)
    old_password: Optional[str] = None

class KeypadSetPasswordResponse(BaseModel):
    success: bool
    message: str

class KeypadVerifyRequest(BaseModel):
    password: str

class KeypadVerifyResponse(BaseModel):
    success: bool
    message: str
