import axios from 'axios';
import { reportBug } from '../utils/bugReporter';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('crm_accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const tenantId = localStorage.getItem('crm_tenantId');
  if (tenantId) config.headers['X-Tenant-Id'] = tenantId;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      localStorage.removeItem('crm_accessToken');
      localStorage.removeItem('crm_refreshToken');
      window.location.href = '/';
    } else {
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
