// components/Require2FA.js
import { Navigate } from 'react-router-dom';

const Require2FA = ({ children }) => {
  const token = localStorage.getItem('token');
  const has2FA = localStorage.getItem('has2FA') === 'true';

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!has2FA) {
    return <Navigate to="/admin/2fa/setup/" replace />;
  }

  return children;
};

export default Require2FA;
