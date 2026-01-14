from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User, RFIDCard, AccessLog, AccessMethod, AccessType
from schemas.rfid import RFIDCardCreate, RFIDCardResponse, RFIDVerifyRequest, RFIDVerifyResponse
from services.state_manager import state_manager
from services.uart import uart_service
from typing import List

router = APIRouter(prefix="/api/rfid", tags=["RFID"])

@router.post("/register", response_model=RFIDCardResponse)
async def register_rfid(
    card_data: RFIDCardCreate,
    db: Session = Depends(get_db)
):
    """Đăng ký thẻ RFID mới (chỉ trong chế độ Registration)"""
    
    # Kiểm tra chế độ
    if not state_manager.is_registration_mode():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ có thể đăng ký RFID trong chế độ Registration"
        )
    
    # Kiểm tra thẻ đã tồn tại chưa
    existing_card = db.query(RFIDCard).filter(RFIDCard.card_uid == card_data.card_uid).first()
    if existing_card:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Thẻ RFID đã được đăng ký"
        )
    
    # Tạo hoặc lấy user
    user = db.query(User).filter(User.name == card_data.user_name).first()
    if not user:
        user = User(name=card_data.user_name)
        db.add(user)
        db.commit()
        db.refresh(user)
    
    # Lưu thẻ RFID
    rfid_card = RFIDCard(
        card_uid=card_data.card_uid,
        user_id=user.id,
        user_name=user.name
    )
    db.add(rfid_card)
    db.commit()
    db.refresh(rfid_card)
    
    # Phản hồi LED xanh và beep
    uart_service.set_led("green")
    uart_service.beep(2)
    
    return RFIDCardResponse(
        id=rfid_card.id,
        card_uid=rfid_card.card_uid,
        user_id=rfid_card.user_id,
        user_name=rfid_card.user_name,
        is_active=rfid_card.is_active,
        created_at=rfid_card.created_at
    )

@router.post("/verify", response_model=RFIDVerifyResponse)
async def verify_rfid(
    request: RFIDVerifyRequest,
    db: Session = Depends(get_db)
):
    """Xác thực thẻ RFID (chỉ trong chế độ Entry/Exit)"""
    
    # Kiểm tra chế độ
    if not state_manager.is_entry_exit_mode():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ có thể xác thực trong chế độ Entry/Exit"
        )
    
    # Tìm thẻ trong database
    rfid_card = db.query(RFIDCard).filter(
        RFIDCard.card_uid == request.card_uid,
        RFIDCard.is_active == True
    ).first()
    
    if rfid_card:
        # Xác thực thành công
        log = AccessLog(
            user_name=rfid_card.user_name,
            access_method=AccessMethod.RFID,
            access_type=AccessType.ENTRY,
            success=True,
            details=f"Card UID: {request.card_uid}"
        )
        db.add(log)
        db.commit()
        
        # Mở khóa cửa
        uart_service.unlock_door(duration=5)
        uart_service.set_led("green")
        uart_service.beep(2)
        
        return RFIDVerifyResponse(
            success=True,
            user_name=rfid_card.user_name,
            message=f"Chào mừng {rfid_card.user_name}!"
        )
    else:
        # Xác thực thất bại
        log = AccessLog(
            user_name=None,
            access_method=AccessMethod.RFID,
            access_type=AccessType.ENTRY,
            success=False,
            details=f"Card UID không hợp lệ: {request.card_uid}"
        )
        db.add(log)
        db.commit()
        
        uart_service.set_led("red")
        uart_service.beep(1)
        
        return RFIDVerifyResponse(
            success=False,
            user_name=None,
            message="Thẻ RFID không hợp lệ"
        )

@router.get("/cards", response_model=List[RFIDCardResponse])
async def get_cards(db: Session = Depends(get_db)):
    """Lấy danh sách thẻ RFID đã đăng ký"""
    cards = db.query(RFIDCard).all()
    
    return [
        RFIDCardResponse(
            id=card.id,
            card_uid=card.card_uid,
            user_id=card.user_id,
            user_name=card.user_name,
            is_active=card.is_active,
            created_at=card.created_at
        )
        for card in cards
    ]

@router.delete("/{card_id}")
async def delete_card(card_id: int, db: Session = Depends(get_db)):
    """Xóa thẻ RFID"""
    card = db.query(RFIDCard).filter(RFIDCard.id == card_id).first()
    
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy thẻ RFID"
        )
    
    db.delete(card)
    db.commit()
    
    return {"success": True, "message": f"Đã xóa thẻ RFID {card.card_uid}"}
