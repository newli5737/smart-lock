from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User, Fingerprint, AccessLog, AccessMethod, AccessType
from schemas.fingerprint import FingerprintEnrollRequest, FingerprintResponse, FingerprintVerifyRequest, FingerprintVerifyResponse
from services.state_manager import state_manager
from services.uart import uart_service
from typing import List

router = APIRouter(prefix="/api/fingerprint", tags=["Fingerprint"])

@router.post("/enroll", response_model=FingerprintResponse)
async def enroll_fingerprint(
    fingerprint_data: FingerprintEnrollRequest,
    db: Session = Depends(get_db)
):
    """Đăng ký vân tay mới (chỉ trong chế độ Registration)"""
    
    # Kiểm tra chế độ
    if not state_manager.is_registration_mode():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ có thể đăng ký vân tay trong chế độ Registration"
        )
    
    # Kiểm tra fingerprint_id đã tồn tại chưa
    existing_print = db.query(Fingerprint).filter(Fingerprint.fingerprint_id == fingerprint_data.fingerprint_id).first()
    if existing_print:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vân tay đã được đăng ký"
        )
    
    # Kiểm tra fingerprint_id hợp lệ (AS608 supports 1-127)
    if fingerprint_data.fingerprint_id < 1 or fingerprint_data.fingerprint_id > 127:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fingerprint ID phải từ 1-127"
        )
    
    # Kiểm tra finger_position hợp lệ (1-10)
    if fingerprint_data.finger_position < 1 or fingerprint_data.finger_position > 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Finger position phải từ 1-10"
        )
    
    # Tạo hoặc lấy user
    user = db.query(User).filter(User.name == fingerprint_data.user_name).first()
    if not user:
        user = User(name=fingerprint_data.user_name)
        db.add(user)
        db.commit()
        db.refresh(user)
    
    # Lưu vân tay
    fingerprint = Fingerprint(
        fingerprint_id=fingerprint_data.fingerprint_id,
        user_id=user.id,
        user_name=user.name,
        finger_position=fingerprint_data.finger_position
    )
    db.add(fingerprint)
    db.commit()
    db.refresh(fingerprint)
    
    # Phản hồi LED xanh và beep
    uart_service.set_led("green")
    uart_service.beep(2)
    
    return FingerprintResponse(
        id=fingerprint.id,
        fingerprint_id=fingerprint.fingerprint_id,
        user_id=fingerprint.user_id,
        user_name=fingerprint.user_name,
        finger_position=fingerprint.finger_position,
        is_active=fingerprint.is_active,
        created_at=fingerprint.created_at
    )

@router.post("/verify", response_model=FingerprintVerifyResponse)
async def verify_fingerprint(
    request: FingerprintVerifyRequest,
    db: Session = Depends(get_db)
):
    """Xác thực vân tay (chỉ trong chế độ Entry/Exit)"""
    
    # Kiểm tra chế độ
    if not state_manager.is_entry_exit_mode():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ có thể xác thực trong chế độ Entry/Exit"
        )
    
    # Tìm vân tay trong database
    fingerprint = db.query(Fingerprint).filter(
        Fingerprint.fingerprint_id == request.fingerprint_id,
        Fingerprint.is_active == True
    ).first()
    
    if fingerprint:
        # Xác thực thành công
        log = AccessLog(
            user_name=fingerprint.user_name,
            access_method=AccessMethod.FINGERPRINT,
            access_type=AccessType.ENTRY,
            success=True,
            details=f"Fingerprint ID: {request.fingerprint_id}"
        )
        db.add(log)
        db.commit()
        
        # Mở khóa cửa
        uart_service.unlock_door(duration=5)
        uart_service.set_led("green")
        uart_service.beep(2)
        
        return FingerprintVerifyResponse(
            success=True,
            user_name=fingerprint.user_name,
            message=f"Chào mừng {fingerprint.user_name}!"
        )
    else:
        # Xác thực thất bại
        log = AccessLog(
            user_name=None,
            access_method=AccessMethod.FINGERPRINT,
            access_type=AccessType.ENTRY,
            success=False,
            details=f"Fingerprint ID không hợp lệ: {request.fingerprint_id}"
        )
        db.add(log)
        db.commit()
        
        uart_service.set_led("red")
        uart_service.beep(1)
        
        return FingerprintVerifyResponse(
            success=False,
            user_name=None,
            message="Vân tay không hợp lệ"
        )

@router.get("/prints", response_model=List[FingerprintResponse])
async def get_fingerprints(db: Session = Depends(get_db)):
    """Lấy danh sách vân tay đã đăng ký"""
    fingerprints = db.query(Fingerprint).all()
    
    return [
        FingerprintResponse(
            id=fp.id,
            fingerprint_id=fp.fingerprint_id,
            user_id=fp.user_id,
            user_name=fp.user_name,
            finger_position=fp.finger_position,
            is_active=fp.is_active,
            created_at=fp.created_at
        )
        for fp in fingerprints
    ]

@router.delete("/{fingerprint_id}")
async def delete_fingerprint(fingerprint_id: int, db: Session = Depends(get_db)):
    """Xóa vân tay"""
    fingerprint = db.query(Fingerprint).filter(Fingerprint.id == fingerprint_id).first()
    
    if not fingerprint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy vân tay"
        )
    
    db.delete(fingerprint)
    db.commit()
    
    return {"success": True, "message": f"Đã xóa vân tay ID {fingerprint.fingerprint_id}"}
