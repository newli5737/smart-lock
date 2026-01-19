import threading
from enum import Enum
from typing import Optional, Callable, List

class LockMode(str, Enum):
    ENTRY_EXIT = "entry_exit"  
    REGISTRATION = "registration"  

class DoorStatus(str, Enum):
    LOCKED = "locked"
    UNLOCKED = "unlocked"

class StateManager:
    def __init__(self):
        self._lock = threading.Lock()
        self._mode: LockMode = LockMode.ENTRY_EXIT
        self._door_status: DoorStatus = DoorStatus.LOCKED
        self._callbacks: List[Callable] = []
    
    @property
    def mode(self) -> LockMode:
        with self._lock:
            return self._mode
    
    @property
    def door_status(self) -> DoorStatus:
        with self._lock:
            return self._door_status
    
    def set_mode(self, mode: LockMode) -> bool:
        with self._lock:
            if mode not in LockMode:
                return False
            
            old_mode = self._mode
            self._mode = mode
            
            print(f"Mode changed: {old_mode} → {mode}")
            self._notify_callbacks()
            return True
    
    def set_door_status(self, status: DoorStatus):
        with self._lock:
            old_status = self._door_status
            self._door_status = status
            
            if old_status != status:
                print(f"Door status changed: {old_status} → {status}")
                self._notify_callbacks()
    
    def is_entry_exit_mode(self) -> bool:
        return self.mode == LockMode.ENTRY_EXIT
    
    def is_registration_mode(self) -> bool:
        return self.mode == LockMode.REGISTRATION
    
    def register_callback(self, callback: Callable):
        with self._lock:
            self._callbacks.append(callback)
    
    def _notify_callbacks(self):
        for callback in self._callbacks:
            try:
                callback(self._mode, self._door_status)
            except Exception as e:
                print(f"Error in state change callback: {e}")
    
    def get_state(self) -> dict:
        with self._lock:
            return {
                "mode": self._mode.value,
                "door_status": self._door_status.value
            }

state_manager = StateManager()
