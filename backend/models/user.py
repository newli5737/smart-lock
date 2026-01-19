from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from database import Base
from utils.time_utils import vietnam_now

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False) # Ensure name is unique for simple merging
    created_at = Column(DateTime(timezone=True), default=vietnam_now)
    updated_at = Column(DateTime(timezone=True), onupdate=vietnam_now)

    fingerprints = relationship("Fingerprint", back_populates="user")
    faces = relationship("Face", back_populates="user")
