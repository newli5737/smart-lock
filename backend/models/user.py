from sqlalchemy import Column, Integer, String, DateTime, LargeBinary, Enum as SQLEnum
from sqlalchemy.sql import func
from database import Base
import enum

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    face_embedding = Column(LargeBinary, nullable=True)  # Numpy array stored as bytes
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
