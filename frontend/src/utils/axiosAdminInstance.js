// utils/axiosAdminInstance.js
import axios from 'axios';

const baseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/';

const axiosAdminInstance = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const getCookie = (name) => {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [key, value] = cookie.trim().split('=');
      if (key === name) {
        cookieValue = decodeURIComponent(value);
        break;
      }
    }
  }
  return cookieValue;
};

const getAccessToken = () => localStorage.getItem('admin_token');
const getRefreshToken = () => localStorage.getItem('admin_refresh');

axiosAdminInstance.interceptors.request.use((config) => {
  const csrfToken = getCookie('csrftoken');
  const token = getAccessToken();

  if (csrfToken && ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
    config.headers['X-CSRFToken'] = csrfToken;
  }

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  return config;
});

axiosAdminInstance.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if ((error.response?.status === 401 || error.response?.status === 400) && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_refresh');
        window.location.href = '/admin/login';
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${baseURL}token/refresh/`, {
          refresh: refreshToken,
        });

        const newAccess = res.data.access;
        localStorage.setItem('admin_token', newAccess);
        axiosAdminInstance.defaults.headers['Authorization'] = `Bearer ${newAccess}`;
        originalRequest.headers['Authorization'] = `Bearer ${newAccess}`;

        return axiosAdminInstance(originalRequest);
      } catch (refreshErr) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_refresh');
        window.location.href = '/admin/login';
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosAdminInstance;
