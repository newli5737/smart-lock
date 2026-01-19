from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import Fingerprint, User, AccessLog, AccessMethod, AccessType
from pydantic import BaseModel
from services.state_manager import state_manager
from services.uart import uart_service
import services.message_handler as mh
import asyncio

router = APIRouter(prefix="/api/fingerprint", tags=["Fingerprint"])

class FingerprintEnrollRequest(BaseModel):
    user_id: int

class FingerprintResponse(BaseModel):
    id: int
    fingerprint_id: int
    user_id: int
    user_name: str
    is_active: bool
    created_at: object

class FingerprintVerifyRequest(BaseModel):
    fingerprint_id: int

class FingerprintVerifyResponse(BaseModel):
    success: bool
    message: str
    user_name: str = None

@router.post("/enroll", response_model=FingerprintResponse)
async def enroll_fingerprint(
    fingerprint_data: FingerprintEnrollRequest,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == fingerprint_data.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Người dùng không tồn tại"
        )

    # Auto-assign ID
    used_ids = [fp.fingerprint_id for fp in db.query(Fingerprint).all()]
    new_id = 1
    while new_id in used_ids:
        new_id += 1
    
    if new_id > 127:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bộ nhớ vân tay đã đầy (Max 127)"
        )
    
    fingerprint = Fingerprint(
        fingerprint_id=new_id,
        user_id=user.id,
        is_active=False  
    )
    db.add(fingerprint)
    db.commit()
    db.refresh(fingerprint)
    
    uart_service.send_command({
        "cmd": "enroll_fingerprint",
        "id": new_id
    })
    
    uart_service.beep(2)
    
    return FingerprintResponse(
        id=fingerprint.id,
        fingerprint_id=fingerprint.fingerprint_id,
        user_id=fingerprint.user_id,
        user_name=user.name,
        is_active=fingerprint.is_active,
        created_at=fingerprint.created_at
    )

@router.post("/verify", response_model=FingerprintVerifyResponse)
async def verify_fingerprint(
    request: FingerprintVerifyRequest,
    db: Session = Depends(get_db)
):
    
    if not state_manager.is_entry_exit_mode():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ có thể xác thực trong chế độ Entry/Exit"
        )
    
    fingerprint = db.query(Fingerprint).filter(
        Fingerprint.fingerprint_id == request.fingerprint_id,
        Fingerprint.is_active == True
    ).first()
    
    if fingerprint:
        log = AccessLog(
            user_name=fingerprint.user.name, 
            access_method=AccessMethod.FINGERPRINT,
            access_type=AccessType.ENTRY,
            success=True,
            details=f"Vân tay ID {fingerprint.fingerprint_id}"
        )
        db.add(log)
        db.commit()
        
        # uart_service.unlock_door(duration=5)
        uart_service.beep(2)
        
        return FingerprintVerifyResponse(
            success=True,
            message=f"Chào mừng {fingerprint.user.name}!",
            user_name=fingerprint.user.name
        )
    else:
        log = AccessLog(
            user_name=None,
            access_method=AccessMethod.FINGERPRINT,
            access_type=AccessType.ENTRY,
            success=False,
            details=f"Vân tay ID {request.fingerprint_id} không tồn tại hoặc chưa active"
        )
        db.add(log)
        db.commit()
        
        uart_service.beep(1)
        
        return FingerprintVerifyResponse(
            success=False,
            message="Vân tay không hợp lệ"
        )

@router.get("/prints")
async def get_fingerprints(db: Session = Depends(get_db)):
    fingerprints = db.query(Fingerprint).all()
    return [
        FingerprintResponse(
            id=fp.id,
            fingerprint_id=fp.fingerprint_id,
            user_id=fp.user_id,
            user_name=fp.user.name, 
            is_active=fp.is_active,
            created_at=fp.created_at
        )
        for fp in fingerprints
    ]

@router.get("/sensor-prints")
async def get_sensor_prints():
    # Send command to list fingerprints
    mh.sensor_listing_complete = False
    mh.sensor_fingerprints = []
    
    success = uart_service.send_command({
        "cmd": "list_fingerprints"
    })
    
    if not success:
         raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Không thể gửi lệnh đến cảm biến (Mất kết nối UART)"
        )
    
    # Wait for results (max 3 seconds)
    for _ in range(30):
        if mh.sensor_listing_complete:
            break
        await asyncio.sleep(0.1)
        
    return {
        "success": True,
        "message": "Lấy danh sách từ cảm biến thành công",
        "fingerprints": mh.sensor_fingerprints,
        "count": len(mh.sensor_fingerprints)
    }

@router.delete("/clear-all")
async def clear_all_fingerprints(db: Session = Depends(get_db)):
    deleted_count = db.query(Fingerprint).delete()
    db.commit()
    
    uart_service.send_command({
        "cmd": "clear_all_fingerprints"
    })
    
    return {
        "success": True,
        "message": f"Đã xóa {deleted_count} vân tay khỏi database và gửi lệnh xóa tất cả đến AS608"
    }

@router.delete("/{fingerprint_id}")
async def delete_fingerprint(fingerprint_id: int, db: Session = Depends(get_db)):
    fingerprint = db.query(Fingerprint).filter(Fingerprint.fingerprint_id == fingerprint_id).first()
    if not fingerprint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Fingerprint database ID {fingerprint_id} không tồn tại"
        )
    
    sensor_id = fingerprint.fingerprint_id
    
    db.delete(fingerprint)
    db.commit()
    
    uart_service.send_command({
        "cmd": "delete_fingerprint",
        "id": sensor_id
    })
    
    return {"success": True, "message": f"Đã xóa vân tay ID {sensor_id}"}


@router.post("/retry/{fingerprint_id}")
async def retry_enroll_fingerprint(
    fingerprint_id: int,
    db: Session = Depends(get_db)
):
    fingerprint = db.query(Fingerprint).filter(Fingerprint.fingerprint_id == fingerprint_id).first()
    if not fingerprint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vân tay không tồn tại"
        )
    
    if fingerprint.is_active:
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vân tay đã Active, không cần đăng ký lại"
        )

    # Resend command
    uart_service.send_command({
        "cmd": "enroll_fingerprint",
        "id": fingerprint.fingerprint_id
    })
    
    uart_service.beep(2)
    
    return {"success": True, "message": f"Đã gửi lại lệnh đăng ký cho ID {fingerprint.fingerprint_id}"}

