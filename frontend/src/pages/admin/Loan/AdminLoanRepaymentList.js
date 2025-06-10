import React, { useState, useEffect, useRef } from 'react';
import axiosInstance from '../../../utils/axiosInstance';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import '../../../styles/admin/loan/LoanManagement.css';
import { formatNaira } from '../../../utils/formatCurrency';
import ExportPrintGroup from '../../../components/ExportPrintGroup';


const AdminLoanRepaymentList = () => {
  const [filters, setFilters] = useState({
    loan__loan_reference: '',
    was_late: '',
    ordering: '-payment_date',
  });
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Ref for printable content
  const printRef = useRef();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (filters.loan__reference)
        params['loan__reference'] = filters.loan__reference;

      if (filters.payment_date_after)
        params['payment_date_after'] = filters.payment_date_after;

      if (filters.payment_date_before)
        params['payment_date_before'] = filters.payment_date_before;

      if (filters.was_late !== '') params['was_late'] = filters.was_late;
      if (filters.ordering) params['ordering'] = filters.ordering;
      

      const response = await axiosInstance.get('/admin/loan/repayments-admin/', { params });
      setData(response.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

 
 // Export to Excel (fixed)
const exportToExcel = () => {
  if (!data.length) return;
  const excelData = data.map((repayment) => ({
    LoanRef: repayment.loan_reference || 'N/A',
    PaidBy: repayment.paid_by_name || 'N/A',
    Amount: `NGN ${Number(repayment.amount).toLocaleString()}`,
    PaymentDate: repayment.recorded_at?.split('T')[0],  
    DueDate: repayment.due_date || 'N/A',             
    WasLate: repayment.was_late ? 'Yes' : 'No',
  }));
  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Repayments');
  XLSX.writeFile(workbook, 'repayments.xlsx');
};

// Export to PDF (fixed)
const exportToPDF = () => {
  if (!data.length) return;

  const doc = new jsPDF();

  doc.text('Loan Repayments', 14, 15);

  const tableColumn = ['Loan Ref', 'Paid By', 'Amount', 'Payment Date', 'Due Date', 'Late?'];
  const tableRows = [];

  data.forEach((repayment) => {
    const repaymentData = [
      repayment.loan_reference || 'N/A',
      repayment.paid_by_name || 'N/A',
      `NGN ${Number(repayment.amount).toLocaleString()}`,
      repayment.recorded_at?.split('T')[0],
      repayment.due_date || 'N/A',
      repayment.was_late ? 'Yes' : 'No',
    ];
    tableRows.push(repaymentData);
  });

  autoTable(doc, {
    startY: 20,
    head: [tableColumn],
    body: tableRows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [76, 175, 80] },
  });

  doc.save('repayments.pdf');
};

const exportToCSV = () => {
    if (!data.length) return;
    const excelData = data.map((repayment) => ({
      LoanRef: repayment.loan_reference || 'N/A',
      PaidBy: repayment.paid_by_name || 'N/A',
      Amount: `NGN ${Number(repayment.amount).toLocaleString()}`,
      PaymentDate: repayment.recorded_at?.split('T')[0],  
      DueDate: repayment.due_date || 'N/A',             
      WasLate: repayment.was_late ? 'Yes' : 'No',
    }));
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Repayments');
    XLSX.writeFile(workbook, 'repayments.csv', { bookType: 'csv' });
  };


  // Print the table - opens print dialog with just the table content
  const handlePrint = () => {
    if (!printRef.current) return;
    const printContents = printRef.current.innerHTML;
    const originalContents = document.body.innerHTML;

    document.body.innerHTML = printContents;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload(); // Reload to restore React state
  };

  return (
    <div className="loan-management">
      <h2>All Loan Repayments</h2>

      <div
        style={{
          marginBottom: '15px',
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <input
          className="filter-input"
          placeholder="Loan Ref"
          value={filters.loan__reference}
          onChange={(e) =>
            setFilters((f) => ({ ...f, loan__reference: e.target.value }))
          }
        />
        <small className="form-hint">
              Set start date:
        </small>
        <input
          type="date"
          className="filter-input"
          value={filters.payment_date_after}
          onChange={(e) =>
            setFilters((f) => ({ ...f, payment_date_after: e.target.value }))
          }
        />
         <small className="form-hint">
              Set end date:
        </small>
        <input
          type="date"
          className="filter-input"
          value={filters.payment_date_before}
          onChange={(e) =>
            setFilters((f) => ({ ...f, payment_date_before: e.target.value }))
          }
        />

        <select
          className="filter-select"
          value={filters.was_late}
          onChange={(e) => setFilters((f) => ({ ...f, was_late: e.target.value }))}
        >
          <option value="">All</option>
          <option value="true">Late</option>
          <option value="false">On Time</option>
        </select>

        <ExportPrintGroup
        data={data} 
        exportToExcel={exportToExcel} 
        exportToPDF={exportToPDF}     
        exportToCSV={exportToCSV}    
        handlePrint={handlePrint}    
      />

      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>Error loading repayments.</p>}

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
                  {/* <td>{repayment.payment_date}</td> */}
                  <td>{repayment.recorded_at?.split('T')[0]}</td>
                  <td>{repayment.due_date? new Date(repayment.due_date).toLocaleDateString() : 'N/A'}</td>
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
    </div>
  );
};

export default AdminLoanRepaymentList;
