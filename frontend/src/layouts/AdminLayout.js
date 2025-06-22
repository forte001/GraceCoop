import React, { useEffect, useState, useContext } from 'react';
import { ThemeContext } from '../components/ThemeContext';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import '../styles/admin/AdminLayout.css';

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isMembershipOpen, setIsMembershipOpen] = useState(
    location.pathname.startsWith('/admin/members')
  );
  const [isLoanOpen, setIsLoanOpen] = useState(
    location.pathname.startsWith('/admin/loan')
  );
  const [isPaymentsOpen, setIsPaymentsOpen] = useState(
    location.pathname.startsWith('/admin/payments')
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(
    location.pathname.startsWith('/admin/settings')
  );

  const { theme, setTheme } = useContext(ThemeContext);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    navigate('/admin/login');
  };

  const toggleMembershipMenu = () => setIsMembershipOpen(prev => !prev);
  const toggleLoanMenu = () => setIsLoanOpen(prev => !prev);
  const togglePaymentsMenu = () => setIsPaymentsOpen(prev => !prev);
  const toggleSettingsMenu = () => setIsSettingsOpen(prev => !prev);

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div>
          <h3>Admin Panel</h3>
          <ul className="sidebar-nav">
            <li><Link to="/admin/dashboard">Dashboard</Link></li>

            <li>
              <button onClick={toggleMembershipMenu} className="sidebar-link collapsible">
                Membership {isMembershipOpen ? '▾' : '▸'}
              </button>
              {isMembershipOpen && (
                <ul className="submenu">
                  <li><Link to="/admin/members/pending">Pending Members</Link></li>
                  <li><Link to="/admin/members/approved">Members</Link></li>
                </ul>
              )}
            </li>

            <li>
              <button onClick={toggleLoanMenu} className="sidebar-link collapsible">
                Loan {isLoanOpen ? '▾' : '▸'}
              </button>
              {isLoanOpen && (
                <ul className="submenu">
                  <li><Link to="/admin/loan/categories">Loan Categories</Link></li>
                  <li><Link to="/admin/loan/management">Loan Management</Link></li>
                </ul>
              )}
            </li>

            <li>
              <button onClick={togglePaymentsMenu} className="sidebar-link collapsible">
                Payments {isPaymentsOpen ? '▾' : '▸'}
              </button>
              {isPaymentsOpen && (
                <ul className="submenu">
                  <li><Link to="/admin/all-payments">All Payments</Link></li>
                  <li><Link to="/admin/loan/repayment-list">Loan Repayments</Link></li>
                  <li><Link to="/admin/payments/levies">Development Levy</Link></li>
                  <li><Link to="/admin/payments/contributions">Contribution</Link></li>
                </ul>
              )}
            </li>

            <li><Link to="/admin/report">Reports</Link></li>
            <li><Link to="/admin/permissions">Permissions</Link></li>

            <li>
              <button onClick={toggleSettingsMenu} className="sidebar-link collapsible">
                Settings {isSettingsOpen ? '▾' : '▸'}
              </button>
              {isSettingsOpen && (
                <ul className="submenu">
                  <li><Link to="/admin/settings/2fa">Two-Factor Auth</Link></li>
                  <li><Link to="/admin/coop-config">Cooperative Config</Link></li>
                </ul>
              )}
            </li>
          </ul>
        </div>

        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </aside>

      <main className="main-content">
        <div className="theme-toggle-floating">
          <button
            className={`theme-toggle-btn ${theme === 'light' ? 'active' : ''}`}
            onClick={() => setTheme('light')}
            title="Light mode"
          >
            🌞
          </button>
          <button
            className={`theme-toggle-btn ${theme === 'dark' ? 'active' : ''}`}
            onClick={() => setTheme('dark')}
            title="Dark mode"
          >
            🌙
          </button>
          <button
            className={`theme-toggle-btn ${theme === 'system' ? 'active' : ''}`}
            onClick={() => setTheme('system')}
            title="System default"
          >
            🖥
          </button>
        </div>

        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
