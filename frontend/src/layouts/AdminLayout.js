import React, { useState, useContext, useEffect } from 'react';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
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

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      
      // Auto-collapse sidebar on mobile
      if (mobile) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  }, [location.pathname, isMobile]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    navigate('/admin/login');
  };

  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileMenuOpen(prev => !prev);
    } else {
      setIsSidebarCollapsed(prev => !prev);
    }
  };

  const closeMobileMenu = () => {
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  };

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

  const layoutClasses = `admin-layout ${isSidebarCollapsed ? 'collapsed' : ''} ${isMobileMenuOpen ? 'sidebar-open' : ''}`;

  return (
    <div className={layoutClasses}>
      {/* Mobile menu button */}
      {isMobile && (
        <button onClick={toggleSidebar} className="mobile-menu-btn">
          <FaBars />
        </button>
      )}

      {/* Sidebar overlay for mobile */}
      {isMobileMenuOpen && <div className="sidebar-overlay" onClick={closeMobileMenu} />}

      <aside className="sidebar">
        <div className="sidebar-header">
          <img src="/logo.png" alt="GraceCoop" className="sidebar-logo" />
          {!isSidebarCollapsed && <span className="sidebar-subtitle">GraceCoop</span>}
          {!isSidebarCollapsed && <h3>Admin Panel</h3>}
          {!isMobile && (
            <button onClick={toggleSidebar} className="sidebar-toggle-btn">
              <FaBars />
            </button>
          )}
        </div>

        <ul className="sidebar-nav">
          <li>
            <Link to="/admin/dashboard" onClick={closeMobileMenu}>
              <FaTachometerAlt />
              {(!isSidebarCollapsed || isMobile) && <span>Dashboard</span>}
            </Link>
          </li>

          <li>
            <button onClick={toggleMembershipMenu} className="sidebar-link collapsible">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaUsers />
                {(!isSidebarCollapsed || isMobile) && <span>Membership</span>}
              </div>
              {(!isSidebarCollapsed || isMobile) && <span>{isMembershipOpen ? '▾' : '▸'}</span>}
            </button>
            {isMembershipOpen && (!isSidebarCollapsed || isMobile) && (
              <ul className="submenu">
                <li><Link to="/admin/members/pending" onClick={closeMobileMenu}>Pending Members</Link></li>
                <li><Link to="/admin/members/approved" onClick={closeMobileMenu}>Members</Link></li>
              </ul>
            )}
          </li>

          <li>
            <button onClick={toggleLoanMenu} className="sidebar-link collapsible">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaHandshake />
                {(!isSidebarCollapsed || isMobile) && <span>Loan</span>}
              </div>
              {(!isSidebarCollapsed || isMobile) && <span>{isLoanOpen ? '▾' : '▸'}</span>}
            </button>
            {isLoanOpen && (!isSidebarCollapsed || isMobile) && (
              <ul className="submenu">
                <li><Link to="/admin/loan/categories" onClick={closeMobileMenu}>Loan Categories</Link></li>
                <li><Link to="/admin/loan/management" onClick={closeMobileMenu}>Loan Management</Link></li>
                <li><Link to="/admin/disbursement-logs" onClick={closeMobileMenu}>Disbursement Log</Link></li>
              </ul>
            )}
          </li>

          <li>
            <button onClick={togglePaymentsMenu} className="sidebar-link collapsible">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaMoneyBill />
                {(!isSidebarCollapsed || isMobile) && <span>Payments</span>}
              </div>
              {(!isSidebarCollapsed || isMobile) && <span>{isPaymentsOpen ? '▾' : '▸'}</span>}
            </button>
            {isPaymentsOpen && (!isSidebarCollapsed || isMobile) && (
              <ul className="submenu">
                <li><Link to="/admin/all-payments" onClick={closeMobileMenu}>All Payments</Link></li>
                <li><Link to="/admin/loan/repayment-list" onClick={closeMobileMenu}>Loan Repayments</Link></li>
                <li><Link to="/admin/payments/levies" onClick={closeMobileMenu}>Development Levy</Link></li>
                <li><Link to="/admin/payments/contributions" onClick={closeMobileMenu}>Contribution</Link></li>
              </ul>
            )}
          </li>
            
          <li>
            <button onClick={toggleReportsMenu} className="sidebar-link collapsible">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaFileAlt />
                {(!isSidebarCollapsed || isMobile) && <span>Reports</span>}
              </div>
              {(!isSidebarCollapsed || isMobile) && <span>{isReportsOpen ? '▾' : '▸'}</span>}
            </button>
            {isReportsOpen && (!isSidebarCollapsed || isMobile) && (
              <ul className="submenu">
                <li><Link to="/admin/report/members-balances" onClick={closeMobileMenu}>Members Balances</Link></li>
                <li><Link to="/admin/report/analysis-of-receipts" onClick={closeMobileMenu}>Analysis of Receipts</Link></li>
                <li><Link to="/admin/report/member-ledger" onClick={closeMobileMenu}>Member Ledger Report</Link></li>
              </ul>
            )}
          </li>
          
          <li>
            <Link to="/admin/expenses" onClick={closeMobileMenu}>
              <FaFileInvoiceDollar />
              {(!isSidebarCollapsed || isMobile) && <span>Expense Management</span>}
            </Link>
          </li>

          <li>
            <Link to="/admin/announcements" onClick={closeMobileMenu}>
              <FaBullhorn />
              {(!isSidebarCollapsed || isMobile) && <span>Announcements</span>}
            </Link>
          </li>

          <li>
            <button onClick={toggleSettingsMenu} className="sidebar-link collapsible">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaCog />
                {(!isSidebarCollapsed || isMobile) && <span>Settings</span>}
              </div>
              {(!isSidebarCollapsed || isMobile) && <span>{isSettingsOpen ? '▾' : '▸'}</span>}
            </button>
            {isSettingsOpen && (!isSidebarCollapsed || isMobile) && (
              <ul className="submenu">
                <li><Link to="/admin/settings/2fa" onClick={closeMobileMenu}>Two-Factor Auth</Link></li>
                <li><Link to="/admin/coop-config" onClick={closeMobileMenu}>Cooperative Config</Link></li>
                <li><Link to="/admin/permissions" onClick={closeMobileMenu}>Permissions</Link></li>
              </ul>
            )}
          </li>
        </ul>

        <button onClick={handleLogout} className="logout-button">
          <FaSignOutAlt />
          {(!isSidebarCollapsed || isMobile) && <span>Logout</span>}
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