import React, { useEffect, useState, useRef } from "react";
import axios from "../../../utils/getAxiosByRole";
import ExportPrintGroup from "../../../utils/ExportPrintGroup";
import exportHelper from "../../../utils/exportHelper";
import Spinner from "../../../components/Spinner";
import { toast } from "react-toastify";
import "../../../styles/admin/loan/LoanManagement.css";
import { formatNaira } from "../../../utils/formatCurrency";

const MemberLedgerReport = () => {
  const currentYear = new Date().getFullYear();
  const [filters, setFilters] = useState({
    search: "",
    year: currentYear,
  });
  const [data, setData] = useState([]);
  const [memberInfo, setMemberInfo] = useState(null);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const printRef = useRef();

  // Fetch member suggestions for autocomplete
  const fetchMemberSuggestions = async (searchTerm) => {
    if (searchTerm.length < 2) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const res = await axios().get(
        `/admin/report/reports/search-members/?q=${encodeURIComponent(searchTerm)}`
      );
      setSearchSuggestions(res.data.results);
      setShowSuggestions(true);
    } catch (err) {
      console.error("Failed to fetch member suggestions:", err);
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Debounced search suggestions
  useEffect(() => {
    const timer = setTimeout(() => {
      if (filters.search.trim()) {
        fetchMemberSuggestions(filters.search.trim());
      } else {
        setSearchSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [filters.search]);

  const fetchMemberLedger = async () => {
    if (!filters.search.trim()) {
      toast.warn("Please enter a member name or ID");
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: filters.search,
        year: filters.year,
      }).toString();

      const res = await axios().get(
        `/admin/report/reports/member-ledger/?${params}`
      );

      const { monthly_breakdown, grand_total, ...memberData } = res.data;

      // Transform monthly breakdown into array format
      const arr = Object.entries(monthly_breakdown).map(([month, values]) => ({
        month,
        ...values,
      }));

      setData(arr);
      setMemberInfo(memberData);
      setGrandTotal(grand_total);
      setShowSuggestions(false);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 404) {
        toast.error(`No member found matching '${filters.search}'`);
      } else {
        toast.error("Failed to load member ledger");
      }
      setData([]);
      setMemberInfo(null);
      setGrandTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setFilters((f) => ({ ...f, search: suggestion.display_text }));
    setShowSuggestions(false);
    // Auto-fetch when suggestion is selected
    setTimeout(() => fetchMemberLedger(), 100);
  };

  // Transform function for export
  const transformExport = (row) => ({
    Month: row.month,
    Shares: row.shares === "-" ? "-" : `NGN ${Number(row.shares).toLocaleString()}`,
    Levy: row.levy === "-" ? "-" : `NGN ${Number(row.levy).toLocaleString()}`,
    "Loan Repayment":
      row.loan_repayment === "-" ? "-" : `NGN ${Number(row.loan_repayment).toLocaleString()}`,
    Total: row.total === "-" ? "-" : `NGN ${Number(row.total).toLocaleString()}`,
  });

  // Custom data fetcher for export (since we already have the data)
  const getExportData = async () => {
    if (!data.length || !memberInfo) {
      return [];
    }
    return data.map(transformExport);
  };

  // Initialize export helper
  const { exportToExcel, exportToCSV, exportToPDF } = exportHelper({
    url: null, // We'll override with custom data fetcher
    filters: {},
    transformFn: transformExport,
    columns: ["Month", "Shares", "Levy", "Loan Repayment", "Total"],
    fileName: memberInfo ? `member_ledger_${memberInfo.member_id}` : "member_ledger",
    reportTitle: memberInfo 
      ? `Member Ledger - ${memberInfo.full_name} (${memberInfo.member_id}) - ${filters.year}`
      : "Member Ledger Report",
  });

  // Custom export handlers that use the export helper
  const handleExcelExport = async () => {
    if (!data.length || !memberInfo) {
      toast.warn("No data to export");
      return;
    }
    
    // Create a custom export helper instance with current data
    const exporter = exportHelper({
      url: null,
      filters: {},
      transformFn: (row) => row, // Data is already transformed
      columns: ["Month", "Shares", "Levy", "Loan Repayment", "Total"],
      fileName: `member_ledger_${memberInfo.member_id}`,
      reportTitle: `Member Ledger - ${memberInfo.full_name} (${memberInfo.member_id}) - ${filters.year}`,
    });

    // Override the data fetching with our local data
    const originalGetAllData = exporter.getAllPaginatedDataForExport;
    exporter.getAllPaginatedDataForExport = async () => data.map(transformExport);
    
    await exporter.exportToExcel();
  };

  const handleCSVExport = async () => {
    if (!data.length || !memberInfo) {
      toast.warn("No data to export");
      return;
    }
    
    const exporter = exportHelper({
      url: null,
      filters: {},
      transformFn: (row) => row,
      columns: ["Month", "Shares", "Levy", "Loan Repayment", "Total"],
      fileName: `member_ledger_${memberInfo.member_id}`,
      reportTitle: `Member Ledger - ${memberInfo.full_name} (${memberInfo.member_id}) - ${filters.year}`,
    });

    exporter.getAllPaginatedDataForExport = async () => data.map(transformExport);
    await exporter.exportToCSV();
  };

  const handlePDFExport = async () => {
    if (!data.length || !memberInfo) {
      toast.warn("No data to export");
      return;
    }

    toast.loading("Exporting as PDF...", { toastId: "export-toast" });

    try {
      const { default: jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF();
      
      const transformedData = data.map(transformExport);
      const reportTitle = `Member Ledger - ${memberInfo.full_name} (${memberInfo.member_id}) - ${filters.year}`;
      
      autoTable(doc, {
        startY: 80,
        head: [["Month", "Shares", "Levy", "Loan Repayment", "Total"]],
        body: transformedData.map((row) =>
          ["Month", "Shares", "Levy", "Loan Repayment", "Total"].map(
            (col) => row[col] ?? ""
          )
        ),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [63, 81, 181] },
        didDrawPage: (data) => {
          if (doc.internal.getNumberOfPages() === 1) {
            const logoPath = "/logo.png";
            doc.addImage(logoPath, "PNG", 95, 10, 20, 20);
            doc.setFontSize(14);
            doc.text(
              "GraceCoop",
              doc.internal.pageSize.width / 2,
              40,
              { align: "center" }
            );
            doc.setFontSize(12);
            doc.text(
              reportTitle,
              doc.internal.pageSize.width / 2,
              50,
              { align: "center" }
            );
            
            // Member details
            doc.setFontSize(10);
            doc.text(`Email: ${memberInfo.email}`, 20, 65);
            doc.text(`Phone: ${memberInfo.phone_number}`, 20, 72);
            doc.text(`Status: ${memberInfo.membership_status}`, 120, 65);
            doc.text(`Grand Total: NGN ${Number(grandTotal).toLocaleString()}`, 120, 72);
          }
          
          // Watermark
          doc.setTextColor(180);
          doc.setFontSize(25);
          doc.text(
            "GraceCoop",
            doc.internal.pageSize.width / 2,
            doc.internal.pageSize.height / 2,
            { angle: 45, align: "center", opacity: 0.02 }
          );
          
          // Footer
          const dateStr = `Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
          doc.setFontSize(8);
          doc.setTextColor(100);
          doc.text(
            dateStr,
            doc.internal.pageSize.width - 10,
            doc.internal.pageSize.height - 5,
            { align: "right" }
          );
        },
      });
      
      doc.save(`member_ledger_${memberInfo.member_id}.pdf`);

      toast.update("export-toast", {
        render: "Exported as PDF",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
    } catch (err) {
      console.error(err);
      toast.update("export-toast", {
        render: "Failed to export as PDF",
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    }
  };

  return (
    <div className="loan-management">
      <h2>Member Ledger Report</h2>

      <div className="filter-section">
        <div className="search-container">
          <small className="form-hint">Member Name or ID:</small>
          <input
            type="text"
            className="filter-input"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Enter member name or ID..."
            autoComplete="off"
          />
          
          {/* Search Suggestions Dropdown */}
          {showSuggestions && searchSuggestions.length > 0 && (
            <div className="suggestions-dropdown">
              {searchSuggestions.map((suggestion) => (
                <div
                  key={suggestion.member_id}
                  className="suggestion-item"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <div className="suggestion-name">{suggestion.display_text}</div>
                  <div className="suggestion-details">
                    {suggestion.email} • {suggestion.membership_status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <small className="form-hint">Year:</small>
        <input
          type="number"
          className="filter-input"
          value={filters.year}
          onChange={(e) => setFilters((f) => ({ ...f, year: e.target.value }))}
        />

        <button 
          type="button" 
          className="filter-button" 
          onClick={fetchMemberLedger}
          disabled={loading}
        >
          {loading ? "Searching..." : "Search"}
        </button>
        
        <div className="export-button-group">
          <ExportPrintGroup
            data={data.map(transformExport)}
            exportToExcel={handleExcelExport}
            exportToCSV={handleCSVExport}
            exportToPDF={handlePDFExport}
          />
        </div>
      </div>

      {loading && <Spinner />}

      {/* Member Information Section */}
      {memberInfo && (
        <div className="summary-section">
          <h3>Member Information</h3>
          <div className="member-info-grid">
            <div>
              <strong>Member ID:</strong>
              <div>{memberInfo.member_id}</div>
            </div>
            <div>
              <strong>Full Name:</strong>
              <div>{memberInfo.full_name}</div>
            </div>
            <div>
              <strong>Email:</strong>
              <div>{memberInfo.email}</div>
            </div>
            <div>
              <strong>Phone:</strong>
              <div>{memberInfo.phone_number}</div>
            </div>
            <div>
              <strong>Status:</strong>
              <div className={`status-badge ${memberInfo.membership_status === "active" ? "active" : "inactive"}`}>
                {memberInfo.membership_status?.toUpperCase()}
              </div>
            </div>
            <div>
              <strong>Grand Total ({filters.year}):</strong>
              <div className={`grand-total ${grandTotal >= 0 ? "positive" : "negative"}`}>
                {formatNaira(grandTotal)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ledger Table */}
      {memberInfo && (
        <div ref={printRef}>
          <table className="loan-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Shares</th>
                <th>Levy</th>
                <th>Loan Repayment</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? (
                data.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.month}</td>
                    <td>
                      {row.shares === "-" ? "-" : formatNaira(row.shares)}
                    </td>
                    <td>
                      {row.levy === "-" ? "-" : formatNaira(row.levy)}
                    </td>
                    <td className={row.loan_repayment !== "-" && Number(row.loan_repayment) < 0 ? "negative-amount" : ""}>
                      {row.loan_repayment === "-" ? "-" : formatNaira(row.loan_repayment)}
                    </td>
                    <td className={`total-amount ${row.total !== "-" && Number(row.total) < 0 ? "negative" : ""}`}>
                      {row.total === "-" ? "-" : formatNaira(row.total)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="no-data">
                    {memberInfo ? "No transactions found for this period." : "Use the search above to find a member's ledger."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MemberLedgerReport;