from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, LargeBinary
from sqlalchemy.orm import relationship
from database import Base
from utils.time_utils import vietnam_now

class Face(Base):
    __tablename__ = "faces"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    face_embedding = Column(LargeBinary, nullable=False)  # Numpy array stored as bytes
    image_path = Column(String, nullable=True) # Path to the registered image
    created_at = Column(DateTime(timezone=True), default=vietnam_now)
    updated_at = Column(DateTime(timezone=True), onupdate=vietnam_now)

    user = relationship("User", back_populates="faces")
