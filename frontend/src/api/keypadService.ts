import apiClient from './client';
import type { KeypadVerifyResponse } from '../types';

export const keypadService = {
    // Set/change password
    async setPassword(password: string): Promise<{ success: boolean; message: string }> {
        const response = await apiClient.post('/api/keypad/set-password', { password });
        return response.data;
    },

    // Verify password
    async verify(password: string): Promise<KeypadVerifyResponse> {
        const response = await apiClient.post<KeypadVerifyResponse>('/api/keypad/verify', {
            password,
        });
        return response.data;
    },

    // Check if password exists
    async hasPassword(): Promise<{ has_password: boolean }> {
        const response = await apiClient.get('/api/keypad/has-password');
        return response.data;
    },
};
