from services.state_manager import state_manager, DoorStatus
from services.uart import uart_service
from database import SessionLocal
from models import KeypadPassword, AccessLog, AccessMethod, AccessType, Fingerprint
import hashlib
import time

sensor_fingerprints = []
sensor_listing_complete = False

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

# Callback xử lý tin nhắn từ ESP32
def handle_esp32_message(message: dict):
    """Xử lý tin nhắn từ ESP32"""
    global sensor_fingerprints, sensor_listing_complete
    
    msg_type = message.get("type")
    status_value = message.get("status")
    
    if status_value and not msg_type:
        print(f"Status received: {status_value}")
        
        if status_value == "listing_fingerprints":
            sensor_fingerprints = []
            sensor_listing_complete = False
            print("Bắt đầu quét danh sách vân tay từ AS608...")
        elif status_value == "listing_complete":
            sensor_listing_complete = True
            print(f"Hoàn thành quét: Tìm thấy {len(sensor_fingerprints)} vân tay trong AS608")
        elif status_value == "all_fingerprints_cleared":
            print("Đã xóa tất cả vân tay trong AS608")
        elif status_value in ["place_finger", "remove_finger", "place_again", "enrollment_started"]:
            try:
                from services.websocket import websocket_manager
                import asyncio
                
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
                
                try:
                    loop = asyncio.get_event_loop()
                except RuntimeError:
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)

                if loop.is_running():
                    loop.create_task(websocket_manager.broadcast(payload))
                else:
                    loop.run_until_complete(websocket_manager.broadcast(payload))
            except Exception as e:
                print(f"Error broadcasting WebSocket: {e}")
        return
    
    if "fingerprint_found" in message:
        fingerprint_id = message.get("fingerprint_found")
        sensor_fingerprints.append(fingerprint_id)
        print(f"Tìm thấy vân tay ID: {fingerprint_id}")
        return
    
    if msg_type == "rfid":
        card_uid = message.get("uid")
        print(f"RFID card scanned: {card_uid}")
        
    elif msg_type == "fingerprint":
        fingerprint_id = message.get("id")
        print(f"Fingerprint detected: {fingerprint_id}")
        
        if isinstance(fingerprint_id, str) and fingerprint_id.startswith("ENROLL_OK:"):
            enrolled_id = int(fingerprint_id.split(":")[1])
            print(f"Fingerprint enrollment successful for ID: {enrolled_id}")
            
            db = SessionLocal()
            try:
                fingerprint = db.query(Fingerprint).filter(
                    Fingerprint.fingerprint_id == enrolled_id
                ).first()
                
                if fingerprint:
                    fingerprint.is_active = True
                    db.commit()
                    print(f"Activated fingerprint ID: {enrolled_id}")
                    
                    try:
                        from services.websocket import websocket_manager
                        import asyncio
                        
                        payload = {
                            "type": "enrollment_success",
                            "fingerprint_id": enrolled_id,
                            "message": f"Đăng ký vân tay ID {enrolled_id} thành công!"
                        }
                        
                        try:
                            loop = asyncio.get_event_loop()
                        except RuntimeError:
                            loop = asyncio.new_event_loop()
                            asyncio.set_event_loop(loop)

                        if loop.is_running():
                            loop.create_task(websocket_manager.broadcast(payload))
                        else:
                            loop.run_until_complete(websocket_manager.broadcast(payload))
                    except Exception as e:
                        print(f"Error broadcasting success: {e}")
                        pass
                else:
                    print(f"Fingerprint ID {enrolled_id} not found in database")
            finally:
                db.close()
        elif isinstance(fingerprint_id, str) and fingerprint_id.startswith("ENROLL_FAIL:"):
            error_code = fingerprint_id.split(":")[1]
            print(f"Fingerprint enrollment failed with code: {error_code}")
            
            try:
                from services.websocket import websocket_manager
                import asyncio
                
                payload = {
                    "type": "enrollment_failed",
                    "error_code": error_code,
                    "message": f"Đăng ký vân tay thất bại! Mã lỗi: {error_code}"
                }
                
                try:
                    loop = asyncio.get_event_loop()
                except RuntimeError:
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)

                if loop.is_running():
                    loop.create_task(websocket_manager.broadcast(payload))
                else:
                    loop.run_until_complete(websocket_manager.broadcast(payload))
            except Exception as e:
                print(f"Error broadcasting failure: {e}")
                pass
        
        elif fingerprint_id is not None:
            try:
                fid = int(fingerprint_id)
                print(f"Verifying fingerprint ID: {fid}")
                
                db = SessionLocal()
                try:
                    fingerprint = db.query(Fingerprint).filter(
                        Fingerprint.fingerprint_id == fid,
                        Fingerprint.is_active == True
                    ).first()
                    
                    if fingerprint:
                        print(f"Fingerprint ID {fid} matched: {fingerprint.user_name}")
                        
                        log = AccessLog(
                            user_name=fingerprint.user_name,
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
                            from services.websocket import websocket_manager
                            import asyncio
                            
                            payload = {
                                "type": "scan_success",
                                "message": f"Xin chào {fingerprint.user_name}!",
                                "user_name": fingerprint.user_name
                            }
                            
                            try:
                                loop = asyncio.get_event_loop()
                            except RuntimeError:
                                loop = asyncio.new_event_loop()
                                asyncio.set_event_loop(loop)

                            if loop.is_running():
                                loop.create_task(websocket_manager.broadcast(payload))
                            else:
                                loop.run_until_complete(websocket_manager.broadcast(payload))
                        except:
                            pass
                            
                    else:
                        print(f"Fingerprint ID {fid} not found or inactive")
                        uart_service.beep(3) 
                        
                        try:
                            from services.websocket import websocket_manager
                            import asyncio
                            
                            payload = {
                                "type": "scan_failed",
                                "message": "Vân tay không hợp lệ hoặc chưa được kích hoạt"
                            }
                            
                            try:
                                loop = asyncio.get_event_loop()
                            except RuntimeError:
                                loop = asyncio.new_event_loop()
                                asyncio.set_event_loop(loop)

                            if loop.is_running():
                                loop.create_task(websocket_manager.broadcast(payload))
                            else:
                                loop.run_until_complete(websocket_manager.broadcast(payload))
                        except:
                            pass
                        
                finally:
                    db.close()
            except ValueError:
                pass 
        
    elif msg_type == "keypad":
        password = message.get("password")
        print(f"Keypad input received: {password}")
        
        db = SessionLocal()
        try:
            password_hash = hash_password(password)
            stored_password = db.query(KeypadPassword).first()
            
            if stored_password and password_hash == stored_password.password_hash:
                print(f"Password correct - Unlocking door")
                
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
                print(f"Password incorrect")
                
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
        
        if door_status == "locked":
            state_manager.set_door_status(DoorStatus.LOCKED)
        elif door_status == "unlocked":
            state_manager.set_door_status(DoorStatus.UNLOCKED)
