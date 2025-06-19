// src/components/TwoFASetup.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import getAxiosByRole  from '../utils/getAxiosByRole';
import "../styles/admin/AdminLogin.css";

const TwoFASetup = () => {
  const [totpUri, setTotpUri] = useState(null);
  const [token, setToken] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const isAdmin = window.location.pathname.startsWith('/admin');
  const axios = getAxiosByRole();

  useEffect(() => {
    const initializeSetup = async () => {
      try {
        const userResponse = await axios.get(isAdmin ? '/admin/2fa/status/' : '/members/2fa/status/');
        if (userResponse.data.is_2fa_enabled) {
          navigate(isAdmin ? '/admin/dashboard' : '/member/dashboard');
          return;
        }

        const setupResponse = await axios.get(isAdmin ? '/admin/2fa/setup/' : '/members/2fa/setup/');
        if (setupResponse.data?.totp_uri) {
          setTotpUri(setupResponse.data.totp_uri);
        } else {
          throw new Error("Missing TOTP URI in response.");
        }
      } catch (error) {
        console.error("2FA setup error:", error);
        setErrorMsg("Failed to initialize 2FA setup.");
      }
    };

    initializeSetup();
  }, [axios, isAdmin, navigate]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await axios.post(isAdmin ? '/admin/2fa/setup-verify/' : '/members/2fa/setup-verify/', {
        otp: token,
      });

      setSuccessMsg("2FA setup successful! Redirecting...");
      setTimeout(() => {
        navigate(isAdmin ? '/admin/dashboard' : '/member/dashboard');
      }, 2000);
    } catch (error) {
      console.error("2FA verification failed:", error);
      setErrorMsg("Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Set Up Two-Factor Authentication</h2>
      {totpUri ? (
        <>
          <p>Scan this QR code using an authenticator app:</p>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <QRCodeCanvas value={totpUri} size={180} />
          </div>
          <form onSubmit={handleVerify}>
            <label>Enter the 6-digit code from your app:</label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="123456"
              required
              disabled={loading}
            />
            {errorMsg && <p className="error-msg">{errorMsg}</p>}
            {successMsg && <p style={{ color: 'green' }}>{successMsg}</p>}
            <button type="submit" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Complete Setup'}
            </button>
          </form>
        </>
      ) : (
        <p>Loading setup...</p>
      )}
    </div>
  );
};

export default TwoFASetup;
