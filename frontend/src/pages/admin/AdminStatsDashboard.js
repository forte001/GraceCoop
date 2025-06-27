import React, { useEffect, useState, useContext } from 'react';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import axiosAdminInstance from '../../utils/axiosAdminInstance';
import Spinner from '../../components/Spinner';
import '../../styles/admin/AdminStatsDashboard.css';
import { ThemeContext } from '../../components/ThemeContext';

const AdminStatsDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const [chartOptions, setChartOptions] = useState({});
  const { theme } = useContext(ThemeContext);


  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axiosAdminInstance.get(`/admin/dashboard-stats/?period=${period}`);
        setStats(res.data);
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [period]);

  useEffect(() => {
  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim();
  const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--grid-color').trim();

  setChartOptions({
    responsive: true,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: textColor,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: textColor,
        },
        grid: {
          color: gridColor,
        },
      },
      y: {
        ticks: {
          color: textColor,
        },
        grid: {
          color: gridColor,
        },
      },
    },
  });
}, [theme]);

  if (loading) return <Spinner />;
  if (!stats) return <p>No data available.</p>;

  // Build line graph from recent payments
  const amountsByDay = stats.recent_payments.reduce((acc, payment) => {
    const date = new Date(payment.paid_date).toLocaleDateString();
    acc[date] = (acc[date] || 0) + parseFloat(payment.amount);
    return acc;
  }, {});

  const chartLabels = Object.keys(amountsByDay).sort(
    (a, b) => new Date(a) - new Date(b)
  );
  const chartData = chartLabels.map(label => amountsByDay[label]);

  const lineData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Total Payments (₦)',
        data: chartData,
        fill: false,
        backgroundColor: '#10b981',
        borderColor: '#10b981',
        tension: 0.3,
      },
    ],
  };



  return (
    <div className="dashboard-container" style={{ padding: '20px' }}>
      {/* Stats */}
      <div className="dashboard-grid">
        <div className="stat-card total">
          <h4>Total Members</h4>
          <p>{stats.total_members}</p>
        </div>
        <div className="stat-card pending">
          <h4>Pending Approvals</h4>
          <p>{stats.pending_members}</p>
        </div>
        <div className="stat-card payments">
          <h4>Total Payments (₦)</h4>
          <p>{parseFloat(stats.total_payments).toFixed(2)}</p>
        </div>
      </div>

      {/* Period selector */}
      <div className="period-selector">
        <label htmlFor="period">Select Period (days): </label>
        <select
          id="period"
          value={period}
          onChange={e => setPeriod(e.target.value)}
          style={{ marginLeft: '10px' }}
        >
          <option value={30}>30</option>
          <option value={60}>60</option>
          <option value={90}>90</option>
        </select>
      </div>

      {/* Line Graph */}
      <div className="chart-container" style={{ marginTop: '40px' }}>
        <Line data={lineData} options={chartOptions} />
      </div>

      {/* Recent Payments */}
      <div className="recent-payments" style={{ marginTop: '40px' }}>
        <h4>Recent Payments</h4>
        <table className="recent-payments-table">
          <thead>
            <tr>
              <th>Amount</th>
              <th>Type</th>
              <th>Paid Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {stats.recent_payments.map((payment) => (
              <tr key={payment.id}>
                <td>₦{parseFloat(payment.amount).toFixed(2)}</td>
                <td>{payment.payment_type.toUpperCase()}</td>
                <td>{new Date(payment.paid_date).toLocaleDateString()}</td>
                <td
                  style={{
                    color: payment.status === 'complete' ? 'var(--success-color)' : 'var(--warning-color)',
                    fontWeight: 'bold',
                  }}
                >
                  {payment.status.toUpperCase()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminStatsDashboard;
