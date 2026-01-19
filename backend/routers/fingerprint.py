from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import Fingerprint, User
from schemas.fingerprint import (
    FingerprintEnrollRequest,
    FingerprintResponse,
    FingerprintVerifyRequest,
    FingerprintVerifyResponse
)
from services.state_manager import state_manager
from services.uart import uart_service
from models import AccessLog, AccessMethod, AccessType
import services.message_handler as mh
import asyncio

router = APIRouter(prefix="/api/fingerprint", tags=["Fingerprint"])

@router.post("/enroll", response_model=FingerprintResponse)
async def enroll_fingerprint(
    fingerprint_data: FingerprintEnrollRequest,
    db: Session = Depends(get_db)
):

    existing_print = db.query(Fingerprint).filter(Fingerprint.fingerprint_id == fingerprint_data.fingerprint_id).first()
    if existing_print:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Fingerprint ID {fingerprint_data.fingerprint_id} đã tồn tại"
        )
    
    user = db.query(User).filter(User.name == fingerprint_data.user_name).first()
    if not user:
        max_user = db.query(User).order_by(User.id.desc()).first()
        new_user_id = (max_user.id + 1) if max_user else 1
        
        user = User(
            id=new_user_id,
            name=fingerprint_data.user_name
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    fingerprint = Fingerprint(
        fingerprint_id=fingerprint_data.fingerprint_id,
        user_id=user.id,
        # user_name removed
        finger_position=fingerprint_data.finger_position,
        is_active=False  
    )
    db.add(fingerprint)
    db.commit()
    db.refresh(fingerprint)
    
    uart_service.send_message({
        "cmd": "enroll_fingerprint",
        "id": fingerprint_data.fingerprint_id
    })
    
    uart_service.beep(2)
    
    return FingerprintResponse(
        id=fingerprint.id,
        fingerprint_id=fingerprint.fingerprint_id,
        user_id=fingerprint.user_id,
        user_name=user.name, # Use mapped user object
        finger_position=fingerprint.finger_position,
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
            user_name=fingerprint.user.name, # Use relationship
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
    # Ensure lazy load works or do joinedload if performance needed. 
    # For small app, simple access is fine.
    return [
        FingerprintResponse(
            id=fp.id,
            fingerprint_id=fp.fingerprint_id,
            user_id=fp.user_id,
            user_name=fp.user.name, # Access relationship
            finger_position=fp.finger_position,
            is_active=fp.is_active,
            created_at=fp.created_at
        )
        for fp in fingerprints
    ]

@router.get("/sensor-prints")
async def get_sensor_fingerprints():
    import time
    
    mh.sensor_fingerprints = []
    mh.sensor_listing_complete = False
    
    uart_service.send_message({
        "cmd": "list_fingerprints"
    })
    
    timeout = 15
    start_time = time.time()
    
    while not mh.sensor_listing_complete and (time.time() - start_time) < timeout:
        await asyncio.sleep(0.1)
    
    if mh.sensor_listing_complete:
        if len(mh.sensor_fingerprints) == 0:
            message = "Không có vân tay nào trong AS608 sensor"
        else:
            message = f"Tìm thấy {len(mh.sensor_fingerprints)} vân tay trong AS608 sensor"
        
        return {
            "success": True,
            "fingerprints": mh.sensor_fingerprints,
            "count": len(mh.sensor_fingerprints),
            "message": message
        }
    else:
        return {
            "success": False,
            "fingerprints": mh.sensor_fingerprints,
            "count": len(mh.sensor_fingerprints),
            "message": "Timeout - Chỉ nhận được một phần kết quả"
        }

@router.delete("/clear-all")
async def clear_all_fingerprints(db: Session = Depends(get_db)):
    deleted_count = db.query(Fingerprint).delete()
    db.commit()
    
    uart_service.send_message({
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
    
    uart_service.send_message({
        "cmd": "delete_fingerprint",
        "id": sensor_id
    })
    
    return {"success": True, "message": f"Đã xóa vân tay ID {sensor_id}"}
