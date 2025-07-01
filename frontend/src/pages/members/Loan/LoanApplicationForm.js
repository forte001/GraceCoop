import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import axiosMemberInstance from '../../../utils/axiosMemberInstance';
import '../../../styles/members/loan/LoanApplication.css';

const LoanApplicationForm = () => {
  const [loanCategories, setLoanCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [repaymentMonths, setRepaymentMonths] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success'); // success | error
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLoanCategories = async () => {
      try {
        const response = await axiosMemberInstance.get('/members/loan/loan-categories/');
        setLoanCategories(response.data.results);
      } catch (error) {
        console.error('Failed to fetch loan categories:', error);
      }
    };

    fetchLoanCategories();
  }, []);

  const handleCategoryChange = (e) => {
    const categoryId = e.target.value;
    setSelectedCategoryId(categoryId);

    const selectedCategory = loanCategories.find(cat => cat.id === parseInt(categoryId));
    if (selectedCategory) {
      setRepaymentMonths(selectedCategory.loan_period_months);
      setInterestRate(selectedCategory.interest_rate);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedCategoryId) {
      setMessageType('error');
      setMessage('Please select a loan category.');
      return;
    }

    try {
      await axiosMemberInstance.post('/members/loan/loan-applications/', {
        amount,
        repayment_months: repaymentMonths,
        category_id: selectedCategoryId,
        status: 'pending',
      });

      setMessageType('success');
      setMessage('Application submitted successfully!');

      // clear form
      setAmount('');
      setSelectedCategoryId('');
      setRepaymentMonths('');
      setInterestRate('');

      // navigate after 5 seconds
      setTimeout(() => {
        navigate('/member/loan-application-list');
      }, 5000);

    } catch (error) {
      console.error('Error submitting application:', error);
      setMessageType('error');
      if (
        error.response &&
        error.response.data &&
        error.response.data.non_field_errors
      ) {
        setMessage(error.response.data.non_field_errors[0]);
      } else {
        setMessage('Error submitting application.');
      }
    }
  };

  return (
    <div className="loan-application-form-container">
      <h2>Apply for a Loan</h2>
      {message && (
        <div className={`alert-banner ${messageType === 'error' ? 'error' : ''}`}>
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="close-btn">×</button>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <label>
          Loan Category:
          <select value={selectedCategoryId} onChange={handleCategoryChange} required>
            <option value="">-- Select Loan Category --</option>
            {loanCategories
              .filter(category => category.status === 'active')
              .map(category => (
                <option key={category.id} value={category.id}>
                  {category.name} ({category.loan_period_months} months)
                </option>
              ))}
          </select>
        </label>

        <label>
          Loan Amount:
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>

        <label>
          Repayment Period (months):
          <input
            type="number"
            value={repaymentMonths}
            readOnly
          />
        </label>

        <label>
          Interest Rate:
          <input
            type="text"
            value={interestRate}
            readOnly
          />
        </label>

        <button type="submit">Submit Application</button>
      </form>
    </div>
  );
};

export default LoanApplicationForm;
