"""
Runtime Configuration Manager
Allows frontend to configure backend settings without .env file
"""

from typing import Optional
from pydantic import BaseModel

class RuntimeConfig(BaseModel):
    # UART Configuration
    uart_port: str = "COM3"
    uart_baudrate: int = 115200
    
    # Face Recognition
    face_similarity_threshold: float = 0.7
    
    # API Configuration  
    api_host: str = "0.0.0.0"
    api_port: int = 8000

class ConfigManager:
    def __init__(self):
        self._config = RuntimeConfig()
    
    def get_config(self) -> RuntimeConfig:
        """Get current configuration"""
        return self._config
    
    def update_config(self, **kwargs):
        """Update configuration"""
        for key, value in kwargs.items():
            if hasattr(self._config, key):
                setattr(self._config, key, value)
                print(f"✓ Updated config: {key} = {value}")
    
    def get(self, key: str, default=None):
        """Get a specific config value"""
        return getattr(self._config, key, default)

# Global config manager
config_manager = ConfigManager()
