import React, { useRef, useState } from "react";
import usePaginatedData from "../../utils/usePaginatedData";
import "../../styles/admin/Members.css";
import axiosAdminInstance from "../../utils/axiosAdminInstance";
import ExportPrintGroup from "../../utils/ExportPrintGroup";
import Spinner from "../../components/Spinner";
import exportHelper from "../../utils/exportHelper";

const MembersList = () => {
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
  } = usePaginatedData("/admin/members/approved/", {
    full_name: "",
    email: "",
    member_id: "",
    membership_status: "",
    joined_on_after: "",
    joined_on_before: "",
  });

  const [editingMemberId, setEditingMemberId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    full_name: "",
    phone_number: "",
    address: "",
    membership_status: "active",
  });

  const printRef = useRef();

  const handleEditClick = (member) => {
    setEditingMemberId(member.id);
    setEditFormData({
      full_name: member.full_name || "",
      phone_number: member.phone_number || "",
      address: member.address || "",
      membership_status: member.membership_status || "active",
    });
  };

  const handleCancelEdit = () => {
    setEditingMemberId(null);
    setEditFormData({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async (memberId) => {
    try {
      await axiosAdminInstance.put(`/admin/members/${memberId}/update/`, editFormData);
      setEditingMemberId(null);
    } catch (err) {
      console.error("Update failed:", err);
    }
  };

  const transformExport = (m) => ({
    Name: m.full_name || "N/A",
    MemberID: m.member_id || "N/A",
    Email: m.email || "N/A",
    Phone: m.phone_number || "N/A",
    Status: m.membership_status?.toUpperCase() || "N/A",
    Joined: m.joined_on || "N/A",
  });

  const {
    exportToExcel,
    exportToCSV,
    exportToPDF,
  } = exportHelper({
    url: "/admin/members/approved/",
    filters,
    transformFn: transformExport,
    columns: ["Name", "MemberID", "Email", "Phone", "Status", "Joined"],
    fileName: "approved_members",
    reportTitle: "Approved Members",
  });

  const previewExportData = members.map(transformExport);

  return (
    <div className="members-list">
      <h2>Approved Members</h2>

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

        <input
          className="filter-input"
          placeholder="Member ID"
          value={filters.member_id || ""}
          onChange={(e) => setFilters((f) => ({ ...f, member_id: e.target.value }))}
        />

        <select
          className="filter-select"
          value={filters.membership_status || ""}
          onChange={(e) => setFilters((f) => ({ ...f, membership_status: e.target.value }))}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
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
        <table className="members-table approved">
          <thead>
            <tr>
              <th>Full Name</th>
              <th>Member ID</th>
              <th>Email</th>
              <th>Phone Number</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.length > 0 ? (
              members.map((member) => (
                <tr key={member.id}>
                  {editingMemberId === member.id ? (
                    <>
                      <td>
                        <input
                          name="full_name"
                          value={editFormData.full_name}
                          onChange={handleInputChange}
                        />
                      </td>
                      <td>{member.member_id}</td>
                      <td>{member.email}</td>
                      <td>
                        <input
                          name="phone_number"
                          value={editFormData.phone_number}
                          onChange={handleInputChange}
                        />
                      </td>
                      <td>
                        <select
                          name="membership_status"
                          value={editFormData.membership_status}
                          onChange={handleInputChange}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="archived">Archived</option>
                        </select>
                      </td>
                      <td>{member.joined_on}</td>
                      <td>
                        <button
                          className="save-button"
                          onClick={() => handleSaveEdit(member.id)}
                        >
                          Save
                        </button>
                        <button className="cancel-button" onClick={handleCancelEdit}>
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{member.full_name}</td>
                      <td>{member.member_id}</td>
                      <td>{member.email}</td>
                      <td>{member.phone_number}</td>
                      <td>
                        <span className={`status-badge ${member.membership_status}`}>
                          {member.membership_status?.toUpperCase()}
                        </span>
                      </td>
                      <td>{member.joined_on}</td>
                      <td>
                        <button className="edit-button" onClick={() => handleEditClick(member)}>
                          Edit
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: "center" }}>
                  No approved members found.
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

export default MembersList;
