from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import Base, engine
from routers import state, face, fingerprint, keypad, logs, config, video, user
from services.uart import uart_service
from services.state_manager import state_manager
from services.websocket import websocket_manager
from models import AccessLog, AccessMethod, AccessType
from database import SessionLocal

@asynccontextmanager
async def lifespan(app: FastAPI):

    Base.metadata.create_all(bind=engine)
    print("Database tables created")
    
    from models import KeypadPassword
    import hashlib
    db = SessionLocal()
    try:
        existing_password = db.query(KeypadPassword).first()
        if not existing_password:
            default_hash = hashlib.sha256("123456".encode()).hexdigest()
            default_pwd = KeypadPassword(password_hash=default_hash)
            db.add(default_pwd)
            db.commit()
            print("Default password (123456) initialized")
        else:
            print("Password already exists")
    finally:
        db.close()
    
    print("Waiting for UART configuration from Frontend...")

    # Initialize Camera Service and Face Stream globally
    from services.face_stream import face_recognition_stream
    from services.camera import camera_service
    
    print("Initializing Camera Service...")
    try:
        # Warm up camera
        camera_service.get_frame()
        # Start face recognition stream (it runs its own loop if generated, but we just ensures it's ready)
        # Actually generate_frames_with_recognition is a generator.
        # If we want it to run always, we might need a separate thread consuming it or different design.
        # But User request: "mới chạy?? đúng nguyên tắc là nó phải khởi tạo sớm hơn".
        # Initializing `CameraService` (opening camera) here handles the "slow start".
        print("Camera initialized.")
    except Exception as e:
        print(f"Failed to initialize camera: {e}")
    
    yield
    
    print("Shutting down Smart Lock Backend...")
    uart_service.disconnect()

app = FastAPI(
    title="Smart Lock API",
    description="IoT Smart Lock với Face Recognition và Keypad",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



app.include_router(state.router)
app.include_router(face.router)
app.include_router(fingerprint.router)
app.include_router(keypad.router)
app.include_router(logs.router)
app.include_router(config.router)
app.include_router(video.router)
app.include_router(user.router)

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Smart Lock API",
        "version": "1.0.0",
        "status": "running",
        "mode": state_manager.mode.value,
        "door_status": state_manager.door_status.value
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "uart_connected": uart_service.serial_conn is not None and uart_service.serial_conn.is_open,
        "mode": state_manager.mode.value,
        "door_status": state_manager.door_status.value,
        "websocket_clients": len(websocket_manager.active_connections)
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        websocket_manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    from config import config_manager
    
    cfg = config_manager.get_config()
    uvicorn.run(
        "main:app",
        host=cfg.api_host,
        port=cfg.api_port,
        reload=True
    )
