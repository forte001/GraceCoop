import React, { useContext, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { MemberContext } from '../components/MemberContext';
import '../styles/members/MemberLayout.css';

const MemberLayout = () => {
  const { memberProfile, loading } = useContext(MemberContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [isLoanOpen, setIsLoanOpen] = useState(
    location.pathname.startsWith('/member/loans')
  );
  const [isOtherPaymentsOpen, setIsOtherPaymentsOpen] = useState(
    location.pathname.startsWith('/member/pay-contribution') ||
    location.pathname.startsWith('/member/pay-development-levy')
  );
  const [isPaymentsOpen, setIsPaymentsOpen] = useState(
    location.pathname.startsWith('/member/contribution') ||
    location.pathname.startsWith('/member/development_levy') ||
    location.pathname.startsWith('/member/loan-repayments')
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(
    location.pathname.startsWith('/member/settings')
  );

  const toggleLoanMenu = () => setIsLoanOpen(prev => !prev);
  const toggleOtherPaymentsMenu = () => setIsOtherPaymentsOpen(prev => !prev);
  const togglePaymentsMenu = () => setIsPaymentsOpen(prev => !prev);
  const toggleSettingsMenu = () => setIsSettingsOpen(prev => !prev);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('memberFullName');
    localStorage.removeItem('membershipStatus');
    localStorage.removeItem('memberApprovalStatus');
    navigate('/login');
  };

  if (loading) {
    return <div className="member-layout">Loading member data...</div>;
  }

  const fullName = memberProfile?.user?.username || '';
  const membershipStatus = memberProfile?.membership_status || '';
  const approvalStatus = memberProfile?.status || '';
  const isActiveMember = approvalStatus === 'approved' && membershipStatus === 'active';

  return (
    <div className="member-layout">
      <aside className="member-sidebar">
        <div>
          <h3>Member Panel</h3>

          {fullName && (
            <div className="member-fullname">
              <strong>{fullName}</strong>
            </div>
          )}

          <ul className="sidebar-nav">
            <li><Link to="/member/dashboard">Dashboard</Link></li>
            <li><Link to="/member/profile">Profile</Link></li>

            {isActiveMember && (
              <>
                <li>
                  <button onClick={toggleLoanMenu} className="sidebar-link collapsible">
                    Loans {isLoanOpen ? '▾' : '▸'}
                  </button>
                  {isLoanOpen && (
                    <ul className="submenu">
                      <li><Link to="/member/loan-application">Apply for Loan</Link></li>
                      <li><Link to="/member/loan-application-list">Loan Application History</Link></li>
                      <li><Link to="/member/loans">Loans</Link></li>
                    </ul>
                  )}
                </li>

                <li>
                  <button onClick={toggleOtherPaymentsMenu} className="sidebar-link collapsible">
                    Other Payments {isOtherPaymentsOpen ? '▾' : '▸'}
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
                    Payments {isPaymentsOpen ? '▾' : '▸'}
                  </button>
                  {isPaymentsOpen && (
                    <ul className="submenu">
                      <li><Link to="/member/loan-repayments">Loan Repayments</Link></li>
                      <li><Link to="/member/contribution-list">Contribution</Link></li>
                      <li><Link to="/member/levy-list">Development Levy</Link></li>
                    </ul>
                  )}
                </li>

                <li><Link to="/member/reports">Reports</Link></li>

                <li>
                  <button onClick={toggleSettingsMenu} className="sidebar-link collapsible">
                    Settings {isSettingsOpen ? '▾' : '▸'}
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
        </div>
        <p>Logged in as: {fullName}</p>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </aside>

      <main className="member-content">
        <Outlet />
      </main>
    </div>
  );
};

export default MemberLayout;
