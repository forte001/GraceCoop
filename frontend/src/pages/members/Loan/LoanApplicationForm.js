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
      setInterestRate(selectedCategory.interest_rate); // Set the interest rate based on the selected category
    }
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  if (!selectedCategoryId) {
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

    setMessage('Application submitted successfully!');

    // Clear the form
    setAmount('');
    setSelectedCategoryId('');
    setRepaymentMonths('');
    setInterestRate('');

    // Wait 5 seconds, then navigate
    setTimeout(() => {
      navigate('/member/loan-application-list');
    }, 5000);

  } catch (error) {
    console.error('Error submitting application:', error);
    setMessage('Error submitting application.');
  }
};


  return (
    <div className="loan-application-form-container">
      <h2>Apply for a Loan</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Loan Category:
          <select value={selectedCategoryId} onChange={handleCategoryChange} required>
            <option value="">-- Select Loan Category --</option>
            {loanCategories
                .filter(category => category.status === 'active') // ✅ Only show active categories
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

        {/* Interest Rate Field */}
        <label>
          Interest Rate:
          <input
            type="text"
            value={interestRate}
            readOnly
          />
        </label>

        <button type="submit">Submit Application</button>
        {message && <p className="form-message">{message}</p>}
      </form>
    </div>
  );
};

export default LoanApplicationForm;
