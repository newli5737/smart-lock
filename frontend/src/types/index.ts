// TypeScript interfaces for Smart Lock system

export interface SystemState {
  mode: 'entry_exit' | 'registration';
  door_status: 'locked' | 'unlocked';
}

export interface User {
  id: number;
  name: string;
  created_at: string;
  has_face: boolean;
}

export interface Fingerprint {
  id: number;
  fingerprint_id: number;
  user_id: number;
  user_name: string;
  is_active: boolean;
  created_at: string;
}

export interface AccessLog {
  id: number;
  user_name: string | null;
  access_method: 'face' | 'fingerprint' | 'keypad';
  access_type: 'entry' | 'exit';
  success: boolean;
  timestamp: string;
  details: string | null;
}

export interface AccessStats {
  total_accesses: number;
  successful_accesses: number;
  failed_accesses: number;
  by_method: Record<string, number>;
  by_type: Record<string, number>;
  recent_logs: AccessLog[];
}

export interface FaceVerifyResponse {
  success: boolean;
  user_name: string | null;
  similarity: number;
  message: string;
}

export interface FingerprintVerifyResponse {
  success: boolean;
  user_name: string | null;
  message: string;
}

export interface KeypadVerifyResponse {
  success: boolean;
  message: string;
}

export interface RuntimeConfig {
  uart_port: string;
  uart_baudrate: number;
  face_similarity_threshold: number;
  api_host: string;
  api_port: number;
}
