import React from 'react';
import { Bars } from 'react-loader-spinner';

const Spinner = ({ size = 50, color = "#10b981" }) => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
    <Bars
      height={size}
      width={size}
      color={color}
      ariaLabel="loading-bars"
      visible={true}
    />
  </div>
);

export default Spinner;
