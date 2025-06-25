import React, { useState, useCallback, useMemo } from 'react';
import usePaginatedData from '../../../utils/usePaginatedData';
import { formatNaira } from '../../../utils/formatCurrency';
import '../../../styles/members/loan/LoanApplication.css';
import Spinner from '../../../components/Spinner';

const LoanApplicationList = () => {
  const {
  data: applications,
  currentPage,
  totalPages,
  loading,
  setCurrentPage,
  filters,
  setFilters,
} = usePaginatedData("/members/loan/loan-applications/", {
  status: '',
  category: '',
  amount__gte: '',
  amount__lte: '',
  application_date__gte: '',
  application_date__lte: '',
});



  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

 const handleResetFilters = () => {
  setFilters({
    status: '',
    category: '',
    amount__gte: '',
    amount__lte: '',
    application_date__gte: '',
    application_date__lte: '',
  });
  setCurrentPage(1);
};



  return (
    <div className="loan-application-history-container">
      <h2>Your Loan Applications</h2>

      {/* Filter Controls */}
      <div className="filter-form">
        <select name="status" value={filters.status} onChange={handleInputChange}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>

        <input
          type="number"
          name="amount__gte"
          placeholder="Min Amount"
          value={filters.amount__gte || ''}
          onChange={handleInputChange}
        />
        <input
          type="number"
          name="amount__lte"
          placeholder="Max Amount"
          value={filters.amount__lte || ''}
          onChange={handleInputChange}
        />

        <input
          type="date"
          name="application_date__gte"
          value={filters.application_date__gte || ''}
          onChange={handleInputChange}
        />
        <input
          type="date"
          name="application_date__lte"
          value={filters.application_date__lte || ''}
          onChange={handleInputChange}
        />


        <button onClick={handleResetFilters}>Reset</button>
      </div>

      {loading ? (
      <>
        <Spinner size={18} color="#fff" /> Loading...
      </>
    ) : applications.length === 0 ? (
        <p>No loan applications found.</p>
      ) : (
        <div>
          {applications.map((app) => (
            <div key={app.id} className="loan-application-card">
              <div className="card-item">
                <h4>Loan Amount:</h4>
                <p><span>{formatNaira(app.amount)}</span></p>
              </div>

              <div className="card-item">
                <h4>Loan Category:</h4>
                <p><span>{app.category?.name || 'N/A'}</span></p>
              </div>

              <div className="card-item">
                <h4>Repayment Period:</h4>
                <p><span>{app.repayment_months} months</span></p>
              </div>

              <div className="card-item">
                <h4>Interest Rate:</h4>
                <p><span>{app.category?.interest_rate || 'N/A'}%</span></p>
              </div>

              <div className="card-item">
                <h4>Status:</h4>
                <p>
                  <span
                    className={
                      app.status === 'pending'
                        ? 'status-pending'
                        : app.status === 'approved'
                        ? 'status-approved'
                        : 'status-rejected'
                    }
                  >
                    {app.status.toUpperCase()}
                  </span>
                </p>
              </div>

              <div className="card-item">
                <h4>Applied On:</h4>
                <p><span>{new Date(app.application_date).toLocaleDateString()}</span></p>
              </div>

              <div className="card-item">
                <a href={`/loan/loan-applications/${app.id}/`} className="view-details">View Details</a>
              </div>
            </div>
          ))}

          {/* Pagination Controls */}
          <div className="pagination-controls">
            <button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>
              Previous
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages}>
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanApplicationList;
