import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isTokenValid } from '../utils/auth';

const PrivateRoute = () => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  // ✅ Dynamically use the correct token key
  const token = localStorage.getItem(isAdmin ? 'admin_token' : 'member_token');

  // ✅ Allow member 2FA verify route through
  if (location.pathname === '/members/2fa/verify') {
    return <Outlet />;
  }

  if (!token || !isTokenValid(token)) {
    return <Navigate to={isAdmin ? '/admin/login' : '/login'} replace />;
  }

  return <Outlet />;
};

export default PrivateRoute;
