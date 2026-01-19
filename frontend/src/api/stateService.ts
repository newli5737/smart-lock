import apiClient from './client';
import type { SystemState } from '../types';

export const stateService = {
    // Get current system state
    async getState(): Promise<SystemState> {
        return await apiClient.get<SystemState>('/api/state') as unknown as SystemState;
    },

    // Switch mode
    async setMode(mode: 'entry_exit' | 'registration'): Promise<void> {
        await apiClient.post('/api/state/mode', { mode });
    },

    // Get detailed status
    async getStatus(): Promise<any> {
        return await apiClient.get('/api/state/status');
    },

    // Control door
    async setDoorStatus(status: 'locked' | 'unlocked'): Promise<void> {
        await apiClient.post('/api/state/door', { status });
    },
};
