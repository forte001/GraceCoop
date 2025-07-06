import React, { useRef } from 'react';
import usePaginatedData from '../../../utils/usePaginatedData';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExportPrintGroup from '../../../components/ExportPrintGroup';
import Spinner from '../../../components/Spinner';
import { toast } from 'react-toastify';
import '../../../styles/admin/loan/LoanManagement.css';
import { formatNaira } from '../../../utils/formatCurrency';
import getAllPaginatedDataForExport from '../../../utils/getAllPaginatedDataForExport';

const MembersBalancesReport = () => {
  const {
    data,
    fullData,
    currentPage,
    pageSize,
    totalPages,
    loading,
    setCurrentPage,
    setPageSize,
    filters,
    setFilters,
  } = usePaginatedData('/admin/report/reports/members-balances/', {
    as_of_date: '',
    member_status: '',
    approval_status: '',
    include_inactive: false,
    ordering: 'full_name',
  });

  const printRef = useRef();

  const transformExport = (member) => ({
    Name: member.full_name,
    Contributions: `NGN ${Number(member.contributions_balance).toLocaleString()}`,
    Levies: `NGN ${Number(member.levies_balance).toLocaleString()}`,
    TotalAssets: `NGN ${Number(member.total_assets).toLocaleString()}`,
    OutstandingLoans: `NGN ${Number(member.outstanding_loans).toLocaleString()}`,
    NetPosition: `NGN ${Number(member.net_position).toLocaleString()}`,
  });


  const members = Array.isArray(data) ? data : [];
  const summary = fullData?.summary || {};
  const previewExportData = members.map(transformExport);
  

  const exportToExcel = async () => {
    toast.info('Preparing Excel export...');
    const exportData = await getAllPaginatedDataForExport({
      url: '/admin/report/reports/members-balances/',
      filters,
      transformFn: transformExport,
    });
    if (!exportData.length) return toast.warn('No data to export.');
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, worksheet, 'MembersBalances');
    XLSX.writeFile(wb, 'members_balances.xlsx');
    toast.success('Excel export complete.');
  };

  const exportToCSV = async () => {
    toast.info('Preparing CSV export...');
    const exportData = await getAllPaginatedDataForExport({
      url: '/admin/report/reports/members-balances/',
      filters,
      transformFn: transformExport,
    });
    if (!exportData.length) return toast.warn('No data to export.');
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, worksheet, 'MembersBalances');
    XLSX.writeFile(wb, 'members_balances.csv', { bookType: 'csv' });
    toast.success('CSV export complete.');
  };

  const exportToPDF = async () => {
    toast.info('Preparing PDF export...');
    const exportData = await getAllPaginatedDataForExport({
      url: '/admin/report/reports/members-balances/',
      filters,
      transformFn: transformExport,
    });
    if (!exportData.length) return toast.warn('No data to export.');
    const doc = new jsPDF();
    doc.text("Members' Balances Report", 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [['Name', 'Contributions', 'Levies', 'Total Assets', 'Outstanding Loans', 'Net Position']],
      body: exportData.map((row) => Object.values(row)),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [63, 81, 181] },
    });
    doc.save('members_balances.pdf');
    toast.success('PDF export complete.');
  };

  return (
    <div className="loan-management">
      <h2>Members' Balances Report</h2>

      <div className="filter-section">
        <small className="form-hint">As of Date:</small>
        <input
          type="date"
          className="filter-input"
          value={filters.as_of_date || ''}
          onChange={(e) =>
            setFilters((f) => ({ ...f, as_of_date: e.target.value }))
          }
        />

        <select
          className="filter-select"
          value={filters.member_status}
          onChange={(e) =>
            setFilters((f) => ({ ...f, member_status: e.target.value }))
          }
        >
          <option value="">All Member Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
        </select>

        <select
          className="filter-select"
          value={filters.approval_status}
          onChange={(e) =>
            setFilters((f) => ({ ...f, approval_status: e.target.value }))
          }
        >
          <option value="">All Approval Status</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>

        <label>
          <input
            type="checkbox"
            checked={filters.include_inactive}
            onChange={(e) =>
              setFilters((f) => ({ ...f, include_inactive: e.target.checked }))
            }
          />{' '}
          Include Inactive
        </label>
        
        <div className="export-button-group">
        <ExportPrintGroup
          data={previewExportData}
          exportToExcel={exportToExcel}
          exportToCSV={exportToCSV}
          exportToPDF={exportToPDF}
        />
        </div>
      </div>

      {loading && <Spinner />}

      {summary && Object.keys(summary).length > 0 && (
        <div className="summary-section">
            <h2>Report Summary</h2>
            <div className="summary-grid">
            <div><strong>Total Members:</strong> </div>
            <div><strong>Total Contributions:</strong> </div>
            <div><strong>Total Levies:</strong> </div>
            <div><strong>Total Assets:</strong> </div>
            <div><strong>Total Outstanding Loans:</strong> </div>
            <div><strong>Net Position:</strong> </div>
                <div><strong> {summary.total_members}</strong> </div>
                <div><strong> {formatNaira(summary.total_contributions)}</strong> </div>
                <div><strong> {formatNaira(summary.total_levies)}</strong> </div>
                <div><strong> {formatNaira(summary.total_assets)}</strong> </div>
                <div><strong> {formatNaira(summary.total_outstanding_loans)}</strong> </div>
                <div><strong> {formatNaira(summary.net_cooperative_position)}</strong> </div>
            </div>
        </div>
        )}

      <div ref={printRef}>
        <table className="loan-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Contributions</th>
              <th>Levies</th>
              <th>Total Assets</th>
              <th>Outstanding Loans</th>
              <th>Net Position</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(members) && members.length > 0 ? (
                members.map((member) => (
                    <tr key={member.member_id}>
                    <td>{member.full_name}</td>
                    <td>{formatNaira(member.contributions_balance)}</td>
                    <td>{formatNaira(member.levies_balance)}</td>
                    <td>{formatNaira(member.total_assets)}</td>
                    <td>{formatNaira(member.outstanding_loans)}</td>
                    <td>{formatNaira(member.net_position)}</td>
                    </tr>
                ))
                ) : (
                <tr>
                    <td colSpan="6" style={{ textAlign: 'center' }}>
                    No members found.
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

export default MembersBalancesReport;