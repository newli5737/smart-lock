from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from models.access_log import AccessMethod, AccessType

class AccessLogResponse(BaseModel):
    id: int
    user_name: Optional[str]
    access_method: AccessMethod
    access_type: AccessType
    success: bool
    timestamp: datetime
    details: Optional[str]
    
    class Config:
        from_attributes = True

class AccessLogListResponse(BaseModel):
    logs: List[AccessLogResponse]
    total: int

class AccessStatsResponse(BaseModel):
    total_accesses: int
    successful_accesses: int
    failed_accesses: int
    by_method: dict
    by_type: dict
    recent_logs: List[AccessLogResponse]
