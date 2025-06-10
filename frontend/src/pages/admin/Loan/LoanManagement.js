import React, { useEffect, useState } from 'react';
import axiosInstance from '../../../utils/axiosInstance';
import { getCSRFToken } from '../../../utils/csrf';
import '../../../styles/admin/loan/LoanManagement.css';
import { formatNaira } from '../../../utils/formatCurrency';
import { FaCalendarAlt, FaChartPie, FaMoneyCheckAlt, FaClock } from 'react-icons/fa';
import { Tooltip } from 'react-tooltip';



const LoanManagement = () => {
  const [loanApplications, setLoanApplications] = useState([]);
  const [loans, setLoans] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [disburseAmount, setDisburseAmount] = useState('');
  const [disbursementType, setDisbursementType] = useState('full'); // Full or Partial
  const [numDisbursements, setNumDisbursements] = useState(1); // For partial disbursement
  const [repaymentSchedules, setRepaymentSchedules] = useState({});
  const [expandedSchedules, setExpandedSchedules] = useState({});
  const [expandedSummaries, setExpandedSummaries] = useState({});
  const [loanSummaries, setLoanSummaries] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [isFullPayment, setIsFullPayment] = useState(false); // For full payment option after partial disbursement

  useEffect(() => {
    fetchLoanApplications();
    fetchLoans();
  }, []);

  const fetchLoanApplications = async () => {
    try {
      const response = await axiosInstance.get('/admin/loan/loan-applications-admin/');
      setLoanApplications(response.data);
    } catch (error) {
      console.error('Error fetching loan applications:', error);
    }
  };

  const fetchLoans = async () => {
    try {
      const response = await axiosInstance.get('/admin/loan/loans-admin/');
      setLoans(response.data);
    } catch (error) {
      console.error('Error fetching loans:', error);
    }
  };

  const handleApproveApplication = async (applicationId) => {
    try {
      await axiosInstance.post(
        `/admin/loan/loan-applications-admin/${applicationId}/approve/`,
        {},
        { headers: { 'X-CSRFToken': getCSRFToken() } }
      );
      alert('Loan application approved and loan created.');
      fetchLoans();
    } catch (error) {
      alert('Failed to approve application.');
    }
  };

  const handleDisburse = async (e) => {
    e.preventDefault();
    try {
      // Calculate amount for disbursement
      let amount = 0;
      if (disbursementType === 'full') {
        amount = selectedLoan.disbursements_remaining;
      } else if (disbursementType === 'partial' && !isFullPayment) {
        amount = disburseAmount;
      } else if (isFullPayment) {
        amount = selectedLoan.disbursements_remaining; // Full payment option
      }

      await axiosInstance.post(
        `/admin/loan/loans-admin/${selectedLoan.id}/disburse/`,
        { amount: amount },
        { headers: { 'X-CSRFToken': getCSRFToken() } }
      );
      alert('Loan disbursed successfully!');
      setDisburseAmount('');
      setShowModal(false);
      setIsFullPayment(false); // Reset full payment flag
      fetchLoans();
    } catch (err) {
      alert(err.response?.data?.error || 'An error occurred during disbursement.');
    }
  };

  const toggleSchedule = async (loanId) => {
    setExpandedSchedules((prev) => ({
      ...prev,
      [loanId]: !prev[loanId],
    }));

    if (!repaymentSchedules[loanId]) {
      try {
        const response = await axiosInstance.get(`/admin/loan/loans-admin/${loanId}/repayment-schedule/`);
        setRepaymentSchedules((prev) => ({
          ...prev,
          [loanId]: response.data,
        }));
      } catch (err) {
        alert('Repayment schedule unavailable.');
      }
    }
  };

  const toggleSummary = async (loanId) => {
    setExpandedSummaries((prev) => ({
      ...prev,
      [loanId]: !prev[loanId],
    }));

    if (!loanSummaries[loanId]) {
      try {
        const response = await axiosInstance.get(`/admin/loan/loans-admin/${loanId}/summary/`);
        console.log(response.data);
        setLoanSummaries((prev) => ({
          ...prev,
          [loanId]: response.data,
        }));
      } catch (err) {
        console.error('Failed to fetch summary:', err);
      }
    }
  };

  const handleApplyGracePeriod = async (loanId, loanStatus) => {
    if (loanStatus === 'approved') return;
    if (!window.confirm('Apply grace period?')) return;

    try {
      const response = await axiosInstance.post(
        `/admin/loan/loans-admin/${loanId}/apply-grace-period/`,
        {},
        { headers: { 'X-CSRFToken': getCSRFToken() } }
      );
      alert(response.data.message);
      fetchLoans();
    } catch (err) {
      alert(err.response?.data?.error || 'Error applying grace period.');
    }
  };


  const openModal = (loan) => {
    setSelectedLoan(loan);
    setShowModal(true);
  };

  const getStatusBadge = (status) => {
    const colorMap = {
      pending: 'gray',
      approved: 'blue',
      disbursed: 'green',
      partially_disbursed: 'orange',
      grace_applied: 'purple',
      paid_off: 'darkgreen',
      paid: 'green',
      unpaid: 'gray',
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

  
  return (
    <div className="loan-management">
      <h2>Loan Management</h2>

      <div className="loan-tabs">
        <button
          className={activeTab === 'pending' ? 'active' : ''}
          onClick={() => setActiveTab('pending')}
        >
          Pending Applications
        </button>
        <button
          className={activeTab === 'active' ? 'active' : ''}
          onClick={() => setActiveTab('active')}
        >
          Active Loans
        </button>
      </div>

      {activeTab === 'pending' && (
        <table className="loan-table">
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Application Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loanApplications
              .filter((app) => app.status === 'pending')
              .map((app) => (
                <tr key={app.id}>
                  <td>{app.applicant_name || 'N/A'}</td>
                  <td>{app.category.name}</td>
                  <td>{formatNaira(app.amount)}</td>
                  <td>{getStatusBadge(app.status)}</td>
                  <td>{new Date(app.application_date).toLocaleString()}</td>
                  <td>
                    <button onClick={() => handleApproveApplication(app.id)}>Approve</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      )}

      {activeTab === 'active' && (
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
            {loans.map((loan) => (
              <React.Fragment key={loan.id}>
                {/* Loan row */}
                <tr>
                  <td>{loan.reference}</td>
                  <td>{loan.applicant_name}</td>
                  <td>{loan.category_name}</td>
                  <td>{formatNaira(loan.amount)}</td>
                  <td>{formatNaira(loan.disbursements_remaining)}</td>
                  <td>{getStatusBadge(loan.status)}</td>
                  <td>{loan.approval_date ? new Date(loan.approval_date).toLocaleDateString() : 'N/A'}</td>
                  <td>{loan.total_repayment_months}</td>
                 
                  <td>
                    <button data-tooltip-id="tooltip" data-tooltip-content="View Schedule" onClick={() => toggleSchedule(loan.id)}>
                      <FaCalendarAlt />
                    </button>

                    <button data-tooltip-id="tooltip" data-tooltip-content="View Summary" onClick={() => toggleSummary(loan.id)}>
                      <FaChartPie />
                    </button>

                    {loan.disbursements_remaining > 0 && (
                      <button data-tooltip-id="tooltip" data-tooltip-content="Disburse Loan" onClick={() => openModal(loan)}>
                        <FaMoneyCheckAlt />
                      </button>
                    )}

                    <button
                      data-tooltip-id="tooltip"
                      data-tooltip-content="Apply Grace Period"
                      onClick={() => handleApplyGracePeriod(loan.id, loan.status)}
                      disabled={loan.status === 'approved' || loan.status === 'paid_off' || loan.grace_applied}
                    >
                      <FaClock />
                    </button>
                <Tooltip id="tooltip" />
              </td>
                </tr>

                {/* Loan Summary Row (below the loan row) */}
                {expandedSummaries[loan.id] && loanSummaries[loan.id] && (
                  <tr className="summary-row">
                    <td colSpan="9">
                      <div className="loan-summary">
                        <h4>Loan Summary</h4>
                        <p><strong>Reference:</strong> {loanSummaries[loan.id].reference}</p>
                        <p><strong>Member:</strong> {loanSummaries[loan.id].member_name}</p>
                        <p><strong>Total Disbursed:</strong> {formatNaira(loanSummaries[loan.id].total_disbursed || 0)}</p>
                        <p><strong>Outstanding Disbursement Balance:</strong> {formatNaira(loanSummaries[loan.id].remaining_balance || 0)}</p>
                        <p><strong>Total Repaid:</strong> {formatNaira(loanSummaries[loan.id].total_paid || 0)}</p>
                        <p><strong>Interest Rate:</strong> {loanSummaries[loan.id].interest_rate}%</p>
                        <p><strong>Status:</strong> {getStatusBadge(loanSummaries[loan.id].status)}</p>
                      </div>
                    </td>
                  </tr>
                )}

                {/* Loan Repayment Schedule Row (below the loan row) */}
                {expandedSchedules[loan.id] && repaymentSchedules[loan.id] && (
                  <tr className="schedule-row">
                    <td colSpan="9">
                      <div className="repayment-schedule">
                        <table className="loan-table">
                          <thead>
                            <tr>
                              <th>Installment</th>
                              <th>Due Date</th>
                              <th>Principal</th>
                              <th>Interest</th>
                              <th>Total</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {repaymentSchedules[loan.id].map((item, idx) => {
                              const effectiveStatus = loan.status === 'paid' ? 'paid' : (item.is_paid ? 'paid' : 'unpaid');

                              return (
                                <tr key={idx}>
                                  <td>{item.installment}</td>
                                  <td>{new Date(item.due_date).toLocaleDateString()}</td>
                                  <td>{formatNaira(item.principal)}</td>
                                  <td>{formatNaira(item.interest)}</td>
                                  <td>
                                    {isNaN(Number(item.principal)) || isNaN(Number(item.interest))
                                      ? 'N/A'
                                      : formatNaira(Number(item.principal) + Number(item.interest))}
                                  </td>
                                  <td>{getStatusBadge(effectiveStatus)}</td>
                                </tr>
                              );
                            })}

                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Disburse Loan</h3>
            <form onSubmit={handleDisburse}>
              <label>Disbursement Type:</label>
              <select
                value={disbursementType}
                onChange={(e) => setDisbursementType(e.target.value)}
              >
                <option value="full">Full</option>
                <option value="partial">Partial</option>
              </select>

              {disbursementType === 'partial' && (
                <>
                  <label>Number of Tranches:</label>
                  <input
                    type="number"
                    min="1"
                    value={numDisbursements}
                    onChange={(e) => setNumDisbursements(e.target.value)}
                    required
                  />
                </>
              )}

              {selectedLoan && selectedLoan.disbursements_remaining > 0 && (
                <>
                  <label>
                    <input
                      type="checkbox"
                      checked={isFullPayment}
                      onChange={(e) => setIsFullPayment(e.target.checked)}
                    />
                    Full payment remaining amount
                  </label>
                </>
              )}

              <label>Amount:</label>
              <input
                type="number"
                value={disburseAmount}
                onChange={(e) => setDisburseAmount(e.target.value)}
                required
              />
              <p><strong>Duration:</strong> {selectedLoan?.total_repayment_months || selectedLoan?.duration_months} months</p>
              <button type="submit">Disburse</button>
              <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanManagement;