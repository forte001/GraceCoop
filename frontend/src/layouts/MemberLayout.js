import React, { useContext, useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { MemberContext } from '../components/MemberContext';
import { ThemeContext } from '../components/ThemeContext';
import { FaMoon, FaSun, FaDesktop, FaBars, FaTachometerAlt, 
  FaUser, FaMoneyBill, FaCog, FaHandshake, FaSignOutAlt, 
  FaFileAlt} from 'react-icons/fa';
import '../styles/members/MemberLayout.css';
import Spinner from '../components/Spinner';

const MemberLayout = () => {
  const { memberProfile, loading } = useContext(MemberContext);
  const { theme, setTheme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  const [isLoanOpen, setIsLoanOpen] = useState(location.pathname.startsWith('/member/loans'));
  const [isOtherPaymentsOpen, setIsOtherPaymentsOpen] = useState(
    location.pathname.startsWith('/member/pay-contribution') || location.pathname.startsWith('/member/pay-development-levy')
  );
  const [isPaymentsOpen, setIsPaymentsOpen] = useState(
    location.pathname.startsWith('/member/contribution') ||
    location.pathname.startsWith('/member/development_levy') ||
    location.pathname.startsWith('/member/loan-repayments')
  );
  const [isReportsOpen, setIsReportsOpen] = useState(
    location.pathname.startsWith('/member/report')
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(location.pathname.startsWith('/member/settings'));

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
    localStorage.removeItem('memberFullName');
    localStorage.removeItem('membershipStatus');
    localStorage.removeItem('memberApprovalStatus');
    navigate('/login');
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

  const toggleLoanMenu = () => setIsLoanOpen(prev => !prev);
  const toggleOtherPaymentsMenu = () => setIsOtherPaymentsOpen(prev => !prev);
  const togglePaymentsMenu = () => setIsPaymentsOpen(prev => !prev);
  const toggleReportsMenu = () => setIsReportsOpen(prev => !prev);
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
      <div className="member-layout" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '2rem' }}>
        <Spinner size={24} />
        <span>Loading member data...</span>
      </div>
    );
  }

  const layoutClasses = `member-layout ${isSidebarCollapsed ? 'collapsed' : ''} ${isMobileMenuOpen ? 'sidebar-open' : ''}`;

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

      <aside className="member-sidebar">
        <div className="sidebar-header">
          <img src="/logo.png" alt="GraceCoop" className="sidebar-logo" />
          {!isSidebarCollapsed && <span className="sidebar-subtitle">GraceCoop</span>}
          {!isSidebarCollapsed && <h3 className="panel-title">Member Panel</h3>}
          {!isMobile && (
            <button onClick={toggleSidebar} className="sidebar-toggle-btn">
              <FaBars />
            </button>
          )}
        </div>

        <ul className="sidebar-nav">
          <li>
            <Link to="/member/dashboard" onClick={closeMobileMenu}>
              <FaTachometerAlt />
              {(!isSidebarCollapsed || isMobile) && <span>Dashboard</span>}
            </Link>
          </li>
          
          <li>
            <Link to="/member/profile" onClick={closeMobileMenu}>
              <FaUser />
              {(!isSidebarCollapsed || isMobile) && <span>Profile</span>}
            </Link>
          </li>

          {isActiveMember && (
            <>
              <li>
                <button onClick={toggleLoanMenu} className="sidebar-link collapsible">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaHandshake />
                    {(!isSidebarCollapsed || isMobile) && <span>Loans</span>}
                  </div>
                  {(!isSidebarCollapsed || isMobile) && <span>{isLoanOpen ? '▾' : '▸'}</span>}
                </button>
                {isLoanOpen && (!isSidebarCollapsed || isMobile) && (
                  <ul className="submenu">
                    <li><Link to="/member/loan-application" onClick={closeMobileMenu}>Apply for Loan</Link></li>
                    <li><Link to="/member/loan-application-list" onClick={closeMobileMenu}>Loan Application History</Link></li>
                    <li><Link to="/member/loans" onClick={closeMobileMenu}>Loans</Link></li>
                    <li><Link to="/member/guarantor-requests" onClick={closeMobileMenu}>Guarantor Requests</Link></li>
                  </ul>
                )}
              </li>
              
              <li>
                <button onClick={toggleOtherPaymentsMenu} className="sidebar-link collapsible">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaMoneyBill />
                    {(!isSidebarCollapsed || isMobile) && <span>Other Payments</span>}
                  </div>
                  {(!isSidebarCollapsed || isMobile) && <span>{isOtherPaymentsOpen ? '▾' : '▸'}</span>}
                </button>
                {isOtherPaymentsOpen && (!isSidebarCollapsed || isMobile) && (
                  <ul className="submenu">
                    <li><Link to="/member/pay/contribution" onClick={closeMobileMenu}>Pay Contribution</Link></li>
                    <li><Link to="/member/pay/levy" onClick={closeMobileMenu}>Pay Development Levy</Link></li>
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
                    <li><Link to="/member/all-payments" onClick={closeMobileMenu}>All Payments</Link></li>
                    <li><Link to="/member/loan-repayments" onClick={closeMobileMenu}>Loan Repayments</Link></li>
                    <li><Link to="/member/contribution-list" onClick={closeMobileMenu}>Contribution</Link></li>
                    <li><Link to="/member/levy-list" onClick={closeMobileMenu}>Development Levy</Link></li>
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
                    <li><Link to="/member/report/my-ledger" onClick={closeMobileMenu}>Member Ledger</Link></li>
                  </ul>
                )}
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
                    <li><Link to="/member/settings/2fa" onClick={closeMobileMenu}>Two-Factor Auth</Link></li>
                  </ul>
                )}
              </li>
            </>
          )}
        </ul>

        {(!isSidebarCollapsed || isMobile) && (
          <p className="logged-in-text">
            Logged in as: <strong>{fullName}</strong>
          </p>
        )}
        
        <button onClick={handleLogout} className="logout-button">
          <FaSignOutAlt />
          {(!isSidebarCollapsed || isMobile) && <span>Logout</span>}
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