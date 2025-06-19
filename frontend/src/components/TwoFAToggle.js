// src/components/TwoFAToggle.js
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import getAxiosByRole from '../utils/getAxiosByRole';

const TwoFAToggle = () => {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const location = useLocation();
  const axios = getAxiosByRole(location.pathname);

  const isAdmin = location.pathname.includes('/admin');
  const statusEndpoint = isAdmin ? '/admin/2fa/status/' : '/members/2fa/status/';
  const disableEndpoint = isAdmin ? '/admin/2fa/disable/' : '/members/2fa/disable/';
  const setupPath = isAdmin ? '/admin/2fa/setup' : '/member/2fa/setup';

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await axios.get(statusEndpoint);
        setEnabled(response.data.is_2fa_enabled);
      } catch (error) {
        console.error("Failed to fetch 2FA status", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [axios, statusEndpoint]);

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (enabled) {
        await axios.post(disableEndpoint);
        setEnabled(false);
        setMessage('2FA disabled.');
      } else {
        window.location.href = setupPath;
      }
    } catch (error) {
      console.error("Toggle failed:", error);
      setMessage('Failed to update 2FA setting.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Two-Factor Authentication</h2>
      <p>{enabled ? "2FA is currently enabled." : "2FA is currently disabled."}</p>
      <button onClick={handleToggle} disabled={loading}>
        {enabled ? 'Disable 2FA' : 'Enable 2FA'}
      </button>
      {message && <p>{message}</p>}
    </div>
  );
};

export default TwoFAToggle;
