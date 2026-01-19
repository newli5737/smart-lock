from fastapi import APIRouter
from pydantic import BaseModel
from config import config_manager
from services.uart import uart_service
from services.message_handler import handle_esp32_message
from database import DATABASE_URL

router = APIRouter(prefix="/api/config", tags=["Configuration"])

class UpdateConfigRequest(BaseModel):
    uart_port: str | None = None
    uart_baudrate: int | None = None
    face_similarity_threshold: float | None = None

@router.get("")
async def get_config():
    config = config_manager.get_config()
    return {
        "uart_port": config.uart_port,
        "uart_baudrate": config.uart_baudrate,
        "face_similarity_threshold": config.face_similarity_threshold,
        "database_url": DATABASE_URL
    }

@router.post("/update")
async def update_config(request: UpdateConfigRequest):
    updates = request.model_dump(exclude_none=True)
    config_manager.update_config(**updates)
    
    if request.uart_port or request.uart_baudrate:
        print("UART Config changed, reconnecting...")
        uart_service.disconnect()
        
        current_config = config_manager.get_config()
        
        if uart_service.connect(current_config.uart_port, current_config.uart_baudrate):
             uart_service.start_listening(handle_esp32_message)
        else:
            return {
                "success": False,
                "message": "Đã lưu cấu hình nhưng không thể kết nối UART",
                "config": {
                    "uart_port": current_config.uart_port,
                    "uart_baudrate": current_config.uart_baudrate,
                    "face_similarity_threshold": current_config.face_similarity_threshold,
                    "database_url": DATABASE_URL
                }
            }
            
    return {
        "success": True,
        "message": "Đã cập nhật cấu hình và kết nối UART",
        "config": {
            "uart_port": config_manager.get_config().uart_port,
            "uart_baudrate": config_manager.get_config().uart_baudrate,
            "face_similarity_threshold": config_manager.get_config().face_similarity_threshold,
            "database_url": DATABASE_URL
        }
    }
