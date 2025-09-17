// src/api/axios.ts
import axios from 'axios';
import { getToken, clearToken } from '../utils/auth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:5000/api',
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    const token = getToken();
    console.debug('[API] request to', config.url, 'with token?', !!token);
    config.headers = config.headers || {};
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('[API] request error', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response) {
      console.warn('[API] response error', {
        status: error.response.status,
        url: error.config?.url,
        data: error.response.data,
      });

      if (error.response.status === 401) {
        console.warn('[API] 401 detected - clearing token');
        clearToken();
        delete api.defaults.headers.common['Authorization'];
      }
      // NOTE: 403 is intentionally NOT auto-redirected here — front-end page (login/signup) should decide what to do,
      // because 403 could mean "email not verified" or "forbidden resource". The response body often contains helpful flags.
    } else {
      console.error('[API] network/error w/o response', error);
    }
    return Promise.reject(error);
  }
);

export default api;
