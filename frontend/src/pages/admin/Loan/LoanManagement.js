// src/components/admin/loan/LoanManagement.js

import React, { useState } from 'react';
import usePaginatedData from '../../../utils/usePaginatedData';
import axiosInstance from '../../../utils/axiosInstance';
import { getCSRFToken } from '../../../utils/csrf';
import '../../../styles/admin/loan/LoanManagement.css';
import { formatNaira } from '../../../utils/formatCurrency';
import { FaCalendarAlt, FaChartPie, FaMoneyCheckAlt, FaFileExport, FaClock  } from 'react-icons/fa';
import { Tooltip } from 'react-tooltip';

const LoanManagement = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [disburseAmount, setDisburseAmount] = useState('');
  const [disbursementType, setDisbursementType] = useState('full');
  const [repaymentSchedules, setRepaymentSchedules] = useState({});
  const [expandedSchedules, setExpandedSchedules] = useState({});
  const [expandedSummaries, setExpandedSummaries] = useState({});
  const [loanSummaries, setLoanSummaries] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [isFullPayment, setIsFullPayment] = useState(false);

  const queryParams = {
    search: searchTerm,
    start_date: startDate,
    end_date: endDate,
  };

  const {
    data: loanApplicationsData,
    count: applicationCount,
    currentPage: applicationPage,
    totalPages: totalApplicationPages,
    setCurrentPage: setApplicationPage,
    refresh: refreshApplications,
  } = usePaginatedData('/admin/loan/loan-applications-admin/', queryParams);

  const {
    data: loansData,
    count: loanCount,
    currentPage: loanPage,
    totalPages: totalLoanPages,
    setCurrentPage: setLoanPage,
    refresh: refreshLoans,
  } = usePaginatedData('/admin/loan/loans-admin/', queryParams);

  const handleApproveApplication = async (applicationId) => {
    try {
      await axiosInstance.post(
        `/admin/loan/loan-applications-admin/${applicationId}/approve/`,
        {},
        { headers: { 'X-CSRFToken': getCSRFToken() } }
      );
      alert('Loan application approved and loan created.');
      refreshApplications();
      refreshLoans();
    } catch (error) {
      alert('Failed to approve application.');
    }
  };

  const openModal = (loan) => {
    setSelectedLoan(loan);
    setShowModal(true);
    setDisburseAmount('');
    setDisbursementType('full');
    setIsFullPayment(false);
  };

  const handleDisburse = async (e) => {
    e.preventDefault();
    try {
      const amount = disbursementType === 'full' || isFullPayment
        ? selectedLoan.disbursements_remaining
        : disburseAmount;

      await axiosInstance.post(
        `/admin/loan/loans-admin/${selectedLoan.id}/disburse/`,
        { amount },
        { headers: { 'X-CSRFToken': getCSRFToken() } }
      );

      alert('Loan disbursed successfully!');
      setShowModal(false);
      refreshLoans();
    } catch (err) {
      alert(err.response?.data?.error || 'An error occurred during disbursement.');
    }
  };

  const toggleSchedule = async (loanId) => {
    setExpandedSchedules(prev => ({ ...prev, [loanId]: !prev[loanId] }));
    if (!repaymentSchedules[loanId]) {
      try {
        const res = await axiosInstance.get(`/admin/loan/loans-admin/${loanId}/repayment-schedule/`);
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
        const res = await axiosInstance.get(`/admin/loan/loans-admin/${loanId}/summary/`);
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
      const response = await axiosInstance.post(
        `/admin/loan/loans-admin/${loanId}/apply-grace-period/`,
        {},
        { headers: { 'X-CSRFToken': getCSRFToken() } }
      );
      alert(response.data.message);
      refreshLoans();
    } catch (err) {
      alert(err.response?.data?.error || 'Error applying grace period.');
    }
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
      <span style={{
        backgroundColor: colorMap[status] || 'black',
        color: '#fff',
        padding: '3px 6px',
        borderRadius: '4px',
      }}>
        {status.toUpperCase().replace('_', ' ')}
      </span>
    );
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams(queryParams).toString();
      const response = await axiosInstance.get(`/admin/loan/export-loans/?${params}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'loans.xlsx');
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      alert('Failed to export data.');
    }
  };

  const renderPagination = (page, totalPages, setPage) => (
    <div className="pagination">
      <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
      <span>Page {page} of {totalPages}</span>
      <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
    </div>
  );

  return (
    <div className="loan-management">
      <h2>Loan Management</h2>

      <div className="filter-controls">
        <input type="text" placeholder="Search by reference or name" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <button onClick={handleExport}><FaFileExport /> Export</button>
      </div>

      <div className="loan-tabs">
        <button className={activeTab === 'pending' ? 'active' : ''} onClick={() => setActiveTab('pending')}>Pending Applications</button>
        <button className={activeTab === 'active' ? 'active' : ''} onClick={() => setActiveTab('active')}>Active Loans</button>
      </div>

      {activeTab === 'pending' && (
        <>
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
              {(loanApplicationsData || []).filter(app => app.status === 'pending').map(app => (
                <tr key={app.id}>
                  <td>{app.applicant_name || 'N/A'}</td>
                  <td>{app.category.name}</td>
                  <td>{formatNaira(app.amount)}</td>
                  <td>{getStatusBadge(app.status)}</td>
                  <td>{new Date(app.application_date).toLocaleString()}</td>
                  <td><button onClick={() => handleApproveApplication(app.id)}>Approve</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {renderPagination(applicationPage, totalApplicationPages, setApplicationPage)}
        </>
      )}

      {activeTab === 'active' && (
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
          {renderPagination(loanPage, totalLoanPages, setLoanPage)}
        </>
      )}

      {showModal && selectedLoan && (
        <div className="modal">
          <div className="modal-content">
            <h3>Disburse Loan - {selectedLoan.reference}</h3>
            <form onSubmit={handleDisburse}>
              <div>
                <label>
                  <input
                    type="radio"
                    name="disbursementType"
                    value="full"
                    checked={disbursementType === 'full'}
                    onChange={() => {
                      setDisbursementType('full');
                      setIsFullPayment(true);
                    }}
                  />
                  Full Disbursement
                </label>
                <label>
                  <input
                    type="radio"
                    name="disbursementType"
                    value="partial"
                    checked={disbursementType === 'partial'}
                    onChange={() => {
                      setDisbursementType('partial');
                      setIsFullPayment(false);
                    }}
                  />
                  Partial Disbursement
                </label>
              </div>
              {disbursementType === 'partial' && (
                <div>
                  <label>Amount to Disburse</label>
                  <input
                    type="number"
                    value={disburseAmount}
                    onChange={(e) => setDisburseAmount(e.target.value)}
                    min="1"
                    max={selectedLoan.disbursements_remaining}
                    required
                  />
                </div>
              )}
              <button type="submit">Confirm Disbursement</button>
              <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanManagement;
