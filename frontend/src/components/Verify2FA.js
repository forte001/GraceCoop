// src/components/Verify2FA.js

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axiosInstance';

const getUserRoleFromPath = (pathname) => {
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/member')) return 'member';
  return 'unknown';
};

const Verify2FA = () => {
  const [token, setToken] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const userRole = getUserRoleFromPath(location.pathname);
  const isAdmin = userRole === 'admin';
  const isSetupFlow = location.pathname.includes('setup');

  useEffect(() => {
    if (isSetupFlow) return;

    const awaiting2FA = sessionStorage.getItem('is_awaiting_2fa');
    const userId = sessionStorage.getItem('2fa_user_id');
    const tempToken = sessionStorage.getItem('temp_token');

    console.log("👀 On 2FA Page:", { awaiting2FA, userId, tempToken });

    const isValidSession = awaiting2FA && userId && tempToken;

    if (!isValidSession) {
      const redirectPath = isAdmin ? '/admin/login' : '/login';
      console.log("🔴 Invalid session. Redirecting to:", redirectPath);
      navigate(redirectPath, { replace: true });
    }
  }, [location.pathname, navigate, isSetupFlow, isAdmin]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const loginEndpoint = isAdmin
      ? '/admin/2fa/verify/'
      : '/members/2fa/verify/';
    const setupEndpoint = isAdmin
      ? '/admin/2fa/setup-verify/'
      : '/members/2fa/setup-verify/';

    try {
      let response;

      if (isSetupFlow) {
        // 2FA setup flow
        response = await axiosInstance.post(setupEndpoint, {
          otp: token,
        });
      } else {
        // 2FA login flow
        const userId = sessionStorage.getItem('2fa_user_id');
        const tempToken = sessionStorage.getItem('temp_token');

        if (!userId || !tempToken) {
          throw new Error('Missing user ID or temporary token.');
        }

        response = await axiosInstance.post(
          loginEndpoint,
          { otp: token, user_id: userId },
          {
            headers: {
              Authorization: `Bearer ${tempToken}`,
            },
          }
        );
      }

      const { access, refresh, user } = response.data;

      if (access && refresh) {
        localStorage.setItem('token', access);
        localStorage.setItem('refreshToken', refresh);
        axiosInstance.defaults.headers['Authorization'] = `Bearer ${access}`;
      }

      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }

      // ✅ Clean up temp session data
      sessionStorage.removeItem('is_awaiting_2fa');
      sessionStorage.removeItem('2fa_user_id');
      sessionStorage.removeItem('temp_token');

      const dashboardPath = isAdmin ? '/admin/dashboard' : '/member/dashboard';
      navigate(dashboardPath);
    } catch (error) {
      console.error('2FA verification failed:', error);
      setErrorMsg('Invalid code. Please try again.');
    }
  };

  return (
    <div className="login-container">
      <h2>{isSetupFlow ? 'Confirm 2FA Setup' : 'Verify 2FA Login'}</h2>
      <form onSubmit={handleVerify}>
        <input
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Enter your 6-digit code"
          required
        />
        {errorMsg && <p className="error-msg">{errorMsg}</p>}
        <button type="submit">Verify</button>
      </form>
    </div>
  );
};

export default Verify2FA;
