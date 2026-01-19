from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import Base, engine
from routers import state, face, fingerprint, keypad, logs, config, video
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
    
    yield
    
    print("Shutting down Smart Lock Backend...")
    uart_service.disconnect()

app = FastAPI(
    title="Smart Lock API",
    description="IoT Smart Lock với Face Recognition, RFID, và Keypad",
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

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"WebSocket client connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        print(f"WebSocket client disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        for connection in self.active_connections[:]:  
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Error broadcasting to client: {e}")
                try:
                    self.disconnect(connection)
                except:
                    pass

manager = ConnectionManager()

app.include_router(state.router)
app.include_router(face.router)
app.include_router(fingerprint.router)
app.include_router(keypad.router)
app.include_router(logs.router)
app.include_router(config.router)
app.include_router(video.router)

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
