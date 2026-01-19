"""
Face Recognition Stream Service
- Liên tục nhận diện khuôn mặt khi ở chế độ entry_exit
- Vẽ khung vuông trung tâm - chỉ so sánh khi mặt nằm trong khung
- Cooldown sau khi mở cửa để tránh spam lệnh
"""

import cv2
import time
import threading
import numpy as np
from typing import Generator, Optional, List
from database import SessionLocal
from models import User, AccessLog, AccessMethod, AccessType, Face

from services.singleton import SingletonMeta

class FaceRecognitionStream(metaclass=SingletonMeta):
    def __init__(self):
        self.camera = None
        self.running = False
        self.recognition_thread: Optional[threading.Thread] = None
        
        # Cooldown settings
        self.last_unlock_time = 0
        self.cooldown_seconds = 5  # Thời gian chờ sau khi mở cửa
        
        # Detection box (center rectangle ratio)
        self.box_ratio = 0.5  # 50% của frame
        
        # Last recognized user
        self.last_recognized_user: Optional[str] = None
        self.last_similarity: float = 0.0
        
    def _get_center_box(self, frame_width: int, frame_height: int):
        """Tính toán khung vuông trung tâm"""
        box_w = int(frame_width * self.box_ratio)
        box_h = int(frame_height * self.box_ratio)
        x1 = (frame_width - box_w) // 2
        y1 = (frame_height - box_h) // 2
        x2 = x1 + box_w
        y2 = y1 + box_h
        return x1, y1, x2, y2
    
    def _is_face_in_box(self, face_bbox, center_box) -> bool:
        """Kiểm tra xem khuôn mặt có nằm trong khung trung tâm không"""
        fx1, fy1, fx2, fy2 = face_bbox
        cx1, cy1, cx2, cy2 = center_box
        
        # Kiểm tra tâm khuôn mặt có trong box không
        face_center_x = (fx1 + fx2) // 2
        face_center_y = (fy1 + fy2) // 2
        
        return (cx1 <= face_center_x <= cx2) and (cy1 <= face_center_y <= cy2)
    
    def _can_recognize(self) -> bool:
        """Kiểm tra có thể nhận diện không (cooldown)"""
        return time.time() - self.last_unlock_time > self.cooldown_seconds
    
    def _draw_detection_ui(self, frame, center_box, faces=None, recognized_user=None, in_box=False, current_similarity=0.0):
        """Vẽ UI lên frame"""
        height, width = frame.shape[:2]
        cx1, cy1, cx2, cy2 = center_box
        
        # Vẽ khung trung tâm
        color = (0, 255, 0) if in_box else (255, 255, 255)  # Xanh nếu có mặt trong khung
        thickness = 3 if in_box else 2
        cv2.rectangle(frame, (cx1, cy1), (cx2, cy2), color, thickness)
        
        # Vẽ các góc của khung
        corner_len = 30
        # Top-left
        cv2.line(frame, (cx1, cy1), (cx1 + corner_len, cy1), color, 4)
        cv2.line(frame, (cx1, cy1), (cx1, cy1 + corner_len), color, 4)
        # Top-right
        cv2.line(frame, (cx2, cy1), (cx2 - corner_len, cy1), color, 4)
        cv2.line(frame, (cx2, cy1), (cx2, cy1 + corner_len), color, 4)
        # Bottom-left
        cv2.line(frame, (cx1, cy2), (cx1 + corner_len, cy2), color, 4)
        cv2.line(frame, (cx1, cy2), (cx1, cy2 - corner_len), color, 4)
        # Bottom-right
        cv2.line(frame, (cx2, cy2), (cx2 - corner_len, cy2), color, 4)
        cv2.line(frame, (cx2, cy2), (cx2, cy2 - corner_len), color, 4)
        
        # Vẽ text hướng dẫn
        text = "Di chuyen mat vao khung"
        sub_text = ""
        
        if in_box:
            if recognized_user:
                text = f"Xin chao: {recognized_user}"
                sub_text = f"Do tuong dong: {current_similarity*100:.1f}%"
                color = (0, 255, 0)
            else:
                text = "Dang nhan dien..."
                if current_similarity > 0:
                    sub_text = f"Tuong dong: {current_similarity*100:.1f}%"
                color = (0, 255, 255)
        
        font = cv2.FONT_HERSHEY_SIMPLEX
        
        # Main text
        text_size = cv2.getTextSize(text, font, 0.8, 2)[0]
        text_x = (width - text_size[0]) // 2
        text_y = cy1 - 25
        cv2.rectangle(frame, (text_x - 10, text_y - 30), (text_x + text_size[0] + 10, text_y + 10), (0, 0, 0), -1)
        cv2.putText(frame, text, (text_x, text_y), font, 0.8, color, 2)
        
        # Sub text (similarity)
        if sub_text:
            sub_text_size = cv2.getTextSize(sub_text, font, 0.6, 2)[0]
            sub_text_x = (width - sub_text_size[0]) // 2
            sub_text_y = cy1 + 25  # Below the top line of box
            cv2.rectangle(frame, (sub_text_x - 5, sub_text_y - 20), (sub_text_x + sub_text_size[0] + 5, sub_text_y + 5), (0, 0, 0), -1)
            cv2.putText(frame, sub_text, (sub_text_x, sub_text_y), font, 0.6, (200, 200, 200), 2)

        
        # Vẽ các khuôn mặt đã phát hiện
        if faces is not None:
            # Check length safely for numpy array or list
            try:
                has_faces = len(faces) > 0
            except:
                has_faces = False
                
            if has_faces:
                for face in faces:
                    # Face object truy cập thuộc tính an toàn
                    try:
                        bbox = getattr(face, 'bbox', None)
                        if bbox is None:
                            bbox = getattr(face, 'box', None)
                            
                        if bbox is not None:
                            x1, y1, x2, y2 = [int(v) for v in bbox[:4]]
                            face_color = (0, 255, 0) if self._is_face_in_box((x1, y1, x2, y2), center_box) else (0, 165, 255)
                            cv2.rectangle(frame, (x1, y1), (x2, y2), face_color, 2)
                    except:
                        pass
        
        # Hiển thị cooldown status
        if not self._can_recognize():
            remaining = self.cooldown_seconds - (time.time() - self.last_unlock_time)
            cooldown_text = f"Cho {remaining:.1f}s"
            cv2.putText(frame, cooldown_text, (10, height - 20), font, 0.7, (0, 165, 255), 2)
        
        return frame
    
    def generate_frames_with_recognition(self) -> Generator[bytes, None, None]:
        """Stream video với nhận diện khuôn mặt real-time"""
        from services.state_manager import state_manager
        from services.uniface import uniface_service
        from services.uart import uart_service
        
        if self.camera is None or not self.camera.isOpened():
            self.camera = cv2.VideoCapture(0)
            time.sleep(0.5)
        
        recognized_user = None
        recognition_time = 0
        
        while True:
            current_best_similarity = 0.0
            success, frame = self.camera.read()
            if not success:
                self.camera.release()
                self.camera = cv2.VideoCapture(0)
                time.sleep(1)
                continue
            
            height, width = frame.shape[:2]
            center_box = self._get_center_box(width, height)
            faces = []
            in_box = False
            
            # Chỉ nhận diện trong chế độ entry_exit
            if state_manager.is_entry_exit_mode():
                try:
                    # Detect faces
                    faces = uniface_service.detector.detect(frame)
                    
                    if faces is not None and len(faces) > 0 and self._can_recognize():
                        # Kiểm tra xem có mặt nào trong khung không
                        for face in faces:
                            # Face object có thuộc tính bbox và landmarks
                            bbox = getattr(face, 'bbox', None)
                            if bbox is None:
                                bbox = getattr(face, 'box', None)
                            
                            landmarks = getattr(face, 'landmarks', None)
                            if landmarks is None:
                                landmarks = getattr(face, 'kps', None)
                            
                            if bbox is not None:
                                try:
                                    x1, y1, x2, y2 = [int(v) for v in bbox[:4]]
                                except:
                                    continue
                                
                                if self._is_face_in_box((x1, y1, x2, y2), center_box):
                                    in_box = True
                                    embedding = None
                                    
                                    # Thực hiện nhận diện
                                    if landmarks is not None:
                                        try:
                                            embedding = uniface_service.recognizer.get_normalized_embedding(
                                                frame, 
                                                landmarks
                                            )
                                        except Exception:
                                            pass
                                    
                                    if embedding is not None:
                                        # So sánh với database
                                        db = SessionLocal()
                                        try:
                                            faces = db.query(Face).all()
                                            
                                            best_match_face = None
                                            best_similarity = 0.0
                                            
                                            for face in faces:
                                                stored_embedding = np.frombuffer(face.face_embedding, dtype=np.float32)
                                                similarity = uniface_service.compare_faces(embedding, stored_embedding)
                                                
                                                if similarity > best_similarity:
                                                    best_similarity = similarity
                                                    best_match_face = face
                                            
                                            threshold = 0.7
                                            
                                            # Cập nhật similarity hiện tại để hiển thị
                                            current_best_similarity = best_similarity
                                            
                                            if best_similarity >= threshold:
                                                user = best_match_face.user
                                                recognized_user = user.name
                                                self.last_recognized_user = recognized_user
                                                self.last_similarity = best_similarity
                                                recognition_time = time.time()
                                                
                                                # Log access
                                                log = AccessLog(
                                                    user_name=user.name,
                                                    access_method=AccessMethod.FACE,
                                                    access_type=AccessType.ENTRY,
                                                    success=True,
                                                    details=f"Do tuong dong: {best_similarity:.3f}"
                                                )
                                                db.add(log)
                                                db.commit()
                                                
                                                # Mở cửa
                                                uart_service.unlock_door(duration=5)
                                                uart_service.beep(2)
                                                
                                                # Set cooldown
                                                self.last_unlock_time = time.time()
                                                
                                            else:
                                                recognized_user = None
                                        finally:
                                            db.close()
                                    
                                    break  # Chỉ xử lý mặt đầu tiên trong khung
                except Exception:
                    pass
            
            # Clear recognized user sau 3 giây
            if recognized_user and time.time() - recognition_time > 3:
                recognized_user = None
            
            # Vẽ UI
            frame = self._draw_detection_ui(frame, center_box, faces, recognized_user, in_box, current_best_similarity)
            
            # Encode frame
            ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            if ret:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
            
            time.sleep(0.03)  # ~30 FPS
    
    def release(self):
        self.running = False
        if self.camera and self.camera.isOpened():
            self.camera.release()

face_recognition_stream = FaceRecognitionStream()
