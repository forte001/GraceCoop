import React, { useState, useEffect } from 'react';
import '../../../styles/members/loan/ApprovedLoansList.css';
import { useLoanPayment } from '../../../utils/useLoanPayment';
import { formatNaira } from '../../../utils/formatCurrency';
import Spinner from '../../../components/Spinner';

const LoanRepaymentForm = ({ loanReference, type, installment, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const { initiateLoanPayment, loading } = useLoanPayment();


  const isPayoff = type === 'payoff';

  useEffect(() => {
    if (installment && installment.amount_due) {
      setAmount(installment.amount_due); // prefill with schedule amount
    }
  }, [installment]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isPayoff && (!amount || isNaN(amount) || parseFloat(amount) <= 0)) {
      setError('Please enter a valid amount.');
      return;
    }

    try {
      await initiateLoanPayment(
      loanReference,
      isPayoff,
      isPayoff ? null : parseFloat(amount)
    );


      setAmount('');
      onSuccess?.();
    } catch (err) {
      const message = err.response?.data?.detail || 'An error occurred.';
      setError(message);
    }
  };

  return (
    <div className="repayment-form-container">
      <h3>{isPayoff ? 'Pay Off Loan' : 'Make a Repayment'}</h3>

      <form onSubmit={handleSubmit}>
        {!isPayoff && (
          <div className="form-group">
            <label>Amount (₦)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter repayment amount"
              required
            />
            <small>Default: {formatNaira(installment?.amount_due || 0)}</small>
          </div>
        )}

        {error && <p className="error-text">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Spinner size={16} /> Processing...
            </>
          ) : isPayoff ? 'Pay Off Now' : 'Submit Repayment'}
        </button>

      </form>
    </div>
  );
};

export default LoanRepaymentForm;
