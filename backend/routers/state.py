from fastapi import APIRouter, Depends, HTTPException, status
from services.state_manager import state_manager, LockMode, DoorStatus
from schemas.state import StateResponse, SetModeRequest, SetModeResponse

router = APIRouter(prefix="/api/state", tags=["State Management"])

@router.get("", response_model=StateResponse)
async def get_state():
    state = state_manager.get_state()
    return StateResponse(**state)

@router.post("/mode", response_model=SetModeResponse)
async def set_mode(request: SetModeRequest):
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
    return {
        "mode": state_manager.mode.value,
        "door_status": state_manager.door_status.value,
        "is_entry_exit_mode": state_manager.is_entry_exit_mode(),
        "is_registration_mode": state_manager.is_registration_mode()
    }

from schemas.state import SetDoorStatusRequest, SetDoorStatusResponse
from services.uart import uart_service

@router.post("/door", response_model=SetDoorStatusResponse)
async def set_door_status(request: SetDoorStatusRequest):
    if request.status == DoorStatus.UNLOCKED:
        uart_service.unlock_door()
        state_manager.set_door_status(DoorStatus.UNLOCKED)
        return SetDoorStatusResponse(
            success=True,
            status=DoorStatus.UNLOCKED.value,
            message="Đã gửi lệnh mở cửa"
        )
    elif request.status == DoorStatus.LOCKED:
        uart_service.lock_door()
        state_manager.set_door_status(DoorStatus.LOCKED)
        return SetDoorStatusResponse(
            success=True,
            status=DoorStatus.LOCKED.value,
            message="Đã gửi lệnh đóng cửa"
        )
    else:
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Trạng thái cửa không hợp lệ"
        )
