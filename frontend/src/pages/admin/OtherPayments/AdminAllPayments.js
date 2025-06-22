import React, { useRef } from 'react';
import usePaginatedData from '../../../utils/usePaginatedData';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatNaira } from '../../../utils/formatCurrency';
import ExportPrintGroup from '../../../components/ExportPrintGroup';
import '../../../styles/admin/loan/LoanManagement.css';
import { toast } from 'react-toastify';
import getAllPaginatedDataForExport from '../../../utils/getAllPaginatedDataForExport';

const AdminAllPayments = () => {
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
  } = usePaginatedData('/admin/payment/payments-admin/', {
    payment_type: '',
    verified: '',
    member__full_name: '',
    created_at_after: '',
    created_at_before: '',
    ordering: '-created_at',
  });

const printRef = useRef();
const transformExportPayment = (payment) => ({
    Member: payment.member_name || 'N/A',
    Type: payment.payment_type.toUpperCase() || 'N/A',
    Reference: payment.reference || 'N/A',
    Amount: `NGN ${Number(payment.amount).toLocaleString()}`,
    CreatedAt: payment.created_at?.split('T')[0] || 'N/A',
    Verified: payment.verified ? 'Yes' : 'No',
    
  });
const previewExportData = (data || []).map(transformExportPayment);

const exportToExcel = async () => {
  toast.info('Preparing Excel export...');
  try {
    const exportData = await getAllPaginatedDataForExport({
      url: '/admin/payment/payments-admin/',
      filters,
      transformFn: transformExportPayment,
    });
    if (!exportData.length) return toast.warn('No data to export.');

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, worksheet, 'Payments');
    XLSX.writeFile(wb, 'payments.xlsx');

    toast.success('Excel export complete.');
  } catch (err) {
    toast.error('Failed to export to Excel.');
    console.error(err);
  }
};

const exportToCSV = async () => {
  toast.info('Preparing CSV export...');
  try {
    const exportData = await getAllPaginatedDataForExport({
      url: '/admin/payment/payments-admin/',
      filters,
      transformFn: transformExportPayment,
    });
    if (!exportData.length) return toast.warn('No data to export.');

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, worksheet, 'Payments');
    XLSX.writeFile(wb, 'payments.csv', { bookType: 'csv' });

    toast.success('CSV export complete.');
  } catch (err) {
    toast.error('Failed to export to CSV.');
    console.error(err);
  }
};

const exportToPDF = async () => {
  toast.info('Preparing PDF export...');
  try {
    const exportData = await getAllPaginatedDataForExport({
      url: '/admin/payment/payments-admin/',
      filters,
      transformFn: transformExportPayment,
    });
    if (!exportData.length) return toast.warn('No data to export.');

    const doc = new jsPDF();
    doc.text('All Payments', 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [['Member', 'Type', 'Amount', 'Verified', 'Created At', 'Ref']],
      body: exportData.map((p) => Object.values(p)),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [33, 150, 243] },
    });
    doc.save('payments.pdf');

    toast.success('PDF export complete.');
  } catch (err) {
    toast.error('Failed to export to PDF.');
    console.error(err);
  }
};


  return (
    <div className="loan-management">
      <h2>All Payments</h2>

      <div className="filter-section">
        <input
          className="filter-input"
          placeholder="Member name"
          value={filters.member__full_name || ''}
          onChange={(e) =>
            setFilters((f) => ({ ...f, member__full_name: e.target.value }))
          }
        />

        <select
          className="filter-select"
          value={filters.payment_type}
          onChange={(e) =>
            setFilters((f) => ({ ...f, payment_type: e.target.value }))
          }
        >
          <option value="">All Types</option>
          <option value="shares">Shares</option>
          <option value="levy">Levy</option>
          <option value="loan_repayment">Loan Repayment</option>
        </select>

        <select
          className="filter-select"
          value={filters.verified}
          onChange={(e) =>
            setFilters((f) => ({ ...f, verified: e.target.value }))
          }
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
          onChange={(e) =>
            setFilters((f) => ({ ...f, created_at_after: e.target.value }))
          }
        />

        <small className="form-hint">End Date:</small>
        <input
          type="date"
          className="filter-input"
          value={filters.created_at_before || ''}
          onChange={(e) =>
            setFilters((f) => ({ ...f, created_at_before: e.target.value }))
          }
        />

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
              <th>Member</th>
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
                  <td>{p.member_name || 'N/A'}</td>
                  <td>{p.payment_type.toUpperCase()}</td>
                  <td>{p.reference}</td>
                  <td>{formatNaira(p.amount)}</td>
                  <td>{p.created_at?.split('T')[0]}</td>
                  <td>{p.verified ? 'Yes' : 'No'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center' }}>
                  No payments found.
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

export default AdminAllPayments;
