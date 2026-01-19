import { api } from './client';
import type { User, FaceVerifyResponse } from '../types';

export const faceService = {
    // Register new face
    async register(userId: number, imageFile: File): Promise<User> {
        const formData = new FormData();
        formData.append('user_id', userId.toString());
        formData.append('image', imageFile);

        const response = await api.post<any, User>('/api/face/register', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response;
    },

    // Verify face
    async verify(imageFile: File): Promise<FaceVerifyResponse> {
        const formData = new FormData();
        formData.append('image', imageFile);

        const response = await api.post<any, FaceVerifyResponse>('/api/face/verify', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response;
    },

    // Verify face from backend camera stream
    async verifyFromStream(): Promise<FaceVerifyResponse> {
        const response = await api.post<any, FaceVerifyResponse>('/api/face/verify-from-stream');
        return response;
    },

    // Get all users (Deprecated? Use userService)
    async getUsers(): Promise<User[]> {
        const response = await api.get<any, User[]>('/api/face/users');
        return response;
    },

    // Delete user (Deprecated? Use userService)
    async deleteUser(userId: number): Promise<void> {
        await api.delete(`/api/face/${userId}`);
    },
};
