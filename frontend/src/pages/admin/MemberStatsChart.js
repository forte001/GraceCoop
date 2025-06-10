import React, { useEffect, useState } from 'react';
import { Pie } from 'react-chartjs-2';
import 'chart.js/auto';
import axiosInstance from '../../utils/axiosInstance'; 

const MemberStatsChart = () => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMemberStats = async () => {
      try {
        const response = await axiosInstance.get('/admin/dashboard-stats/');
        const stats = response.data;

        // Transform data into chart-friendly format
        const formatted = [
          { status: 'Approved', value: stats.paid_members },
          { status: 'Pending', value: stats.pending_members }
        ];

        setChartData(formatted);
      } catch (error) {
        console.error('Failed to fetch member stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMemberStats();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (!chartData.length) return <p>No data available.</p>;

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
    <div style={{ maxWidth: 500, marginTop: '40px' }}>
      <Pie data={chartConfig} options={options} />
    </div>
  );
};

export default MemberStatsChart;
