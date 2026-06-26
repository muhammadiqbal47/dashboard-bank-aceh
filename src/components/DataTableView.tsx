import { useState, useMemo } from "react";
import { PerformanceRecord, Branch } from "../types";
import { 
  Download, 
  Search, 
  FileText, 
  Table as TableIcon, 
  ChevronLeft, 
  ChevronRight,
  RefreshCw,
  SlidersHorizontal,
  Calendar,
  Layers,
  MapPin
} from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

interface DataTableViewProps {
  records: PerformanceRecord[];
  branches: Branch[];
  loading: boolean;
  onRefresh: () => void;
  currentUser: any;
}

export default function DataTableView({
  records,
  branches,
  loading,
  onRefresh,
  currentUser
}: DataTableViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBranch, setFilterBranch] = useState("all");
  const [filterProduct, setFilterProduct] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [sortField, setSortField] = useState<keyof PerformanceRecord>("no");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Get unique products
  const uniqueProducts = useMemo(() => {
    return [...new Set(records.map(r => r.namaProduk))].sort();
  }, [records]);

  // Sort helper
  const handleSort = (field: keyof PerformanceRecord) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  // Filtered and Sorted Records
  const processedRecords = useMemo(() => {
    let result = [...records];

    // Text search (by branch name, product name, or code)
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        r => 
          r.namaCabang.toLowerCase().includes(q) || 
          r.kodeCabang.includes(q) || 
          r.namaProduk.toLowerCase().includes(q)
      );
    }

    // Branch filter
    if (filterBranch && filterBranch !== "all") {
      result = result.filter(r => r.kodeCabang === filterBranch);
    }

    // Product filter
    if (filterProduct && filterProduct !== "all") {
      result = result.filter(r => r.namaProduk === filterProduct);
    }

    // Specific Date filter
    if (filterDate) {
      result = result.filter(r => r.tanggal === filterDate);
    }

    // Sort
    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === "string" && typeof valB === "string") {
        return sortDirection === "asc" 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      } else {
        return sortDirection === "asc"
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number);
      }
    });

    return result;
  }, [records, searchTerm, filterBranch, filterProduct, filterDate, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(processedRecords.length / itemsPerPage);
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedRecords.slice(start, start + itemsPerPage);
  }, [processedRecords, currentPage, itemsPerPage]);

  // Aggregate stats of filtered table
  const totals = useMemo(() => {
    let tTarget = 0;
    let tRealisasi = 0;
    processedRecords.forEach(r => {
      tTarget += r.target;
      tRealisasi += r.realisasi;
    });
    const percentage = tTarget > 0 ? parseFloat(((tRealisasi / tTarget) * 100).toFixed(2)) : 0;
    return { target: tTarget, realisasi: tRealisasi, percentage };
  }, [processedRecords]);

  // Export to Excel
  const exportToExcel = () => {
    if (processedRecords.length === 0) return;

    // Map records to a readable Indonesian excel structure
    const dataToExport = processedRecords.map((r, idx) => ({
      "No": idx + 1,
      "Tanggal": r.tanggal,
      "Kode Cabang": r.kodeCabang,
      "Nama Cabang": r.namaCabang,
      "Nama Produk Digital": r.namaProduk,
      "Target (Unit)": r.target,
      "Realisasi (Unit)": r.realisasi,
      "Pencapaian (%)": `${r.persentase}%`
    }));

    // Add totals row at the bottom
    dataToExport.push({
      "No": null as any,
      "Tanggal": "TOTAL KONSOLIDASI",
      "Kode Cabang": "",
      "Nama Cabang": "",
      "Nama Produk Digital": "",
      "Target (Unit)": totals.target,
      "Realisasi (Unit)": totals.realisasi,
      "Pencapaian (%)": `${totals.percentage}%`
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pencapaian Produk Digital");

    // Adjust column widths
    worksheet["!cols"] = [
      { wch: 6 },  // No
      { wch: 15 }, // Tanggal
      { wch: 15 }, // Kode Cabang
      { wch: 28 }, // Nama Cabang
      { wch: 25 }, // Nama Produk
      { wch: 15 }, // Target
      { wch: 15 }, // Realisasi
      { wch: 18 }  // Persentase
    ];

    XLSX.writeFile(workbook, `Laporan_Pencapaian_Digital_BankAceh_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // Export to PDF
  const exportToPDF = () => {
    if (processedRecords.length === 0) return;

    const doc = new jsPDF({ orientation: "landscape" });

    // Header Title
    doc.setFontSize(16);
    doc.setTextColor(4, 120, 87); // Emerald 700
    doc.setFont("helvetica", "bold");
    doc.text("BANK ACEH", 14, 16);
    
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text("Laporan Monitoring Pencapaian Target Produk Digital", 14, 22);

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // Slate 500
    const filterDesc = `Filter Cabang: ${filterBranch === 'all' ? 'Semua' : filterBranch}, Produk: ${filterProduct === 'all' ? 'Semua' : filterProduct}, Tanggal: ${filterDate || 'Semua'}`;
    doc.text(filterDesc, 14, 27);
    doc.text(`Dicetak oleh: ${currentUser?.name || "Staff"} | Tanggal Cetak: ${new Date().toLocaleDateString("id-ID")} ${new Date().toLocaleTimeString("id-ID")}`, 14, 31);

    // Table rows
    const tableRows = processedRecords.map((r, idx) => [
      idx + 1,
      r.tanggal,
      r.kodeCabang,
      r.namaCabang,
      r.namaProduk,
      r.target.toLocaleString("id-ID"),
      r.realisasi.toLocaleString("id-ID"),
      `${r.persentase}%`
    ]);

    // Totals row
    tableRows.push([
      "",
      "TOTAL KONSOLIDASI",
      "",
      "",
      "",
      totals.target.toLocaleString("id-ID"),
      totals.realisasi.toLocaleString("id-ID"),
      `${totals.percentage}%`
    ]);

    (doc as any).autoTable({
      head: [["No", "Tanggal", "Kode", "Nama Cabang", "Nama Produk", "Target (Unit)", "Realisasi (Unit)", "Pencapaian"]],
      body: tableRows,
      startY: 35,
      theme: "striped",
      headStyles: { fillColor: [4, 120, 87], textColor: [255, 255, 255], fontStyle: "bold" } as any, // Custom colors handled below in standard ways
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 25 },
        2: { cellWidth: 15 },
        3: { cellWidth: 65 },
        4: { cellWidth: 50 },
        5: { cellWidth: 35, halign: "right" },
        6: { cellWidth: 35, halign: "right" },
        7: { cellWidth: 35, halign: "right" }
      },
      didParseCell: (data: any) => {
        // Style total row at bottom
        if (data.row.index === tableRows.length - 1) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [240, 253, 250]; // Light emerald tint
        }
      }
    });

    doc.save(`Laporan_Digital_BankAceh_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  return (
    <div id="data-table-view" className="space-y-4">
      
      {/* Filters and Search Bar */}
      <div className="bg-white p-5 border border-slate-100 rounded-2xl shadow-sm space-y-4">
        
        {/* Row 1: Search Input */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              id="input-table-search"
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Cari berdasarkan Cabang atau Produk..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white text-xs text-slate-700 transition-all"
            />
          </div>
          
          <div className="flex gap-2 shrink-0">
            {/* Export Buttons */}
            <button
              id="btn-export-excel"
              onClick={exportToExcel}
              disabled={processedRecords.length === 0}
              className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <TableIcon className="w-4 h-4 text-emerald-600" /> Export Excel
            </button>
            <button
              id="btn-export-pdf"
              onClick={exportToPDF}
              disabled={processedRecords.length === 0}
              className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <FileText className="w-4 h-4 text-rose-500" /> Export PDF
            </button>
          </div>
        </div>

        {/* Row 2: Sliders Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-50 pt-4 text-xs">
          {/* Branch */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Cabang
            </label>
            <select
              id="select-table-branch"
              value={filterBranch}
              onChange={(e) => { setFilterBranch(e.target.value); setCurrentPage(1); }}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white text-slate-600"
            >
              <option value="all">Semua Cabang</option>
              {branches.map(b => (
                <option key={b.code} value={b.code}>[{b.code}] {b.name}</option>
              ))}
            </select>
          </div>

          {/* Product */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
              <Layers className="w-3 h-3" /> Produk Digital
            </label>
            <select
              id="select-table-product"
              value={filterProduct}
              onChange={(e) => { setFilterProduct(e.target.value); setCurrentPage(1); }}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white text-slate-600"
            >
              <option value="all">Semua Produk</option>
              {uniqueProducts.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Tanggal Pencapaian
            </label>
            <input
              id="input-table-date"
              type="date"
              value={filterDate}
              onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white text-slate-600"
            />
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table id="achievement-table" className="w-full text-left border-collapse font-sans">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 text-[10px] uppercase tracking-wider">
                <th onClick={() => handleSort("no")} className="py-3 px-4 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                  No {sortField === "no" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th onClick={() => handleSort("tanggal")} className="py-3 px-4 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                  Tanggal {sortField === "tanggal" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th onClick={() => handleSort("kodeCabang")} className="py-3 px-4 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                  Kode {sortField === "kodeCabang" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th onClick={() => handleSort("namaCabang")} className="py-3 px-4 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                  Unit Cabang {sortField === "namaCabang" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th onClick={() => handleSort("namaProduk")} className="py-3 px-4 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                  Nama Produk {sortField === "namaProduk" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th onClick={() => handleSort("target")} className="py-3 px-4 cursor-pointer hover:bg-slate-100 select-none transition-colors text-right">
                  Target {sortField === "target" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th onClick={() => handleSort("realisasi")} className="py-3 px-4 cursor-pointer hover:bg-slate-100 select-none transition-colors text-right">
                  Realisasi {sortField === "realisasi" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th onClick={() => handleSort("persentase")} className="py-3 px-4 cursor-pointer hover:bg-slate-100 select-none transition-colors text-right">
                  Pencapaian {sortField === "persentase" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    <span>Mengambil baris data...</span>
                  </td>
                </tr>
              ) : paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 font-medium">
                    Tidak ditemukan kecocokan baris data.
                  </td>
                </tr>
              ) : (
                <>
                  {paginatedRecords.map((r, index) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {r.no || (currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-500 whitespace-nowrap">
                        {r.tanggal}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {r.kodeCabang}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {r.namaCabang}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium text-[10px]">
                          {r.namaProduk}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-slate-600">
                        {r.target.toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                        {r.realisasi.toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className={`inline-block font-mono font-bold px-2 py-0.5 rounded-full text-[10px] ${
                          r.persentase >= 100 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                            : r.persentase >= 90 
                            ? "bg-amber-50 text-amber-700 border border-amber-100" 
                            : "bg-rose-50 text-rose-600 border border-rose-100"
                        }`}>
                          {r.persentase}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  
                  {/* Aggregated Totals Row */}
                  <tr className="bg-emerald-50/25 font-semibold text-slate-900 border-t-2 border-slate-100">
                    <td className="py-3 px-4"></td>
                    <td className="py-3 px-4 whitespace-nowrap">TOTAL KONSOLIDASI</td>
                    <td className="py-3 px-4"></td>
                    <td className="py-3 px-4 text-slate-400 font-normal">({processedRecords.length} baris difilter)</td>
                    <td className="py-3 px-4"></td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-800 font-semibold">{totals.target.toLocaleString("id-ID")}</td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-800 font-bold">{totals.realisasi.toLocaleString("id-ID")}</td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <span className="inline-block bg-emerald-700 text-white font-mono font-bold px-2 py-0.5 rounded-full text-[10px]">
                        {totals.percentage}%
                      </span>
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Pagination */}
        {processedRecords.length > 0 && (
          <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span>Tampilkan</span>
              <select
                id="select-pagination-size"
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="border border-slate-200 rounded px-1.5 py-0.5 bg-white focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
              </select>
              <span>dari {processedRecords.length} entri</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                id="btn-table-prev-page"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 border border-slate-200 rounded hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2">Halaman <b>{currentPage}</b> dari <b>{totalPages}</b></span>
              <button
                id="btn-table-next-page"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 border border-slate-200 rounded hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
