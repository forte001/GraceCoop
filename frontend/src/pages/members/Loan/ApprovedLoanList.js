import React, { useState, useEffect } from 'react';
import axiosMemberInstance from '../../../utils/axiosMemberInstance';
import { formatNaira } from '../../../utils/formatCurrency';
import LoanRepaymentForm from './LoanRepaymentForm';
import '../../../styles/members/loan/ApprovedLoansList.css';
import usePaginatedData from '../../../utils/usePaginatedData';
import { formatDateTime } from '../../../utils/formatDate';

const ApprovedLoansList = () => {

  const [selectedLoanId, setSelectedLoanId] = useState(null);
  const [repaymentSchedule, setRepaymentSchedule] = useState([]);
  const [loanSummary, setLoanSummary] = useState(null);
  const [showRepaymentModal, setShowRepaymentModal] = useState(false);
  const [repaymentTarget, setRepaymentTarget] = useState(null);

const {
  data: loans,
  currentPage,
  totalPages,
  setCurrentPage,
  setFilters,
  filters,
} = usePaginatedData('/members/loan/loans/', {
  status: 'disbursed',
  query: '',
  approved_at_after: '',
  approved_at_before: '',
});



  useEffect(() => {
    if (selectedLoanId) {
      fetchLoanDetails(selectedLoanId);
    }
  }, [selectedLoanId]);

  const fetchLoanDetails = async (loanId) => {
    try {
      const [scheduleRes, summaryRes] = await Promise.all([
        axiosMemberInstance.get(`/members/loan/loans/${loanId}/repayment-schedule/`),
        axiosMemberInstance.get(`/members/loan/loans/${loanId}/summary/`)
      ]);
      setRepaymentSchedule(scheduleRes.data);
      setLoanSummary(summaryRes.data);
    } catch (error) {
      console.error('Error fetching loan details:', error);
    }
  };

  const handlePayClick = (type = 'repayment', item = null) => {
    setRepaymentTarget({ loanId: selectedLoanId, type, installment: item });
    setShowRepaymentModal(true);
  };

  const getStatusBadge = (status) => {
    const colorMap = {
      pending: 'gray',
      approved: 'blue',
      disbursed: 'green',
      partially_disbursed: 'orange',
      grace_applied: 'purple',
      paid_off: 'darkgreen',
    };
    return (
      <span
        style={{
          backgroundColor: colorMap[status] || 'black',
          color: '#fff',
          padding: '3px 6px',
          borderRadius: '4px',
        }}
      >
        {status.toUpperCase().replace('_', ' ')}
      </span>
    );
  };

  const handleReset = () => {
  setFilters({
    status: 'disbursed',
    query: '',
    approved_at_after: '',
    approved_at_before: '',
  });
  setCurrentPage(1);
};

  return (
          <div className="approved-loans-list">
            <h2>Your Approved Loans</h2>
              <div className="loan-filter-form">
                <h4>Filter Loans</h4>
                <form
                  className="filter-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setCurrentPage(1);
                  }}
                >
                  <input
                type="text"
                name="query"
                placeholder="Loan reference or name"
                value={filters.query || ''}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, query: e.target.value }));
                  setCurrentPage(1);
                }}
              />
              <input
                type="date"
                name="approved_at_after"
                value={filters.approved_at_after || ''}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, approved_at_after: e.target.value }));
                  setCurrentPage(1);
                }}
              />
              <input
                type="date"
                name="approved_at_before"
                value={filters.approved_at_before || ''}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, approved_at_before: e.target.value }));
                  setCurrentPage(1);
                }}
              />

            <button
              type="button"
              className="reset-button"
              onClick={handleReset}
            >
              Reset
            </button>
  </form>
