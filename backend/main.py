from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import Base, engine
from routers import state, face, rfid, keypad, logs, config, video
from services.uart import uart_service
from services.state_manager import state_manager
from models import AccessLog, AccessMethod, AccessType
from database import SessionLocal

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events"""
    # Startup
    print("🚀 Starting Smart Lock Backend...")
    
    # Tạo database tables
    Base.metadata.create_all(bind=engine)
    print("✓ Database tables created")
    
    # Không tự động kết nối UART nữa. Chờ config từ frontend.
    print("ℹ Waiting for UART configuration from Frontend...")
    
    yield
    
    # Shutdown
    print("🛑 Shutting down Smart Lock Backend...")
    uart_service.disconnect()

# Tạo FastAPI app
app = FastAPI(
    title="Smart Lock API",
    description="IoT Smart Lock với Face Recognition, RFID, và Keypad",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Trong production nên chỉ định cụ thể
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(state.router)
app.include_router(face.router)
app.include_router(rfid.router)
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
    """Health check endpoint"""
    return {
        "status": "healthy",
        "uart_connected": uart_service.serial_conn is not None and uart_service.serial_conn.is_open,
        "mode": state_manager.mode.value,
        "door_status": state_manager.door_status.value
    }

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
