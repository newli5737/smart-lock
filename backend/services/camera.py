import cv2
import time
from typing import Generator

class CameraService:
    def __init__(self):
        self.camera = None

    def get_frame(self):
        """
        Capture a frame from the webcam.
        Returns bytes of the frame or None if failed.
        """
        if self.camera is None or not self.camera.isOpened():
             self.camera = cv2.VideoCapture(0)
             # Warm up
             time.sleep(0.5)

        success, frame = self.camera.read()
        if not success:
            # Try to re-open
            self.camera.release()
            self.camera = cv2.VideoCapture(0)
            success, frame = self.camera.read()
            if not success:
                return None

        ret, buffer = cv2.imencode('.jpg', frame)
        if not ret:
            return None
        
        return buffer.tobytes()

    def generate_frames(self) -> Generator[bytes, None, None]:
        """Generator function for video streaming"""
        while True:
            frame_bytes = self.get_frame()
            if frame_bytes:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            else:
                # If no camera, yield a placeholder or wait
                time.sleep(1)

    def release(self):
        if self.camera and self.camera.isOpened():
            self.camera.release()

camera_service = CameraService()
