import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import axiosInstance from '../utils/axiosInstance';

const TwoFAToggle = () => {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const location = useLocation();

  // Determine if the user is admin or member based on path
  const isAdmin = location.pathname.includes('/admin');

  // Define endpoints dynamically
  const statusEndpoint = isAdmin ? '/admin/2fa/status/' : '/members/2fa/status/';
  const disableEndpoint = isAdmin ? '/admin/2fa/disable/' : '/members/2fa/disable/';
  const setupPath = isAdmin ? '/admin/2fa/setup' : '/member/2fa/setup';

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await axiosInstance.get(statusEndpoint);
        setEnabled(response.data.is_2fa_enabled);
      } catch (error) {
        console.error("Failed to fetch 2FA status", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [statusEndpoint]);

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (enabled) {
        await axiosInstance.post(disableEndpoint);
        setEnabled(false);
        setMessage('2FA disabled.');
      } else {
        window.location.href = setupPath; // redirect to QR setup
      }
    } catch (error) {
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
