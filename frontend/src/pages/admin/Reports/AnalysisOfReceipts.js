import React, { useEffect, useState, useRef } from "react";
import axios from "../../../utils/getAxiosByRole";
import ExportPrintGroup from "../../../utils/ExportPrintGroup";
import exportHelper from "../../../utils/exportHelper";
import Spinner from "../../../components/Spinner";
import { toast } from "react-toastify";
import "../../../styles/admin/loan/LoanManagement.css";
import { formatNaira } from "../../../utils/formatCurrency";

const MonthlyReceiptsReport = () => {
  const currentYear = new Date().getFullYear();
  const [filters, setFilters] = useState({
    year: currentYear,
  });
  const [data, setData] = useState([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const printRef = useRef();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams(filters).toString();
        const res = await axios().get(
          `/admin/report/reports/monthly-receipts-analysis/?${params}`
        );
        const { monthly_breakdown, grand_total } = res.data;

        const arr = Object.entries(monthly_breakdown).map(([month, values]) => ({
          month,
          ...values,
        }));

        setData(arr);
        setGrandTotal(grand_total);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load monthly receipts report");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters]);

  const transformExport = (row) => ({
    Month: row.month,
    Shares: row.shares === "-" ? "-" : `NGN ${Number(row.shares).toLocaleString()}`,
    Levy: row.shares === "-" ? "-" : `NGN ${Number(row.levy).toLocaleString()}`,
    LoanRepayment:
      row.shares === "-" ? "-" : `NGN ${Number(row.loan_repayment).toLocaleString()}`,
    Total: row.shares === "-" ? "-" : `NGN ${Number(row.total).toLocaleString()}`,
  });

  // use exportHelper
  const { exportToExcel, exportToCSV, exportToPDF } = exportHelper({
    url: null, // no paginated URL, we use static data
    filters: {},
    transformFn: transformExport,
    columns: ["Month", "Shares", "Levy", "LoanRepayment", "Total"],
    fileName: "monthly_receipts",
    reportTitle: `Monthly Receipts Analysis - ${filters.year}`,
  });

  // override exportHelper's data by supplying current data directly:
  const handleExport = async (format) => {
    if (!data.length) {
      toast.warn("No data to export");
      return;
    }

    // adapt the same exportHelper logic but feeding current in-memory data
    try {
      toast.loading(`Exporting as ${format.toUpperCase()}...`, { toastId: "export-toast" });

      const transformedData = data.map(transformExport);

      if (format === "excel") {
        const XLSX = await import("xlsx");
        const worksheet = XLSX.utils.json_to_sheet(transformedData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, worksheet, "MonthlyReceipts");
        XLSX.writeFile(wb, `monthly_receipts.xlsx`);
      } else if (format === "csv") {
        const XLSX = await import("xlsx");
        const worksheet = XLSX.utils.json_to_sheet(transformedData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, worksheet, "MonthlyReceipts");
        XLSX.writeFile(wb, `monthly_receipts.csv`, { bookType: "csv" });
      } else if (format === "pdf") {
        const { default: jsPDF } = await import("jspdf");
        const autoTable = (await import("jspdf-autotable")).default;
        const doc = new jsPDF();
        autoTable(doc, {
          startY: 60,
          head: [["Month", "Shares", "Levy", "LoanRepayment", "Total"]],
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
                `Monthly Receipts Analysis - ${filters.year}`,
                doc.internal.pageSize.width / 2,
                50,
                { align: "center" }
              );
            }
            // watermark
            doc.setTextColor(180);
            doc.setFontSize(25);
            doc.text(
              "GraceCoop",
              doc.internal.pageSize.width / 2,
              doc.internal.pageSize.height / 2,
              { angle: 45, align: "center", opacity: 0.02 }
            );
            // footer
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
        doc.save("monthly_receipts.pdf");
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
      <h2>Monthly Receipt Analysis</h2>

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
            exportToExcel={() => handleExport("excel")}
            exportToCSV={() => handleExport("csv")}
            exportToPDF={() => handleExport("pdf")}
          />
        </div>
      </div>

      {loading && <Spinner />}

      <div className="summary-section">
        <h2>Grand Total</h2>
        <div className="summary-grid">
          <div>
            <strong>Total for {filters.year}</strong>
            <div>{formatNaira(grandTotal)}</div>
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
                  <td>
                    {row.shares === "-" ? "-" : formatNaira(row.shares)}
                  </td>
                  <td>
                    {row.shares === "-" ? "-" : formatNaira(row.levy)}
                  </td>
                  <td>
                    {row.shares === "-" ? "-" : formatNaira(row.loan_repayment)}
                  </td>
                  <td>
                    {row.shares === "-" ? "-" : formatNaira(row.total)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ textAlign: "center" }}>
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

export default MonthlyReceiptsReport;