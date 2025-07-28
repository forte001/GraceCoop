// src/utils/axiosMemberInstance.js
import axios from 'axios';

const baseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/';

const axiosMemberInstance = axios.create({
  baseURL,
  withCredentials: true,
  
});

axiosMemberInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('member_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  const csrfToken = document.cookie
    .split('; ')
    .find((row) => row.startsWith('csrftoken='))
    ?.split('=')[1];

  if (csrfToken && ['post', 'put', 'patch', 'delete'].includes(config.method)) {
    config.headers['X-CSRFToken'] = csrfToken;
  }

  //  Dynamically set JSON Content-Type only when data is plain JS object
  if (
    config.data &&
    !(config.data instanceof FormData) &&
    typeof config.data === 'object'
  ) {
    config.headers['Content-Type'] = 'application/json';
   
  } else if (config.data instanceof FormData) {
    
    delete config.headers['Content-Type'];
    
  }

  console.log('DEBUG: Final headers:', config.headers);
  return config;
});


// Auto-refresh token logic 
axiosMemberInstance.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if ((error.response?.status === 401 || error.response?.status === 400) && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('member_refresh');
      if (!refreshToken) {
        localStorage.removeItem('member_token');
        localStorage.removeItem('member_refresh');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${baseURL}token/refresh/`, {
          refresh: refreshToken,
        });

        const newAccess = res.data.access;
        localStorage.setItem('member_token', newAccess);
        axiosMemberInstance.defaults.headers['Authorization'] = `Bearer ${newAccess}`;
        originalRequest.headers['Authorization'] = `Bearer ${newAccess}`;

        return axiosMemberInstance(originalRequest);
      } catch (refreshErr) {
        localStorage.removeItem('member_token');
        localStorage.removeItem('member_refresh');
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosMemberInstance;
