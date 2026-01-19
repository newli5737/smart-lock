import apiClient from './client';

export interface User {
    id: number;
    name: string;
    created_at: string;
    fingerprints_count: number;
    faces_count: number;
}

export const userService = {
    getAllUsers: async (): Promise<User[]> => {
        const response = await apiClient.get<User[]>('/api/users/all');
        return response as unknown as User[];
    },

    deleteUser: async (id: number): Promise<void> => {
        await apiClient.delete(`/api/users/${id}`);
    }
};
