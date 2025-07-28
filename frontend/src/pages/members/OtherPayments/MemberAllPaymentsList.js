import React, { useRef, useState } from 'react';
import usePaginatedData from '../../../utils/usePaginatedData';
import { formatNaira } from '../../../utils/formatCurrency';
import ExportPrintGroup from '../../../utils/ExportPrintGroup';
import axiosMemberInstance from '../../../utils/axiosMemberInstance';
import '../../../styles/admin/loan/LoanManagement.css';
import { toast } from 'react-toastify';
import getAllPaginatedDataForExport from '../../../utils/getAllPaginatedDataForExport';
import exportHelper from '../../../utils/exportHelper';
import Spinner from '../../../components/Spinner';

// Payment Recheck Component
const PaymentRecheckButton = ({ payment, onPaymentUpdated }) => {
  const [isRechecking, setIsRechecking] = useState(false);

  const handleRecheck = async () => {
    setIsRechecking(true);

    try {
      const response = await axiosMemberInstance.post('/members/payment/recheck/', {
        payment_id: payment.id
      });

      if (response.data.payment_verified) {
        toast.success(response.data.message);
        // Update the payment in the list
        onPaymentUpdated(payment.id);
      } else {
        toast.warning(response.data.message);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'An error occurred during recheck';
      toast.error(errorMessage);
    } finally {
      setIsRechecking(false);
    }
  };

  // Don't show recheck button for already verified payments
  if (payment.verified) {
    return null;
  }

  // Check if payment is too old (30 days)
  const paymentDate = new Date(payment.created_at);
  const daysDiff = Math.floor((new Date() - paymentDate) / (1000 * 60 * 60 * 24));
  
  if (daysDiff > 30) {
    return (
      <span className="text-muted" style={{ fontSize: '12px' }}>
        Too old to recheck
      </span>
    );
  }

  return (
    <button 
      onClick={handleRecheck}
      disabled={isRechecking}
      className="btn-recheck"
      style={{
        padding: '4px 8px',
        fontSize: '12px',
        backgroundColor: isRechecking ? '#ccc' : '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: isRechecking ? 'not-allowed' : 'pointer'
      }}
    >
      {isRechecking ? (
        <>
          <span style={{ 
            display: 'inline-block', 
            width: '12px', 
            height: '12px', 
            border: '2px solid #fff',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginRight: '4px'
          }}></span>
          Checking...
        </>
      ) : (
        'Recheck'
      )}
    </button>
  );
};

const MemberAllPaymentsList = () => {
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
    refreshData, // Make sure your usePaginatedData hook provides this
  } = usePaginatedData('/members/payment/all-payments/', {
    payment_type: '',
    verified: '',
    created_at_after: '',
    created_at_before: '',
    ordering: '-created_at',
  });

  const printRef = useRef();

  const transformExportPayment = (payment) => ({
    Type: payment.payment_type?.toUpperCase() || 'N/A',
    Reference: payment.reference || 'N/A',
    Amount: `NGN ${Number(payment.amount).toLocaleString()}`,
    CreatedAt: payment.created_at?.split('T')[0] || 'N/A',
    Verified: payment.verified ? 'Yes' : 'No',
  });

  const previewExportData = data.map(transformExportPayment);

  const {
    exportToExcel,
    exportToCSV,
    exportToPDF,
  } = exportHelper({
    url: '/members/payment/all-payments/',
    filters,
    transformFn: transformExportPayment,
    columns: ['Type', 'Reference', 'Amount', 'CreatedAt', 'Verified'],
    fileName: 'member_payments',
    reportTitle: 'All Member Payments',
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

  // Handle payment update after successful recheck
  const handlePaymentUpdated = (paymentId) => {
    // Use usePaginatedData hook refreshData function
    if (refreshData) {
      refreshData();
    } else {
      // Or Force a page reload or manual state update
      window.location.reload();
    }
  };

  return (
    <div className="loan-management">
      {/* Add CSS for spinner animation */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <h2>All Your Payments</h2>

      <div className="filter-section">
        <select
          className="filter-select"
          value={filters.payment_type}
          onChange={(e) => setFilters(f => ({ ...f, payment_type: e.target.value }))}
        >
          <option value="">All Types</option>
          <option value="shares">Shares</option>
          <option value="levy">Levy</option>
          <option value="loan_repayment">Loan Repayment</option>
        </select>

        <select
          className="filter-select"
          value={filters.verified}
          onChange={(e) => setFilters(f => ({ ...f, verified: e.target.value }))}
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
          onChange={(e) => setFilters(f => ({ ...f, created_at_after: e.target.value }))}
        />

        <small className="form-hint">End Date:</small>
        <input
          type="date"
          className="filter-input"
          value={filters.created_at_before || ''}
          onChange={(e) => setFilters(f => ({ ...f, created_at_before: e.target.value }))}
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
              <th>Type</th>
              <th>Ref</th>
              <th>Amount</th>
              <th>Created At</th>
              <th>Verified</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((p) => (
                <tr key={p.id}>
                  <td>{p.payment_type?.toUpperCase()}</td>
                  <td>{p.reference}</td>
                  <td>{formatNaira(p.amount)}</td>
                  <td>{p.created_at?.split('T')[0]}</td>
                  <td>
                    {p.verified ? (
                      <span style={{ color: 'green', fontWeight: 'bold' }}>
                        ✅ Yes
                      </span>
                    ) : (
                      <span style={{ color: 'orange', fontWeight: 'bold' }}>
                        ⏳ No
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {/* Receipt download button for verified payments */}
                      {p.verified && p.source_reference && (
                        <button 
                          onClick={() => downloadReceipt(p.source_reference)}
                          className="btn-receipt"
                          style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Receipt
                        </button>
                      )}
                      
                      {/* Recheck button for unverified payments */}
                      <PaymentRecheckButton 
                        payment={p}
                        onPaymentUpdated={handlePaymentUpdated}
                      />
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center' }}>No payments found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination-controls">
          <button onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))} disabled={currentPage === 1}>
            Prev
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))} disabled={currentPage === totalPages}>
            Next
          </button>
          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
            {[10, 20, 50].map(size => (
              <option key={size} value={size}>{size} / page</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default MemberAllPaymentsList;