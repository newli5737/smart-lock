import { api } from './client';
import type { Fingerprint, FingerprintVerifyResponse } from '../types/index';

export const fingerprintService = {
    // Enroll new fingerprint
    async enroll(userId: number): Promise<Fingerprint> {
        const response = await api.post<any, Fingerprint>('/api/fingerprint/enroll', {
            user_id: userId
        });
        return response;
    },

    // Verify fingerprint (Still accessed manually via API if needed, usually UART handles this)
    async verify(fingerprintId: number): Promise<FingerprintVerifyResponse> {
        const response = await api.post<any, FingerprintVerifyResponse>('/api/fingerprint/verify', {
            fingerprint_id: fingerprintId
        });
        return response;
    },

    // Get all fingerprints
    async getPrints(): Promise<Fingerprint[]> {
        const response = await api.get<any, Fingerprint[]>('/api/fingerprint/prints');
        return response;
    },

    // Delete fingerprint
    async deletePrint(id: number): Promise<void> {
        await api.delete(`/api/fingerprint/${id}`);
    },

    // Get fingerprint list from AS608 sensor
    async getSensorPrints(): Promise<{
        success: boolean;
        message: string;
        fingerprints?: number[];
        count?: number
    }> {
        const response = await api.get<any, any>('/api/fingerprint/sensor-prints');
        return response;
    },

    // Clear all fingerprints from database and sensor
    async clearAll(): Promise<{ success: boolean; message: string }> {
        const response = await api.delete<any, any>('/api/fingerprint/clear-all');
        return response;
    },

    // Retry enrollment for inactive fingerprint
    async retryEnroll(fingerprintId: number): Promise<{ success: boolean; message: string }> {
        const response = await api.post<any, any>(`/api/fingerprint/retry/${fingerprintId}`);
        return response;
    },
};
