import axios from 'axios';

const AUTH_URL  = import.meta.env.VITE_AUTH_URL  || '';
const SLOTS_URL = import.meta.env.VITE_SLOTS_URL || '';

export const authAPI = axios.create({ baseURL: AUTH_URL });
export const slotsAPI = axios.create({ baseURL: SLOTS_URL });

const attachToken = (config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
};

authAPI.interceptors.request.use(attachToken);
slotsAPI.interceptors.request.use(attachToken);
