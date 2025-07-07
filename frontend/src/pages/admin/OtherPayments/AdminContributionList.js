import React, { useRef } from "react";
import "../../../styles/admin/loan/LoanManagement.css";
import { formatNaira } from "../../../utils/formatCurrency";
import ExportPrintGroup from "../../../utils/ExportPrintGroup";
import usePaginatedData from "../../../utils/usePaginatedData";
import { toast } from "react-toastify";
import Spinner from "../../../components/Spinner";
import exportHelper from "../../../utils/exportHelper";

const AdminContributionList = () => {
  const printRef = useRef();

  const {
    data: contributions,
    loading,
    error,
    currentPage,
    totalPages,
    goToPage,
    filters,
    setFilters,
  } = usePaginatedData("/admin/contribution/contributions-admin/");

  const transformExportContribution = (item) => ({
    PaidBy: item.member_name || "N/A",
    Amount: `NGN ${Number(item.amount).toLocaleString()}`,
    PaymentDate: item.date?.split("T")[0] || "N/A",
  });

  const {
    exportToExcel,
    exportToCSV,
    exportToPDF,
  } = exportHelper({
    url: "/admin/contribution/contributions-admin/",
    filters,
    transformFn: transformExportContribution,
    columns: ["PaidBy", "Amount", "PaymentDate"],
    fileName: "contributions",
    reportTitle: "Contributions List",
  });

  const previewExportData = (contributions || []).map(transformExportContribution);

  return (
    <div className="loan-management">
      <h2>All Contributions</h2>

      <div className="filter-group">
        <input
          className="filter-input"
          placeholder="Member name"
          value={filters.member_name || ""}
          onChange={(e) => setFilters((f) => ({ ...f, member_name: e.target.value }))}
        />
        <small className="form-hint">Start Date:</small>
        <input
          type="date"
          className="filter-input"
          value={filters.payment_date_after || ""}
          onChange={(e) => setFilters((f) => ({ ...f, payment_date_after: e.target.value }))}
        />
        <small className="form-hint">End Date:</small>
        <input
          type="date"
          className="filter-input"
          value={filters.payment_date_before || ""}
          onChange={(e) => setFilters((f) => ({ ...f, payment_date_before: e.target.value }))}
        />

        <ExportPrintGroup
          data={previewExportData}
          exportToExcel={exportToExcel}
          exportToPDF={exportToPDF}
          exportToCSV={exportToCSV}
        />
      </div>

      {loading && <Spinner />}
      {error && <p style={{ color: "red" }}>Error loading contributions.</p>}

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
            {contributions?.length > 0 ? (
              contributions.map((item) => (
                <tr key={item.id}>
                  <td>{item.member_name || "N/A"}</td>
                  <td>{formatNaira(item.amount)}</td>
                  <td>{item.date?.split("T")[0] || "N/A"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" style={{ textAlign: "center" }}>
                  No contribution records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
          Previous
        </button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
          Next
        </button>
      </div>
    </div>
  );
};

export default AdminContributionList;
