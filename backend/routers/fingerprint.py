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
import asyncio

router = APIRouter(prefix="/api/fingerprint", tags=["Fingerprint"])

@router.post("/enroll", response_model=FingerprintResponse)
async def enroll_fingerprint(
    fingerprint_data: FingerprintEnrollRequest,
    db: Session = Depends(get_db)
):
    """Đăng ký vân tay mới"""
    
    # Kiểm tra fingerprint_id đã tồn tại chưa
    existing_print = db.query(Fingerprint).filter(Fingerprint.fingerprint_id == fingerprint_data.fingerprint_id).first()
    if existing_print:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Fingerprint ID {fingerprint_data.fingerprint_id} đã tồn tại"
        )
    
    # Kiểm tra hoặc tạo user
    user = db.query(User).filter(User.name == fingerprint_data.user_name).first()
    if not user:
        # Tạo user mới
        # Tìm ID lớn nhất hiện tại
        max_user = db.query(User).order_by(User.id.desc()).first()
        new_user_id = (max_user.id + 1) if max_user else 1
        
        user = User(
            id=new_user_id,
            name=fingerprint_data.user_name
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    # Lưu vân tay với trạng thái inactive (chờ ESP32 xác nhận)
    fingerprint = Fingerprint(
        fingerprint_id=fingerprint_data.fingerprint_id,
        user_id=user.id,
        user_name=user.name,
        finger_position=fingerprint_data.finger_position,
        is_active=False  # Chỉ active khi ESP32 báo enrollment thành công
    )
    db.add(fingerprint)
    db.commit()
    db.refresh(fingerprint)
    
    # Gửi lệnh enrollment đến ESP32
    uart_service.send_message({
        "cmd": "enroll_fingerprint",
        "id": fingerprint_data.fingerprint_id
    })
    
    # Phản hồi beep
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
    
    # Tìm vân tay
    fingerprint = db.query(Fingerprint).filter(
        Fingerprint.fingerprint_id == request.fingerprint_id,
        Fingerprint.is_active == True
    ).first()
    
    if fingerprint:
        # Xác thực thành công
        from models import AccessLog, AccessMethod, AccessType
        log = AccessLog(
            user_name=fingerprint.user_name,
            access_method=AccessMethod.FINGERPRINT,
            access_type=AccessType.ENTRY,
            success=True,
            details=f"Vân tay ID {fingerprint.fingerprint_id}"
        )
        db.add(log)
        db.commit()
        
        # Mở khóa cửa
        uart_service.unlock_door(duration=5)
        uart_service.beep(2)
        
        return FingerprintVerifyResponse(
            success=True,
            message=f"Chào mừng {fingerprint.user_name}!",
            user_name=fingerprint.user_name
        )
    else:
        # Xác thực thất bại
        from models import AccessLog, AccessMethod, AccessType
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

@router.get("/sensor-prints")
async def get_sensor_fingerprints():
    """Lấy danh sách vân tay từ AS608 sensor (không phải database)"""
    from services.message_handler import sensor_fingerprints, sensor_listing_complete
    import time
    
    # Reset và gửi lệnh lấy danh sách đến ESP32
    import services.message_handler as mh
    mh.sensor_fingerprints = []
    mh.sensor_listing_complete = False
    
    uart_service.send_message({
        "cmd": "list_fingerprints"
    })
    
    # Chờ kết quả (tối đa 15 giây)
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
    """Xóa toàn bộ vân tay trong cả database và AS608 sensor"""
    # Xóa tất cả khỏi database
    deleted_count = db.query(Fingerprint).delete()
    db.commit()
    
    # Gửi lệnh xóa tất cả đến ESP32
    uart_service.send_message({
        "cmd": "clear_all_fingerprints"
    })
    
    return {
        "success": True,
        "message": f"Đã xóa {deleted_count} vân tay khỏi database và gửi lệnh xóa tất cả đến AS608"
    }

@router.delete("/{fingerprint_id}")
async def delete_fingerprint(fingerprint_id: int, db: Session = Depends(get_db)):
    """Xóa vân tay"""
    fingerprint = db.query(Fingerprint).filter(Fingerprint.fingerprint_id == fingerprint_id).first()
    if not fingerprint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Fingerprint database ID {fingerprint_db_id} không tồn tại"
        )
    
    # Lưu fingerprint_id để gửi lệnh xóa đến ESP32
    sensor_id = fingerprint.fingerprint_id
    
    # Xóa khỏi database
    db.delete(fingerprint)
    db.commit()
    
    # Gửi lệnh xóa đến ESP32
    uart_service.send_message({
        "cmd": "delete_fingerprint",
        "id": sensor_id
    })
    
    return {"success": True, "message": f"Đã xóa vân tay ID {sensor_id}"}
