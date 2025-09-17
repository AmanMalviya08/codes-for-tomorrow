// src/utils/auth.ts
import api from '../api/axios';

export const TOKEN_KEY = 'token';

export const saveToken = (token: string): void => {
  try {
    // strip accidental quotes, whitespace
    const clean = token?.toString().trim().replace(/^"|"$/g, '');
    localStorage.setItem(TOKEN_KEY, clean);
    // Also set axios default header so subsequent requests are authenticated
    if (clean) {
      api.defaults.headers.common['Authorization'] = `Bearer ${clean}`;
    }
    console.debug('[auth] token saved length=', clean?.length);
  } catch (e) {
    console.error('saveToken error:', e);
  }
};

export const getToken = (): string | null => {
  try {
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t) {
      console.debug('[auth] no token in localStorage');
      return null;
    }
    return t;
  } catch (e) {
    console.error('getToken error:', e);
    return null;
  }
};

export const clearToken = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    // remove axios default header as well
    try { delete api.defaults.headers.common['Authorization']; } catch {}
    console.debug('[auth] token cleared');
  } catch (e) {
    console.error('clearToken error:', e);
  }
};

export const getAuthHeader = (): { Authorization?: string } => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};
