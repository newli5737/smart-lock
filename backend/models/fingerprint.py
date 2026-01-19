from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from database import Base
from utils.time_utils import vietnam_now

class Fingerprint(Base):
    __tablename__ = "fingerprints"
    
    id = Column(Integer, primary_key=True, index=True)
    fingerprint_id = Column(Integer, unique=True, nullable=False, index=True)  
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=vietnam_now)
    updated_at = Column(DateTime(timezone=True), onupdate=vietnam_now)

    user = relationship("User", back_populates="fingerprints")
