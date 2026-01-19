from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from services.camera import camera_service
from services.face_stream import face_recognition_stream

router = APIRouter(prefix="/api/video", tags=["Video Stream"])

@router.get("/stream")
async def video_stream():
    """Stream video thuần từ camera (không có nhận diện)"""
    return StreamingResponse(
        camera_service.generate_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@router.get("/face-recognition")
async def face_recognition_video_stream():
    """
    Stream video với nhận diện khuôn mặt real-time
    - Vẽ khung vuông trung tâm
    - Chỉ nhận diện khi mặt nằm trong khung
    - Cooldown sau khi mở cửa thành công
    """
    return StreamingResponse(
        face_recognition_stream.generate_frames_with_recognition(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )
