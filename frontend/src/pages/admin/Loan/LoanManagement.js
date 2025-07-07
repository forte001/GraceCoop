// src/components/admin/loan/LoanManagement.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import usePaginatedData from '../../../utils/usePaginatedData';
import axiosAdminInstance from '../../../utils/axiosAdminInstance';
import { getCSRFToken } from '../../../utils/csrf';
import '../../../styles/admin/loan/LoanManagement.css';
import { formatNaira } from '../../../utils/formatCurrency';
import { FaCalendarAlt, FaChartPie, FaMoneyCheckAlt, FaClock  } from 'react-icons/fa';
import { Tooltip } from 'react-tooltip';
import ExportPrintGroup from '../../../utils/ExportPrintGroup';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'react-toastify';
import getAllPaginatedDataForExport from '../../../utils/getAllPaginatedDataForExport';
import { formatDateTime } from '../../../utils/formatDate';

const LoanManagement = () => {


  const [activeTab, setActiveTab] = useState('pending');
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [disburseAmount, setDisburseAmount] = useState('');
  const [disbursementType, setDisbursementType] = useState('full');
  const [repaymentSchedules, setRepaymentSchedules] = useState({});
  const [expandedSchedules, setExpandedSchedules] = useState({});
  const [expandedSummaries, setExpandedSummaries] = useState({});
  const [loanSummaries, setLoanSummaries] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [isFullPayment, setIsFullPayment] = useState(false);
  const navigate = useNavigate();
  

const {
  filters,
  setFilters,
  data: loanApplicationsData,
  currentPage: applicationPage,
  totalPages: totalApplicationPages,
  setCurrentPage: setApplicationPage,
  refresh: refreshApplications,
} = usePaginatedData('/admin/loan/loan-applications-admin/', {
  query: '',
  approved_at_after: '',
  approved_at_before: '',
  ordering: '-approval_date',
});

const {
  data: loansData,
  currentPage: loanPage,
  totalPages: totalLoanPages,
  setCurrentPage: setLoanPage,
  refresh: refreshLoans,
} = usePaginatedData('/admin/loan/loans-admin/', filters);

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
      if (error?.response?.status ===403){
        navigate('/forbidden');
      } else {
        alert(error?.response?.data?.error || 'Failed to approve application.');
      }
      
    }
  };

  const openModal = (loan) => {
    setSelectedLoan(loan);
    setShowModal(true);
    setDisburseAmount('');
    setDisbursementType('full');
    setIsFullPayment(false);
  };

const [receiptFile, setReceiptFile] = useState(null);

    const handleDisburse = async (e) => {
      e.preventDefault();
      try {
        const amount = disbursementType === 'full' || isFullPayment
          ? selectedLoan.disbursements_remaining
          : disburseAmount;

        const formData = new FormData();
        formData.append('amount', amount);
        if (receiptFile) {
          formData.append('receipt', receiptFile);
        }
        // to define number of intended tranches
        // formData.append('num_disbursements', numDisbursements);

        await axiosAdminInstance.post(
          `/admin/loan/loans-admin/${selectedLoan.id}/disburse/`,
          formData,
          {
            headers: {
              'X-CSRFToken': getCSRFToken(),
              'Content-Type': 'multipart/form-data',
            }
          }
        );

        alert('Loan disbursed successfully!');
        setShowModal(false);
        refreshLoans();
      } catch (err) {
        if (err.response?.status === 403){
          navigate('/forbidden');
        } else{
          alert('An error occurred during disbursement.');
        }
      }
    };


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
      if (err?.response?.status ===403){
        navigate('/forbidden');
      } else {
      alert(err.response?.data?.error || 'Error applying grace period.');
    }
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

const transformExportLoan = (loan) => ({
  LoanRef: loan.reference || 'N/A',
  Member: loan.applicant_name || 'N/A',
  Amount: `NGN ${Number(loan.amount || 0).toLocaleString()}`,
  InterestRate: loan.interest_rate !== undefined ? `${loan.interest_rate}%` : 'N/A',
  Duration: loan.duration_months !== undefined ? `${loan.duration_months} mo` : 'N/A',
  Status: loan.status ? loan.status.toUpperCase() : 'N/A',
  Start: loan.approval_date?.split('T')[0] || 'N/A',
  DisbursedAmount: formatNaira(loan.total_disbursed ?? 0),
});

const previewExportData = (loansData || []).map(transformExportLoan);

const exportToExcel = async () => {
  toast.info('Preparing Excel export...');
  const exportData = await getAllPaginatedDataForExport({
    url: '/admin/loan/loans-admin/',
    filters,
    transformFn: transformExportLoan,
  });
  if (!exportData?.length) return toast.warn('No data to export.');
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Loans');
  XLSX.writeFile(workbook, 'loans.xlsx');
  toast.success('Excel export complete.');
};


const exportToCSV = async () => {
  toast.info('Preparing CSV export...');
  const exportData = await getAllPaginatedDataForExport({
    url: '/admin/loan/loans-admin/',
    filters,
    transformFn: transformExportLoan,
  });
  if (!exportData?.length) return toast.warn('No data to export.');

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Loans');
  XLSX.writeFile(workbook, 'loans.csv', { bookType: 'csv' });
  toast.success('CSV export complete.');
};

