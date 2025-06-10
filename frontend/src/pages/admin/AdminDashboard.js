import React from 'react';
import AdminStatsDashboard from './AdminStatsDashboard';
// import MemberStatsChart from './MemberStatsChart';

const AdminDashboard = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Admin Dashboard</h1>
      <AdminStatsDashboard />
      {/* <MemberStatsChart /> Render the chart component */}
    </div>
  );
};

export default AdminDashboard;
