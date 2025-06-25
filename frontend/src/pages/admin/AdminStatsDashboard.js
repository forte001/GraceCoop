import React, { useEffect, useState } from 'react';
import { Pie } from 'react-chartjs-2';
import 'chart.js/auto';
import axiosAdminInstance from '../../utils/axiosAdminInstance'; 
import '../../styles/admin/AdminStatsDashboard.css'; 
import Spinner from '../../components/Spinner';


const AdminStatsDashboard = () => {
  const [stats, setStats] = useState({
    total_members: 0,
    pending_members: 0,
    paid_members: 0,
    unpaid_members: 0
  });

  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axiosAdminInstance.get('/admin/dashboard-stats/');
        const data = res.data;
        setStats(data);

        // Prepare chart data
        const formatted = [
          { status: 'Approved', value: data.paid_members },
          { status: 'Pending', value: data.pending_members }
        ];

        setChartData(formatted);
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) return <Spinner />;
  if (!chartData.length) return <p>No data available.</p>;

  // Chart configuration
  const chartConfig = {
    labels: chartData.map(entry => entry.status),
    datasets: [
      {
        label: 'Members',
        data: chartData.map(entry => entry.value),
        backgroundColor: ['#10b981', '#f59e0b'], // Colors for Pending and Approved
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'right' },
    },
  };

  return (
    <div className="dashboard-container" style={{ padding: '20px' }}>
      {/* <h1>Admin Dashboard</h1> */}

      {/* Stats Cards */}
      <div className="dashboard-grid">
        <div className="stat-card total">
          <h4>Total Members</h4>
          <p>{stats.total_members}</p>
        </div>
        <div className="stat-card pending">
          <h4>Pending Approvals</h4>
          <p>{stats.pending_members}</p>
        </div>
        <div className="stat-card paid">
          <h4>Paid Members</h4>
          <p>{stats.paid_members}</p>
        </div>
        <div className="stat-card unpaid">
          <h4>Unpaid Members</h4>
          <p>{stats.unpaid_members}</p>
        </div>
      </div>

      {/* Pie Chart */}
      <div className="pie-chart-container">
        <Pie data={chartConfig} options={options} />
      </div>
    </div>
  );
};

export default AdminStatsDashboard;
