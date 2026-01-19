import cv2
import time
import threading
import numpy as np
from typing import Generator, Optional, List
from database import SessionLocal
from models import User, AccessLog, AccessMethod, AccessType, Face
from services.singleton import SingletonMeta
from services.state_manager import state_manager
from services.uniface import uniface_service
from services.uart import uart_service
from services.camera import camera_service

class FaceRecognitionStream(metaclass=SingletonMeta):
    def __init__(self):
        self.camera = None
        self.running = False
        self.recognition_thread: Optional[threading.Thread] = None
        
        self.last_unlock_time = 0
        self.cooldown_seconds = 5
        
        self.box_ratio = 0.5
        
        self.last_recognized_user: Optional[str] = None
        self.last_similarity: float = 0.0
        
    def _get_center_box(self, frame_width: int, frame_height: int):
        box_w = int(frame_width * self.box_ratio)
        box_h = int(frame_height * self.box_ratio)
        x1 = (frame_width - box_w) // 2
        y1 = (frame_height - box_h) // 2
        x2 = x1 + box_w
        y2 = y1 + box_h
        return x1, y1, x2, y2
    
    def _is_face_in_box(self, face_bbox, center_box) -> bool:
        fx1, fy1, fx2, fy2 = face_bbox
        cx1, cy1, cx2, cy2 = center_box
        
        face_center_x = (fx1 + fx2) // 2
        face_center_y = (fy1 + fy2) // 2
        
        return (cx1 <= face_center_x <= cx2) and (cy1 <= face_center_y <= cy2)
    
    def _can_recognize(self) -> bool:
        return time.time() - self.last_unlock_time > self.cooldown_seconds
    
    def _draw_detection_ui(self, frame, center_box, faces=None, success_user=None, in_box=False, display_name=None, display_score=0.0):
        from PIL import Image, ImageDraw, ImageFont
        
        height, width = frame.shape[:2]
        cx1, cy1, cx2, cy2 = center_box
        
        color = (0, 255, 0) if in_box else (255, 255, 255)
        thickness = 3 if in_box else 2
        cv2.rectangle(frame, (cx1, cy1), (cx2, cy2), color, thickness)
        
        corner_len = 30
        corner_thickness = 4
        cv2.line(frame, (cx1, cy1), (cx1 + corner_len, cy1), color, corner_thickness)
        cv2.line(frame, (cx1, cy1), (cx1, cy1 + corner_len), color, corner_thickness)
        cv2.line(frame, (cx2, cy1), (cx2 - corner_len, cy1), color, corner_thickness)
        cv2.line(frame, (cx2, cy1), (cx2, cy1 + corner_len), color, corner_thickness)
        cv2.line(frame, (cx1, cy2), (cx1 + corner_len, cy2), color, corner_thickness)
        cv2.line(frame, (cx1, cy2), (cx1, cy2 - corner_len), color, corner_thickness)
        cv2.line(frame, (cx2, cy2), (cx2 - corner_len, cy2), color, corner_thickness)
        cv2.line(frame, (cx2, cy2), (cx2, cy2 - corner_len), color, corner_thickness)
        
        img_pil = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        draw = ImageDraw.Draw(img_pil)
        
        try:
            font = ImageFont.truetype("arial.ttf", 24)
            font_big = ImageFont.truetype("arial.ttf", 32)
        except IOError:
            font = ImageFont.load_default()
            font_big = ImageFont.load_default()

        text_guide = "Di chuyển mặt vào khung"
        if in_box:
            if success_user:
                text_guide = "Đã nhận diện"
            else:
                text_guide = "Đang nhận diện..."
        
        text_bbox = draw.textbbox((0, 0), text_guide, font=font_big)
        text_w = text_bbox[2] - text_bbox[0]
        text_h = text_bbox[3] - text_bbox[1]
        
        text_x = (width - text_w) // 2
        text_y = cy1 - 40
        
        draw.rectangle([text_x - 10, text_y - 5, text_x + text_w + 10, text_y + text_h + 5], fill=(0, 0, 0))
        pil_color = (color[2], color[1], color[0])
        draw.text((text_x, text_y), text_guide, font=font_big, fill=pil_color)

        if faces is not None:
            try:
                has_faces = len(faces) > 0
            except:
                has_faces = False
                
            if has_faces:
                for face in faces:
                    try:
                        bbox = getattr(face, 'bbox', None)
                        if bbox is None:
                            bbox = getattr(face, 'box', None)
                            
                        if bbox is not None:
                            x1, y1, x2, y2 = [int(v) for v in bbox[:4]]
                            is_face_in_box = self._is_face_in_box((x1, y1, x2, y2), center_box)
                            
                            outline_color = (0, 255, 0) if is_face_in_box else (255, 165, 0)
                            draw.rectangle([x1, y1, x2, y2], outline=outline_color, width=2)
                            
                            if is_face_in_box and display_name:
                                name_normalized = display_name
                                try:
                                    import unidecode
                                    name_normalized = unidecode.unidecode(display_name)
                                except ImportError:
                                    pass
                                
                                label_text = f"Tương đồng {name_normalized} {display_score*100:.1f}%"
                                
                                label_bbox = draw.textbbox((0, 0), label_text, font=font)
                                label_w = label_bbox[2] - label_bbox[0]
                                label_h = label_bbox[3] - label_bbox[1]
                                
                                draw.rectangle([x1, y1 - label_h - 10, x1 + label_w + 10, y1], fill=(0, 255, 0))
                                draw.text((x1 + 5, y1 - label_h - 5), label_text, font=font, fill=(0, 0, 0))
                                
                    except Exception:
                        pass
        
        if not self._can_recognize():
            remaining = self.cooldown_seconds - (time.time() - self.last_unlock_time)
            cooldown_text = f"Chờ {remaining:.1f}s"
            draw.text((10, height - 40), cooldown_text, font=font_big, fill=(255, 255, 255))

        frame = cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2BGR)
        return frame
    
    def generate_frames_with_recognition(self) -> Generator[bytes, None, None]:
        self.running = True
        recognized_user = None
        recognition_time = 0
        
        while self.running:
            current_best_similarity = 0.0
            candidate_name = None
            
            frame = camera_service.get_raw_frame()
            
            if frame is None:
                time.sleep(0.1)
                continue
            
            height, width = frame.shape[:2]
            center_box = self._get_center_box(width, height)
            faces = []
            in_box = False
            
            if state_manager.is_entry_exit_mode():
                try:
                    faces = uniface_service.detector.detect(frame)
                    
                    if faces is not None and len(faces) > 0 and self._can_recognize():
                        for face in faces:
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
                                    
                                    if landmarks is not None:
                                        try:
                                            embedding = uniface_service.recognizer.get_normalized_embedding(
                                                frame, 
                                                landmarks
                                            )
                                        except Exception:
                                            pass
                                    
                                    if embedding is not None:
                                        db = SessionLocal()
                                        try:
                                            faces_db = db.query(Face).all()
                                            
                                            best_match_face = None
                                            best_similarity = 0.0
                                            
                                            for face_db in faces_db:
                                                stored_embedding = np.frombuffer(face_db.face_embedding, dtype=np.float32)
                                                similarity = uniface_service.compare_faces(embedding, stored_embedding)
                                                
                                                if similarity > best_similarity:
                                                    best_similarity = similarity
                                                    best_match_face = face_db
                                            
                                            current_best_similarity = best_similarity
                                            if best_match_face and best_match_face.user:
                                                candidate_name = best_match_face.user.name
                                            
                                            threshold = 0.7
                                            
                                            if best_similarity >= threshold and best_match_face:
                                                user = best_match_face.user
                                                recognized_user = user.name
                                                self.last_recognized_user = recognized_user
                                                self.last_similarity = best_similarity
                                                recognition_time = time.time()
                                                
                                                log = AccessLog(
                                                    user_name=user.name,
                                                    access_method=AccessMethod.FACE,
                                                    access_type=AccessType.ENTRY,
                                                    success=True,
                                                    details=f"Do tuong dong: {best_similarity:.3f}"
                                                )
                                                db.add(log)
                                                db.commit()
                                                
                                                # uart_service.unlock_door(duration=5)
                                                uart_service.beep(2)
                                                
                                                self.last_unlock_time = time.time()
                                                
                                            else:
                                                pass
                                        finally:
                                            db.close()
                                    
                                    break
                except Exception:
                    pass
            
            if recognized_user and time.time() - recognition_time > 3:
                recognized_user = None
            
            display_name = candidate_name
            display_score = current_best_similarity
            
            if recognized_user:
                display_name = recognized_user
                if display_score == 0.0:
                    display_score = self.last_similarity

            frame = self._draw_detection_ui(
                frame, 
                center_box, 
                faces, 
                success_user=recognized_user, 
                in_box=in_box, 
                display_name=display_name, 
                display_score=display_score
            )
            
            ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            if ret:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
            
            time.sleep(0.03)
    
    def release(self):
        self.running = False

face_recognition_stream = FaceRecognitionStream()
