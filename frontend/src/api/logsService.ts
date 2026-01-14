import apiClient from './client';
import type { AccessLog, AccessStats } from '../types';

export const logsService = {
    // Get access logs with filters
    async getLogs(params?: {
        limit?: number;
        offset?: number;
        method?: 'face' | 'rfid' | 'keypad';
        access_type?: 'entry' | 'exit';
        success?: boolean;
    }): Promise<{ logs: AccessLog[]; total: number }> {
        const response = await apiClient.get('/api/logs', { params });
        return response.data;
    },

    // Get statistics
    async getStats(days: number = 7): Promise<AccessStats> {
        const response = await apiClient.get<AccessStats>('/api/logs/stats', {
            params: { days },
        });
        return response.data;
    },

    // Delete log
    async deleteLog(logId: number): Promise<void> {
        await apiClient.delete(`/api/logs/${logId}`);
    },

    // Clear all logs
    async clearAll(): Promise<void> {
        await apiClient.delete('/api/logs/clear-all');
    },
};
