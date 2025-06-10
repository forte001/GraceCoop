import React, { useContext } from 'react';
import { MemberContext } from '../../components/MemberContext';
import "../../styles/members/DashboardPage.css";
import PayButtons from "../../components/PayButton";

const DashboardPage = () => {
  const { memberProfile, loading } = useContext(MemberContext);

  if (loading) return <div className="dashboard-container">Loading...</div>;
  if (!memberProfile) {
    return (
      <div className="dashboard-container">
        <h2>Unable to load profile.</h2>
      </div>
    );
  }

  const { user, status, has_paid_shares, has_paid_levy } = memberProfile;
  const notApproved = status !== "approved";
  const unpaidFees = !has_paid_shares || !has_paid_levy;

  return (
    <div className="dashboard-container">
      <h1>Welcome, {user?.username || "Member"}!</h1>

      {(notApproved || unpaidFees) && (
        <div className="alert-banner">
          <h3>🚨 Membership Notice</h3>
          <p>
            Your membership status is <strong>{status}</strong>.
            {!has_paid_shares && ' Please pay your Shares fee.'}
            {!has_paid_levy && ' Please pay your Development Levy.'}
          </p>
          <p>Admin approval requires all payments to be completed.</p>

          <PayButtons hasPaidShares={has_paid_shares} hasPaidLevy={has_paid_levy} />
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
