import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosMemberInstance from '../../../utils/axiosMemberInstance';
import '../../../styles/members/loan/LoanApplication.css';
import { formatDateTime } from '../../../utils/formatDate';
import { formatNaira } from '../../../utils/formatCurrency';

const LoanApplicationDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchApplicationDetails = async () => {
      try {
        const response = await axiosMemberInstance.get(`/members/loan/loan-applications/${id}/details/`);
        setApplication(response.data);
      } catch (err) {
        console.error('Failed to load application details:', err);
        setError('Failed to load application details.');
      } finally {
        setLoading(false);
      }
    };

    fetchApplicationDetails();
  }, [id]);

  const handleEditClick = () => {
    navigate(`/member/loan-application-form/${id}`);
  };

  if (loading) return <div className="loan-application-form-container"><p>Loading...</p></div>;
  if (error) return <div className="loan-application-form-container"><p className="form-message error">{error}</p></div>;

  const {
    applicant_name,
    category,
    amount,
    interest_rate,
    repayment_months,
    status,
    application_date,
    approval_date,
    rejection_reason,
    guarantors
  } = application;

  return (
    <div className="loan-application-form-container">
      <h2>Loan Application Details</h2>

      <div className="loan-details-grid">
        <div><strong>Applicant:</strong> {applicant_name}</div>
        <div><strong>Loan Category:</strong> {category?.name}</div>
        <div><strong>Amount:</strong> {formatNaira(amount)}</div>
        <div><strong>Interest Rate:</strong> {interest_rate}%</div>
        <div><strong>Repayment Period:</strong> {repayment_months} months</div>
        <div><strong>Status:</strong> <span className={`status-pill status-${status}`}>{status.toUpperCase()}</span></div>
        <div><strong>Applied On:</strong> {formatDateTime(application_date)}</div>
        {approval_date && <div><strong>Approved On:</strong> {formatDateTime(approval_date)}</div>}
        
        {status === 'rejected' && (
          <div className="rejection-reason">
            <strong>Rejection Reason:</strong> {rejection_reason || 'No reason provided'}
          </div>
        )}
      </div>

      <div className="guarantor-section">
        <h4>Selected Guarantors</h4>
        {guarantors.length > 0 ? (
          <div className="guarantor-pill-container">
            {guarantors.map(g => (
              <span key={g.id} className="guarantor-pill selected">
                {g.guarantor_name} ({g.guarantor_id})
              </span>
            ))}
          </div>
        ) : (
          <p>No guarantors selected.</p>
        )}
      </div>

      {status === 'rejected'| status === 'pending' && (
        <div className="edit-button-container">
          <button onClick={handleEditClick} className="edit-loan-button">
            Edit Application
          </button>
        </div>
      )}
    </div>
  );
};

export default LoanApplicationDetails;