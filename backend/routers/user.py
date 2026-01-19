from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from database import get_db
from models import User, Face, Fingerprint
from services.uart import uart_service

router = APIRouter(prefix="/api/users", tags=["Users"])

class UserListResponse(BaseModel):
    id: int
    name: str  # Changed from string which is not defined
    created_at: datetime
    fingerprints_count: int
    faces_count: int
    
    class Config:
        from_attributes = True

@router.get("/all", response_model=List[UserListResponse])
async def get_all_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    
    result = []
    for user in users:
        result.append({
            "id": user.id,
            "name": user.name,
            "created_at": user.created_at,
            "fingerprints_count": len(user.fingerprints),
            "faces_count": len(user.faces)
        })
        
    return result

@router.delete("/{user_id}")
async def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy người dùng"
        )
    
    # Logic xóa vân tay khỏi sensor nếu cần
    for fp in user.fingerprints:
        uart_service.send_message({
            "cmd": "delete_fingerprint",
            "id": fp.fingerprint_id
        })
    
    db.delete(user)
    db.commit()
    
    return {"success": True, "message": f"Đã xóa người dùng {user.name} và toàn bộ dữ liệu liên quan"}
