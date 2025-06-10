import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axiosInstance';
import { QRCodeCanvas } from 'qrcode.react';
import "../styles/admin/AdminLogin.css";

const TwoFASetup = () => {
  const [totpUri, setTotpUri] = useState(null);
  const [token, setToken] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const isAdmin = window.location.pathname.startsWith('/admin');

  useEffect(() => {
    const initializeSetup = async () => {
      try {
        // 1. Fetch current user to check if 2FA is enabled
        const userResponse = await axiosInstance.get(isAdmin ? '/admin/2fa/status/' : '/members/2fa/status/');
        const { is_2fa_enabled } = userResponse.data;

        // 2. If 2FA is already enabled, redirect to the dashboard
        if (is_2fa_enabled) {
          const dashboardPath = isAdmin ? '/admin/dashboard/' : '/member/dashboard';
          navigate(dashboardPath);
          return;
        }

        // 3. Continue with 2FA setup (generate the TOTP URI)
        const setupEndpoint = isAdmin ? '/admin/2fa/setup/' : '/members/2fa/setup/';
        const setupResponse = await axiosInstance.get(setupEndpoint);
        if (setupResponse.data?.totp_uri) {
          setTotpUri(setupResponse.data.totp_uri);
        } else {
          throw new Error("Missing TOTP URI in response.");
        }
      } catch (error) {
        console.error("Error during 2FA setup initialization:", error);
        setErrorMsg("Failed to initialize 2FA setup.");
      }
    };

    initializeSetup();
  }, [isAdmin, navigate]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const endpoint = isAdmin ? '/admin/2fa/setup-verify/' : '/members/2fa/setup-verify/';
      await axiosInstance.post(endpoint, { otp: token });

      setSuccessMsg("2FA setup successful! Redirecting to your dashboard...");

      setTimeout(() => {
        const redirectPath = isAdmin ? '/admin/dashboard' : '/member/dashboard';
        navigate(redirectPath);
      }, 2000);
    } catch (error) {
      console.error("Verification failed:", error);
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
              required
              placeholder="123456"
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
