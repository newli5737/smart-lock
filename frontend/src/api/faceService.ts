import apiClient from './client';
import type { User, FaceVerifyResponse } from '../types';

export const faceService = {
    // Register new face
    async register(name: string, imageFile: File): Promise<User> {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('image', imageFile);

        const response = await apiClient.post<User>('/api/face/register', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    // Verify face
    async verify(imageFile: File): Promise<FaceVerifyResponse> {
        const formData = new FormData();
        formData.append('image', imageFile);

        const response = await apiClient.post<FaceVerifyResponse>('/api/face/verify', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    // Get all users
    async getUsers(): Promise<User[]> {
        const response = await apiClient.get<User[]>('/api/face/users');
        return response.data;
    },

    // Delete user
    async deleteUser(userId: number): Promise<void> {
        await apiClient.delete(`/api/face/${userId}`);
    },
};
