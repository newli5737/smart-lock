import apiClient from './client';
import type { SystemState } from '../types';

export const stateService = {
    // Get current system state
    async getState(): Promise<SystemState> {
        const response = await apiClient.get<SystemState>('/api/state');
        return response.data;
    },

    // Switch mode
    async setMode(mode: 'entry_exit' | 'registration'): Promise<void> {
        await apiClient.post('/api/state/mode', { mode });
    },

    // Get detailed status
    async getStatus(): Promise<any> {
        const response = await apiClient.get('/api/state/status');
        return response.data;
    },
};
