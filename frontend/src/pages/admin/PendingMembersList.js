import React, { useRef } from "react";
import usePaginatedData from "../../utils/usePaginatedData";
import "../../styles/admin/Members.css";
import axiosAdminInstance from "../../utils/axiosAdminInstance";
import ExportPrintGroup from "../../utils/ExportPrintGroup";
import Spinner from "../../components/Spinner";
import exportHelper from "../../utils/exportHelper";

const PendingMemberList = () => {
  const {
    data: members,
    currentPage,
    pageSize,
    totalPages,
    loading,
    setCurrentPage,
    setPageSize,
    filters,
    setFilters,
  } = usePaginatedData("/admin/members/pending/", {
    full_name: "",
    email: "",
    has_paid_shares: "",
    has_paid_levy: "",
    joined_on_after: "",
    joined_on_before: "",
  });

  const printRef = useRef();

  const transformExport = (member) => ({
    Name: member.user?.username || "Unnamed",
    FullName: member.full_name || "N/A",
    Email: member.email || "N/A",
    SharesPaid: member.has_paid_shares ? "Yes" : "No",
    LevyPaid: member.has_paid_levy ? "Yes" : "No",
    JoinedOn: member.joined_on || "N/A",
  });

  const {
    exportToExcel,
    exportToCSV,
    exportToPDF,
  } = exportHelper({
    url: "/admin/members/pending/",
    filters,
    transformFn: transformExport,
    columns: ["Name", "FullName", "Email", "SharesPaid", "LevyPaid", "JoinedOn"],
    fileName: "pending_members",
    reportTitle: "Pending Member Applications",
  });

  const previewExportData = members.map(transformExport);

  const handleApprove = async (id) => {
    try {
      await axiosAdminInstance.patch(`/admin/members/${id}/approve/`, {
        status: "approved",
        membership_status: "active",
      });
      window.location.reload();
    } catch (error) {
      alert(error.response?.data?.detail || "Approval failed");
    }
  };

  return (
    <div className="pending-member-list">
      <h2>Pending Member Applications</h2>

      <div className="filter-section">
        <input
          className="filter-input"
          placeholder="Full Name"
          value={filters.full_name || ""}
          onChange={(e) => setFilters((f) => ({ ...f, full_name: e.target.value }))}
        />

        <input
          className="filter-input"
          placeholder="Email"
          value={filters.email || ""}
          onChange={(e) => setFilters((f) => ({ ...f, email: e.target.value }))}
        />

        <select
          className="filter-select"
          value={filters.has_paid_shares || ""}
          onChange={(e) => setFilters((f) => ({ ...f, has_paid_shares: e.target.value }))}
        >
          <option value="">Shares Paid?</option>
          <option value="true">✅</option>
          <option value="false">❌</option>
        </select>

        <select
          className="filter-select"
          value={filters.has_paid_levy || ""}
          onChange={(e) => setFilters((f) => ({ ...f, has_paid_levy: e.target.value }))}
        >
          <option value="">Levy Paid?</option>
          <option value="true">✅</option>
          <option value="false">❌</option>
        </select>

        <input
          type="date"
          className="filter-input"
          value={filters.joined_on_after || ""}
          onChange={(e) => setFilters((f) => ({ ...f, joined_on_after: e.target.value }))}
        />

        <input
          type="date"
          className="filter-input"
          value={filters.joined_on_before || ""}
          onChange={(e) => setFilters((f) => ({ ...f, joined_on_before: e.target.value }))}
        />

        <ExportPrintGroup
          data={previewExportData}
          exportToExcel={exportToExcel}
          exportToPDF={exportToPDF}
          exportToCSV={exportToCSV}
        />
      </div>

      {loading && <Spinner size={30} />}

      <div ref={printRef}>
        <table className="members-table pending">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Full Name</th>
              <th>Shares</th>
              <th>Levy</th>
              <th>Joined</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {members.length > 0 ? (
              members.map((member) => {
                const canApprove = member.has_paid_shares && member.has_paid_levy;
                return (
                  <tr key={member.id} >
                    <td>{member.user?.username}</td>
                    <td>{member.email}</td>
                    <td>{member.full_name}</td>
                    <td>{member.has_paid_shares ? "✅" : "❌"}</td>
                    <td>{member.has_paid_levy ? "✅" : "❌"}</td>
                    <td>{member.joined_on}</td>
                    <td>
                      <button
                        className="approve-button"
                        disabled={!canApprove}
                        onClick={() => handleApprove(member.id)}
                      >
                        Approve
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: "center" }}>
                  No pending members found.
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
        <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
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

export default PendingMemberList;
