# Smart Lock Backend - Quick Start Guide

## ✅ Backend Đã Hoàn Thành

Backend FastAPI đang chạy tại: **http://localhost:8000**

### 🎯 Tính Năng Chính

1. **Nhận Diện Khuôn Mặt** (Uniface - RetinaFace + ArcFace)
   - Đăng ký khuôn mặt với upload ảnh
   - Xác thực khuôn mặt (threshold 0.7)
   - Lưu ảnh vào `uploads/`

2. **RFID Authentication**
   - Đăng ký thẻ RFID
   - Xác thực thẻ RFID

3. **Keypad Password**
   - Đặt/thay đổi mật khẩu (SHA-256)
   - Xác thực mật khẩu

4. **UART Communication với ESP32**
   - JSON protocol qua serial
   - Nhận: RFID scan, keypad input, door status
   - Gửi: unlock, lock, LED control, beep

5. **State Management**
   - 2 chế độ: Entry/Exit và Registration
   - Mode-based access control
   - Door status tracking

6. **Access Logging & Statistics**
   - Log mọi authentication attempt
   - Thống kê theo method, type, success rate
   - Filter và export logs

7. **Runtime Configuration**
   - Cấu hình từ frontend (không cần .env)
   - UART port, baudrate
   - Face similarity threshold

### 📚 API Documentation

Truy cập: **http://localhost:8000/docs**

### 🔧 Cấu Hình

Mặc định:
- Database: `smart_lock.db` (SQLite)
- UART Port: COM3
- Baudrate: 115200
- Face Threshold: 0.7
- API Port: 8000

Thay đổi cấu hình qua API:
```bash
POST http://localhost:8000/api/config/update
{
  "uart_port": "COM5",
  "uart_baudrate": 9600,
  "face_similarity_threshold": 0.75
}
```

### 🧪 Test API

```bash
# Kiểm tra trạng thái
GET http://localhost:8000/health

# Lấy state hiện tại
GET http://localhost:8000/api/state

# Chuyển sang Registration mode
POST http://localhost:8000/api/state/mode
{
  "mode": "registration"
}

# Đăng ký khuôn mặt (multipart/form-data)
POST http://localhost:8000/api/face/register
- name: "Nguyen Van A"
- image: [file upload]
```

### 📁 Cấu Trúc Database

- `users` - Người dùng + face embeddings
- `rfid_cards` - Thẻ RFID
- `keypad_passwords` - Mật khẩu (hashed)
- `access_logs` - Nhật ký truy cập

### 🚀 Chạy Backend

```bash
cd backend
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 📝 UART Protocol (ESP32)

**Từ ESP32 → Backend:**
```json
{"type": "rfid", "uid": "A1B2C3D4"}
{"type": "keypad", "password": "123456"}
{"type": "status", "door": "locked"}
```

**Từ Backend → ESP32:**
```json
{"cmd": "unlock", "duration": 5}
{"cmd": "lock"}
{"cmd": "led", "color": "green"}
{"cmd": "beep", "times": 2}
```

### ⚠️ Lưu Ý

- Uniface đang ở mock mode (cần cài đặt `uniface` package)
- ESP32 optional khi development
- Mật khẩu được hash với SHA-256
- Face embeddings lưu dưới dạng binary

### 🎨 Frontend

Frontend React TypeScript đang được xây dựng với:
- Axios cho API calls
- Zustand cho state management
- React Webcam cho camera
- React Router cho routing

API base URL có thể cấu hình từ frontend (lưu trong localStorage).
