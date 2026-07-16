import axios from 'axios';
import { reportBug } from '../utils/bugReporter';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('crm_accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    const status = error.response?.status;

    const url = error.config?.url ?? '';
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/google');
    if (status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('crm_accessToken');
      localStorage.removeItem('crm_refreshToken');
      window.location.href = '/';
    } else if (!status || status >= 500) {
      // Only report server errors and network failures — not 4xx client errors
      const method = (error.config?.method ?? 'REQUEST').toUpperCase();
      const url    = error.config?.url ?? 'unknown';
      reportBug(
        {
          message: `API ${method} ${url} — status ${status ?? 'network error'}`,
          stack:   error.stack,
        },
        'axios',
        { type: 'api_error', url: window.location.pathname },
      );
    }

    return Promise.reject(error);
  },
);

export default api;
