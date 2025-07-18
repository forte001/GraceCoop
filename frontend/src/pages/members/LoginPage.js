import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosMemberInstance from '../../utils/axiosMemberInstance'; 
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
      const response = await axiosMemberInstance.post('/members/login/', {
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
      localStorage.setItem('member_token', data.access);
      localStorage.setItem('member_refresh', data.refresh);


     
      axiosMemberInstance.defaults.headers['Authorization'] = `Bearer ${data.access}`;

      // Fetch the user profile after login
      const profileResponse = await axiosMemberInstance.get('/members/my-profile/');
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
      <img src="/logo.png" alt="GraceCoop Logo" className="landing-logo" />
      <p className="logo-text">GraceCoop</p>
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
          <p>Forgot Password? <a href="/password-reset">Reset password</a></p>
        </div>
        <div>
          <p>
            Don't have an account?{" "}
            <a
              href="/register"
              onClick={(e) => {
                e.preventDefault();
                navigate('/register');
              }}
              className="button-link"
            >
              Sign up
            </a>
          </p>
        </div>

        
      </form>
    </div>
  );
};

export default LoginPage;
