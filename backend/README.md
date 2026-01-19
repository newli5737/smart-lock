# Smart Lock Backend API

Backend cho hệ thống khóa thông minh IoT với Face Recognition, RFID, và Keypad.

## Tính Năng

- ✅ Nhận diện khuôn mặt (Uniface)
- ✅ Xác thực thẻ RFID
- ✅ Xác thực mật khẩu bàn phím
- ✅ Giao tiếp UART với ESP32
- ✅ Quản lý trạng thái 2 chế độ (Entry/Exit và Registration)
- ✅ Nhật ký truy cập chi tiết
- ✅ Thống kê truy cập

## Cài Đặt

```bash
# Cài đặt dependencies với uv
uv sync

# Hoặc với pip
pip install -r requirements.txt
```

## Cấu Hình

Chỉnh sửa file `.env`:

```env
DATABASE_URL=sqlite:///./smart_lock.db
UART_PORT=COM6
UART_BAUDRATE=115200
FACE_SIMILARITY_THRESHOLD=0.6
API_HOST=0.0.0.0
API_PORT=8000
```

## Chạy Server

```bash
# Với uv
uv run python main.py

# Hoặc với uvicorn trực tiếp
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API sẽ chạy tại: `http://localhost:8000`

API Documentation: `http://localhost:8000/docs`

## Giao Thức UART với ESP32

### Tin nhắn TỪ ESP32 → Backend

```json
// RFID Card Scanned
{"type": "rfid", "uid": "A1B2C3D4"}

// Keypad Input
{"type": "keypad", "password": "123456"}

// Door Status
{"type": "status", "door": "locked"}
```

### Tin nhắn TỪ Backend → ESP32

```json
// Unlock Door
{"cmd": "unlock", "duration": 5}

// Lock Door
{"cmd": "lock"}

// Set LED
{"cmd": "led", "color": "green"}  // green, red, blue, off

// Beep
{"cmd": "beep", "times": 2}
```

## API Endpoints

### State Management
- `GET /api/state` - Lấy trạng thái hệ thống
- `POST /api/state/mode` - Chuyển đổi chế độ
- `GET /api/state/status` - Trạng thái chi tiết

### Face Recognition
- `POST /api/face/register` - Đăng ký khuôn mặt (chỉ trong chế độ Registration)
- `POST /api/face/verify` - Xác thực khuôn mặt (chỉ trong chế độ Entry/Exit)
- `GET /api/face/users` - Danh sách người dùng
- `DELETE /api/face/{user_id}` - Xóa người dùng

### RFID
- `POST /api/rfid/register` - Đăng ký thẻ RFID (chỉ trong chế độ Registration)
- `POST /api/rfid/verify` - Xác thực thẻ RFID (chỉ trong chế độ Entry/Exit)
- `GET /api/rfid/cards` - Danh sách thẻ
- `DELETE /api/rfid/{card_id}` - Xóa thẻ

### Keypad
- `POST /api/keypad/set-password` - Đặt mật khẩu (chỉ trong chế độ Registration)
- `POST /api/keypad/verify` - Xác thực mật khẩu (chỉ trong chế độ Entry/Exit)
- `GET /api/keypad/has-password` - Kiểm tra đã có mật khẩu chưa

### Access Logs
- `GET /api/logs` - Lấy nhật ký với bộ lọc
- `GET /api/logs/stats` - Thống kê truy cập
- `DELETE /api/logs/{log_id}` - Xóa nhật ký
- `DELETE /api/logs/clear-all` - Xóa tất cả nhật ký

## Cấu Trúc Dự Án

```
backend/
├── main.py                 # FastAPI app
├── config.py              # Configuration
├── database.py            # Database setup
├── models/                # SQLAlchemy models
│   ├── user.py
│   ├── rfid.py
│   ├── keypad.py
│   └── access_log.py
├── routers/               # API endpoints
│   ├── state.py
│   ├── face.py
│   ├── rfid.py
│   ├── keypad.py
│   └── logs.py
├── services/              # Business logic
│   ├── uart.py
│   ├── uniface.py
│   └── state_manager.py
└── schemas/               # Pydantic schemas
    ├── user.py
    ├── rfid.py
    ├── keypad.py
    ├── state.py
    └── logs.py
```

## Database

Sử dụng SQLite với các bảng:
- `users` - Người dùng với face embeddings
- `rfid_cards` - Thẻ RFID
- `keypad_passwords` - Mật khẩu bàn phím (hashed)
- `access_logs` - Nhật ký truy cập

## Chế Độ Hoạt Động

### Entry/Exit Mode
- Xác thực người dùng (face, RFID, keypad)
- Mở khóa cửa khi xác thực thành công
- Ghi nhật ký truy cập

### Registration Mode
- Đăng ký khuôn mặt mới
- Đăng ký thẻ RFID mới
- Đặt/thay đổi mật khẩu bàn phím

## Lưu Ý

- Uniface cần được cài đặt riêng
- ESP32 là optional khi development (có thể test API mà không cần ESP32)
- Mật khẩu được hash bằng SHA-256
- Face embeddings được lưu dưới dạng binary trong database
