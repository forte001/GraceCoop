import React, { useRef } from 'react';
import usePaginatedData from '../../../utils/usePaginatedData';
import { formatNaira } from '../../../utils/formatCurrency';
import ExportPrintGroup from '../../../utils/ExportPrintGroup';
import axiosMemberInstance from '../../../utils/axiosMemberInstance';
import '../../../styles/admin/loan/LoanManagement.css';
import { toast } from 'react-toastify';
import getAllPaginatedDataForExport from '../../../utils/getAllPaginatedDataForExport';
import exportHelper from '../../../utils/exportHelper';
import Spinner from '../../../components/Spinner';

const MemberAllPaymentsList = () => {
  const {
    data,
    currentPage,
    pageSize,
    totalPages,
    loading,
    setCurrentPage,
    setPageSize,
    filters,
    setFilters,
  } = usePaginatedData('/members/payment/all-payments/', {
    payment_type: '',
    verified: '',
    created_at_after: '',
    created_at_before: '',
    ordering: '-created_at',
  });

  const printRef = useRef();

  const transformExportPayment = (payment) => ({
    Type: payment.payment_type?.toUpperCase() || 'N/A',
    Reference: payment.reference || 'N/A',
    Amount: `NGN ${Number(payment.amount).toLocaleString()}`,
    CreatedAt: payment.created_at?.split('T')[0] || 'N/A',
    Verified: payment.verified ? 'Yes' : 'No',
  });

  const previewExportData = data.map(transformExportPayment);

  const {
    exportToExcel,
    exportToCSV,
    exportToPDF,
  } = exportHelper({
    url: '/members/payment/all-payments/',
    filters,
    transformFn: transformExportPayment,
    columns: ['Type', 'Reference', 'Amount', 'CreatedAt', 'Verified'],
    fileName: 'member_payments',
    reportTitle: 'All Member Payments',
    getAllDataFn: getAllPaginatedDataForExport,
  });

  const downloadReceipt = async (sourceReference) => {
    try {
      const response = await axiosMemberInstance.get(
        `/members/payment/receipt/${sourceReference}/`,
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipt_${sourceReference}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download receipt:', error);
      toast.error('Could not download receipt. Please try again.');
    }
  };

  return (
    <div className="loan-management">
      <h2>All Your Payments</h2>

      <div className="filter-section">
        <select
          className="filter-select"
          value={filters.payment_type}
          onChange={(e) => setFilters(f => ({ ...f, payment_type: e.target.value }))}
        >
          <option value="">All Types</option>
          <option value="shares">Shares</option>
          <option value="levy">Levy</option>
          <option value="loan_repayment">Loan Repayment</option>
        </select>

        <select
          className="filter-select"
          value={filters.verified}
          onChange={(e) => setFilters(f => ({ ...f, verified: e.target.value }))}
        >
          <option value="">Verified?</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>

        <small className="form-hint">Start Date:</small>
        <input
          type="date"
          className="filter-input"
          value={filters.created_at_after || ''}
          onChange={(e) => setFilters(f => ({ ...f, created_at_after: e.target.value }))}
        />

        <small className="form-hint">End Date:</small>
        <input
          type="date"
          className="filter-input"
          value={filters.created_at_before || ''}
          onChange={(e) => setFilters(f => ({ ...f, created_at_before: e.target.value }))}
        />

        <ExportPrintGroup
          data={previewExportData}
          exportToExcel={exportToExcel}
          exportToPDF={exportToPDF}
          exportToCSV={exportToCSV}
        />
      </div>

      {loading && <Spinner />}

      <div ref={printRef}>
        <table className="loan-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Ref</th>
              <th>Amount</th>
              <th>Created At</th>
              <th>Verified</th>
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((p) => (
                <tr key={p.id}>
                  <td>{p.payment_type?.toUpperCase()}</td>
                  <td>{p.reference}</td>
                  <td>{formatNaira(p.amount)}</td>
                  <td>{p.created_at?.split('T')[0]}</td>
                  <td>{p.verified ? 'Yes' : 'No'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center' }}>No payments found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination-controls">
          <button onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))} disabled={currentPage === 1}>
            Prev
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))} disabled={currentPage === totalPages}>
            Next
          </button>
          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
            {[10, 20, 50].map(size => (
              <option key={size} value={size}>{size} / page</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default MemberAllPaymentsList;
