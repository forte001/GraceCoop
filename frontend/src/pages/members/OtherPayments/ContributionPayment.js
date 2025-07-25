import React, { useEffect, useState } from 'react';
import axiosMemberInstance from '../../../utils/axiosMemberInstance';
import { useContributionPayment } from '../../../utils/useContributionPayment';
import '../../../styles/members/loan/LoanApplication.css'

const ContributionPayment = () => {
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState(null);
  const [min, setMin] = useState(null);
  const [max, setMax] = useState(null);
  const { initiateContributionPayment, loading } = useContributionPayment();

  useEffect(() => {
    // Fetch min/max config using axiosMemberInstance
    axiosMemberInstance.get('/members/cooperative-config/active/')
      .then(res => {
        setMin(res.data.min_contribution_amount);
        setMax(res.data.max_contribution_amount);
      })
      .catch(err => {
        console.error('Failed to load config', err);
      });
  }, []);

const handlePayment = async (e) => {
  e.preventDefault();
  setStatus(null);

  const customAmount = parseFloat(amount);  
  if (isNaN(customAmount) || customAmount < (min || 0)) {
    setStatus('error');
    return;
  }
  if (max && customAmount > max) {
    setStatus('error');
    return;
  }

  try {
    await initiateContributionPayment(customAmount);  
    setStatus('success');
    setAmount('');
  } catch (error) {
    console.error('Payment failed:', error);
    setStatus('error');
  }
};


  return (
   <div className="loan-application-form-container">
      <h2>Pay Contribution</h2>
      <form onSubmit={handlePayment}>
        <label>
          Amount (₦):
          <input
            type="number"
            value={amount}
            min={min || 0}
            onChange={(e) => setAmount(e.target.value)}
            required
            step="0.01"
          />
        </label>

        {min !== null && <p className="form-message">Minimum contribution: ₦{min}</p>}

        {max !== null && amount && parseFloat(amount) > max && (
          <p className="form-message">Maximum allowed: ₦{max}. Please adjust.</p>
        )}

        <button type="submit" disabled={loading || (max && parseFloat(amount) > max)}>
          {loading ? 'Processing...' : 'Pay'}
        </button>
      </form>

      {status === 'success' && (
        <p className="form-message success">Payment successful!</p>
      )}
      {status === 'error' && (
        <p className="form-message">Payment failed or invalid amount. Try again.</p>
      )}
    </div>

  );
};

export default ContributionPayment;
