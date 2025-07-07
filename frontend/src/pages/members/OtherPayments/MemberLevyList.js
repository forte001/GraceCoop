import React, { useRef } from 'react';
import { formatNaira } from '../../../utils/formatCurrency';
import ExportPrintGroup from '../../../utils/ExportPrintGroup';
import usePaginatedData from '../../../utils/usePaginatedData';
import getAllPaginatedDataForExport from '../../../utils/getAllPaginatedDataForExport';
import exportHelper from '../../../utils/exportHelper';
import { toast } from 'react-toastify';
import axiosMemberInstance from '../../../utils/axiosMemberInstance';
import Spinner from '../../../components/Spinner';
import '../../../styles/admin/loan/LoanManagement.css';

const MemberLevyList = () => {
  const {
    data,
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
    source_reference: '',
    ordering: '-date',
  });

  const printRef = useRef();

  const transformExportLevy = (item) => ({
    Reference: item.source_reference || 'N/A',
    Amount: `NGN ${Number(item.amount).toLocaleString()}`,
    PaymentDate: item.date?.split('T')[0] || 'N/A',
  });

  const previewExportData = data.map(transformExportLevy);

  const {
    exportToExcel,
    exportToCSV,
    exportToPDF,
  } = exportHelper({
    url: '/members/levy/levy-list/',
    filters,
    transformFn: transformExportLevy,
    columns: ['Reference', 'Amount', 'PaymentDate'],
    fileName: 'member_levies',
    reportTitle: 'Member Levies',
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
      <h2>Your Levies</h2>

      <div className="filter-group">
        <small className="form-hint">Reference:</small>
        <input
          type="text"
          className="filter-input"
          placeholder="Enter reference"
          value={filters.source_reference}
          onChange={(e) => setFilters(f => ({ ...f, source_reference: e.target.value }))}
        />
        <small className="form-hint">Start Date:</small>
        <input
          type="date"
          className="filter-input"
          value={filters.payment_date_after}
          onChange={(e) => setFilters(f => ({ ...f, payment_date_after: e.target.value }))}
        />
        <small className="form-hint">End Date:</small>
        <input
          type="date"
          className="filter-input"
          value={filters.payment_date_before}
          onChange={(e) => setFilters(f => ({ ...f, payment_date_before: e.target.value }))}
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
              <th>Reference</th>
              <th>Amount</th>
              <th>Payment Date</th>
              <th>Receipt</th>
            </tr>
          </thead>
          <tbody>
            {data?.length > 0 ? (
              data.map((item) => (
                <tr key={item.id}>
                  <td>{item.source_reference || 'N/A'}</td>
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
                <td colSpan="4" style={{ textAlign: 'center' }}>
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
          <span>Page {currentPage} of {totalPages}</span>
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
