import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isTokenValid } from '../utils/auth';

const PrivateRoute = () => {
  const token = localStorage.getItem('token');
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  // ✅ Allow this specific 2FA route through
  if (location.pathname === '/members/2fa/verify') {
    return <Outlet />;
  }

  if (!token || !isTokenValid(token)) {
    return <Navigate to={isAdmin ? '/admin/login' : '/login'} replace />;
  }

  return <Outlet />;
};

export default PrivateRoute;
