from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from services.camera import camera_service

router = APIRouter(prefix="/api/video", tags=["Video Stream"])

@router.get("/stream")
async def video_stream():
    """Stream video from backend camera"""
    return StreamingResponse(
        camera_service.generate_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )
