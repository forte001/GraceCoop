import React, { useState, useEffect } from 'react';
import axiosInstance from '../../../utils/axiosInstance';
import { formatNaira } from '../../../utils/formatCurrency';
import '../../../styles/members/loan/LoanApplication.css';

const LoanApplicationList = () => {
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const response = await axiosInstance.get('/members/loan/loan-applications/');
        setApplications(response.data);
      } catch (error) {
        console.error('Error fetching applications:', error);
      }
    };

    fetchApplications();
  }, []);

  return (
    <div className="loan-application-history-container">
      <h2>Your Loan Applications</h2>

      {applications.length === 0 ? (
        <p>No loan applications found.</p>
      ) : (
        <div>
          {applications.map((app) => (
            <div key={app.id} className="loan-application-card">
              {/* Loan Amount */}
              <div className="card-item">
                <h4>Loan Amount:</h4>
                <p><span>{formatNaira(app.amount)}</span></p>
              </div>

              {/* Loan Category */}
              <div className="card-item">
                <h4>Loan Category:</h4>
                <p><span>{app.category.name || 'N/A'}</span></p>
              </div>

              {/* Repayment Period */}
              <div className="card-item">
                <h4>Repayment Period:</h4>
                <p><span>{app.repayment_months} months</span></p>
              </div>

              {/* Interest Rate */}
              <div className="card-item">
                <h4>Interest Rate:</h4>
                <p><span>{app.category.interest_rate || 'N/A'}%</span></p>
              </div>

              {/* Loan Status */}
              <div className="card-item">
                <h4>Status:</h4>
                <p>
                  <span
                    className={
                      app.status === 'pending'
                        ? 'status-pending'
                        : app.status === 'approved'
                        ? 'status-approved'
                        : 'status-rejected'
                    }
                  >
                    {app.status.toUpperCase()}
                  </span>
                </p>
              </div>

              {/* Applied On Date */}
              <div className="card-item">
                <h4>Applied On:</h4>
                <p><span>{new Date(app.application_date).toLocaleDateString()}</span></p>
              </div>

              {/* View Details Button */}
              <div className="card-item">
                <a href={`/loan/loan-applications/${app.id}/`} className="view-details">View Details</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LoanApplicationList;
