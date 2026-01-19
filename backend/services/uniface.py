from services.singleton import SingletonMeta
import numpy as np
import cv2
from PIL import Image
import io
from typing import Optional, Tuple

from uniface import RetinaFace, ArcFace, compute_similarity

class UnifaceService(metaclass=SingletonMeta):
    def __init__(self):
        self.detector = None
        self.recognizer = None
        self._initialize_models()
    
    def _initialize_models(self):
        try:
            self.detector = RetinaFace()
            self.recognizer = ArcFace()
        except Exception as e:
            raise RuntimeError(f"Failed to load models: {e}")
    
    def extract_embedding(self, image_bytes: bytes) -> Optional[np.ndarray]:
        try:
            image = Image.open(io.BytesIO(image_bytes))
            
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            image_np = np.array(image)
            image_bgr = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)
            
            faces = self.detector.detect(image_bgr)
            
            if faces is not None and len(faces) > 0:
                face = faces[0]
                
                # Handle Face object attribute access
                landmarks = getattr(face, 'landmarks', None)
                if landmarks is None:
                    landmarks = getattr(face, 'kps', None)
                
                if landmarks is None:
                    # Fallback for dictionary access if somehow it is a dict
                    try:
                        landmarks = face['landmarks']
                    except:
                        pass
                
                if landmarks is not None:
                    embedding = self.recognizer.get_normalized_embedding(
                        image_bgr, 
                        landmarks
                    )
                    
                    if embedding is not None:
                        return embedding
                
                return None
            else:
                return None
                
        except Exception:
            return None
    
    def compare_faces(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        try:
            similarity = compute_similarity(embedding1, embedding2)
            return float(similarity)
        except Exception:
            # Fallback to cosine similarity
            similarity = np.dot(embedding1, embedding2) / (
                np.linalg.norm(embedding1) * np.linalg.norm(embedding2)
            )
            return float(similarity)
    
    def verify_face(self, image_bytes: bytes, stored_embedding: np.ndarray, threshold: float = 0.7) -> Tuple[bool, float]:
        new_embedding = self.extract_embedding(image_bytes)
        
        if new_embedding is None:
            return False, 0.0
        
        similarity = self.compare_faces(new_embedding, stored_embedding)
        is_match = similarity >= threshold
        
        return is_match, similarity

uniface_service = UnifaceService()
