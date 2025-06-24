import React, { useRef } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import '../../../styles/admin/loan/LoanManagement.css';
import { formatNaira } from '../../../utils/formatCurrency';
import ExportPrintGroup from '../../../components/ExportPrintGroup';
import usePaginatedData from '../../../utils/usePaginatedData';
import getAllPaginatedDataForExport from '../../../utils/getAllPaginatedDataForExport';
import { toast } from 'react-toastify';
import axiosMemberInstance from '../../../utils/axiosMemberInstance';

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

const transformExportLevy = (item) => ({
  PaidBy: item.member_name || 'N/A',
  Amount: `NGN ${(item.amount)}`,
  PaymentDate: item.date?.split('T')[0] || 'N/A',
});

const previewExportData = (data || []).map(transformExportLevy);

const exportToExcel = async () => {
  toast.info('Preparing Excel export...');
  const exportData = await getAllPaginatedDataForExport({
    url: '/members/levy/levy-list/',
    filters,
    transformFn: transformExportLevy,
  });
  if (!exportData.length) return toast.warn('No data to export.');
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Levies');
  XLSX.writeFile(workbook, 'levies.xlsx');
  toast.success('Excel export complete.');
};

const exportToCSV = async () => {
  toast.info('Preparing CSV export...');
  const exportData = await getAllPaginatedDataForExport({
    url: '/members/levy/levy-list/',
    filters,
    transformFn: transformExportLevy,
  });
  if (!exportData.length) return toast.warn('No data to export.');
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Levies');
  XLSX.writeFile(workbook, 'levies.csv', { bookType: 'csv' });
  toast.success('CSV export complete.');
};

const exportToPDF = async () => {
  toast.info('Preparing PDF export...');
  const exportData = await getAllPaginatedDataForExport({
    url: '/members/levy/levy-list/',
    filters,
    transformFn: transformExportLevy,
  });
  if (!exportData.length) return toast.warn('No data to export.');
  const doc = new jsPDF();
  doc.text('Levies List', 14, 15);
  autoTable(doc, {
    startY: 20,
    head: [['Paid By', 'Amount', 'Payment Date']],
    body: exportData.map((item) => Object.values(item)),
  });
  doc.save('levies.pdf');
  toast.success('PDF export complete.');
};
const downloadReceipt = async (sourceReference) => {
  try {
    const response = await axiosMemberInstance.get(`/members/payment/receipt/${sourceReference}/`, {
      responseType: 'blob',  // important to treat as binary
    });

    // Create a blob URL and force download
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
              <th>Paid By</th>
              <th>Amount</th>
              <th>Payment Date</th>
              <th>Receipt</th>
            </tr>
          </thead>
          <tbody>
            {data?.length > 0 ? (
              data.map((item) => (
                <tr key={item.id}>
                  <td>{item.member_name || 'N/A'}</td>
                  <td>{formatNaira(item.amount)}</td>
                  <td>{item.date?.split('T')[0] || 'N/A'}</td>
                  <td>
                    {item.source_reference ? (
                      <button
                        className="download-btn"
                        onClick={() => downloadReceipt(item.source_reference)}
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
