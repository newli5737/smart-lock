from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db
from models import User, AccessLog, AccessMethod, AccessType
from schemas.user import UserResponse, FaceVerifyResponse
from services.uniface import uniface_service
from services.state_manager import state_manager
from services.uart import uart_service
from services.camera import camera_service
import numpy as np
from typing import List
import os
import uuid
from datetime import datetime

router = APIRouter(prefix="/api/face", tags=["Face Recognition"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def save_uploaded_image(image: UploadFile, user_name: str) -> str:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_extension = os.path.splitext(image.filename)[1] or ".jpg"
    filename = f"{user_name}_{timestamp}_{uuid.uuid4().hex[:8]}{file_extension}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    with open(filepath, "wb") as f:
        f.write(image.file.read())
    
    return filepath

@router.post("/register", response_model=UserResponse)
async def register_face(
    name: str = Form(...),
    image: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    
    if not state_manager.is_registration_mode():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ có thể đăng ký khuôn mặt trong chế độ Registration"
        )
    
    image_bytes = await image.read()
    
    image.file.seek(0)  
    image_path = save_uploaded_image(image, name)
    print(f"Saved image to: {image_path}")
    
    embedding = uniface_service.extract_embedding(image_bytes)
    
    if embedding is None:
        if os.path.exists(image_path):
            os.remove(image_path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không phát hiện khuôn mặt trong ảnh"
        )
    
    user = User(
        name=name,
        face_embedding=embedding.tobytes()
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    uart_service.set_led("green")
    uart_service.beep(2)
    
    return UserResponse(
        id=user.id,
        name=user.name,
        created_at=user.created_at,
        has_face=True
    )

@router.post("/verify", response_model=FaceVerifyResponse)
async def verify_face(
    image: UploadFile = File(...),
    db: Session = Depends(get_db)
):

    if not state_manager.is_entry_exit_mode():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ có thể xác thực trong chế độ Entry/Exit"
        )
    
    image_bytes = await image.read()
    
    new_embedding = uniface_service.extract_embedding(image_bytes)
    
    if new_embedding is None:
        log = AccessLog(
            user_name=None,
            access_method=AccessMethod.FACE,
            access_type=AccessType.ENTRY,
            success=False,
            details="Không phát hiện khuôn mặt"
        )
        db.add(log)
        db.commit()
        
        uart_service.set_led("red")
        uart_service.beep(1)
        
        return FaceVerifyResponse(
            success=False,
            user_name=None,
            similarity=0.0,
            message="Không phát hiện khuôn mặt"
        )
    
    users = db.query(User).filter(User.face_embedding.isnot(None)).all()
    
    if not users:
        log = AccessLog(
            user_name=None,
            access_method=AccessMethod.FACE,
            access_type=AccessType.ENTRY,
            success=False,
            details="Chưa có người dùng nào đăng ký"
        )
        db.add(log)
        db.commit()
        
        uart_service.set_led("red")
        uart_service.beep(1)
        
        return FaceVerifyResponse(
            success=False,
            user_name=None,
            similarity=0.0,
            message="Chưa có người dùng nào đăng ký"
        )
    
    best_match = None
    best_similarity = 0.0
    
    for user in users:
        stored_embedding = np.frombuffer(user.face_embedding, dtype=np.float32)
        similarity = uniface_service.compare_faces(new_embedding, stored_embedding)
        
        if similarity > best_similarity:
            best_similarity = similarity
            best_match = user
    
    threshold = 0.7
    if best_similarity >= threshold:
        log = AccessLog(
            user_name=best_match.name,
            access_method=AccessMethod.FACE,
            access_type=AccessType.ENTRY,
            success=True,
            details=f"Độ tương đồng: {best_similarity:.3f}"
        )
        db.add(log)
        db.commit()
        
        uart_service.unlock_door(duration=5)
        uart_service.set_led("green")
        uart_service.beep(2)
        
        return FaceVerifyResponse(
            success=True,
            user_name=best_match.name,
            similarity=best_similarity,
            message=f"Chào mừng {best_match.name}!"
        )
    else:
        log = AccessLog(
            user_name=None,
            access_method=AccessMethod.FACE,
            access_type=AccessType.ENTRY,
            success=False,
            details=f"Độ tương đồng cao nhất: {best_similarity:.3f}"
        )
        db.add(log)
        db.commit()
        
        uart_service.set_led("red")
        uart_service.beep(1)
        
        return FaceVerifyResponse(
            success=False,
            user_name=None,
            similarity=best_similarity,
            message="Khuôn mặt không khớp"
        )

@router.get("/users", response_model=List[UserResponse])
async def get_users(db: Session = Depends(get_db)):
    users = db.query(User).filter(User.face_embedding.isnot(None)).all()
    
    return [
        UserResponse(
            id=user.id,
            name=user.name,
            created_at=user.created_at,
            has_face=True
        )
        for user in users
    ]

@router.post("/verify-from-stream", response_model=FaceVerifyResponse)
async def verify_face_from_stream(db: Session = Depends(get_db)):
    
    if not state_manager.is_entry_exit_mode():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ có thể xác thực trong chế độ Entry/Exit"
        )
    
    frame_bytes = camera_service.get_frame()
    
    if frame_bytes is None:
        uart_service.set_led("red")
        uart_service.beep(1)
        
        return FaceVerifyResponse(
            success=False,
            user_name=None,
            similarity=0.0,
            message="Không thể truy cập camera backend"
        )
    
    new_embedding = uniface_service.extract_embedding(frame_bytes)
    
    if new_embedding is None:
        log = AccessLog(
            user_name=None,
            access_method=AccessMethod.FACE,
            access_type=AccessType.ENTRY,
            success=False,
            details="Không phát hiện khuôn mặt"
        )
        db.add(log)
        db.commit()
        
        uart_service.set_led("red")
        uart_service.beep(1)
        
        return FaceVerifyResponse(
            success=False,
            user_name=None,
            similarity=0.0,
            message="Không phát hiện khuôn mặt"
        )
    
    users = db.query(User).filter(User.face_embedding.isnot(None)).all()
    
    if not users:
        log = AccessLog(
            user_name=None,
            access_method=AccessMethod.FACE,
            access_type=AccessType.ENTRY,
            success=False,
            details="Chưa có người dùng nào đăng ký"
        )
        db.add(log)
        db.commit()
        
        uart_service.set_led("red")
        uart_service.beep(1)
        
        return FaceVerifyResponse(
            success=False,
            user_name=None,
            similarity=0.0,
            message="Chưa có người dùng nào đăng ký"
        )
    
    best_match = None
    best_similarity = 0.0
    
    for user in users:
        stored_embedding = np.frombuffer(user.face_embedding, dtype=np.float32)
        similarity = uniface_service.compare_faces(new_embedding, stored_embedding)
        
        if similarity > best_similarity:
            best_similarity = similarity
            best_match = user
    
    threshold = 0.7
    if best_similarity >= threshold:
        log = AccessLog(
            user_name=best_match.name,
            access_method=AccessMethod.FACE,
            access_type=AccessType.ENTRY,
            success=True,
            details=f"Độ tương đồng: {best_similarity:.3f}"
        )
        db.add(log)
        db.commit()
        
        uart_service.unlock_door(duration=5)
        uart_service.set_led("green")
        uart_service.beep(2)
        
        return FaceVerifyResponse(
            success=True,
            user_name=best_match.name,
            similarity=best_similarity,
            message=f"Chào mừng {best_match.name}!"
        )
    else:
        log = AccessLog(
            user_name=None,
            access_method=AccessMethod.FACE,
            access_type=AccessType.ENTRY,
            success=False,
            details=f"Độ tương đồng cao nhất: {best_similarity:.3f}"
        )
        db.add(log)
        db.commit()
        
        uart_service.set_led("red")
        uart_service.beep(1)
        
        return FaceVerifyResponse(
            success=False,
            user_name=None,
            similarity=best_similarity,
            message="Khuôn mặt không khớp"
        )

@router.delete("/{user_id}")
async def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy người dùng"
        )
    
    db.delete(user)
    db.commit()
    
    return {"success": True, "message": f"Đã xóa người dùng {user.name}"}
