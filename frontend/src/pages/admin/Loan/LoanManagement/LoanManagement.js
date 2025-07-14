import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import usePaginatedData from '../../../../utils/usePaginatedData';
import '../../../../styles/admin/loan/LoanManagement.css';
import ExportPrintGroup from '../../../../utils/ExportPrintGroup';
import exportHelper from '../../../../utils/exportHelper';
import PendingApplications from './PendingApplications';
import ActiveLoans from './ActiveLoans';

const LoanManagement = () => {
  const [activeTab, setActiveTab] = useState('pending');
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

  const transformExportLoan = (loan) => ({
    'Loan Ref': loan.reference || 'N/A',
    'Member': loan.applicant_name || 'N/A',
    'Amount': `NGN ${Number(loan.amount || 0).toLocaleString()}`,
    'Interest Rate': loan.interest_rate !== undefined ? `${loan.interest_rate}%` : 'N/A',
    'Duration': loan.duration_months !== undefined ? `${loan.duration_months} mo` : 'N/A',
    'Status': loan.status ? loan.status.toUpperCase() : 'N/A',
    'Start Date': loan.approval_date?.split('T')[0] || 'N/A',
    'Disbursed': `NGN ${Number(loan.total_disbursed || 0).toLocaleString()}`,
  });

  const previewExportData = (loansData || []).map(transformExportLoan);

  const exportColumns = [
    'Loan Ref',
    'Member',
    'Amount',
    'Interest Rate',
    'Duration',
    'Status',
    'Start Date',
    'Disbursed',
  ];

  const {
    exportToExcel,
    exportToCSV,
    exportToPDF,
  } = exportHelper({
    url: '/admin/loan/loans-admin/',
    filters,
    transformFn: transformExportLoan,
    columns: exportColumns,
    fileName: 'loans',
    reportTitle: 'Loan Management Report',
  });

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
        <button className={activeTab === 'pending' ? 'active' : ''} onClick={() => setActiveTab('pending')}>
          Pending Applications
        </button>
        <button className={activeTab === 'active' ? 'active' : ''} onClick={() => setActiveTab('active')}>
          Active Loans
        </button>
      </div>

      {activeTab === 'pending' && (
        <PendingApplications
          loanApplicationsData={loanApplicationsData}
          applicationPage={applicationPage}
          totalApplicationPages={totalApplicationPages}
          setApplicationPage={setApplicationPage}
          refreshApplications={refreshApplications}
          refreshLoans={refreshLoans}
          navigate={navigate}
        />
      )}

      {activeTab === 'active' && (
        <ActiveLoans
          loansData={loansData}
          loanPage={loanPage}
          totalLoanPages={totalLoanPages}
          setLoanPage={setLoanPage}
          refreshLoans={refreshLoans}
          navigate={navigate}
        />
      )}
    </div>
  );
};

export default LoanManagement;