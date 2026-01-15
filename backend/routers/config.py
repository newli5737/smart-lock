from fastapi import APIRouter
from pydantic import BaseModel
from config import config_manager, RuntimeConfig
from services.uart import uart_service
from services.message_handler import handle_esp32_message

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
    """Cập nhật cấu hình từ frontend và kết nối UART"""
    updates = request.model_dump(exclude_none=True)
    config_manager.update_config(**updates)
    
    # Logic kết nối lại UART nếu có config liên quan
    if request.uart_port or request.uart_baudrate:
        print("🔄 UART Config changed, reconnecting...")
        uart_service.disconnect()
        
        # Lấy config mới nhất
        current_config = config_manager.get_config()
        
        # Kết nối lại
        if uart_service.connect(current_config.uart_port, current_config.uart_baudrate):
             uart_service.start_listening(handle_esp32_message)
        else:
            return {
                "success": False,
                "message": "Đã lưu cấu hình nhưng không thể kết nối UART",
                "config": current_config
            }
            
    return {
        "success": True,
        "message": "Đã cập nhật cấu hình và kết nối UART",
        "config": config_manager.get_config()
    }
