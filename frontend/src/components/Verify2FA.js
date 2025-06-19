// src/components/Verify2FA.js
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import getAxiosByRole from '../utils/getAxiosByRole';

const Verify2FA = () => {
  const [token, setToken] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const isSetupFlow = location.pathname.includes('setup');
  const isAdmin = location.pathname.startsWith('/admin');
  const axios = getAxiosByRole(location.pathname);

  useEffect(() => {
    if (isSetupFlow) return;

    const awaiting2FA = sessionStorage.getItem('is_awaiting_2fa');
    const userId = sessionStorage.getItem('2fa_user_id');
    const tempToken = sessionStorage.getItem('temp_token');

    const isValidSession = awaiting2FA && userId && tempToken;

    if (!isValidSession) {
      navigate(isAdmin ? '/admin/login' : '/login', { replace: true });
    }
  }, [location.pathname, navigate, isAdmin, isSetupFlow]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const loginEndpoint = isAdmin ? '/admin/2fa/verify/' : '/members/2fa/verify/';
    const setupEndpoint = isAdmin ? '/admin/2fa/setup-verify/' : '/members/2fa/setup-verify/';

    try {
      let response;

      if (isSetupFlow) {
        response = await axios.post(setupEndpoint, { otp: token });
      } else {
        const userId = sessionStorage.getItem('2fa_user_id');
        const tempToken = sessionStorage.getItem('temp_token');

        if (!userId || !tempToken) {
          throw new Error('Missing user ID or temporary token.');
        }

        response = await axios.post(
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
        axios.defaults.headers['Authorization'] = `Bearer ${access}`;
      }

      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }

      sessionStorage.removeItem('is_awaiting_2fa');
      sessionStorage.removeItem('2fa_user_id');
      sessionStorage.removeItem('temp_token');

      navigate(isAdmin ? '/admin/dashboard' : '/member/dashboard');
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
