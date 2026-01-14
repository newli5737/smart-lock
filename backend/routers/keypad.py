from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import KeypadPassword, AccessLog, AccessMethod, AccessType
from schemas.keypad import (
    KeypadSetPasswordRequest,
    KeypadSetPasswordResponse,
    KeypadVerifyRequest,
    KeypadVerifyResponse
)
from services.state_manager import state_manager
from services.uart import uart_service
import hashlib

router = APIRouter(prefix="/api/keypad", tags=["Keypad"])

def hash_password(password: str) -> str:
    """Hash mật khẩu sử dụng SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

@router.post("/set-password", response_model=KeypadSetPasswordResponse)
async def set_password(
    request: KeypadSetPasswordRequest,
    db: Session = Depends(get_db)
):
    """Đặt/thay đổi mật khẩu bàn phím (chỉ trong chế độ Registration)"""
    
    # Kiểm tra chế độ
    if not state_manager.is_registration_mode():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ có thể đặt mật khẩu trong chế độ Registration"
        )
    
    # Hash mật khẩu
    password_hash = hash_password(request.password)
    
    # Xóa mật khẩu cũ (chỉ giữ 1 mật khẩu)
    db.query(KeypadPassword).delete()
    
    # Lưu mật khẩu mới
    keypad_password = KeypadPassword(password_hash=password_hash)
    db.add(keypad_password)
    db.commit()
    
    # Phản hồi LED xanh và beep
    uart_service.set_led("green")
    uart_service.beep(2)
    
    return KeypadSetPasswordResponse(
        success=True,
        message="Đã đặt mật khẩu thành công"
    )

@router.post("/verify", response_model=KeypadVerifyResponse)
async def verify_password(
    request: KeypadVerifyRequest,
    db: Session = Depends(get_db)
):
    """Xác thực mật khẩu bàn phím (chỉ trong chế độ Entry/Exit)"""
    
    # Kiểm tra chế độ
    if not state_manager.is_entry_exit_mode():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ có thể xác thực trong chế độ Entry/Exit"
        )
    
    # Hash mật khẩu nhập vào
    password_hash = hash_password(request.password)
    
    # Lấy mật khẩu đã lưu
    stored_password = db.query(KeypadPassword).first()
    
    if not stored_password:
        # Chưa có mật khẩu nào được đặt
        log = AccessLog(
            user_name=None,
            access_method=AccessMethod.KEYPAD,
            access_type=AccessType.ENTRY,
            success=False,
            details="Chưa có mật khẩu được đặt"
        )
        db.add(log)
        db.commit()
        
        uart_service.set_led("red")
        uart_service.beep(1)
        
        return KeypadVerifyResponse(
            success=False,
            message="Chưa có mật khẩu được đặt"
        )
    
    if password_hash == stored_password.password_hash:
        # Xác thực thành công
        log = AccessLog(
            user_name="Keypad User",
            access_method=AccessMethod.KEYPAD,
            access_type=AccessType.ENTRY,
            success=True,
            details="Mật khẩu đúng"
        )
        db.add(log)
        db.commit()
        
        # Mở khóa cửa
        uart_service.unlock_door(duration=5)
        uart_service.set_led("green")
        uart_service.beep(2)
        
        return KeypadVerifyResponse(
            success=True,
            message="Mật khẩu đúng! Chào mừng!"
        )
    else:
        # Xác thực thất bại
        log = AccessLog(
            user_name=None,
            access_method=AccessMethod.KEYPAD,
            access_type=AccessType.ENTRY,
            success=False,
            details="Mật khẩu sai"
        )
        db.add(log)
        db.commit()
        
        uart_service.set_led("red")
        uart_service.beep(1)
        
        return KeypadVerifyResponse(
            success=False,
            message="Mật khẩu sai"
        )

@router.get("/has-password")
async def has_password(db: Session = Depends(get_db)):
    """Kiểm tra xem đã có mật khẩu chưa"""
    password = db.query(KeypadPassword).first()
    return {"has_password": password is not None}
