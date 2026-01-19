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
        return response as unknown as Fingerprint;
    },

    // Verify fingerprint
    async verify(fingerprintId: number): Promise<FingerprintVerifyResponse> {
        const response = await apiClient.post<FingerprintVerifyResponse>('/api/fingerprint/verify', {
            fingerprint_id: fingerprintId
        });
        return response as unknown as FingerprintVerifyResponse;
    },

    // Get all fingerprints
    async getPrints(): Promise<Fingerprint[]> {
        const response = await apiClient.get<Fingerprint[]>('/api/fingerprint/prints');
        return response as unknown as Fingerprint[];
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
        return response as unknown as { success: boolean; message: string; fingerprints?: number[]; count?: number };
    },

    // Clear all fingerprints from database and sensor
    async clearAll(): Promise<{ success: boolean; message: string }> {
        const response = await apiClient.delete('/api/fingerprint/clear-all');
        return response as unknown as { success: boolean; message: string };
    },
};
