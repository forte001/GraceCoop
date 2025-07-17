import React, { useState, useContext } from 'react';
import { ThemeContext } from '../components/ThemeContext';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { FaBars, FaTachometerAlt, FaUsers, FaMoneyBill, FaCog, 
  FaHandshake, FaBullhorn, FaFileAlt, FaSignOutAlt, FaMoon, FaSun, FaDesktop, FaFileInvoiceDollar } from 'react-icons/fa';
import '../styles/admin/AdminLayout.css';

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useContext(ThemeContext);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
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
  const [isReportsOpen, setIsReportsOpen] = useState(
    location.pathname.startsWith('/admin/reports')
  );

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    navigate('/admin/login');
  };

  const toggleSidebar = () => setIsSidebarCollapsed(prev => !prev);
  const toggleMembershipMenu = () => setIsMembershipOpen(prev => !prev);
  const toggleLoanMenu = () => setIsLoanOpen(prev => !prev);
  const togglePaymentsMenu = () => setIsPaymentsOpen(prev => !prev);
  const toggleSettingsMenu = () => setIsSettingsOpen(prev => !prev);
  const toggleReportsMenu = () => setIsReportsOpen(prev => !prev);

  const renderThemeIcon = () => {
      switch (theme) {
        case 'light': return <FaSun />;
        case 'dark': return <FaMoon />;
        default: return <FaDesktop />;
      }
    };

  const cycleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(nextTheme);
  };

  return (
    <div className={`admin-layout ${isSidebarCollapsed ? 'collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-header">
          <img src="/logo.png" alt="GraceCoop" className="sidebar-logo" />
          {!isSidebarCollapsed && <span className="sidebar-subtitle">GraceCoop</span>}
          {!isSidebarCollapsed && <h3>Admin Panel</h3>}
          <button onClick={toggleSidebar} className="sidebar-toggle-btn">
            <FaBars />
          </button>
        </div>

        <ul className="sidebar-nav">
          <li>
            <Link to="/admin/dashboard">
              <FaTachometerAlt />
              {!isSidebarCollapsed && ' Dashboard'}
            </Link>
          </li>

          <li>
            <button onClick={toggleMembershipMenu} className="sidebar-link collapsible">
              <FaUsers />
              {!isSidebarCollapsed && ` Membership ${isMembershipOpen ? '▾' : '▸'}`}
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
              <FaHandshake />
              {!isSidebarCollapsed && ` Loan ${isLoanOpen ? '▾' : '▸'}`}
            </button>
            {isLoanOpen && (
              <ul className="submenu">
                <li><Link to="/admin/loan/categories">Loan Categories</Link></li>
                <li><Link to="/admin/loan/management">Loan Management</Link></li>
                <li><Link to="/admin/disbursement-logs">Disbursement Log</Link></li>
              </ul>
            )}
          </li>

          <li>
            <button onClick={togglePaymentsMenu} className="sidebar-link collapsible">
              <FaMoneyBill />
              {!isSidebarCollapsed && ` Payments ${isPaymentsOpen ? '▾' : '▸'}`}
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
            
          <li>
            <button onClick={toggleReportsMenu} className="sidebar-link collapsible">
              <FaFileAlt />
              {!isSidebarCollapsed && ` Reports ${isReportsOpen ? '▾' : '▸'}`}
            </button>
            {isReportsOpen && (
              <ul className="submenu">
                <li><Link to="/admin/report/members-balances">Members Balances</Link></li>
                <li><Link to="/admin/report/analysis-of-receipts">Analysis of Receipts</Link></li>
                <li><Link to="/admin/report/member-ledger">Member Ledger Report</Link></li>
              </ul>
            )}
          </li>
          <li>
            <Link to="/admin/expenses">
              <FaFileInvoiceDollar  />
              {!isSidebarCollapsed && ' Expense Management'}
            </Link>
          </li>

          <li>
            <Link to="/admin/announcements">
              <FaBullhorn />
              {!isSidebarCollapsed && ' Announcements'}
            </Link>
          </li>

          <li>
            <button onClick={toggleSettingsMenu} className="sidebar-link collapsible">
              <FaCog />
              {!isSidebarCollapsed && ` Settings ${isSettingsOpen ? '▾' : '▸'}`}
            </button>
            {isSettingsOpen && (
              <ul className="submenu">
                <li><Link to="/admin/settings/2fa">Two-Factor Auth</Link></li>
                <li><Link to="/admin/coop-config">Cooperative Config</Link></li>
                <li><Link to="/admin/permissions">Permissions</Link></li>
              </ul>
            )}
          </li>
        </ul>

        <button onClick={handleLogout} className="logout-button">
          <FaSignOutAlt />
          {!isSidebarCollapsed && ' Logout'}
        </button>
      </aside>

      <main className="main-content">
        <div className="theme-toggle-container">
        <button className="theme-toggle-btn" onClick={cycleTheme} title={`Theme: ${theme}`}>
          {renderThemeIcon()}
        </button>
      </div>
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
