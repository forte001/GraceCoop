import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Permissions from '../admin/Permissions';
import '../../styles/admin/AdminLayout.css';

const AdminSidebar = () => {
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

  const toggleMembershipMenu = () => setIsMembershipOpen(prev => !prev);
  const toggleLoanMenu = () => setIsLoanOpen(prev => !prev);
  const togglePaymentsMenu = () => setIsPaymentsOpen(prev => !prev);
  const toggleSettingsMenu = () => setIsSettingsOpen(prev => !prev);

  return (
    <div className="sidebar">
      <h3>Admin Panel</h3>
      <ul className="sidebar-nav">
        <li><Link to="/admin/dashboard">Dashboard</Link></li>
        <Permissions />

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
              <li><Link to="/admin/loan/loans">Loans</Link></li>
            </ul>
          )}
        </li>

        <li>
          <button onClick={togglePaymentsMenu} className="sidebar-link collapsible">
            Payments {isPaymentsOpen ? '▾' : '▸'}
          </button>
          {isPaymentsOpen && (
            <ul className="submenu">
              <li><Link to="/admin/payments/loans">Loans</Link></li>
              <li><Link to="/admin/payments/development-levy">Development Levy</Link></li>
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
              <li><Link to="/admin/settings/profile">Profile Settings</Link></li>
              <li><Link to="/admin/settings/theme">Theme Mode</Link></li>
              <li><Link to="/admin/settings/2fa">Two-Factor Auth</Link></li>
            </ul>
          )}
        </li>
      </ul>
    </div>
  );
};

export default AdminSidebar;
