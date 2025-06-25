import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosAdminInstance from '../../utils/axiosAdminInstance';
import "../../styles/admin/AdminLogin.css";
import Spinner from '../../components/Spinner';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const response = await axiosAdminInstance.post('/admin/login/', {
        login_id: username.trim(),
        password,
      });

      const data = response.data;

      if (data.require_2fa) {
        sessionStorage.setItem('2fa_user_id', data.user_id.toString());
        sessionStorage.setItem('is_awaiting_2fa', 'true');
        sessionStorage.setItem('temp_token', data.temp_token);

        navigate(data.is_2fa_setup_complete ? '/admin/2fa/verify' : '/admin/2fa/setup', { replace: true });
        return;
      }

      localStorage.setItem('admin_token', data.access);
      localStorage.setItem('admin_refresh', data.refresh);

      
      console.log("✅ Login successful — redirecting...");
      navigate('/admin/dashboard');

    } catch (error) {
      const detail = error?.response?.data?.detail || 'Login failed.';
      setErrorMsg(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Admin Login</h2>
      <form onSubmit={handleLogin}>
        <div>
          <label>Username:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        {errorMsg && <p className="error-msg">{errorMsg}</p>}

        <button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Spinner size={18} color="#fff" /> Logging in...
            </>
          ) : (
            'Login'
          )}
        </button>

      </form>
    </div>
  );
};

export default AdminLogin;
