import { create } from 'zustand';
import type { RuntimeConfig, AccessStats } from '../types';
import { stateService, logsService, configService, updateAPIBaseURL } from '../api';

interface LockStore {
    // System state
    mode: 'entry_exit' | 'registration';
    doorStatus: 'locked' | 'unlocked';

    // API Configuration
    apiBaseURL: string;
    config: RuntimeConfig | null;

    // Statistics
    stats: AccessStats | null;

    // Loading states
    isLoading: boolean;
    error: string | null;

    // Actions
    setMode: (mode: 'entry_exit' | 'registration') => Promise<void>;
    setDoorStatus: (status: 'locked' | 'unlocked') => void;
    setAPIBaseURL: (url: string) => void;
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
    apiBaseURL: localStorage.getItem('api_base_url') || 'http://localhost:8000',
    config: null,
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

    setAPIBaseURL: (url) => {
        localStorage.setItem('api_base_url', url);
        updateAPIBaseURL(url);
        set({ apiBaseURL: url });
    },

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
        set({ isLoading: true, error: null });
        try {
            const result = await configService.updateConfig(newConfig);
            set({ config: result.config, isLoading: false });
        } catch (error: any) {
            set({
                error: error.response?.data?.detail || 'Không thể cập nhật cấu hình',
                isLoading: false
            });
            throw error;
        }
    },
}));
