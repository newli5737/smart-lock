from sqlalchemy import Column, Integer, String, DateTime, Enum as SQLEnum, Boolean
from sqlalchemy.sql import func
from database import Base
import enum

class AccessMethod(str, enum.Enum):
    FACE = "face"
    FINGERPRINT = "fingerprint"
    KEYPAD = "keypad"

class AccessType(str, enum.Enum):
    ENTRY = "entry"
    EXIT = "exit"

class AccessLog(Base):
    __tablename__ = "access_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_name = Column(String, nullable=True)  # Null if access denied
    access_method = Column(SQLEnum(AccessMethod), nullable=False)
    access_type = Column(SQLEnum(AccessType), nullable=False)  # entry or exit
    success = Column(Boolean, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    details = Column(String, nullable=True)  # Additional info like error messages
