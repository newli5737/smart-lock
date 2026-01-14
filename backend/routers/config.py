from fastapi import APIRouter
from pydantic import BaseModel
from config import config_manager, RuntimeConfig

router = APIRouter(prefix="/api/config", tags=["Configuration"])

class UpdateConfigRequest(BaseModel):
    uart_port: str | None = None
    uart_baudrate: int | None = None
    face_similarity_threshold: float | None = None

@router.get("", response_model=RuntimeConfig)
async def get_config():
    """Lấy cấu hình hiện tại"""
    return config_manager.get_config()

@router.post("/update")
async def update_config(request: UpdateConfigRequest):
    """Cập nhật cấu hình từ frontend"""
    updates = request.model_dump(exclude_none=True)
    config_manager.update_config(**updates)
    
    return {
        "success": True,
        "message": "Đã cập nhật cấu hình",
        "config": config_manager.get_config()
    }
