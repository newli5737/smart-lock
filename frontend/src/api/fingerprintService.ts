import apiClient from './client';
import type { Fingerprint, FingerprintVerifyResponse } from '../types/index';

export const fingerprintService = {
    // Enroll new fingerprint
    async enroll(fingerprintId: number, userName: string, fingerPosition: number): Promise<Fingerprint> {
        const response = await apiClient.post<Fingerprint>('/api/fingerprint/enroll', {
            fingerprint_id: fingerprintId,
            user_name: userName,
            finger_position: fingerPosition
        });
        return response.data;
    },

    // Verify fingerprint
    async verify(fingerprintId: number): Promise<FingerprintVerifyResponse> {
        const response = await apiClient.post<FingerprintVerifyResponse>('/api/fingerprint/verify', {
            fingerprint_id: fingerprintId
        });
        return response.data;
    },

    // Get all fingerprints
    async getPrints(): Promise<Fingerprint[]> {
        const response = await apiClient.get<Fingerprint[]>('/api/fingerprint/prints');
        return response.data;
    },

    // Delete fingerprint
    async deletePrint(id: number): Promise<void> {
        await apiClient.delete(`/api/fingerprint/${id}`);
    },

    // Get fingerprint list from AS608 sensor
    async getSensorPrints(): Promise<{
        success: boolean;
        message: string;
        fingerprints?: number[];
        count?: number
    }> {
        const response = await apiClient.get('/api/fingerprint/sensor-prints');
        return response.data;
    },

    // Clear all fingerprints from database and sensor
    async clearAll(): Promise<{ success: boolean; message: string }> {
        const response = await apiClient.delete('/api/fingerprint/clear-all');
        return response.data;
    },
};
