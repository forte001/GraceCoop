import React, { useState } from 'react';
import axiosAdminInstance from '../../../../utils/axiosAdminInstance';
import { getCSRFToken } from '../../../../utils/csrf';
import { formatNaira } from '../../../../utils/formatCurrency';
import { formatDateTime } from '../../../../utils/formatDate';
import { 
  FaCheckCircle, 
  FaTimesCircle, 
  FaChevronDown, 
  FaChevronUp, 
  FaUsers, 
  FaClock, 
  FaExclamationTriangle,
  FaPhone,
  FaIdCard,
  FaEye,
  FaEyeSlash
} from 'react-icons/fa';
import { getStatusBadge } from '../../../../utils/statusBadge';
import RejectionModal from './RejectionModal';


const PendingApplications = ({
  loanApplicationsData,
  applicationPage,
  totalApplicationPages,
  setApplicationPage,
  refreshApplications,
  refreshLoans,
  navigate
}) => {
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedApplicationId, setSelectedApplicationId] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());

  const handleApproveApplication = async (applicationId) => {
    try {
      await axiosAdminInstance.post(
        `/admin/loan/loan-applications-admin/${applicationId}/approve/`,
        {},
        { headers: { 'X-CSRFToken': getCSRFToken() } }
      );
      alert('Loan application approved and loan created.');
      refreshApplications();
      refreshLoans();
    } catch (error) {
      if (error?.response?.status === 403) {
        navigate('/forbidden');
      } else {
        alert(error?.response?.data?.detail || error?.response?.data?.error || 'Failed to approve application.');
      }
    }
  };

  const handleRejectApplication = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason.');
      return;
    }

    try {
      await axiosAdminInstance.post(
        `/admin/loan/loan-applications-admin/${selectedApplicationId}/reject/`,
        { reason: rejectionReason },
        {
          headers: {
            'X-CSRFToken': getCSRFToken(),
            'Content-Type': 'application/json',
          },
        }
      );

      alert('Loan application rejected.');
      refreshApplications();
      closeRejectionModal();
    } catch (error) {
      if (error?.response?.status === 403) {
        navigate('/forbidden');
      } else {
        alert(error?.response?.data?.error || 'Failed to reject application.');
      }
    }
  };

  const openRejectionModal = (applicationId) => {
    setSelectedApplicationId(applicationId);
    setRejectionReason('');
    setShowRejectionModal(true);
  };

  const closeRejectionModal = () => {
    setShowRejectionModal(false);
    setSelectedApplicationId(null);
    setRejectionReason('');
  };

  const toggleRowExpansion = (applicationId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(applicationId)) {
      newExpanded.delete(applicationId);
    } else {
      newExpanded.add(applicationId);
    }
    setExpandedRows(newExpanded);
  };

  const getGuarantorStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span className="status-badge approved">✓ Approved</span>;
      case 'rejected':
        return <span className="status-badge rejected">✗ Rejected</span>;
      case 'pending':
        return <span className="status-badge pending">⏱ Pending</span>;
      default:
        return <span className="status-badge unknown">? Unknown</span>;
    }
  };

  const getGuarantorSummary = (guarantors) => {
    if (!guarantors || guarantors.length === 0) {
      return { total: 0, approved: 0, rejected: 0, pending: 0 };
    }

    return guarantors.reduce((summary, guarantor) => {
      summary.total++;
      if (guarantor.consent_status === 'approved') summary.approved++;
      else if (guarantor.consent_status === 'rejected') summary.rejected++;
      else if (guarantor.consent_status === 'pending') summary.pending++;
      return summary;
    }, { total: 0, approved: 0, rejected: 0, pending: 0 });
  };

  const renderGuarantorDetails = (guarantors) => {
    if (!guarantors || guarantors.length === 0) {
      return (
        <div className="no-guarantors">
          <FaUsers className="icon" />
          <span>No guarantors assigned to this application</span>
        </div>
      );
    }

    return (
      <div className="guarantors-container">
        <h4 className="guarantors-title">
          <FaUsers className="title-icon" />
          Guarantors ({guarantors.length})
        </h4>
        <div className="guarantors-grid">
          {guarantors.map((guarantor, index) => (
            <div key={guarantor.id || index} className="guarantor-card">
              <div className="guarantor-header">
                <div className="guarantor-name">
                  {guarantor.guarantor_name || 'Unknown Guarantor'}
                </div>
                <div className="guarantor-status">
                  {getGuarantorStatusBadge(guarantor.consent_status)}
                </div>
              </div>
              
              <div className="guarantor-info">
                <div className="info-row">
                  <FaIdCard className="info-icon" />
                  <span className="info-label">ID:</span>
                  <span className="info-value">{guarantor.guarantor_id || 'N/A'}</span>
                </div>
                <div className="info-row">
                  <FaPhone className="info-icon" />
                  <span className="info-label">Phone:</span>
                  <span className="info-value">{guarantor.guarantor_phone || 'N/A'}</span>
                </div>
                <div className="info-row">
                  <FaClock className="info-icon" />
                  <span className="info-label">Requested:</span>
                  <span className="info-value">{formatDateTime(guarantor.created_at)}</span>
                </div>
                
                {guarantor.response_date && (
                  <div className="info-row">
                    <FaCheckCircle className="info-icon" />
                    <span className="info-label">Responded:</span>
                    <span className="info-value">{formatDateTime(guarantor.response_date)}</span>
                  </div>
                )}
                
                {guarantor.consent_status === 'pending' && (
                  <div className="info-row">
                    <FaExclamationTriangle className={`info-icon ${guarantor.is_long_pending ? 'warning' : ''}`} />
                    <span className="info-label">Days Pending:</span>
                    <span className={`info-value ${guarantor.is_long_pending ? 'warning-text' : ''}`}>
                      {guarantor.days_pending || 0} days
                      {guarantor.is_long_pending && <span className="long-pending-tag">Long Pending!</span>}
                    </span>
                  </div>
                )}
                
                {guarantor.rejection_reason && (
                  <div className="info-row rejection-row">
                    <FaTimesCircle className="info-icon rejection" />
                    <span className="info-label">Rejection Reason:</span>
                    <span className="info-value rejection-reason">{guarantor.rejection_reason}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPagination = (page, totalPages, setPage) => (
    <div className="pagination">
      <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
      <span>Page {page} of {totalPages}</span>
      <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
    </div>
  );

  const pendingApplications = (loanApplicationsData || []).filter(app => app.status === 'pending');

  return (
    <>
      <div className="pending-applications-wrapper">
        <table className="loan-table">
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Guarantors</th>
              <th>Status</th>
              <th>Application Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingApplications.map(app => {
              const guarantorSummary = getGuarantorSummary(app.guarantors);
              const isExpanded = expandedRows.has(app.id);
              
              return (
                <React.Fragment key={app.id}>
                  <tr className={`main-row ${isExpanded ? 'expanded' : ''}`}>
                    <td>
                      <div className="applicant-info">
                        <div className="applicant-name">{app.applicant_name || 'N/A'}</div>
                      </div>
                    </td>
                    <td>{app.category?.name || 'N/A'}</td>
                    <td>{formatNaira(app.amount)}</td>
                    <td>
                      <div className="guarantor-summary">
                        <div className="summary-count">
                          <FaUsers className="summary-icon" />
                          {guarantorSummary.total}
                        </div>
                        <div className="summary-breakdown">
                          {guarantorSummary.approved > 0 && (
                            <span className="mini-badge approved">✓{guarantorSummary.approved}</span>
                          )}
                          {guarantorSummary.rejected > 0 && (
                            <span className="mini-badge rejected">✗{guarantorSummary.rejected}</span>
                          )}
                          {guarantorSummary.pending > 0 && (
                            <span className="mini-badge pending">⏱{guarantorSummary.pending}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>{getStatusBadge(app.status)}</td>
                    <td>{formatDateTime(app.application_date)}</td>
                    <td>
                      <div className="loan-icon-actions">
                        <button
                          onClick={() => toggleRowExpansion(app.id)}
                          className="icon-button small details"
                          title={isExpanded ? 'Hide details' : 'Show details'}
                        >
                          {isExpanded ? <FaEyeSlash /> : <FaEye />}
                        </button>
                        <button
                          onClick={() => handleApproveApplication(app.id)}
                          className="icon-button small approve"
                          title="Approve"
                        >
                          <FaCheckCircle />
                        </button>
                        <button
                          onClick={() => openRejectionModal(app.id)}
                          className="icon-button small reject"
                          title="Reject"
                        >
                          <FaTimesCircle />
                        </button>
                      </div>
                    </td>
                  </tr>
                  
                  {isExpanded && (
                    <tr className="details-row">
                      <td colSpan="7">
                        <div className="expanded-content">
                          <div className="application-details">
                            <h3>Application Details</h3>
                            <div className="details-grid">
                              <div className="detail-item">
                                <span className="detail-label">Applicant ID:</span>
                                <span className="detail-value">{app.applicant_member_id || 'N/A'}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Repayment Period:</span>
                                <span className="detail-value">{app.repayment_months || 'N/A'} months</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Interest Rate:</span>
                                <span className="detail-value">{app.interest_rate || 'N/A'}%</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Purpose:</span>
                                <span className="detail-value">{app.purpose || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="guarantor-section">
                            {renderGuarantorDetails(app.guarantors)}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {renderPagination(applicationPage, totalApplicationPages, setApplicationPage)}

      <RejectionModal
        showRejectionModal={showRejectionModal}
        rejectionReason={rejectionReason}
        setRejectionReason={setRejectionReason}
        handleRejectApplication={handleRejectApplication}
        closeRejectionModal={closeRejectionModal}
      />
    </>
  );
};

export default PendingApplications;