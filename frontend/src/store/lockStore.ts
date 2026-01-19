import { create } from 'zustand';
import type { RuntimeConfig, AccessStats } from '../types';
import { stateService, logsService, configService } from '../api';

interface LockStore {
    // System state
    mode: 'entry_exit' | 'registration';
    doorStatus: 'locked' | 'unlocked';

    // API Configuration
    config: RuntimeConfig | null;
    apiBaseURL: string;

    // Statistics
    stats: AccessStats | null;

    // Loading states
    isLoading: boolean;
    error: string | null;

    // Actions
    setMode: (mode: 'entry_exit' | 'registration') => Promise<void>;
    setDoorStatus: (status: 'locked' | 'unlocked') => void;
    setConfig: (config: RuntimeConfig) => void;
    setError: (error: string | null) => void;

    // Fetch methods
    fetchState: () => Promise<void>;
    fetchStats: (days?: number) => Promise<void>;
    fetchConfig: () => Promise<void>;

    // Update config
    updateConfig: (config: Partial<RuntimeConfig>) => Promise<void>;
}

export const useLockStore = create<LockStore>((set) => ({
    // Initial state
    mode: 'entry_exit',
    doorStatus: 'locked',
    config: null,
    apiBaseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
    stats: null,
    isLoading: false,
    error: null,

    // Actions
    setMode: async (mode) => {
        set({ isLoading: true, error: null });
        try {
            await stateService.setMode(mode);
            set({ mode, isLoading: false });
        } catch (error: any) {
            set({
                error: error.response?.data?.detail || 'Không thể chuyển đổi chế độ',
                isLoading: false
            });
            throw error;
        }
    },

    setDoorStatus: (status) => set({ doorStatus: status }),

    setConfig: (config) => set({ config }),

    setError: (error) => set({ error }),

    fetchState: async () => {
        try {
            const data = await stateService.getState();
            set({
                mode: data.mode,
                doorStatus: data.door_status,
                error: null,
            });
        } catch (error: any) {
            console.error('Failed to fetch state:', error);
            set({ error: 'Không thể kết nối với backend' });
        }
    },

    fetchStats: async (days = 7) => {
        try {
            const stats = await logsService.getStats(days);
            set({ stats, error: null });
        } catch (error: any) {
            console.error('Failed to fetch stats:', error);
            set({ error: 'Không thể tải thống kê' });
        }
    },

    fetchConfig: async () => {
        try {
            const config = await configService.getConfig();
            set({ config, error: null });
        } catch (error: any) {
            console.error('Failed to fetch config:', error);
        }
    },

    updateConfig: async (newConfig) => {
        console.log('🏪 Store updateConfig called with:', newConfig);
        set({ isLoading: true, error: null });
        console.log('🏪 isLoading set to true');
        try {
            console.log('🏪 Calling configService.updateConfig...');
            const result = await configService.updateConfig(newConfig);
            console.log('🏪 configService.updateConfig result:', result);
            set({ config: result.config, isLoading: false });
            console.log('🏪 Store updated, isLoading set to false');
        } catch (error: any) {
            console.error('🏪 Store updateConfig error:', error);
            set({
                error: error.response?.data?.detail || 'Không thể cập nhật cấu hình',
                isLoading: false
            });
            throw error;
        }
    },
}));
