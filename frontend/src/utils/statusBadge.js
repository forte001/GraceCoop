// src/utils/statusBadge.js

export const getStatusBadge = (status) => {
  const colorMap = {
    pending: 'gray',
    rejected: 'red',
    approved: 'blue',
    disbursed: 'green',
    partially_disbursed: 'orange',
    grace_applied: 'purple',
    paid_off: 'darkgreen',
    paid: 'green',
    unpaid: 'gray',
  };
  
  return (
    <span style={{
      backgroundColor: colorMap[status] || 'black',
      color: '#fff',
      padding: '3px 6px',
      borderRadius: '4px',
    }}>
      {status.toUpperCase().replace('_', ' ')}
    </span>
  );
};