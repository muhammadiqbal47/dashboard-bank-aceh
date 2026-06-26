import React, { useState, useRef } from "react";
import { api } from "../utils/api";
import { downloadExcelTemplate } from "../utils/excelTemplate";
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  Eye, 
  Trash2, 
  Calendar,
  Layers,
  HelpCircle,
  RefreshCw
} from "lucide-react";
import * as XLSX from "xlsx";

interface ImportViewProps {
  onImportSuccess: () => void;
}

export default function ImportView({ onImportSuccess }: ImportViewProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [dragging, setDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag-and-Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Parse Excel File on client side
  const processFile = (selectedFile: File) => {
    setError("");
    setSuccess("");
    
    const fileExtension = selectedFile.name.split(".").pop()?.toLowerCase();
    if (fileExtension !== "xlsx" && fileExtension !== "xls") {
      setError("Hanya diperbolehkan mengunggah file format Excel (.xlsx atau .xls).");
      setFile(null);
      setParsedData([]);
      return;
    }

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert sheet to JSON array
        const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (rawRows.length < 2) {
          setError("File Excel kosong atau tidak memiliki baris data setelah header.");
          return;
        }

        // Parse and find header index or map columns
        // Standard expected columns: No, Kode Cabang, Nama Produk, Target, Realisasi
        const headers = rawRows[0].map((h: any) => String(h).trim().toLowerCase());
        
        const noIdx = headers.findIndex((h: string) => h === "no" || h === "nomor");
        const codeIdx = headers.findIndex((h: string) => h.includes("cabang") && (h.includes("kode") || h.includes("code")));
        const productIdx = headers.findIndex((h: string) => h.includes("produk") || h.includes("nama produk"));
        const targetIdx = headers.findIndex((h: string) => h === "target" || h.includes("target"));
        const realisasiIdx = headers.findIndex((h: string) => h.includes("realisasi") || h === "realisasi");

        if (codeIdx === -1 || productIdx === -1 || targetIdx === -1 || realisasiIdx === -1) {
          setError("Struktur kolom Excel tidak cocok. Pastikan terdapat kolom: 'Kode Cabang', 'Nama Produk', 'Target', dan 'Realisasi'. Gunakan Template Excel yang kami sediakan.");
          return;
        }

        // Map data rows
        const rows: any[] = [];
        for (let i = 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (row.length === 0 || !row[productIdx]) continue; // Skip empty rows

          rows.push({
            no: noIdx !== -1 ? Number(row[noIdx]) : i,
            kodeCabang: String(row[codeIdx]).trim().padStart(3, "0"),
            namaProduk: String(row[productIdx]).trim(),
            target: Number(row[targetIdx]) || 0,
            realisasi: Number(row[realisasiIdx]) || 0
          });
        }

        if (rows.length === 0) {
          setError("Tidak ada baris data yang valid ditemukan untuk diimpor.");
        } else {
          setParsedData(rows);
        }
      } catch (err) {
        console.error(err);
        setError("Gagal memproses file Excel. Pastikan file tidak rusak.");
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  // Submit to API
  const handleImportSubmit = async () => {
    if (!file || parsedData.length === 0) {
      setError("Silakan pilih file Excel yang valid terlebih dahulu.");
      return;
    }

    if (!selectedDate) {
      setError("Silakan pilih tanggal pencapaian data.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await api.importPerformance(selectedDate, parsedData);
      setSuccess(res.message || "Data berhasil diimpor ke database.");
      setFile(null);
      setParsedData([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onImportSuccess();
    } catch (err: any) {
      setError(err.message || "Gagal mengimpor data ke server.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelFile = () => {
    setFile(null);
    setParsedData([]);
    setError("");
    setSuccess("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleResetDatabase = async () => {
    if (!window.confirm("Apakah Anda yakin ingin mengatur ulang (reset) database ke data demo default? Tindakan ini akan menghapus semua unggahan kustom Anda.")) {
      return;
    }
    setLoading(true);
    try {
      const res = await api.resetDatabase();
      alert(res.message);
      onImportSuccess();
    } catch (err: any) {
      alert(`Gagal reset database: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="import-view" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Configuration & Instructions Column */}
      <div className="lg:col-span-1 space-y-6">
        
        {/* Template Downloader Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
            <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
            <h4 className="font-bold text-slate-800 text-sm">Template Unggahan</h4>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Gunakan format berkas Excel standar untuk memperlancar validasi harian. Klik di bawah untuk mengunduh berkas acuan Bank Aceh.
          </p>
          <button
            id="btn-download-template"
            onClick={downloadExcelTemplate}
            className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-emerald-100 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50/50 hover:bg-emerald-50 transition-colors"
          >
            <Download className="w-4 h-4" /> Unduh Template Excel
          </button>
        </div>

        {/* Date Selection Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
            <Calendar className="w-5 h-5 text-emerald-700" />
            <h4 className="font-bold text-slate-800 text-sm">Tanggal Target Data</h4>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Tanggal Pencapaian Harian
            </label>
            <input
              id="input-import-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white text-xs text-slate-700 font-medium"
            />
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Seluruh data di dalam berkas Excel akan diasosiasikan dengan tanggal di atas. Data ganda pada tanggal dan cabang yang sama akan di-overwrote.
          </p>
        </div>

        {/* Developer Sandbox Options */}
        <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-5 shadow-sm space-y-3">
          <h4 className="font-bold text-rose-800 text-xs flex items-center gap-1">
            <AlertCircle className="w-4 h-4 text-rose-600" /> Zona Pemulihan Sistem
          </h4>
          <p className="text-[10px] text-rose-700/80 leading-relaxed">
            Ingin mengembalikan seluruh database ke skenario simulasi 7-hari harian asli Bank Aceh? Klik tombol di bawah.
          </p>
          <button
            id="btn-reset-db"
            onClick={handleResetDatabase}
            disabled={loading}
            className="w-full flex justify-center items-center gap-1.5 py-2 px-3 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 bg-white hover:bg-rose-50 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" /> Reset Database ke Data Demo
          </button>
        </div>

      </div>

      {/* Main Drag-And-Drop / Import Column */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Alerts and Logs block */}
        {error && (
          <div id="import-error-alert" className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl flex items-start text-xs">
            <AlertCircle className="w-5 h-5 mr-2.5 shrink-0 mt-0.5" />
            <div>
              <h5 className="font-bold mb-0.5">Terjadi Masalah Unggahan</h5>
              <span>{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div id="import-success-alert" className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-start text-xs">
            <CheckCircle className="w-5 h-5 mr-2.5 shrink-0 mt-0.5" />
            <div>
              <h5 className="font-bold mb-0.5">Proses Berhasil</h5>
              <span>{success}</span>
            </div>
          </div>
        )}

        {/* Dropzone Container */}
        {!file ? (
          <div
            id="excel-dropzone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all flex flex-col justify-center items-center ${
              dragging 
                ? "border-emerald-600 bg-emerald-50/50" 
                : "border-slate-200 bg-white hover:border-emerald-500 hover:bg-slate-50/50"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx, .xls"
              className="hidden"
            />
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100/70 text-emerald-700 mb-4 shadow-inner">
              <Upload className="w-8 h-8" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">Tarik dan Lepas File Excel</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
              Dukung format berkas .xlsx atau .xls. Atau klik untuk mencari berkas dari komputer/handphone Anda.
            </p>
          </div>
        ) : (
          /* File Uploaded Preview and Actions */
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            
            {/* Header file description */}
            <div className="p-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500 text-white p-2.5 rounded-xl">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-xs truncate max-w-[200px] sm:max-w-xs">{file.name}</h4>
                  <p className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(1)} KB | {parsedData.length} baris data terdeteksi</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  id="btn-cancel-file"
                  onClick={handleCancelFile}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500 hover:bg-white hover:text-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  id="btn-execute-import"
                  onClick={handleImportSubmit}
                  disabled={loading}
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-700/10 transition-all disabled:opacity-50 flex items-center gap-1"
                >
                  {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />}
                  Mulai Impor
                </button>
              </div>
            </div>

            {/* Preview Scrollable Table */}
            <div className="p-5">
              <h5 className="font-bold text-xs text-slate-700 mb-3 flex items-center gap-1">
                <Eye className="w-4 h-4 text-emerald-600" /> Pratinjau Baris Data
              </h5>
              
              <div className="max-h-[300px] overflow-y-auto border border-slate-100 rounded-xl">
                <table id="import-preview-table" className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                      <th className="py-2.5 px-3">No</th>
                      <th className="py-2.5 px-3">Kode Cabang</th>
                      <th className="py-2.5 px-3">Nama Produk</th>
                      <th className="py-2.5 px-3 text-right">Target</th>
                      <th className="py-2.5 px-3 text-right">Realisasi</th>
                      <th className="py-2.5 px-3 text-right">Persentase</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-slate-600">
                    {parsedData.slice(0, 15).map((row, idx) => {
                      const percentage = row.target > 0 ? ((row.realisasi / row.target) * 100).toFixed(1) : "0";
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-mono text-slate-400">{row.no}</td>
                          <td className="py-2 px-3 font-mono">{row.kodeCabang}</td>
                          <td className="py-2 px-3 font-medium text-slate-700">{row.namaProduk}</td>
                          <td className="py-2 px-3 text-right font-mono">{row.target}</td>
                          <td className="py-2 px-3 text-right font-mono text-slate-800 font-semibold">{row.realisasi}</td>
                          <td className="py-2 px-3 text-right whitespace-nowrap">
                            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono text-[10px]">
                              {percentage}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {parsedData.length > 15 && (
                <p className="text-[10px] text-slate-400 text-center mt-3">
                  Menampilkan 15 baris pertama dari total {parsedData.length} baris data Excel.
                </p>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
