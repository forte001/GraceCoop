import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "react-toastify";
import getAllPaginatedDataForExport from "./getAllPaginatedDataForExport";

/**
 * A reusable export helper that fetches all paginated data before exporting.
 *
 * @param {Object} options
 * @param {String} options.url - API endpoint to pull all data
 * @param {Object} options.filters - query filters
 * @param {Function} options.transformFn - transformation function for each row
 * @param {Array} options.columns - PDF/CSV/Excel header columns
 * @param {String} options.fileName - base file name (without extension)
 * @param {String} options.reportTitle - title of the report
 */
export default function exportHelper({
  url,
  filters,
  transformFn,
  columns,
  fileName,
  reportTitle,
}) {
  const doExport = async (format) => {
    toast.loading(`Preparing ${format.toUpperCase()} export...`, {
      toastId: "export-toast",
    });

    const fullData = await getAllPaginatedDataForExport({
      url,
      filters,
      transformFn,
    });

    if (!fullData.length) {
      toast.update("export-toast", {
        render: "No data to export.",
        type: "warning",
        isLoading: false,
        autoClose: 3000,
      });
      return;
    }

    try {
      if (format === "excel") {
        const worksheet = XLSX.utils.json_to_sheet(fullData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, worksheet, reportTitle);
        XLSX.writeFile(wb, `${fileName}.xlsx`);
      } else if (format === "csv") {
        const worksheet = XLSX.utils.json_to_sheet(fullData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, worksheet, reportTitle);
        XLSX.writeFile(wb, `${fileName}.csv`, { bookType: "csv" });
      } else if (format === "pdf") {
        const doc = new jsPDF();

        autoTable(doc, {
          startY: 60,
          head: [columns],
          body: fullData.map((row) => columns.map((col) => row[col] ?? "")),
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
              doc.text(reportTitle, doc.internal.pageSize.width / 2, 50, {
                align: "center",
              });
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

        doc.save(`${fileName}.pdf`);
      }

      toast.update("export-toast", {
        render: `${format.toUpperCase()} export complete.`,
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
    } catch (err) {
      console.error(err);
      toast.update("export-toast", {
        render: `Failed to export as ${format.toUpperCase()}`,
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    }
  };

  return {
    exportToExcel: () => doExport("excel"),
    exportToCSV: () => doExport("csv"),
    exportToPDF: () => doExport("pdf"),
  };
}