const exportToPDF = async () => {
  toast.info('Preparing PDF export...');
  try {
    const exportData = await getAllPaginatedDataForExport({
      url: '/admin/loan/loans-admin/',
      filters,
      transformFn: transformExportLoan,
    });

    if (!exportData || !Array.isArray(exportData) || exportData.length === 0) {
      toast.warn('No data to export.');
      return;
    }

    const doc = new jsPDF();
    doc.text('Loan Management', 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [['Loan Ref', 'Member', 'Amount', 'Interest', 'Duration', 'Status', 'Start Date', 'Disbursed']],
      body: exportData.map((loan) => Object.values(loan)),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [63, 81, 181] },
    });
    doc.save('loans.pdf');
    toast.success('PDF export complete.');
  } catch (err) {
    console.error('PDF export failed:', err);
    toast.error('Failed to export PDF.');
  }
};


  const renderPagination = (page, totalPages, setPage) => (
    <div className="pagination">
      <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
      <span>Page {page} of {totalPages}</span>
      <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
    </div>
  );
    useEffect(() => {
      setApplicationPage(1);
      setLoanPage(1);
    }, [filters, setApplicationPage, setLoanPage]);
  return (
    <div className="loan-management">
      <h2>Loan Management</h2>

  <div className="filter-section">
       <small className="form-hint">Search with:</small>
       <input
  className="filter-input"
  type='text'
  placeholder="Loan reference or member name"
  value={filters.query || ''}
  onChange={(e) =>
    setFilters((f) => ({ ...f, query: e.target.value }))
  }
/>

<small className="form-hint">Set start date:</small>
<input
  className="filter-input"
  type="date"
  value={filters.approved_at_after || ''}
  onChange={(e) =>
    setFilters((f) => ({ ...f, approved_at_after: e.target.value }))
  }
/>

<small className="form-hint">Set end date:</small>
<input
  className="filter-input"
  type="date"
  value={filters.approved_at_before || ''}
  onChange={(e) =>
    setFilters((f) => ({ ...f, approved_at_before: e.target.value }))
  }
/>


        <ExportPrintGroup
          data={previewExportData}
          exportToExcel={exportToExcel}
          exportToPDF={exportToPDF}
          exportToCSV={exportToCSV}
        />
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
                    <td>{formatDateTime(loan.start_date)|| 'N/A'}</td>
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

                    {/* <button
                      data-tooltip-id="tooltip"
                      data-tooltip-content="Apply Grace Period"
                      onClick={() => handleApplyGracePeriod(loan.id, loan.status)}
                      disabled={loan.status === 'approved' || loan.status === 'paid_off' || loan.grace_applied}
                    >
                      <FaClock />
                    </button> */}
                    <button
                      data-tooltip-id="tooltip"
                      data-tooltip-content="Apply Grace Period"
                      onClick={() => handleApplyGracePeriod(loan.id, loan.status)}
                      disabled={
                        loan.status === 'approved' ||
                        loan.status === 'paid_off' ||
                        loan.grace_applied ||
                        !loan.end_date ||                         // no end date, don’t allow
                        new Date(loan.end_date) > new Date()      // period not yet expired
                      }
                    >
                      <FaClock />
                    </button>
                <Tooltip id="tooltip" />
              </td>
                  </tr>
                  
                  {expandedSummaries[loan.id] && loanSummaries[loan.id] && (
                    <tr className="summary-row">
                    <td colSpan="9">
                      <div className="loan-summary-container">
                          <div className="summary-column loan-details">
                            <h4>Loan Summary</h4>
                            <p><strong>Reference:</strong> {loanSummaries[loan.id].reference}</p>
                            <p><strong>Member:</strong> {loanSummaries[loan.id].member_name}</p>
                            <p><strong>Total Disbursed:</strong> {formatNaira(loanSummaries[loan.id].total_disbursed || 0)}</p>
                            <p><strong>Outstanding Disbursement Balance:</strong> {formatNaira(loanSummaries[loan.id].remaining_balance || 0)}</p>
                            <p><strong>Total Repaid:</strong> {formatNaira(loanSummaries[loan.id].total_paid || 0)}</p>
                            <p><strong>Interest Rate:</strong> {loanSummaries[loan.id].interest_rate}%</p>
                            <p><strong>Status:</strong> {getStatusBadge(loanSummaries[loan.id].status)}</p>
                          </div>
                          <div className="summary-column disbursement-receipts">
                            <h4>Disbursement Receipts</h4>
                            {loan.disbursements && loan.disbursements.length > 0 ? (
                              loan.disbursements.map((d) => (
                                <div key={d.id} className="receipt-entry">
                                  <p>{formatNaira(d.amount)} on {formatDateTime(d.disbursed_at)}</p>
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

                                </div>
                              ))
                            ) : (
                              <p>No disbursement records</p>
                            )}
                          </div>
                          <div className="summary-column reserved">
                            <h4>Reserved</h4>
                            <p>Coming soon...</p>
                          </div>
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
          <div className="modal-overlay">
            <div className="modal">
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

                <div>
                  <label>Upload Disbursement Receipt</label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setReceiptFile(e.target.files[0])}
                    required
                  />
                </div>

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
