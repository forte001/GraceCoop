import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from "react-router-dom";
import axiosMemberInstance from '../../../utils/axiosMemberInstance';
import '../../../styles/members/loan/LoanApplication.css';

const LoanApplicationForm = () => {
  const { id } = useParams(); // If present, we are editing
  const navigate = useNavigate();

  const [loanCategories, setLoanCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [repaymentMonths, setRepaymentMonths] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  const [approvedMembers, setApprovedMembers] = useState([]);
  const [selectedGuarantors, setSelectedGuarantors] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  const isEditing = Boolean(id);

  // Load loan categories on mount
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

  // Load existing loan application if editing
  useEffect(() => {
    if (isEditing) {
      const fetchApplication = async () => {
        try {
          const response = await axiosMemberInstance.get(`/members/loan/loan-applications/${id}/details/`);
          const data = response.data;
          setAmount(data.amount);
          setSelectedCategoryId(data.category.id);
          setRepaymentMonths(data.repayment_months);
          setInterestRate(data.interest_rate);
          setSelectedGuarantors(data.guarantors.map(g => ({
            id: g.guarantor,
            full_name: g.guarantor_name,
            member_id: g.member_id
          })));
        } catch (err) {
          console.error('Error loading application:', err);
          setMessageType('error');
          setMessage('Could not load loan application details.');
        }
      };
      fetchApplication();
    }
  }, [id]);

  // Fetch paginated approved members (excluding selected ones)
  useEffect(() => {
    const fetchUnselectedGuarantors = async () => {
      try {
        const response = await axiosMemberInstance.get(`/members/loan/guarantor-candidates/?page=${currentPage}`);
        const unselected = response.data.results.filter(
          m => !selectedGuarantors.some(g => g.id === m.id)
        );
        setApprovedMembers(unselected);
        setHasNext(Boolean(response.data.next));
        setHasPrev(Boolean(response.data.previous));
      } catch (error) {
        console.error('Error fetching approved members:', error);
      }
    };

    fetchUnselectedGuarantors();
  }, [currentPage, selectedGuarantors]);

  const handleCategoryChange = (e) => {
    const categoryId = e.target.value;
    setSelectedCategoryId(categoryId);

    const selectedCategory = loanCategories.find(cat => cat.id === parseInt(categoryId));
    if (selectedCategory) {
      setRepaymentMonths(selectedCategory.loan_period_months);
      setInterestRate(selectedCategory.interest_rate);
    }
  };

  const toggleGuarantor = (member) => {
    const isSelected = selectedGuarantors.some(g => g.id === member.id);
    if (isSelected) {
      setSelectedGuarantors(prev => prev.filter(g => g.id !== member.id));
      setApprovedMembers(prev => [...prev, member]);
    } else {
      setSelectedGuarantors(prev => [...prev, member]);
      setApprovedMembers(prev => prev.filter(m => m.id !== member.id));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedCategoryId) {
      setMessageType('error');
      setMessage('Please select a loan category.');
      return;
    }

    if (selectedGuarantors.length < 2) {
      setMessageType('error');
      setMessage('Please select at least two guarantors.');
      return;
    }

    const payload = {
      amount,
      repayment_months: repaymentMonths,
      category_id: selectedCategoryId,
      guarantors: selectedGuarantors.map(g => ({ guarantor: g.id })),
    };

    try {
      if (isEditing) {
        // Resubmit rejected application
        const res = await axiosMemberInstance.put(`/members/loan/loan-applications/${id}/`, payload);
        await axiosMemberInstance.post(`/members/loan/loan-applications/${id}/resubmit/`);
        setMessageType('success');
        setMessage('Application resubmitted successfully!');
      } else {
        // New application
        await axiosMemberInstance.post('/members/loan/loan-applications/', payload);
        setMessageType('success');
        setMessage('Application submitted successfully!');
      }

      setAmount('');
      setSelectedCategoryId('');
      setRepaymentMonths('');
      setInterestRate('');
      setSelectedGuarantors([]);
      setCurrentPage(1);

      setTimeout(() => navigate('/member/loan-application-list'), 5000);
    } catch (error) {
      console.error('Error submitting application:', error);
      setMessageType('error');
      if (error.response?.data?.non_field_errors) {
        setMessage(error.response.data.non_field_errors[0]);
      } else {
        setMessage('Error submitting application.');
      }
    }
  };

  return (
    <div className="loan-application-form-container">
      <h2>{isEditing ? 'Edit Application' : 'Apply for a Loan'}</h2>
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
          <input type="number" value={repaymentMonths} readOnly />
        </label>

        <label>
          Interest Rate:
          <input type="text" value={interestRate} readOnly />
        </label>

        <div className="guarantor-section">
          <label>Selected Guarantors (click to remove):</label>
          <div className="guarantor-selected-list">
            {selectedGuarantors.map(member => (
              <div
                key={member.id}
                className="guarantor-pill selected"
                onClick={() => toggleGuarantor(member)}
              >
                {member.full_name} ({member.member_id}) ×
              </div>
            ))}
          </div>

          <label>Available Members (click to select):</label>
          <div className="guarantor-available-list">
            {approvedMembers.map(member => (
              <div
                key={member.id}
                className="guarantor-pill"
                onClick={() => toggleGuarantor(member)}
              >
                {member.full_name} ({member.member_id})
              </div>
            ))}
          </div>

          <div className="pagination-controls">
            <button
              type="button"
              disabled={!hasPrev}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={!hasNext}
              onClick={() => setCurrentPage(prev => prev + 1)}
            >
              Next
            </button>
          </div>
        </div>

        <button type="submit">{isEditing ? 'Resubmit Application' : 'Submit Application'}</button>
      </form>
    </div>
  );
};

export default LoanApplicationForm;
