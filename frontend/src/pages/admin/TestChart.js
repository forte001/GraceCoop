// src/components/admin/TestChart.js
import React from 'react';
import { PieChart, Pie } from 'recharts';

const data = [
  { name: 'Approved', value: 10 },
  { name: 'Pending', value: 5 },
];

const TestChart = () => {
  return (
    <div style={{ width: 400, height: 300 }}>
      <PieChart width={400} height={300}>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" />
      </PieChart>
    </div>
  );
};

export default TestChart;
