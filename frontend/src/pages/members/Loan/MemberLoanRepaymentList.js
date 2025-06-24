import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatNaira } from '../../../utils/formatCurrency';
import ExportPrintGroup from '../../../components/ExportPrintGroup';
import usePaginatedData from '../../../utils/usePaginatedData';
import { toast } from 'react-toastify';
import getAllPaginatedDataForExport from '../../../utils/getAllPaginatedDataForExport';
import axiosMemberInstance from '../../../utils/axiosMemberInstance';

const MemberLoanRepaymentList = () => {

  const printRef = useRef();

const {
  data,
  count,
  currentPage,
  pageSize,
  totalPages,
  loading,
  setCurrentPage,
  setPageSize,
  filters,
  setFilters, 
} = usePaginatedData('/members/loan/repayments/', {
  loan__reference: '',
  was_late: '',
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

const previewExportData = (data || []).map(transformExportRepayment);

const exportToExcel = async () => {
  toast.info('Preparing Excel export...');
  const exportData = await getAllPaginatedDataForExport({
    url: '/members/loan/repayments/',
    filters,
    transformFn: transformExportRepayment,
  });
  if (!exportData.length) return toast.warn('No data to export.');
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Repayments');
  XLSX.writeFile(workbook, 'member_repayments.xlsx');
  toast.success('Excel export complete.');
};

const exportToCSV = async () => {
  toast.info('Preparing CSV export...');
  const exportData = await getAllPaginatedDataForExport({
    url: '/members/loan/repayments/',
    filters,
    transformFn: transformExportRepayment,
  });
  if (!exportData.length) return toast.warn('No data to export.');
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Repayments');
  XLSX.writeFile(workbook, 'member_repayments.csv', { bookType: 'csv' });
  toast.success('CSV export complete.');
};

const exportToPDF = async () => {
  toast.info('Preparing PDF export...');
  const exportData = await getAllPaginatedDataForExport({
    url: '/members/loan/repayments/',
    filters,
    transformFn: transformExportRepayment,
  });
  if (!exportData.length) return toast.warn('No data to export.');
  const doc = new jsPDF();
  doc.text('Loan Repayments', 14, 15);
  autoTable(doc, {
    startY: 20,
    head: [['Loan Ref', 'Paid By', 'Amount', 'Payment Date', 'Due Date', 'Late?']],
    body: exportData.map((item) => Object.values(item)),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [76, 175, 80] },
  });
  doc.save('member_repayments.pdf');
  toast.success('PDF export complete.');
};
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
          onChange={(e) =>
            setFilters((f) => ({ ...f, loan__reference: e.target.value }))
          }
        />
        <small className="form-hint">Set start date:</small>
        <input
          type="date"
          className="filter-input"
          value={filters.payment_date_after || ''}
          onChange={(e) =>
            setFilters((f) => ({ ...f, payment_date_after: e.target.value }))
          }
        />
        <small className="form-hint">Set end date:</small>
        <input
          type="date"
          className="filter-input"
          value={filters.payment_date_before || ''}
          onChange={(e) =>
            setFilters((f) => ({ ...f, payment_date_before: e.target.value }))
          }
        />
        <select
          className="filter-select"
          value={filters.was_late}
          onChange={(e) =>
            setFilters((f) => ({ ...f, was_late: e.target.value }))
          }
        >
          <option value="">All</option>
          <option value="true">Late</option>
          <option value="false">On Time</option>
        </select>
        <ExportPrintGroup
          data={previewExportData}
          exportToExcel={exportToExcel}
          exportToPDF={exportToPDF}
          exportToCSV={exportToCSV}
        />
      </div>
      {loading && <p>Loading...</p>}
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
                    ) : (
                      '—'
                    )}
                  </td>

                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center' }}>
                  No repayment records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
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
