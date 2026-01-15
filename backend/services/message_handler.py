from services.state_manager import state_manager, DoorStatus

# Callback xử lý tin nhắn từ ESP32
def handle_esp32_message(message: dict):
    """Xử lý tin nhắn từ ESP32"""
    msg_type = message.get("type")
    
    if msg_type == "rfid":
        # ESP32 gửi dữ liệu RFID
        card_uid = message.get("uid")
        print(f"📡 RFID card scanned: {card_uid}")
        # Frontend sẽ gọi API /api/rfid/verify để xác thực (thông qua polling hoặc SSE nếu có)
        # Hiện tại logic xác thực nằm ở backend endpoint được gọi từ frontend
        # Hoặc nếu ESP32 gửi lên đây thì backend có thể tự verify và gửi lệnh unlock về lại
        # Tuy nhiên architecture hiện tại có vẻ là Frontend active polling hoặc listening.
        # Nhưng code cũ chỉ print.
        
    elif msg_type == "keypad":
        # ESP32 gửi mật khẩu từ bàn phím
        password = message.get("password")
        print(f"📡 Keypad input received: {password}")
        
    elif msg_type == "status":
        # ESP32 gửi trạng thái cửa
        door_status = message.get("door")
        print(f"📡 Door status: {door_status}")
        if door_status == "locked":
            state_manager.set_door_status(DoorStatus.LOCKED)
        elif door_status == "unlocked":
            state_manager.set_door_status(DoorStatus.UNLOCKED)
