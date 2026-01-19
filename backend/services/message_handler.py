from services.state_manager import state_manager, DoorStatus
from services.uart import uart_service
from services.websocket import websocket_manager
from database import SessionLocal
from models import KeypadPassword, AccessLog, AccessMethod, AccessType, Fingerprint
import hashlib
import asyncio

sensor_fingerprints = []
sensor_listing_complete = False

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def broadcast_async(payload: dict):
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    if loop.is_running():
        loop.create_task(websocket_manager.broadcast(payload))
    else:
        loop.run_until_complete(websocket_manager.broadcast(payload))

def handle_esp32_message(message: dict):
    global sensor_fingerprints, sensor_listing_complete
    
    msg_type = message.get("type")
    status_value = message.get("status")
    
    if status_value and not msg_type:
        if status_value == "listing_fingerprints":
            sensor_fingerprints = []
            sensor_listing_complete = False
        elif status_value == "listing_complete":
            sensor_listing_complete = True
        elif status_value == "all_fingerprints_cleared":
            pass
        elif status_value in ["place_finger", "remove_finger", "place_again", "enrollment_started"]:
            try:
                messages = {
                    "enrollment_started": "Đang bắt đầu đăng ký vân tay...",
                    "place_finger": "Đặt ngón tay lên cảm biến...",
                    "remove_finger": "Nhấc tay ra...",
                    "place_again": "Đặt lại ngón tay..."
                }
                
                payload = {
                    "type": "enrollment_status",
                    "status": status_value,
                    "message": messages.get(status_value, status_value)
                }
                
                broadcast_async(payload)
            except Exception:
                pass
        return
    
    if "fingerprint_found" in message:
        fingerprint_id = message.get("fingerprint_found")
        sensor_fingerprints.append(fingerprint_id)
        return
    
    if msg_type == "fingerprint":
        fingerprint_id = message.get("id")
        
        if isinstance(fingerprint_id, str) and fingerprint_id.startswith("ENROLL_OK:"):
            enrolled_id = int(fingerprint_id.split(":")[1])
            
            db = SessionLocal()
            try:
                fingerprint = db.query(Fingerprint).filter(
                    Fingerprint.fingerprint_id == enrolled_id
                ).first()
                
                if fingerprint:
                    fingerprint.is_active = True
                    db.commit()
                    
                    try:
                        payload = {
                            "type": "enrollment_success",
                            "fingerprint_id": enrolled_id,
                            "message": f"Đăng ký vân tay ID {enrolled_id} thành công!"
                        }
                        
                        broadcast_async(payload)
                    except Exception:
                        pass
            finally:
                db.close()
        elif isinstance(fingerprint_id, str) and fingerprint_id.startswith("ENROLL_FAIL:"):
            error_code = fingerprint_id.split(":")[1]
            
            try:
                payload = {
                    "type": "enrollment_failed",
                    "error_code": error_code,
                    "message": f"Đăng ký vân tay thất bại! Mã lỗi: {error_code}"
                }
                
                broadcast_async(payload)
            except Exception:
                pass
        
        elif fingerprint_id is not None:
            try:
                fid = int(fingerprint_id)
                
                db = SessionLocal()
                try:
                    fingerprint = db.query(Fingerprint).filter(
                        Fingerprint.fingerprint_id == fid,
                        Fingerprint.is_active == True
                    ).first()
                    
                    if fingerprint:
                        log = AccessLog(
                            user_name=fingerprint.user.name,
                            access_method=AccessMethod.FINGERPRINT,
                            access_type=AccessType.ENTRY,
                            success=True,
                            details=f"Vân tay ID {fid}"
                        )
                        db.add(log)
                        db.commit()
                        
                        uart_service.unlock_door(duration=5)
                        uart_service.beep(2)
                        
                        try:
                            payload = {
                                "type": "scan_success",
                                "message": f"Xin chào {fingerprint.user.name}!",
                                "user_name": fingerprint.user.name
                            }
                            
                            broadcast_async(payload)
                        except:
                            pass
                            
                    else:
                        uart_service.beep(3) 
                        
                        try:
                            payload = {
                                "type": "scan_failed",
                                "message": "Vân tay không hợp lệ hoặc chưa được kích hoạt"
                            }
                            
                            broadcast_async(payload)
                        except:
                            pass
                        
                finally:
                    db.close()
            except ValueError:
                pass 
        
    elif msg_type == "keypad":
        password = message.get("password")
        
        db = SessionLocal()
        try:
            password_hash = hash_password(password)
            stored_password = db.query(KeypadPassword).first()
            
            if stored_password and password_hash == stored_password.password_hash:
                log = AccessLog(
                    user_name="Keypad User",
                    access_method=AccessMethod.KEYPAD,
                    access_type=AccessType.ENTRY,
                    success=True,
                    details="Mật khẩu đúng"
                )
                db.add(log)
                db.commit()
                
                uart_service.unlock_door(duration=5)
                uart_service.beep(2)
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
                
                uart_service.beep(1)
        finally:
            db.close()
