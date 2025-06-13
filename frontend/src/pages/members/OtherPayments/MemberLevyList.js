import React, { useRef } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import '../../../styles/admin/loan/LoanManagement.css';
import { formatNaira } from '../../../utils/formatCurrency';
import ExportPrintGroup from '../../../components/ExportPrintGroup';
import usePaginatedData from '../../../utils/usePaginatedData';

const MemberLevyList = () => {
  const {
    data,
    fullData,
    loading,
    filters,
    setFilters,
    currentPage,
    setCurrentPage,
    totalPages,
  } = usePaginatedData('/members/levy/levy-list/', {
    member_name: '',
    payment_date_after: '',
    payment_date_before: '',
    ordering: '-date',
  });

  const printRef = useRef();

  const exportToExcel = () => {
    if (!data?.length) return;
    const excelData = data.map((item) => ({
      PaidBy: item.member_name || 'N/A',
      Amount: formatNaira(item.amount),
      PaymentDate: item.payment_date || item.recorded_at?.split('T')[0] || 'N/A',
    }));
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Levies');
    XLSX.writeFile(workbook, 'levies.xlsx');
  };

  const exportToPDF = () => {
    if (!data?.length) return;
    const doc = new jsPDF();
    doc.text('Levies List', 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [['Paid By', 'Amount', 'Payment Date']],
      body: data.map((item) => [
        item.member_name || 'N/A',
        formatNaira(item.amount),
        item.payment_date || item.recorded_at?.split('T')[0] || 'N/A',
      ]),
    });
    doc.save('levies.pdf');
  };

  const exportToCSV = () => {
    if (!data?.length) return;
    const excelData = data.map((item) => ({
      PaidBy: item.member_name || 'N/A',
      Amount: formatNaira(item.amount),
      PaymentDate: item.payment_date || item.recorded_at?.split('T')[0] || 'N/A',
    }));
    const worksheet = XLSX.utils.json_to_sheet(excelData);
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

  return (
    <div className="loan-management">
      <h2>Your Levies</h2>

      <div className="filter-group">
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
          data={data}
          exportToExcel={exportToExcel}
          exportToPDF={exportToPDF}
          exportToCSV={exportToCSV}
          handlePrint={handlePrint}
        />
      </div>

      {loading && <p>Loading...</p>}

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
            {data?.length > 0 ? (
              data.map((item) => (
                <tr key={item.id}>
                  <td>{item.member_name || 'N/A'}</td>
                  <td>{formatNaira(item.amount)}</td>
                  <td>{item.payment_date || item.recorded_at?.split('T')[0] || 'N/A'}</td>
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

      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default MemberLevyList;
