from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db
from models import User, Face, AccessLog, AccessMethod, AccessType
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
    user_id: int = Form(...),
    image: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # Tự động chuyển sang chế độ đăng ký
    state_manager.set_registration_mode()
    
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
             raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Người dùng không tồn tại"
            )

        # Check existing face (One Face Per User)
        existing_face = db.query(Face).filter(Face.user_id == user.id).first()
        if existing_face:
            # Delete old image/record to allow overwrite
            if existing_face.image_path and os.path.exists(existing_face.image_path):
                try:
                    os.remove(existing_face.image_path)
                except:
                    pass
            db.delete(existing_face)
            db.commit()

        image_bytes = await image.read()
        
        image.file.seek(0)  
        image_path = save_uploaded_image(image, user.name)

        
        embedding = uniface_service.extract_embedding(image_bytes)
        
        if embedding is None:
            if os.path.exists(image_path):
                os.remove(image_path)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không phát hiện khuôn mặt trong ảnh"
            )
        
        # Add face to user
        face = Face(
            user_id=user.id,
            face_embedding=embedding.tobytes(),
            image_path=image_path
        )
        db.add(face)
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
    finally:
        state_manager.set_entry_exit_mode()

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
    
    faces = db.query(Face).all()
    
    if not faces:
        log = AccessLog(
            user_name=None,
            access_method=AccessMethod.FACE,
            access_type=AccessType.ENTRY,
            success=False,
            details="Chưa có khuôn mặt nào được đăng ký"
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
    
    best_match_face = None
    best_similarity = 0.0
    
    for face in faces:
        stored_embedding = np.frombuffer(face.face_embedding, dtype=np.float32)
        similarity = uniface_service.compare_faces(new_embedding, stored_embedding)
        
        if similarity > best_similarity:
            best_similarity = similarity
            best_match_face = face
    
    threshold = 0.7
    if best_similarity >= threshold:
        # Get user from face
        user = best_match_face.user
        
        log = AccessLog(
            user_name=user.name,
            access_method=AccessMethod.FACE,
            access_type=AccessType.ENTRY,
            success=True,
            details=f"Độ tương đồng: {best_similarity:.3f}"
        )
        db.add(log)
        db.commit()
        
        # uart_service.unlock_door(duration=5)
        uart_service.set_led("green")
        uart_service.beep(2)
        
        return FaceVerifyResponse(
            success=True,
            user_name=user.name,
            similarity=best_similarity,
            message=f"Chào mừng {user.name}!"
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
    # Get users who have at least one face registered
    users = db.query(User).join(Face).filter(Face.id.isnot(None)).distinct().all()
    
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
    
    faces = db.query(Face).all()
    
    if not faces:
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
    
    best_match_face = None
    best_similarity = 0.0
    
    for face in faces:
        stored_embedding = np.frombuffer(face.face_embedding, dtype=np.float32)
        similarity = uniface_service.compare_faces(new_embedding, stored_embedding)
        
        if similarity > best_similarity:
            best_similarity = similarity
            best_match_face = face
    
    threshold = 0.7
    if best_similarity >= threshold:
        user = best_match_face.user
        log = AccessLog(
            user_name=user.name,
            access_method=AccessMethod.FACE,
            access_type=AccessType.ENTRY,
            success=True,
            details=f"Độ tương đồng: {best_similarity:.3f}"
        )
        db.add(log)
        db.commit()
        
        # uart_service.unlock_door(duration=5)
        uart_service.set_led("green")
        uart_service.beep(2)
        
        return FaceVerifyResponse(
            success=True,
            user_name=user.name,
            similarity=best_similarity,
            message=f"Chào mừng {user.name}!"
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
    # This logic seems redundant if user.py handles user deletion.
    # But this is inside face.py, maybe it was legacy logic.
    # We should deprecate this or keep it.
    # The user asked for "users-page" CRUD.
    # I'll keep it but it might be duplicate of /api/users/{id}.
    # Router prefix is /api/face. So this is /api/face/{user_id}.
    # It deletes the User? The code says `db.query(User)...`.
    # I'll leave it as is to avoid breaking existing frontend if it calls this.
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy người dùng"
        )
    
    db.delete(user)
    db.commit()
    
    return {"success": True, "message": f"Đã xóa người dùng {user.name}"}
