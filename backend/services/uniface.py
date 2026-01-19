import numpy as np
import cv2
from PIL import Image
import io
from typing import Optional, Tuple

try:
    from uniface import RetinaFace, ArcFace, compute_similarity
    UNIFACE_AVAILABLE = True
except ImportError:
    UNIFACE_AVAILABLE = False
    print("Uniface not installed - using mock face recognition")

class UnifaceService:
    def __init__(self):
        self.detector = None
        self.recognizer = None
        self._initialize_models()
    
    def _initialize_models(self):
        if not UNIFACE_AVAILABLE:
            self.detector = None
            self.recognizer = None
            print("Using mock face recognition (install uniface for real recognition)")
            return
            
        try:
            self.detector = RetinaFace()
            self.recognizer = ArcFace()
            print("Uniface models initialized successfully (RetinaFace + ArcFace)")
        except Exception as e:
            print(f"Failed to initialize Uniface: {e}")
            print("Face recognition will use mock mode")
            self.detector = None
            self.recognizer = None
    
    def extract_embedding(self, image_bytes: bytes) -> Optional[np.ndarray]:

        if not self.detector or not self.recognizer:
            print("⚠ Mock mode: generating random face embedding")
            return np.random.rand(512).astype(np.float32)
        
        try:
            image = Image.open(io.BytesIO(image_bytes))
            
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            image_np = np.array(image)
            image_bgr = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)
            
            faces = self.detector.detect(image_bgr)
            
            if not faces or len(faces) == 0:
                print("No face detected in image")
                return None
            
            embedding = self.recognizer.get_normalized_embedding(
                image_bgr, 
                faces[0]['landmarks']
            )
            
            if embedding is not None:
                print(f"Face embedding extracted, shape: {embedding.shape}")
                return embedding
            else:
                print("Failed to extract embedding")
                return None
                
        except Exception as e:
            print(f"Error extracting face embedding: {e}")
            return None
    
    def compare_faces(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:

        if not UNIFACE_AVAILABLE or not self.detector:
            return np.random.uniform(0.5, 0.9)
        
        try:
            similarity = compute_similarity(embedding1, embedding2)
            return float(similarity)
        except Exception as e:
            print(f"Error comparing faces: {e}")
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
        
        print(f"Face verification: similarity={similarity:.3f}, threshold={threshold}, match={is_match}")
        
        return is_match, similarity

uniface_service = UnifaceService()
