import axios from 'axios';
import { ADMIN_TOKEN_KEY, PUBLIC_TOKEN_KEY } from '../utils/authKeys.js';

const resolveBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  if (typeof window !== 'undefined') {
    if (window.location.port === '5173') {
      return '/api';
    }

    if (window.location.port === '4173') {
      return `${window.location.protocol}//${window.location.hostname}:5000/api`;
    }

    return '/api';
  }

  return 'http://127.0.0.1:5000/api';
};

const baseURL = resolveBaseURL();

export const cleanParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined)
  );

const createApiClient = (tokenKey) => {
  const client = axios.create({ baseURL });

  client.interceptors.request.use((config) => {
    const token = localStorage.getItem(tokenKey);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  });

  return client;
};

export const publicApi = createApiClient(PUBLIC_TOKEN_KEY);
export const adminApi = createApiClient(ADMIN_TOKEN_KEY);
