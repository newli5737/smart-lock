export interface SystemState {
    mode: 'entry_exit' | 'registration';
    door_status: 'locked' | 'unlocked';
}

export interface RuntimeConfig {
    database_url?: string;
    uart_port: string;
    uart_baudrate: number;
    api_host?: string;
    api_port?: number;
    face_similarity_threshold: number;
}

export interface AccessLog {
    id: number;
    user_id?: number | null;
    user_name?: string | null;
    access_method: 'face' | 'rfid' | 'keypad';
    access_type: 'entry' | 'exit';
    timestamp: string;
    success: boolean;
    notes?: string;
}

export interface AccessStats {
    total_accesses: number;
    successful_accesses: number;
    failed_accesses: number;
    by_method: {
        face: number;
        rfid: number;
        keypad: number;
    };
    recent_logs: AccessLog[];
}

export interface User {
    id: number;
    name: string;
    face_encoding: string | null; // binary string or handle as needed
    created_at: string;
    is_active: boolean;
}

export interface RFIDCard {
    id: number;
    card_uid: string;
    user_name: string;
    is_active: boolean;
    created_at: string;
}

export interface FaceVerifyResponse {
    success: boolean;
    message: string;
    user_name?: string;
    similarity?: number;
}

export interface RFIDVerifyResponse {
    success: boolean;
    message: string;
    card_uid?: string;
    user_name?: string;
}

export interface KeypadVerifyResponse {
    success: boolean;
    message: string;
}
