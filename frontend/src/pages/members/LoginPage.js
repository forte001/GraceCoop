import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from '../../utils/axiosInstance'; 
import "../../styles/members/LoginPage.css";

const LoginPage = () => {
  const [loginId, setLoginId] = useState("");  // This could be username or member_id
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Make request to the backend to login the user
      const response = await axiosInstance.post('/members/login/', {
        login_id: loginId.trim(),
        password,
      });

      const data = response.data;

      if (data.require_2fa) {
        // Store 2FA session values in sessionStorage for later use
        sessionStorage.setItem('2fa_user_id', data.user_id.toString());
        sessionStorage.setItem('is_awaiting_2fa', 'true');
        sessionStorage.setItem('temp_token', data.temp_token);

        // Redirect to the 2FA verification page
        setTimeout(() => {
          if (data.is_2fa_setup_complete) {
            navigate('/member/2fa/verify', { replace: true });
          } else {
            navigate('/member/2fa/setup', { replace: true });
          }
        }, 100);
        return;
      }

      // If 2FA is not required, proceed with regular login
      localStorage.setItem('token', data.access);
      localStorage.setItem('refreshToken', data.refresh);

      // Set the authorization header for axiosInstance globally
      axiosInstance.defaults.headers['Authorization'] = `Bearer ${data.access}`;

      // Fetch the user profile after login
      const profileResponse = await axiosInstance.get('/members/my-profile/');
      const profile = profileResponse.data;

      // Check if profile is complete or needs further information
      if (!profile.full_name || !profile.phone_number || !profile.address) {
        navigate('/member/complete-profile');
      } else {
        navigate('/member/dashboard');
      }

    } catch (error) {
      console.error('Login failed:', error);
      const detail = error?.response?.data?.detail || 'Login failed.';
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Member Login</h2>
      <form onSubmit={handleLogin}>
        <div>
          <label htmlFor="loginId">Username or Member ID</label>
          <input
            type="text"
            id="loginId"
            name="loginId"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="error-message">{error}</p>}
        <div>
          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </div>
        <div>
          <p>Don't have an account?</p>
          <button type="button" onClick={() => navigate('/register')}>Sign up</button>
        </div>
      </form>
    </div>
  );
};

export default LoginPage;
