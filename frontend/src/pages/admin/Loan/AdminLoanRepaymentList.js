import React, { useRef } from 'react';
import usePaginatedData from '../../../utils/usePaginatedData';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import '../../../styles/admin/loan/LoanManagement.css';
import { formatNaira } from '../../../utils/formatCurrency';
import ExportPrintGroup from '../../../components/ExportPrintGroup';
import getAllPaginatedDataForExport from '../../../utils/getAllPaginatedDataForExport';
import { toast } from 'react-toastify';

const AdminLoanRepaymentList = () => {
  const printRef = useRef();

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
  } = usePaginatedData('/admin/loan/repayments-admin/', {
    loan__reference: '',
    payment_date_after: '',
    payment_date_before: '',
    was_late: '',
    ordering: '-payment_date',
  });

  const transformFn = (repayment) => ({
    LoanRef: repayment.loan_reference || 'N/A',
    PaidBy: repayment.paid_by_name || 'N/A',
    Amount: `NGN ${Number(repayment.amount).toLocaleString()}`,
    PaymentDate: repayment.recorded_at?.split('T')[0] || 'N/A',
    DueDate: repayment.due_date || 'N/A',
    WasLate: repayment.was_late ? 'Yes' : 'No',
  });

  const handleExport = async (format) => {
    toast.loading(`Exporting as ${format.toUpperCase()}...`, { toastId: 'loan-export' });

    const exportData = await getAllPaginatedDataForExport({
      url: '/admin/loan/repayments-admin/',
      filters,
      transformFn,
    });

    if (!exportData.length) {
      toast.update('loan-export', {
        render: 'No data to export.',
        type: 'warning',
        isLoading: false,
        autoClose: 3000,
      });
      return;
    }

    try {
      if (format === 'excel') {
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Repayments');
        XLSX.writeFile(workbook, 'repayments.xlsx');
      } else if (format === 'csv') {
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Repayments');
        XLSX.writeFile(workbook, 'repayments.csv', { bookType: 'csv' });
      } else if (format === 'pdf') {
        const doc = new jsPDF();
        doc.text('Loan Repayments', 14, 15);
        autoTable(doc, {
          startY: 20,
          head: [['Loan Ref', 'Paid By', 'Amount', 'Payment Date', 'Due Date', 'Late?']],
          body: exportData.map((item) => Object.values(item)),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [76, 175, 80] },
        });
        doc.save('repayments.pdf');
      }

      toast.update('loan-export', {
        render: `Exported as ${format.toUpperCase()}`,
        type: 'success',
        isLoading: false,
        autoClose: 3000,
      });
    } catch (err) {
      toast.update('loan-export', {
        render: `Failed to export ${format.toUpperCase()}`,
        type: 'error',
        isLoading: false,
        autoClose: 3000,
      });
    }
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const printContents = printRef.current.innerHTML;
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = printContents;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  return (
    <div className="loan-management">
      <h2>All Loan Repayments</h2>

      <div className="filter-section">
        <input
          className="filter-input"
          placeholder="Loan Ref"
          value={filters.loan__reference || ''}
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
          value={filters.was_late || ''}
          onChange={(e) =>
            setFilters((f) => ({ ...f, was_late: e.target.value }))
          }
        >
          <option value="">All</option>
          <option value="true">Late</option>
          <option value="false">On Time</option>
        </select>

        <ExportPrintGroup
          data={data}
          exportToExcel={() => handleExport('excel')}
          exportToPDF={() => handleExport('pdf')}
          exportToCSV={() => handleExport('csv')}
          handlePrint={handlePrint}
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
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((repayment) => (
                <tr key={repayment.id}>
                  <td>{repayment.loan_reference || 'N/A'}</td>
                  <td>{repayment.paid_by_name || 'N/A'}</td>
                  <td>{formatNaira(repayment.amount)}</td>
                  <td>{repayment.recorded_at?.split('T')[0]}</td>
                  <td>
                    {repayment.due_date
                      ? new Date(repayment.due_date).toLocaleDateString()
                      : 'N/A'}
                  </td>
                  <td>{repayment.was_late ? 'Yes' : 'No'}</td>
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

export default AdminLoanRepaymentList;
