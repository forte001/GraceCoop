import axios from 'axios';

// ✅ Create Axios instance
const axiosInstance = axios.create({
  baseURL: 'http://localhost:8000/api/',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.defaults.withCredentials = true;
// ✅ Load token from localStorage if available
const token = localStorage.getItem('token');
if (token) {
  axiosInstance.defaults.headers['Authorization'] = `Bearer ${token}`;
}

// ✅ Helper to extract CSRF token from cookies
function getCookie(name) {
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
}

// ✅ Request interceptor: attach CSRF token and Authorization
axiosInstance.interceptors.request.use((config) => {
  const csrfToken = getCookie('csrftoken');
  const method = config.method?.toLowerCase();

  if (csrfToken && ['post', 'put', 'patch', 'delete'].includes(method)) {
    config.headers['X-CSRFToken'] = csrfToken;
  }

  return config;
});


// ✅ Response interceptor: auto refresh token on 401/400
axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if ((error.response?.status === 401 || error.response?.status === 400) && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        console.warn('No refresh token found. Redirecting to login.');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/admin/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post('http://localhost:8000/api/token/refresh/', {
          refresh: refreshToken,
        });

        const newAccessToken = response.data.access;
        localStorage.setItem('token', newAccessToken);

        axiosInstance.defaults.headers['Authorization'] = `Bearer ${newAccessToken}`;
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

        return axiosInstance(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed. Redirecting to login.');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/admin/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