</div>





      {loans.length === 0 ? (
        <p>No approved loans found.</p>
      ) : (
        <div>
          {loans.map((loan) => (
            <div key={loan.id} className="loan-record-container">
              <div
                className={`loan-card ${loan.id === selectedLoanId ? 'selected' : ''} ${loan.status === 'approved' ? 'disabled' : ''}`}
                onClick={() => {
                  if (loan.status === 'approved') {
                    alert('This loan has not been disbursed yet. Repayment schedule is unavailable.');
                    return;
                  }
                  setSelectedLoanId((prevId) => (prevId === loan.id ? null : loan.id));
                }}
              >
                <h4>Loan Amount: {formatNaira(loan.amount)}</h4>
                <p>Status: {getStatusBadge(loan.status)}</p>
                <p>
                  Disbursed On:{' '}
                  {loan.disbursed_at ||
                    (loan.disbursements?.length > 0
                      ? new Date(loan.disbursements[0].disbursed_at).toLocaleDateString()
                      : 'N/A')}
                </p>

              </div>


              {selectedLoanId === loan.id && (
                <div className="loan-expanded-section">
                  {loanSummary && (
                    <div className="loan-expanded-section three-column-layout">
    {/* Loan summary */}
    <div className="loan-column loan-summary-column">
      {loanSummary && (
        <>
          <h3>Loan Summary</h3>
          <p>Reference: {loanSummary.reference || 'N/A'}</p>
          <p>Member: {loanSummary.applicant_name}</p>
          <p>Interest Rate: {loanSummary.interest_rate}%</p>
          <p>Total Disbursed: {formatNaira(loanSummary.amount)}</p>
          <p>Remaining Disbursement Balance: {formatNaira(loanSummary.disbursements_remaining)}</p>
          <p>Total Repaid: {formatNaira(loanSummary.total_paid)}</p>
          <p>Repayment Months: {loanSummary.total_repayment_months}</p>
          <p>Start Date: {loanSummary.start_date}</p>
          <p>End Date: {loanSummary.end_date}</p>
        </>
      )}
    </div>

    {/* Disbursement receipts */}
    <div className="loan-column loan-receipts-column">
      <h3>Disbursement Receipts</h3>
      <div className="receipt-list">
        {loanSummary?.disbursements?.length > 0 ? (
          loanSummary.disbursements.map((d) => (
            <div key={d.id} className="receipt-entry">
              <p>
                <strong>Amount:</strong> {formatNaira(d.amount)} <br />
                <strong>Disbursed On:</strong> {formatDateTime(d.disbursed_at)} <br />
                {d.receipt_url ? (
                  <a
                      href={d.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="receipt-button"
                    >
                      View / Download Receipt
                    </a>
                  ) : (
                    <span className="no-receipt">No receipt</span>
                  )}
              </p>
            </div>
          ))
        ) : (
          <p>No receipts found.</p>
        )}
      </div>
    </div>

    {/* Reserved for future */}
    <div className="loan-column loan-future-column">
      <h3>Coming Soon</h3>
      <p>This area is reserved for future functionality.</p>
    </div>
  </div>
                  )}

                  {repaymentSchedule.length > 0 && (
                    <div className="section-block">
                      <h3>Repayment Schedule</h3>
                      <table className="repayment-schedule-table">
                        <thead>
                          <tr>
                            <th>Installment</th>
                            <th>Due Date</th>
                            <th>Principal</th>
                            <th>Interest</th>
                            <th>Total</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            let hasNextUnpaidBeenFound = false;
                            return repaymentSchedule.map((item) => {
                              const isCurrent = !item.is_paid && !hasNextUnpaidBeenFound;
                              if (isCurrent) hasNextUnpaidBeenFound = true;

                              return (
                                <tr key={`${item.disbursement_id}-${item.installment}`}>
                                  <td>{item.installment}</td>
                                  <td>{new Date(item.due_date).toLocaleDateString()}</td>
                                  <td>{formatNaira(item.principal)}</td>
                                  <td>{formatNaira(item.interest)}</td>
                                  <td>
                                    {isNaN(Number(item.principal)) || isNaN(Number(item.interest))
                                      ? 'N/A'
                                      : formatNaira(Number(item.principal) + Number(item.interest))}
                                  </td>
                                  <td>
                                    <button
                                      onClick={() => handlePayClick('repayment', item)}
                                      disabled={!isCurrent || item.is_paid || loan.status === 'paid_off'}
                                      className={
                                        item.is_paid
                                          ? 'paid-button'
                                          : isCurrent
                                          ? 'active-pay-button'
                                          : 'disabled-pay-button'
                                      }
                                    >
                                      {item.is_paid ? 'Paid' : 'Pay'}
                                    </button>
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                      <div style={{ marginTop: '20px' }}>
                        <button
                          onClick={() => handlePayClick('payoff')}
                          className="payoff-button"
                          disabled={loan.status === 'paid'}
                        >
                          {loan.status === 'paid_off' ? 'Loan Paid Off' : 'Pay Off Loan'}
                        </button>
                      </div>
                           {showRepaymentModal && repaymentTarget && (
                            <div className="repayment-modal-overlay">
                              <div className="repayment-modal">
                                <button onClick={() => setShowRepaymentModal(false)} className="close-button">
                                  X
                                </button>
                                <LoanRepaymentForm
                                loanReference={loan.reference}
                                type={repaymentTarget.type}
                                installment={repaymentTarget.installment}
                                onSuccess={() => {
                                  setShowRepaymentModal(false);
                                  fetchLoanDetails(repaymentTarget.loanId);
                                }}
                              />

                              </div>
                            </div>
                          )}
                    </div>
                  )}
                </div>
              )}
            </div>
            
          ))}
          <div className="pagination-controls">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>

        </div>
      )}

    </div>
  );
};

export default ApprovedLoansList;