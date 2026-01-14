import axios from 'axios';

// API Base URL - có thể cấu hình từ localStorage hoặc state
const getBaseURL = () => {
    const savedURL = localStorage.getItem('api_base_url');
    return savedURL || 'http://localhost:8000';
};

// Tạo axios instance
const apiClient = axios.create({
    baseURL: getBaseURL(),
    headers: {
        'Content-Type': 'application/json',
    },
});

// Function để update base URL
export const updateAPIBaseURL = (url: string) => {
    localStorage.setItem('api_base_url', url);
    apiClient.defaults.baseURL = url;
};

// Function để lấy current base URL
export const getAPIBaseURL = () => {
    return apiClient.defaults.baseURL;
};

export default apiClient;
