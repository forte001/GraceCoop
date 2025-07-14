import React, { useContext, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { MemberContext } from '../components/MemberContext';
import { ThemeContext } from '../components/ThemeContext';
import { FaMoon, FaSun, FaDesktop, FaBars, FaTachometerAlt, 
  FaUser, FaMoneyBill, FaCog, FaHandshake, FaSignOutAlt } from 'react-icons/fa';
import '../styles/members/MemberLayout.css';
import Spinner from '../components/Spinner';

const MemberLayout = () => {
  const { memberProfile, loading } = useContext(MemberContext);
  const { theme, setTheme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoanOpen, setIsLoanOpen] = useState(location.pathname.startsWith('/member/loans'));
  const [isOtherPaymentsOpen, setIsOtherPaymentsOpen] = useState(
    location.pathname.startsWith('/member/pay-contribution') || location.pathname.startsWith('/member/pay-development-levy')
  );
  const [isPaymentsOpen, setIsPaymentsOpen] = useState(
    location.pathname.startsWith('/member/contribution') ||
    location.pathname.startsWith('/member/development_levy') ||
    location.pathname.startsWith('/member/loan-repayments')
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(location.pathname.startsWith('/member/settings'));

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('memberFullName');
    localStorage.removeItem('membershipStatus');
    localStorage.removeItem('memberApprovalStatus');
    navigate('/login');
  };

  const toggleSidebar = () => setIsSidebarCollapsed(prev => !prev);
  const toggleLoanMenu = () => setIsLoanOpen(prev => !prev);
  const toggleOtherPaymentsMenu = () => setIsOtherPaymentsOpen(prev => !prev);
  const togglePaymentsMenu = () => setIsPaymentsOpen(prev => !prev);
  const toggleSettingsMenu = () => setIsSettingsOpen(prev => !prev);

  const fullName = memberProfile?.user?.username || '';
  const membershipStatus = memberProfile?.membership_status || '';
  const approvalStatus = memberProfile?.status || '';
  const isActiveMember = approvalStatus === 'approved' && membershipStatus === 'active';

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

  if (loading) {
    return (
      <div className="member-layout" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Spinner size={24} />
        <span>Loading member data...</span>
      </div>
    );
  }

  return (
    <div className={`member-layout ${isSidebarCollapsed ? 'collapsed' : ''}`}>
      <aside className="member-sidebar">
        <div className="sidebar-header">
          <img src="/logo.png" alt="GraceCoop" className="sidebar-logo" />
          {!isSidebarCollapsed && <span className="sidebar-subtitle">GraceCoop</span>}
          {!isSidebarCollapsed && <h3 className="panel-title">Member Panel</h3>}
          <button onClick={toggleSidebar} className="sidebar-toggle-btn">
            <FaBars />
          </button>
        </div>

        <ul className="sidebar-nav">
          <li>
            <Link to="/member/dashboard">
              <FaTachometerAlt />
              {!isSidebarCollapsed && ' Dashboard'}
            </Link>
          </li>
          <li>
            <Link to="/member/profile">
              <FaUser />
              {!isSidebarCollapsed && ' Profile'}
            </Link>
          </li>

          {isActiveMember && (
            <>
              <li>
                <button onClick={toggleLoanMenu} className="sidebar-link collapsible">
                  <FaHandshake />
                  {!isSidebarCollapsed && ` Loans ${isLoanOpen ? '▾' : '▸'}`}
                </button>
                {isLoanOpen && (
                  <ul className="submenu">
                    <li><Link to="/member/loan-application">Apply for Loan</Link></li>
                    <li><Link to="/member/loan-application-list">Loan Application History</Link></li>
                    <li><Link to="/member/loans">Loans</Link></li>
                    <li><Link to="/member/guarantor-requests">Guarantor Requests</Link></li>
                  </ul>
                )}
              </li>
              <li>
                <button onClick={toggleOtherPaymentsMenu} className="sidebar-link collapsible">
                  <FaMoneyBill />
                  {!isSidebarCollapsed && ` Other Payments ${isOtherPaymentsOpen ? '▾' : '▸'}`}
                </button>
                {isOtherPaymentsOpen && (
                  <ul className="submenu">
                    <li><Link to="/member/pay/contribution">Pay Contribution</Link></li>
                    <li><Link to="/member/pay/levy">Pay Development Levy</Link></li>
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
                    <li><Link to="/member/all-payments">All Payments</Link></li>
                    <li><Link to="/member/loan-repayments">Loan Repayments</Link></li>
                    <li><Link to="/member/contribution-list">Contribution</Link></li>
                    <li><Link to="/member/levy-list">Development Levy</Link></li>
                  </ul>
                )}
              </li>
              {/* <li>
                <Link to="/member/reports">
                  <FaFileAlt />
                  {!isSidebarCollapsed && ' Reports'}
                </Link>
              </li> */}
              <li>
                <button onClick={toggleSettingsMenu} className="sidebar-link collapsible">
                  <FaCog />
                  {!isSidebarCollapsed && ` Settings ${isSettingsOpen ? '▾' : '▸'}`}
                </button>
                {isSettingsOpen && (
                  <ul className="submenu">
                    <li><Link to="/member/settings/2fa">Two-Factor Auth</Link></li>
                  </ul>
                )}
              </li>
            </>
          )}
        </ul>

        {!isSidebarCollapsed && (
          <p className="logged-in-text">
            Logged in as: <strong>{fullName}</strong>
          </p>
        )}
        <button onClick={handleLogout} className="logout-button">
          <FaSignOutAlt />
          {!isSidebarCollapsed && ' Logout'}
        </button>
      </aside>

      <main className="member-content">
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

export default MemberLayout;
