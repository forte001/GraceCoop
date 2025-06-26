// utils/axiosAdminInstance.js
import axios from 'axios';

const baseURL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/';

const axiosAdminInstance = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 🍪 Helper to get CSRF token from cookies
const getCookie = (name) => {
  const cookies = document.cookie?.split(';') || [];
  for (let cookie of cookies) {
    const [key, value] = cookie.trim().split('=');
    if (key === name) return decodeURIComponent(value);
  }
  return null;
};

// 🔐 Token getters
const getAccessToken = () => localStorage.getItem('admin_token');
const getRefreshToken = () => localStorage.getItem('admin_refresh');

// ✅ Request Interceptor
axiosAdminInstance.interceptors.request.use((config) => {
  const token = getAccessToken();
  const csrfToken = getCookie('csrftoken');

  // ❌ Skip adding token for login or token refresh
  const isAuthEndpoint = config.url.includes('/login') || config.url.includes('/token/refresh/');
  if (!isAuthEndpoint && token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  if (csrfToken && ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
    config.headers['X-CSRFToken'] = csrfToken;
  }

  return config;
});


// 🔁 Response Interceptor for 401/400 refresh
axiosAdminInstance.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    const status = error.response?.status;

    // 🛑 Handle 403 Forbidden
    if (status === 403) {
      window.location.href = '/forbidden';
      return Promise.reject(error);
    }

    // 🔁 Token Refresh Logic
    const shouldRetry =
      (status === 401 || status === 400) && !originalRequest._retry;

    if (shouldRetry) {
      originalRequest._retry = true;

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_refresh');
        window.location.href = '/admin/login';
        return Promise.reject(error);
      }

      try {
        const refreshResponse = await axios.post(
          `${baseURL}token/refresh/`,
          { refresh: refreshToken },
          { withCredentials: true }
        );

        const newAccess = refreshResponse.data.access;
        localStorage.setItem('admin_token', newAccess);

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
