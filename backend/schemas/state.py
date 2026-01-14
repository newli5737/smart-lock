from pydantic import BaseModel
from services.state_manager import LockMode, DoorStatus

class StateResponse(BaseModel):
    mode: str
    door_status: str

class SetModeRequest(BaseModel):
    mode: LockMode

class SetModeResponse(BaseModel):
    success: bool
    mode: str
    message: str
