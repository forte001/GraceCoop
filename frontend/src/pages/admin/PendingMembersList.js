import React, { useRef } from 'react';
import usePaginatedData from '../../utils/usePaginatedData';
import '../../styles/admin/Members.css';
import axiosAdminInstance from '../../utils/axiosAdminInstance';
import ExportPrintGroup from '../../components/ExportPrintGroup';

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
  } = usePaginatedData('/admin/members/pending/', {
    full_name: '',
    email: '',
    has_paid_shares: '',
    has_paid_levy: '',
    joined_on_after: '',
    joined_on_before: '',
  });

  const printRef = useRef();

  const exportData = members.map((member) => ({
    Name: member.user?.username || 'Unnamed',
    FullName: member.full_name,
    Email: member.email,
    SharesPaid: member.has_paid_shares ? 'Yes' : 'No',
    LevyPaid: member.has_paid_levy ? 'Yes' : 'No',
    JoinedOn: member.joined_on,
  }));

  const handleApprove = async (id) => {
    try {
      await axiosAdminInstance.patch(`/admin/members/${id}/approve/`, {
        status: 'approved',
        membership_status: 'active',
      });
      window.location.reload(); // optional: refetch or reload instead of direct filter update
    } catch (error) {
      alert(error.response?.data?.detail || 'Approval failed');
    }
  };

  const exportToExcel = () => {
    const XLSX = require('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'PendingMembers');
    XLSX.writeFile(workbook, 'pending_members.xlsx');
  };

  const exportToCSV = () => {
    const XLSX = require('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'PendingMembers');
    XLSX.writeFile(workbook, 'pending_members.csv', { bookType: 'csv' });
  };

  const exportToPDF = () => {
    const jsPDF = require('jspdf');
    const autoTable = require('jspdf-autotable');
    const doc = new jsPDF();
    doc.text('Pending Member Applications', 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [['Name', 'Full Name', 'Email', 'Shares Paid', 'Levy Paid', 'Joined On']],
      body: exportData.map((row) => Object.values(row)),
    });
    doc.save('pending_members.pdf');
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const original = document.body.innerHTML;
    document.body.innerHTML = content;
    window.print();
    document.body.innerHTML = original;
    window.location.reload();
  };

  return (
    <div className="pending-member-list">
      <h2>Pending Member Applications</h2>

      <div className="filter-section">
        <input
          className="filter-input"
          placeholder="Full Name"
          value={filters.full_name || ''}
          onChange={(e) => setFilters(f => ({ ...f, full_name: e.target.value }))}
        />

        <input
          className="filter-input"
          placeholder="Email"
          value={filters.email || ''}
          onChange={(e) => setFilters(f => ({ ...f, email: e.target.value }))}
        />

        <select
          className="filter-select"
          value={filters.has_paid_shares || ''}
          onChange={(e) => setFilters(f => ({ ...f, has_paid_shares: e.target.value }))}
        >
          <option value="">Shares Paid?</option>
          <option value="true">✅</option>
          <option value="false">❌</option>
        </select>

        <select
          className="filter-select"
          value={filters.has_paid_levy || ''}
          onChange={(e) => setFilters(f => ({ ...f, has_paid_levy: e.target.value }))}
        >
          <option value="">Levy Paid?</option>
          <option value="true">✅</option>
          <option value="false">❌</option>
        </select>

        <input
          type="date"
          className="filter-input"
          value={filters.joined_on_after || ''}
          onChange={(e) => setFilters(f => ({ ...f, joined_on_after: e.target.value }))}
        />

        <input
          type="date"
          className="filter-input"
          value={filters.joined_on_before || ''}
          onChange={(e) => setFilters(f => ({ ...f, joined_on_before: e.target.value }))}
        />

        <ExportPrintGroup
          data={exportData}
          exportToExcel={exportToExcel}
          exportToPDF={exportToPDF}
          exportToCSV={exportToCSV}
          handlePrint={handlePrint}
        />
      </div>

      {loading ? <p>Loading...</p> : null}

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
                  <tr key={member.id} style={{ opacity: canApprove ? 1 : 0.5 }}>
                    <td>{member.user?.username}</td>
                    <td>{member.email}</td>
                    <td>{member.full_name}</td>
                    <td>{member.has_paid_shares ? '✅' : '❌'}</td>
                    <td>{member.has_paid_levy ? '✅' : '❌'}</td>
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
                <td colSpan="7" style={{ textAlign: 'center' }}>No pending members found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination-controls">
        <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>
          Prev
        </button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>
          Next
        </button>
        <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
          {[10, 20, 50].map((size) => (
            <option key={size} value={size}>{size} / page</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default PendingMemberList;
