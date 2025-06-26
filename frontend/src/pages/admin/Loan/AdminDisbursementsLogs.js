// src/pages/admin/Loan/AdminDisbursementLogs.js
import React, { useRef } from 'react';
import usePaginatedData from '../../../utils/usePaginatedData';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExportPrintGroup from '../../../components/ExportPrintGroup';
import Spinner from '../../../components/Spinner';
import { toast } from 'react-toastify';
import '../../../styles/admin/loan/LoanManagement.css';
import { formatNaira } from '../../../utils/formatCurrency';
import getAllPaginatedDataForExport from '../../../utils/getAllPaginatedDataForExport';

const AdminDisbursementLogs = () => {
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
  } = usePaginatedData('/admin/loan/disbursements-admin/', {
    disbursed_by__username: '',
    loan__reference: '',
    disbursed_at_after: '',
    disbursed_at_before: '',
    ordering: '-disbursed_at',
  });

  const printRef = useRef();

  const transformExportLog = (log) => ({
    Reference: log.loan_reference || 'N/A',
    Amount: `NGN ${Number(log.amount).toLocaleString()}`,
    Months: `${log.repayment_months}`,
    DisbursedBy: log.disbursed_by_name || 'N/A',
    DisbursedAt: log.disbursed_at?.split('T')[0] || 'N/A',
  });

  const previewExportData = (data || []).map(transformExportLog);

  const exportToExcel = async () => {
    toast.info('Preparing Excel export...');
    const exportData = await getAllPaginatedDataForExport({
      url: '/admin/loan/disbursements-admin/',
      filters,
      transformFn: transformExportLog,
    });
    if (!exportData.length) return toast.warn('No data to export.');
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, worksheet, 'Disbursements');
    XLSX.writeFile(wb, 'disbursements.xlsx');
    toast.success('Excel export complete.');
  };

  const exportToCSV = async () => {
    toast.info('Preparing CSV export...');
    const exportData = await getAllPaginatedDataForExport({
      url: '/admin/loan/disbursements-admin/',
      filters,
      transformFn: transformExportLog,
    });
    if (!exportData.length) return toast.warn('No data to export.');
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, worksheet, 'Disbursements');
    XLSX.writeFile(wb, 'disbursements.csv', { bookType: 'csv' });
    toast.success('CSV export complete.');
  };

  const exportToPDF = async () => {
    toast.info('Preparing PDF export...');
    const exportData = await getAllPaginatedDataForExport({
      url: '/admin/loan/disbursements-admin/',
      filters,
      transformFn: transformExportLog,
    });
    if (!exportData.length) return toast.warn('No data to export.');
    const doc = new jsPDF();
    doc.text('Disbursement Logs', 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [['Reference', 'Amount', 'Months', 'Disbursed By', 'Disbursed At']],
      body: exportData.map((row) => Object.values(row)),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [63, 81, 181] },
    });
    doc.save('disbursements.pdf');
    toast.success('PDF export complete.');
  };

  return (
    <div className="loan-management">
      <h2>Disbursement Logs</h2>

      <div className="filter-section">
        <input
          className="filter-input"
          placeholder="Disbursed by (username)"
          value={filters.disbursed_by__username || ''}
          onChange={(e) =>
            setFilters((f) => ({ ...f, disbursed_by__username: e.target.value }))
          }
        />
        <input
          className="filter-input"
          placeholder="Loan reference"
          value={filters.loan__reference || ''}
          onChange={(e) =>
            setFilters((f) => ({ ...f, loan__reference: e.target.value }))
          }
        />
        <small className="form-hint">Start Date:</small>
        <input
          type="date"
          className="filter-input"
          value={filters.disbursed_at_after || ''}
          onChange={(e) =>
            setFilters((f) => ({ ...f, disbursed_at_after: e.target.value }))
          }
        />
        <small className="form-hint">End Date:</small>
        <input
          type="date"
          className="filter-input"
          value={filters.disbursed_at_before || ''}
          onChange={(e) =>
            setFilters((f) => ({ ...f, disbursed_at_before: e.target.value }))
          }
        />
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
              <th>Reference</th>
              <th>Amount</th>
              <th>Months</th>
              <th>Disbursed By</th>
              <th>Disbursed At</th>
            </tr>
          </thead>
          <tbody>
            {data.length ? (
              data.map((log) => (
                <tr key={log.id}>
                  <td>{log.loan_reference}</td>
                  <td>{formatNaira(log.amount)}</td>
                  <td>{log.repayment_months}</td>
                  <td>{log.disbursed_by_name}</td>
                  <td>{log.disbursed_at?.split('T')[0]}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center' }}>
                  No disbursement logs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination-controls">
        <button
          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          disabled={currentPage === 1}
        >
          Prev
        </button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
        <select
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
        >
          {[10, 20, 50].map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default AdminDisbursementLogs;
