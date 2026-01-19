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
    
    existing_password = db.query(KeypadPassword).first()
    
    if existing_password:
        if not request.old_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cần nhập mật khẩu cũ để đổi mật khẩu"
            )
        
        old_hash = hash_password(request.old_password)
        if old_hash != existing_password.password_hash:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Mật khẩu cũ không đúng"
            )
    
    password_hash = hash_password(request.password)
    
    db.query(KeypadPassword).delete()
    
    keypad_password = KeypadPassword(password_hash=password_hash)
    db.add(keypad_password)
    db.commit()
    
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
    
    if not state_manager.is_entry_exit_mode():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ có thể xác thực trong chế độ Entry/Exit"
        )
    
    password_hash = hash_password(request.password)
    
    stored_password = db.query(KeypadPassword).first()
    
    if not stored_password:
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
        log = AccessLog(
            user_name="Keypad User",
            access_method=AccessMethod.KEYPAD,
            access_type=AccessType.ENTRY,
            success=True,
            details="Mật khẩu đúng"
        )
        db.add(log)
        db.commit()
        
        # uart_service.unlock_door(duration=5)
        uart_service.beep(2)
        
        return KeypadVerifyResponse(
            success=True,
            message="Mật khẩu đúng! Chào mừng!"
        )
    else:
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
    password = db.query(KeypadPassword).first()
    return {"has_password": password is not None}
