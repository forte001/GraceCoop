import React, { useRef } from 'react';
import usePaginatedData from '../../../utils/usePaginatedData';
import ExportPrintGroup from '../../../utils/ExportPrintGroup';
import exportHelper from '../../../utils/exportHelper';
import getAllPaginatedDataForExport from '../../../utils/getAllPaginatedDataForExport';
import axiosMemberInstance from '../../../utils/axiosMemberInstance';
import Spinner from '../../../components/Spinner';
import { toast } from 'react-toastify';
import { formatNaira } from '../../../utils/formatCurrency';

const MemberLoanRepaymentList = () => {
  const printRef = useRef();

  const {
    data,
    currentPage,
    totalPages,
    loading,
    setCurrentPage,
    filters,
    setFilters,
  } = usePaginatedData('/members/loan/repayments/', {
    loan__reference: '',
    was_late: '',
    payment_date_after: '',
    payment_date_before: '',
    ordering: '-payment_date',
  });

  const transformExportRepayment = (repayment) => ({
    LoanRef: repayment.loan_reference || 'N/A',
    PaidBy: repayment.paid_by_name || 'N/A',
    Amount: `NGN ${Number(repayment.amount).toLocaleString()}`,
    PaymentDate: repayment.recorded_at?.split('T')[0] || 'N/A',
    DueDate: repayment.due_date || 'N/A',
    WasLate: repayment.was_late ? 'Yes' : 'No',
  });

  const previewExportData = data.map(transformExportRepayment);

  const {
    exportToExcel,
    exportToCSV,
    exportToPDF,
  } = exportHelper({
    url: '/members/loan/repayments/',
    filters,
    transformFn: transformExportRepayment,
    columns: ['LoanRef', 'PaidBy', 'Amount', 'PaymentDate', 'DueDate', 'WasLate'],
    fileName: 'member_repayments',
    reportTitle: 'Loan Repayments',
    getAllDataFn: getAllPaginatedDataForExport,
  });

  const downloadReceipt = async (sourceReference, loanReference = '') => {
    try {
      const response = await axiosMemberInstance.get(
        `/members/payment/receipt/${sourceReference}/`,
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const fileName = loanReference
        ? `loan_receipt_${loanReference}_${sourceReference}.pdf`
        : `receipt_${sourceReference}.pdf`;
      link.setAttribute('download', fileName);
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
      <h2>Your Loan Repayments</h2>

      <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <input
          className="filter-input"
          placeholder="Loan Ref"
          value={filters.loan__reference}
          onChange={(e) => setFilters(f => ({ ...f, loan__reference: e.target.value }))}
        />
        <small className="form-hint">Set start date:</small>
        <input
          type="date"
          className="filter-input"
          value={filters.payment_date_after || ''}
          onChange={(e) => setFilters(f => ({ ...f, payment_date_after: e.target.value }))}
        />
        <small className="form-hint">Set end date:</small>
        <input
          type="date"
          className="filter-input"
          value={filters.payment_date_before || ''}
          onChange={(e) => setFilters(f => ({ ...f, payment_date_before: e.target.value }))}
        />
        <select
          className="filter-select"
          value={filters.was_late}
          onChange={(e) => setFilters(f => ({ ...f, was_late: e.target.value }))}
        >
          <option value="">All</option>
          <option value="true">Late</option>
          <option value="false">On Time</option>
        </select>

        <ExportPrintGroup
          data={previewExportData}
          exportToExcel={exportToExcel}
          exportToCSV={exportToCSV}
          exportToPDF={exportToPDF}
        />
      </div>

      {loading && <Spinner />}

      <div ref={printRef}>
        <table className="loan-table">
          <thead>
            <tr>
              <th>Loan Ref</th>
              <th>Paid By</th>
              <th>Amount</th>
              <th>Payment Date</th>
              <th>Due Date</th>
              <th>Late?</th>
              <th>Receipt</th>
            </tr>
          </thead>
          <tbody>
            {data?.length ? (
              data.map((repayment) => (
                <tr key={repayment.id}>
                  <td>{repayment.loan_reference || 'N/A'}</td>
                  <td>{repayment.paid_by_name || 'N/A'}</td>
                  <td>{formatNaira(repayment.amount)}</td>
                  <td>{repayment.recorded_at?.split('T')[0]}</td>
                  <td>{repayment.due_date ? new Date(repayment.due_date).toLocaleDateString() : 'N/A'}</td>
                  <td>{repayment.was_late ? 'Yes' : 'No'}</td>
                  <td>
                    {repayment.source_reference ? (
                      <button
                        className="download-btn"
                        onClick={() => downloadReceipt(repayment.source_reference, repayment.loan_reference)}
                      >
                        Download
                      </button>
                    ) : '—'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center' }}>
                  No repayment records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination-controls" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
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
        </div>
      )}
    </div>
  );
};

export default MemberLoanRepaymentList;
