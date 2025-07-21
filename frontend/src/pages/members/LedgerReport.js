import React, { useEffect, useState, useRef } from "react";
import axios from "../../utils/getAxiosByRole";
import ExportPrintGroup from "../../utils/ExportPrintGroup";
import exportHelper from "../../utils/exportHelper";
import Spinner from "../../components/Spinner";
import { toast } from "react-toastify";
import { formatNaira } from "../../utils/formatCurrency";
import "../../styles/admin/loan/LoanManagement.css";

const LedgerReport = () => {
  const currentYear = new Date().getFullYear();
  const [filters, setFilters] = useState({ year: currentYear });
  const [data, setData] = useState([]);
  const [memberInfo, setMemberInfo] = useState({ full_name: "", member_id: "" });
  const [totals, setTotals] = useState({
    member_balance: 0,
    total_loan_repayments: 0,
    total_levy_paid: 0,
    total_shares: 0
  });
  const [loading, setLoading] = useState(false);
  const printRef = useRef();

  useEffect(() => {
    const fetchLedger = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams(filters).toString();
        const res = await axios().get(`/members/profiles/my-ledger/?${params}`);
        const { 
          monthly_breakdown, 
          member_balance,
          total_loan_repayments,
          outstanding_loan_balance,
          total_levy_paid,
          total_shares,
          full_name, 
          member_id 
        } = res.data;

        const arr = Object.entries(monthly_breakdown).map(([month, values]) => ({
          month,
          ...values,
        }));

        setData(arr);
        setTotals({
          member_balance: member_balance || 0,
          total_loan_repayments: total_loan_repayments || 0,
          outstanding_loan_balance: outstanding_loan_balance || 0,
          total_levy_paid: total_levy_paid || 0,
          total_shares: total_shares || 0
        });
        setMemberInfo({ full_name, member_id });
      } catch (err) {
        console.error(err);
        toast.error("Failed to load member ledger report");
      } finally {
        setLoading(false);
      }
    };

    fetchLedger();
  }, [filters]);

  // Transform function for export
  const transformExport = (row) => ({
    Month: row.month,
    Shares: row.shares === "-" ? "-" : `NGN ${Number(row.shares).toLocaleString()}`,
    Levy: row.levy === "-" ? "-" : `NGN ${Number(row.levy).toLocaleString()}`,
    "Loan Repayment": row.loan_repayment === "-" ? "-" : `NGN ${Number(row.loan_repayment).toLocaleString()}`,
    Total: row.total === "-" ? "-" : `NGN ${Number(row.total).toLocaleString()}`,
  });

  // Custom export handlers using exportHelper
  const handleExcelExport = async () => {
    if (!data.length) {
      toast.warn("No data to export");
      return;
    }

    toast.loading("Exporting as EXCEL...", { toastId: "export-toast" });

    try {
      const XLSX = await import("xlsx");
      const transformedData = data.map(transformExport);
      
      // Add summary data at the end
      transformedData.push(
        { Month: "", Shares: "", Levy: "", "Loan Repayment": "", Total: "" }, // Empty row
        { Month: "SUMMARY", Shares: "", Levy: "", "Loan Repayment": "", Total: "" },
        { Month: "Total Shares", Shares: `NGN ${Number(totals.total_shares).toLocaleString()}`, Levy: "", "Loan Repayment": "", Total: "" },
        { Month: "Total Levy Paid", Shares: "", Levy: `NGN ${Number(totals.total_levy_paid).toLocaleString()}`, "Loan Repayment": "", Total: "" },
        { Month: "Total Loan Repayments", Shares: "", Levy: "", "Loan Repayment": `NGN ${Number(totals.total_loan_repayments).toLocaleString()}`, Total: "" },
        { Month: "Outstanding Loan Balance", Shares: "", Levy: "", "Outstanding Loan Balance": `NGN ${Number(totals.outstanding_loan_balance).toLocaleString()}`, Total: "" },
        { Month: "Member Balance", Shares: "", Levy: "", "Loan Repayment": "", Total: `NGN ${Number(totals.member_balance).toLocaleString()}` }
      );
      
      const worksheet = XLSX.utils.json_to_sheet(transformedData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, worksheet, "MemberLedger");
      XLSX.writeFile(wb, `${memberInfo.full_name}_ledger_${filters.year}.xlsx`);

      toast.update("export-toast", {
        render: "EXCEL export complete.",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
    } catch (err) {
      console.error(err);
      toast.update("export-toast", {
        render: "Failed to export as EXCEL",
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    }
  };

  const handleCSVExport = async () => {
    if (!data.length) {
      toast.warn("No data to export");
      return;
    }

    toast.loading("Exporting as CSV...", { toastId: "export-toast" });

    try {
      const XLSX = await import("xlsx");
      const transformedData = data.map(transformExport);
      
      // Add summary data at the end
      transformedData.push(
        { Month: "", Shares: "", Levy: "", "Loan Repayment": "", Total: "" }, // Empty row
        { Month: "SUMMARY", Shares: "", Levy: "", "Loan Repayment": "", Total: "" },
        { Month: "Total Shares", Shares: `NGN ${Number(totals.total_shares).toLocaleString()}`, Levy: "", "Loan Repayment": "", Total: "" },
        { Month: "Total Levy Paid", Shares: "", Levy: `NGN ${Number(totals.total_levy_paid).toLocaleString()}`, "Loan Repayment": "", Total: "" },
        { Month: "Total Loan Repayments", Shares: "", Levy: "", "Loan Repayment": `NGN ${Number(totals.total_loan_repayments).toLocaleString()}`, Total: "" },
        { Month: "Outstanding Loan Balance", Shares: "", Levy: "", "Outstanding Loan Balance": `NGN ${Number(totals.outstanding_loan_balance).toLocaleString()}`, Total: "" },
        { Month: "Member Balance", Shares: "", Levy: "", "Loan Repayment": "", Total: `NGN ${Number(totals.member_balance).toLocaleString()}` }
      );
      
      const worksheet = XLSX.utils.json_to_sheet(transformedData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, worksheet, "MemberLedger");
      XLSX.writeFile(wb, `${memberInfo.full_name}_ledger_${filters.year}.csv`, { bookType: "csv" });

      toast.update("export-toast", {
        render: "CSV export complete.",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
    } catch (err) {
      console.error(err);
      toast.update("export-toast", {
        render: "Failed to export as CSV",
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    }
  };

  const handlePDFExport = async () => {
    if (!data.length) {
      toast.warn("No data to export");
      return;
    }

    toast.loading("Exporting as PDF...", { toastId: "export-toast" });

    try {
      const { default: jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF();
      
      const transformedData = data.map(transformExport);
      
      autoTable(doc, {
        startY: 60,
        head: [["Month", "Shares", "Levy", "Loan Repayment", "Total"]],
        body: transformedData.map((row) =>
          ["Month", "Shares", "Levy", "Loan Repayment", "Total"].map((col) => row[col] ?? "")
        ),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [63, 81, 181] },
        didDrawPage: (data) => {
          // header on first page only
          if (doc.internal.getNumberOfPages() === 1) {
            const logoPath = "/logo.png";
            doc.addImage(logoPath, "PNG", 95, 10, 20, 20);
            doc.setFontSize(14);
            doc.text("GraceCoop", doc.internal.pageSize.width / 2, 40, {
              align: "center",
            });
            doc.setFontSize(12);
            doc.text(
              `${memberInfo.full_name} Ledger Report - ${filters.year}`,
              doc.internal.pageSize.width / 2,
              50,
              { align: "center" }
            );
          }
          
          // watermark on every page
          doc.setTextColor(180);
          doc.setFontSize(25);
          doc.text(
            "GraceCoop",
            doc.internal.pageSize.width / 2,
            doc.internal.pageSize.height / 2,
            { angle: 45, align: "center", opacity: 0.02 }
          );

          // footer on every page
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

      // Add summary section to PDF
      const finalY = doc.lastAutoTable.finalY || 60;
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text("Summary", 14, finalY + 20);
      
      const summaryData = [
        ["Total Shares", `NGN ${Number(totals.total_shares).toLocaleString()}`],
        ["Total Levy Paid", `NGN ${Number(totals.total_levy_paid).toLocaleString()}`],
        ["Total Loan Repayments", `NGN ${Number(totals.total_loan_repayments).toLocaleString()}`],
        ["Outstanding Loan Balance", `NGN ${Number(totals.outstanding_loan_balance).toLocaleString()}`],
        ["Member Balance", `NGN ${Number(totals.member_balance).toLocaleString()}`]
      ];

      autoTable(doc, {
        startY: finalY + 25,
        head: [["Description", "Amount"]],
        body: summaryData,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [63, 81, 181] },
      });

      doc.save(`${memberInfo.full_name}_ledger_${filters.year}.pdf`);

      toast.update("export-toast", {
        render: "PDF export complete.",
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
      <h2>{memberInfo.full_name} Ledger Report - {filters.year}</h2>

      <div className="filter-section">
        <small className="form-hint">Year:</small>
        <input
          type="number"
          className="filter-input"
          value={filters.year}
          onChange={(e) => setFilters((f) => ({ ...f, year: e.target.value }))}
        />
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

      <div className="summary-section">
        <h2>Financial Summary for {filters.year}</h2>
        <div className="summary-grid">
          <div>
            <strong>Total Shares</strong>
            <div className="summary-amount positive">
              {formatNaira(totals.total_shares)}
            </div>
          </div>
          <div>
            <strong>Total Levy Paid</strong>
            <div className="summary-amount">
              {formatNaira(totals.total_levy_paid)}
            </div>
          </div>
          <div>
            <strong>Total Loan Repayments</strong>
            <div className="summary-amount">
              {formatNaira(totals.total_loan_repayments)}
            </div>
          </div>
          <div>
            <strong>Outstanding Loan Balance</strong>
            <div className="summary-amount">
              {formatNaira(totals.outstanding_loan_balance)}
            </div>
          </div>
          <div>
            <strong>Member Balance</strong>
            <div className={`summary-amount ${totals.member_balance >= 0 ? "positive" : "negative"}`}>
              {formatNaira(totals.member_balance)}
            </div>
          </div>
        </div>
      </div>

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
                  <td>{row.shares === "-" ? "-" : formatNaira(row.shares)}</td>
                  <td>{row.levy === "-" ? "-" : formatNaira(row.levy)}</td>
                  <td className={row.loan_repayment !== "-" && Number(row.loan_repayment) < 0 ? "negative-amount" : ""}>
                    {row.loan_repayment === "-" ? "-" : formatNaira(row.loan_repayment)}
                  </td>
                  <td className={`total-cell ${row.total !== "-" && Number(row.total) < 0 ? "negative" : ""}`}>
                    {row.total === "-" ? "-" : formatNaira(row.total)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="no-data-message">
                  No data found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LedgerReport;