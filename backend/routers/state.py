from fastapi import APIRouter, Depends, HTTPException, status
from services.state_manager import state_manager, LockMode
from schemas.state import StateResponse, SetModeRequest, SetModeResponse

router = APIRouter(prefix="/api/state", tags=["State Management"])

@router.get("", response_model=StateResponse)
async def get_state():
    """Lấy trạng thái hệ thống hiện tại"""
    state = state_manager.get_state()
    return StateResponse(**state)

@router.post("/mode", response_model=SetModeResponse)
async def set_mode(request: SetModeRequest):
    """Chuyển đổi chế độ hệ thống"""
    success = state_manager.set_mode(request.mode)
    
    if success:
        return SetModeResponse(
            success=True,
            mode=request.mode.value,
            message=f"Đã chuyển sang chế độ {request.mode.value}"
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể chuyển đổi chế độ"
        )

@router.get("/status")
async def get_status():
    """Lấy trạng thái chi tiết của hệ thống"""
    return {
        "mode": state_manager.mode.value,
        "door_status": state_manager.door_status.value,
        "is_entry_exit_mode": state_manager.is_entry_exit_mode(),
        "is_registration_mode": state_manager.is_registration_mode()
    }
