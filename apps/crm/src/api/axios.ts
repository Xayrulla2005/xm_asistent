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

let isRefreshing = false;
let refreshQueue: ((token: string) => void)[] = [];

function drainQueue(token: string) {
  refreshQueue.forEach((cb) => cb(token));
  refreshQueue = [];
}

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const status = error.response?.status;
    const url    = error.config?.url ?? '';

    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/google') ||
      url.includes('/auth/logout') ||
      url.includes('/auth/refresh');

    if (status === 401 && !isAuthEndpoint) {
      const refreshToken = localStorage.getItem('crm_refreshToken');

      if (refreshToken && !error.config._retried) {
        if (isRefreshing) {
          // Queue this request until token is refreshed
          return new Promise((resolve) => {
            refreshQueue.push((newToken) => {
              error.config.headers.Authorization = `Bearer ${newToken}`;
              error.config._retried = true;
              resolve(api.request(error.config));
            });
          });
        }

        isRefreshing = true;
        try {
          const { data } = await api.post('/auth/refresh', { refreshToken });
          const newToken = data.accessToken;
          localStorage.setItem('crm_accessToken', newToken);
          if (data.refreshToken) localStorage.setItem('crm_refreshToken', data.refreshToken);
          drainQueue(newToken);
          error.config.headers.Authorization = `Bearer ${newToken}`;
          error.config._retried = true;
          return api.request(error.config);
        } catch {
          // Refresh failed — clear session
          localStorage.removeItem('crm_accessToken');
          localStorage.removeItem('crm_refreshToken');
          localStorage.removeItem('crm_sessionToken');
          refreshQueue = [];
          window.location.href = '/';
        } finally {
          isRefreshing = false;
        }
      } else if (!refreshToken) {
        localStorage.removeItem('crm_accessToken');
        localStorage.removeItem('crm_sessionToken');
        window.location.href = '/';
      }
    } else if (!status || status >= 500) {
      const method = (error.config?.method ?? 'REQUEST').toUpperCase();
      const reqUrl = error.config?.url ?? 'unknown';
      reportBug(
        {
          message: `API ${method} ${reqUrl} — status ${status ?? 'network error'}`,
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
