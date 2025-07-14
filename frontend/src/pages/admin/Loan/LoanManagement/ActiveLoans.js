import React, { useState } from 'react';
import axiosAdminInstance from '../../../../utils/axiosAdminInstance';
import { getCSRFToken } from '../../../../utils/csrf';
import { formatNaira } from '../../../../utils/formatCurrency';
import { formatDateTime } from '../../../../utils/formatDate';
import { FaCalendarAlt, FaChartPie, FaMoneyCheckAlt, FaClock } from 'react-icons/fa';
import { Tooltip } from 'react-tooltip';
import { getStatusBadge } from '../../../../utils/statusBadge';
import LoanSummary from './LoanSummary';
import RepaymentSchedule from './RepaymentSchedule';
import DisbursementModal from './DisbursementModal';

const ActiveLoans = ({
  loansData,
  loanPage,
  totalLoanPages,
  setLoanPage,
  refreshLoans,
  navigate
}) => {
  const [repaymentSchedules, setRepaymentSchedules] = useState({});
  const [expandedSchedules, setExpandedSchedules] = useState({});
  const [expandedSummaries, setExpandedSummaries] = useState({});
  const [loanSummaries, setLoanSummaries] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);

  const toggleSchedule = async (loanId) => {
    setExpandedSchedules(prev => ({ ...prev, [loanId]: !prev[loanId] }));
    if (!repaymentSchedules[loanId]) {
      try {
        const res = await axiosAdminInstance.get(`/admin/loan/loans-admin/${loanId}/repayment-schedule/`);
        setRepaymentSchedules(prev => ({ ...prev, [loanId]: res.data }));
      } catch (err) {
        alert('Failed to load repayment schedule.');
      }
    }
  };

  const toggleSummary = async (loanId) => {
    setExpandedSummaries(prev => ({ ...prev, [loanId]: !prev[loanId] }));
    if (!loanSummaries[loanId]) {
      try {
        const res = await axiosAdminInstance.get(`/admin/loan/loans-admin/${loanId}/summary/`);
        setLoanSummaries(prev => ({ ...prev, [loanId]: res.data }));
      } catch (err) {
        alert('Failed to load loan summary.');
      }
    }
  };

  const handleApplyGracePeriod = async (loanId, loanStatus) => {
    if (loanStatus === 'approved') return;
    if (!window.confirm('Apply grace period?')) return;

    try {
      const response = await axiosAdminInstance.post(
        `/admin/loan/loans-admin/${loanId}/apply-grace-period/`,
        {},
        { headers: { 'X-CSRFToken': getCSRFToken() } }
      );
      alert(response.data.message);
      refreshLoans();
    } catch (err) {
      if (err?.response?.status === 403) {
        navigate('/forbidden');
      } else {
        alert(err.response?.data?.error || 'Error applying grace period.');
      }
    }
  };

  const openModal = (loan) => {
    setSelectedLoan(loan);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedLoan(null);
  };

  const renderPagination = (page, totalPages, setPage) => (
    <div className="pagination">
      <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
      <span>Page {page} of {totalPages}</span>
      <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
    </div>
  );

  return (
    <>
      <table className="loan-table">
        <thead>
          <tr>
            <th>Reference</th>
            <th>Member</th>
            <th>Category</th>
            <th>Amount</th>
            <th>Remaining</th>
            <th>Status</th>
            <th>Start</th>
            <th>Months</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {(loansData || []).map(loan => (
            <React.Fragment key={loan.id}>
              <tr>
                <td>{loan.reference || 'N/A'}</td>
                <td>{loan.applicant_name || 'N/A'}</td>
                <td>{loan.category_name}</td>
                <td>{formatNaira(loan.amount)}</td>
                <td>{formatNaira(loan.disbursements_remaining)}</td>
                <td>{getStatusBadge(loan.status)}</td>
                <td>{formatDateTime(loan.start_date) || 'N/A'}</td>
                <td>{loan.total_repayment_months}</td>
                <td>
                  <button 
                    data-tooltip-id="tooltip" 
                    data-tooltip-content="View Schedule" 
                    onClick={() => toggleSchedule(loan.id)}
                  >
                    <FaCalendarAlt />
                  </button>

                  <button 
                    data-tooltip-id="tooltip" 
                    data-tooltip-content="View Summary" 
                    onClick={() => toggleSummary(loan.id)}
                  >
                    <FaChartPie />
                  </button>

                  {loan.disbursements_remaining > 0 && (
                    <button 
                      data-tooltip-id="tooltip" 
                      data-tooltip-content="Disburse Loan" 
                      onClick={() => openModal(loan)}
                    >
                      <FaMoneyCheckAlt />
                    </button>
                  )}

                  <button
                    data-tooltip-id="tooltip"
                    data-tooltip-content="Apply Grace Period"
                    onClick={() => handleApplyGracePeriod(loan.id, loan.status)}
                    disabled={
                      loan.status === 'approved' ||
                      loan.status === 'paid_off' ||
                      loan.grace_applied ||
                      !loan.end_date ||
                      new Date(loan.end_date) > new Date()
                    }
                  >
                    <FaClock />
                  </button>
                  <Tooltip id="tooltip" />
                </td>
              </tr>
              
              {expandedSummaries[loan.id] && loanSummaries[loan.id] && (
                <LoanSummary
                  loan={loan}
                  loanSummary={loanSummaries[loan.id]}
                />
              )}

              {expandedSchedules[loan.id] && repaymentSchedules[loan.id] && (
                <RepaymentSchedule
                  loan={loan}
                  repaymentSchedule={repaymentSchedules[loan.id]}
                />
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      {renderPagination(loanPage, totalLoanPages, setLoanPage)}

      <DisbursementModal
        showModal={showModal}
        selectedLoan={selectedLoan}
        closeModal={closeModal}
        refreshLoans={refreshLoans}
        navigate={navigate}
      />
    </>
  );
};

export default ActiveLoans;