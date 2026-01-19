from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from datetime import datetime
from database import get_db
from models import User, Face, Fingerprint
from services.uart import uart_service

router = APIRouter(prefix="/api/users", tags=["Users"])

class UserListResponse(BaseModel):
    id: int
    name: str
    created_at: datetime
    fingerprints_count: int
    faces_count: int
    
    class Config:
        from_attributes = True

class UserCreateRequest(BaseModel):
    name: str

class UserUpdateRequest(BaseModel):
    name: str

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

@router.post("/", response_model=UserListResponse)
async def create_user(user_data: UserCreateRequest, db: Session = Depends(get_db)):
    # Check if name exists? Not strictly required but good practice.
    # Allowing duplicate names for now as user didn't specify unique names constraint strictly, 
    # but unique name is better for display.
    # models.User has name column.
    
    user = User(name=user_data.name)
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return UserListResponse(
        id=user.id,
        name=user.name,
        created_at=user.created_at,
        fingerprints_count=0,
        faces_count=0
    )

@router.put("/{user_id}", response_model=UserListResponse)
async def update_user(user_id: int, user_data: UserUpdateRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy người dùng"
        )
    
    user.name = user_data.name
    db.commit()
    db.refresh(user)
    
    return UserListResponse(
        id=user.id,
        name=user.name,
        created_at=user.created_at,
        fingerprints_count=len(user.fingerprints),
        faces_count=len(user.faces)
    )

@router.delete("/{user_id}")
async def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy người dùng"
        )
    
    # Delete fingerprints from sensor
    for fp in user.fingerprints:
        uart_service.send_command({
            "cmd": "delete_fingerprint",
            "id": fp.fingerprint_id
        })
    
    # Database cascade delete should handle faces/fingerprints rows if configured,
    # but SQLAlchemy defaults need explicit cascade or manual delete.
    # We will manually delete to be safe and clear files if needed.
    
    # Delete faces
    for face in user.faces:
        # Delete file if exists
        import os
        if face.image_path and os.path.exists(face.image_path):
            try:
                os.remove(face.image_path)
            except:
                pass
        db.delete(face)

    # Delete fingerprints
    for fp in user.fingerprints:
        db.delete(fp)
        
    db.delete(user)
    db.commit()
    
    return {"success": True, "message": f"Đã xóa người dùng {user.name} và toàn bộ dữ liệu liên quan"}
