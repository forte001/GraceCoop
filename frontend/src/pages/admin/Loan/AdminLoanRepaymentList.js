// src/pages/admin/Loan/AdminLoanRepaymentList.js
import React, { useRef } from "react";
import usePaginatedData from "../../../utils/usePaginatedData";
import "../../../styles/admin/loan/LoanManagement.css";
import { formatNaira } from "../../../utils/formatCurrency";
import ExportPrintGroup from "../../../utils/ExportPrintGroup";
import Spinner from "../../../components/Spinner";
import exportHelper from "../../../utils/exportHelper";

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
  } = usePaginatedData("/admin/loan/repayments-admin/", {
    loan__reference: "",
    payment_date_after: "",
    payment_date_before: "",
    was_late: "",
    ordering: "-payment_date",
  });

  const transformFn = (repayment) => ({
    "Loan Ref": repayment.loan_reference || "N/A",
    "Paid By": repayment.paid_by_name || "N/A",
    Amount: `NGN ${Number(repayment.amount).toLocaleString()}`,
    "Payment Date": repayment.recorded_at?.split("T")[0] || "N/A",
    "Due Date": repayment.due_date || "N/A",
    "Late?": repayment.was_late ? "Yes" : "No",
  });

  const { exportToExcel, exportToCSV, exportToPDF } = exportHelper({
    url: "/admin/loan/repayments-admin/",
    filters,
    transformFn,
    columns: [
      "Loan Ref",
      "Paid By",
      "Amount",
      "Payment Date",
      "Due Date",
      "Late?",
    ],
    fileName: "repayments",
    reportTitle: "Loan Repayments Report",
  });

  return (
    <div className="loan-management">
      <h2>All Loan Repayments</h2>

      <div className="filter-section">
        <input
          className="filter-input"
          placeholder="Loan Ref"
          value={filters.loan__reference || ""}
          onChange={(e) =>
            setFilters((f) => ({ ...f, loan__reference: e.target.value }))
          }
        />

        <small className="form-hint">Set start date:</small>
        <input
          type="date"
          className="filter-input"
          value={filters.payment_date_after || ""}
          onChange={(e) =>
            setFilters((f) => ({ ...f, payment_date_after: e.target.value }))
          }
        />

        <small className="form-hint">Set end date:</small>
        <input
          type="date"
          className="filter-input"
          value={filters.payment_date_before || ""}
          onChange={(e) =>
            setFilters((f) => ({ ...f, payment_date_before: e.target.value }))
          }
        />

        <select
          className="filter-select"
          value={filters.was_late || ""}
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
                  <td>{repayment.loan_reference || "N/A"}</td>
                  <td>{repayment.paid_by_name || "N/A"}</td>
                  <td>{formatNaira(repayment.amount)}</td>
                  <td>{repayment.recorded_at?.split("T")[0]}</td>
                  <td>
                    {repayment.due_date
                      ? new Date(repayment.due_date).toLocaleDateString()
                      : "N/A"}
                  </td>
                  <td>{repayment.was_late ? "Yes" : "No"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: "center" }}>
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
