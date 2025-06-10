import React from 'react';
import { useEntryPayment } from '../utils/useEntryPayment';

const PayButtons = ({ hasPaidShares, hasPaidLevy }) => {
  const { initiateEntryPayment, loading } = useEntryPayment();

  return (
    <div className="payment-buttons">
      {!hasPaidShares && (
        <button onClick={() => initiateEntryPayment('shares')} disabled={loading}>
          Pay Shares Fee
        </button>
      )}
      {!hasPaidLevy && (
        <button onClick={() => initiateEntryPayment('levy')} disabled={loading}>
          Pay Development Levy
        </button>
      )}
    </div>
  );
};

export default PayButtons;

