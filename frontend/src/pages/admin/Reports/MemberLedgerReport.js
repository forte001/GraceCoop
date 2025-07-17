import React, { useEffect, useState, useRef } from "react";
import axios from "../../../utils/getAxiosByRole";
import ExportPrintGroup from "../../../utils/ExportPrintGroup";
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

  const transformExport = (row) => ({
    Month: row.month,
    Shares: row.shares === "-" ? "-" : `NGN ${Number(row.shares).toLocaleString()}`,
    Levy: row.levy === "-" ? "-" : `NGN ${Number(row.levy).toLocaleString()}`,
    LoanRepayment:
      row.loan_repayment === "-" ? "-" : `NGN ${Number(row.loan_repayment).toLocaleString()}`,
    Total: row.total === "-" ? "-" : `NGN ${Number(row.total).toLocaleString()}`,
  });

  // Custom export handler for member ledger
  const handleExport = async (format) => {
    if (!data.length || !memberInfo) {
      toast.warn("No data to export");
      return;
    }

    try {
      toast.loading(`Exporting as ${format.toUpperCase()}...`, { toastId: "export-toast" });

      const transformedData = data.map(transformExport);
      const reportTitle = `Member Ledger - ${memberInfo.full_name} (${memberInfo.member_id}) - ${filters.year}`;

      if (format === "excel") {
        const XLSX = await import("xlsx");
        const worksheet = XLSX.utils.json_to_sheet(transformedData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, worksheet, "MemberLedger");
        XLSX.writeFile(wb, `member_ledger_${memberInfo.member_id}.xlsx`);
      } else if (format === "csv") {
        const XLSX = await import("xlsx");
        const worksheet = XLSX.utils.json_to_sheet(transformedData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, worksheet, "MemberLedger");
        XLSX.writeFile(wb, `member_ledger_${memberInfo.member_id}.csv`, { bookType: "csv" });
      } else if (format === "pdf") {
        const { default: jsPDF } = await import("jspdf");
        const autoTable = (await import("jspdf-autotable")).default;
        const doc = new jsPDF();
        
        // Add member info header
        autoTable(doc, {
          startY: 80,
          head: [["Month", "Shares", "Levy", "Loan Repayment", "Total"]],
          body: transformedData.map((row) =>
            ["Month", "Shares", "Levy", "LoanRepayment", "Total"].map(
              (col) => row[col]
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
      }

      toast.update("export-toast", {
        render: `Exported as ${format.toUpperCase()}`,
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
    } catch (err) {
      toast.update("export-toast", {
        render: `Failed to export as ${format.toUpperCase()}`,
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
        <div style={{ position: "relative" }}>
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
            <div style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              backgroundColor: "white",
              border: "1px solid #ccc",
              borderRadius: "4px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              maxHeight: "200px",
              overflowY: "auto",
              zIndex: 1000
            }}>
              {searchSuggestions.map((suggestion) => (
                <div
                  key={suggestion.member_id}
                  onClick={() => handleSuggestionClick(suggestion)}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    borderBottom: "1px solid #eee"
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = "#f5f5f5"}
                  onMouseLeave={(e) => e.target.style.backgroundColor = "white"}
                >
                  <div style={{ fontWeight: "bold" }}>{suggestion.display_text}</div>
                  <div style={{ fontSize: "12px", color: "#666" }}>
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
            exportToExcel={() => handleExport("excel")}
            exportToCSV={() => handleExport("csv")}
            exportToPDF={() => handleExport("pdf")}
          />
        </div>
      </div>

      {loading && <Spinner />}

      {/* Member Information Section */}
      {memberInfo && (
        <div className="summary-section">
          <h3>Member Information</h3>
          <div className="summary-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px" }}>
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
              <div style={{ 
                color: memberInfo.membership_status === "active" ? "green" : "orange",
                fontWeight: "bold"
              }}>
                {memberInfo.membership_status?.toUpperCase()}
              </div>
            </div>
            <div>
              <strong>Grand Total ({filters.year}):</strong>
              <div style={{ 
                fontSize: "18px", 
                fontWeight: "bold",
                color: grandTotal >= 0 ? "green" : "red"
              }}>
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
                    <td style={{ 
                      color: row.loan_repayment !== "-" && Number(row.loan_repayment) < 0 ? "red" : "inherit"
                    }}>
                      {row.loan_repayment === "-" ? "-" : formatNaira(row.loan_repayment)}
                    </td>
                    <td style={{ 
                      fontWeight: "bold",
                      color: row.total !== "-" && Number(row.total) < 0 ? "red" : "inherit"
                    }}>
                      {row.total === "-" ? "-" : formatNaira(row.total)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center" }}>
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