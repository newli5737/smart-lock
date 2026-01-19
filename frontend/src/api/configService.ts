import apiClient from './client';
import type { RuntimeConfig } from '../types';

export const configService = {
    // Get current configuration
    async getConfig(): Promise<RuntimeConfig> {
        const response = await apiClient.get<RuntimeConfig>('/api/config');
        return response as unknown as RuntimeConfig;
    },

    // Update configuration
    async updateConfig(config: Partial<RuntimeConfig>): Promise<{ success: boolean; config: RuntimeConfig }> {
        const response = await apiClient.post('/api/config/update', config);
        return response as unknown as { success: boolean; config: RuntimeConfig };
    },
};
