import { api } from './client';

export interface User {
    id: number;
    name: string;
    created_at: string;
    fingerprints_count: number;
    faces_count: number;
}

export const userService = {
    getAllUsers: () => api.get<any, User[]>('/api/users/all'),
    createUser: (name: string) => api.post<any, User>('/api/users/', { name }),
    updateUser: (id: number, name: string) => api.put<any, User>(`/api/users/${id}`, { name }),
    deleteUser: (id: number) => api.delete<any, any>(`/api/users/${id}`)
};
