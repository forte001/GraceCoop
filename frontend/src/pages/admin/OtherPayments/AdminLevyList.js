import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import '../../../styles/admin/loan/LoanManagement.css';
import { formatNaira } from '../../../utils/formatCurrency';
import ExportPrintGroup from '../../../components/ExportPrintGroup';
import usePaginatedData from '../../../utils/usePaginatedData'; 

const AdminLevyList = () => {
  const [filters, setFilters] = useState({
    member_name: '',
    payment_date_after: '',
    payment_date_before: '',
    ordering: '-date',
  });

  const {
    data,
    loading,
    error,
    next,
    previous,
    currentPage,
    totalPages,
    setPage,
    fetchData,
  } = usePaginatedData('/admin/levy/levy-admin/', filters);

  const printRef = useRef();

    const exportToExcel = () => {
    if (!data.length) return;
    const excelData = data.map((item) => ({
        PaidBy: item.member_name || 'N/A',
        Amount: formatNaira(item.amount),
        PaymentDate: item.date?.split('T')[0] || 'N/A',
    }));
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Levies');
    XLSX.writeFile(workbook, 'levies.xlsx');
  };

  const exportToPDF = () => {
  if (!data.length) return;
  const doc = new jsPDF();
  doc.text('Levies List', 14, 15);
  autoTable(doc, {
    startY: 20,
    head: [['Paid By', 'Amount', 'Payment Date']],
    body: data.map((item) => [
      item.member_name || 'N/A',
      formatNaira(item.amount),
      item.date?.split('T')[0] || 'N/A',
    ]),
  });
  doc.save('levies.pdf');
};


    const exportToCSV = () => {
    if (!data.length) return;
    const csvData = data.map((item) => ({
        PaidBy: item.member_name || 'N/A',
        Amount: formatNaira(item.amount),
        PaymentDate: item.date?.split('T')[0] || 'N/A',
    }));
    const worksheet = XLSX.utils.json_to_sheet(csvData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Levies');
    XLSX.writeFile(workbook, 'levies.csv', { bookType: 'csv' });
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

  console.log('Levy data:', data);
console.log('Loading:', loading);
console.log('Error:', error);


  return (
    <div className="loan-management">
      <h2>All Levies</h2>

      <div className="filter-group">
        <input
          className="filter-input"
          placeholder="Member name"
          value={filters.member_name}
          onChange={(e) =>
            setFilters((f) => ({ ...f, member_name: e.target.value }))
          }
        />
        <small className="form-hint">Start Date:</small>
        <input
          type="date"
          className="filter-input"
          value={filters.payment_date_after}
          onChange={(e) =>
            setFilters((f) => ({ ...f, payment_date_after: e.target.value }))
          }
        />
        <small className="form-hint">End Date:</small>
        <input
          type="date"
          className="filter-input"
          value={filters.payment_date_before}
          onChange={(e) =>
            setFilters((f) => ({ ...f, payment_date_before: e.target.value }))
          }
        />

        <ExportPrintGroup
          data={data || { results: [] }}
          exportToExcel={exportToExcel}
          exportToPDF={exportToPDF}
          exportToCSV={exportToCSV}
          handlePrint={handlePrint}
        />
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>Error loading levies.</p>}

      <div ref={printRef}>
        <table className="loan-table">
          <thead>
            <tr>
              <th>Paid By</th>
              <th>Amount</th>
              <th>Payment Date</th>
            </tr>
          </thead>
           <tbody>
            {Array.isArray(data) && data.length > 0 ? (
                data.map((item) => (
                <tr key={item.id}>
                    <td>{item.member_name?.trim() || 'N/A'}</td>
                    <td>{formatNaira(item.amount)}</td>
                    <td>{item.date.split('T')[0]}</td>
                </tr>
                ))
            ) : (
                <tr>
                <td colSpan="3" style={{ textAlign: 'center' }}>
                    No levy records found.
                </td>
                </tr>
            )}
            </tbody>



        </table>
      </div>

      {/* Pagination Controls */}
      <div className="pagination-controls">
        <button disabled={!previous} onClick={() => setPage(currentPage - 1)}>
          Previous
        </button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <button disabled={!next} onClick={() => setPage(currentPage + 1)}>
          Next
        </button>
      </div>
    </div>
  );
};

export default AdminLevyList;
