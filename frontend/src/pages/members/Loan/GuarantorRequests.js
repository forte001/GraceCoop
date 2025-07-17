import React, { useState } from 'react';
import usePaginatedData from '../../../utils/usePaginatedData';
import axiosMemberInstance from '../../../utils/axiosMemberInstance';
import '../../../styles/admin/CooperativeConfig.css';
import Spinner from '../../../components/Spinner';

const GuarantorRequests = () => {
  const [processingId, setProcessingId] = useState(null);
  const [showDetails, setShowDetails] = useState({});
  const [respondedRequests, setRespondedRequests] = useState({}); // Track responded requests
  
  
  const {
    data: requests,
    currentPage,
    totalPages,
    pageSize,
    loading,
    setCurrentPage,
    setPageSize,
    refetch
  } = usePaginatedData('/members/loan/guarantor-requests/');

  const handleAction = async (guarantorId, action) => {
    if (processingId) return; // Prevent double-click
    
    setProcessingId(guarantorId);
    
    try {
      const response = await axiosMemberInstance.post(
        `/members/loan/guarantor-requests/${guarantorId}/consent/`, 
        { action }
      );
      
      // Mark this request as responded locally for immediate UI feedback
      setRespondedRequests(prev => ({
        ...prev,
        [guarantorId]: {
          action: action,
          message: response.data.message,
          timestamp: new Date()
        }
      }));
      
      // Show success message
      alert(`✅ ${response.data.message}`);
      
      // Refresh the list to get updated data from server
      setTimeout(() => {
        refetch();
      }, 1000); 
      
    } catch (error) {
      console.error(`Error on ${action}:`, error);
      
      // Remove the local status if API call failed
      setRespondedRequests(prev => {
        const newState = { ...prev };
        delete newState[guarantorId];
        return newState;
      });
      
      // Show detailed error message
      const errorMessage = error.response?.data?.error || 'Failed to update guarantor status.';
      alert(`❌ ${errorMessage}`);
    } finally {
      setProcessingId(null);
    }
  };

  const toggleDetails = (requestId) => {
    setShowDetails(prev => ({
      ...prev,
      [requestId]: !prev[requestId]
    }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Helper function to determine the current status of a request
  const getRequestStatus = (req) => {
    // First check local state for immediate feedback
    if (respondedRequests[req.id]) {
      return {
        status: respondedRequests[req.id].action,
        isLocal: true
      };
    }
    
    // Then check server data (now includes status field)
    if (req.status) {
      return {
        status: req.status,
        isLocal: false
      };
    }
    
    // Fallback to pending
    return {
      status: 'pending',
      isLocal: false
    };
  };

  const renderRequestStatus = (req) => {
    const { status, isLocal } = getRequestStatus(req);
    
    if (status === 'pending') {
      return (
        <div className="request-actions">
          <button
            onClick={() => handleAction(req.id, 'approve')}
            className="approve-button"
            disabled={processingId === req.id}
          >
            {(processingId === req.id && 'Processing...') || 'Approve'}
          </button>
          <button
            onClick={() => handleAction(req.id, 'reject')}
            className="reject-button"
            disabled={processingId === req.id}
          >
            {(processingId === req.id && 'Processing...') || 'Reject'}
          </button>
        </div>
      );
    }
    
    // Show status for approved/rejected requests
    return (
      <div className={`response-status ${status}`}>
        <span className="status-icon">
          {status === 'approved' ? '✅' : '❌'}
        </span>
        <span className="status-text">
          {status === 'approved' ? 'Approved' : 'Rejected'}
        </span>
        {isLocal && (
          <span className="status-indicator">(Processing...)</span>
        )}
      </div>
    );
  };

  return (
    <div className="admin-config-page">
      <div className="header-row">
        <h2>Guarantor Requests</h2>
        <p className="subtitle">
          Review and respond to loan applications where you've been selected as a guarantor.
          Your approval/rejection history is shown below.
        </p>
      </div>

      {loading ? (
        <Spinner />
      ) : !requests || requests.length === 0 ? (
        <div className="empty-state">
          <p>No guarantor requests found.</p>
          <small>You'll see requests here when someone selects you as their loan guarantor.</small>
        </div>
      ) : (
        <div className="requests-container">
          {requests.map((req) => {
            const { status } = getRequestStatus(req);
            
            return (
              <div key={req.id} className={`request-card ${status}`}>
                <div className="request-header">
                  <div className="request-info">
                    <h3>{req.applicant}</h3>
                    <p className="member-id">Member ID: {req.applicant_member_id}</p>
                    <p className="amount">{formatCurrency(req.amount)}</p>
                  </div>
                  {renderRequestStatus(req)}
                </div>
                
                <div className="request-summary">
                  <span className="loan-category">{req.loan_category}</span>
                  <span className="application-date">Applied: {formatDate(req.submitted_on)}</span>
                  {req.responded_on && (
                    <span className="response-date">
                      Responded: {formatDate(req.responded_on)}
                    </span>
                  )}
                  <button 
                    className="details-toggle"
                    onClick={() => toggleDetails(req.id)}
                  >
                    {showDetails[req.id] ? 'Hide Details' : 'Show Details'}
                  </button>
                </div>

                {showDetails[req.id] && (
                  <div className="request-details">
                    <div className="details-grid">
                      <div className="detail-item">
                        <label>Loan Amount:</label>
                        <span>{formatCurrency(req.amount)}</span>
                      </div>
                      <div className="detail-item">
                        <label>Repayment Period:</label>
                        <span>{req.repayment_months} months</span>
                      </div>
                      <div className="detail-item">
                        <label>Interest Rate:</label>
                        <span>{req.interest_rate}% per annum</span>
                      </div>
                      <div className="detail-item">
                        <label>Monthly Repayment:</label>
                        <span>
                          {formatCurrency(
                            (req.amount * (1 + req.interest_rate / 100)) / req.repayment_months
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Guarantor Responsibility - Now shown for all requests as the last item */}
                <div className="guarantor-responsibility">
                  <h4>⚠️ Guarantor Responsibility</h4>
                  <p>
                    {status === 'pending' 
                      ? 'By approving this request, you agree to be liable for this loan if the borrower defaults. Please ensure you trust the applicant and understand the financial commitment involved.'
                      : status === 'approved' 
                        ? 'You have agreed to be liable for this loan if the borrower defaults. Please ensure you trust the applicant and understand the financial commitment involved.'
                        : 'You have rejected this guarantor request. You are not liable for this loan.'
                    }
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {requests && requests.length > 0 && (
        <div className="pagination-controls">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            {[5, 10, 20].map((size) => (
              <option key={size} value={size}>{size} per page</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default GuarantorRequests;