import * as XLSX from "xlsx";

export function downloadExcelTemplate() {
  // Create sample rows
  const headers = ["No", "Kode Cabang", "Nama Produk", "Target", "Realisasi", "Persentase Pencapaian (%)"];
  const rows = [
    [1, "010", "Action Mobile", 500, 480, "96%"],
    [2, "010", "Action Cash", 200, 210, "105%"],
    [3, "020", "Action Mobile", 300, 260, "86.67%"],
    [4, "020", "Action Pay (QRIS)", 150, 140, "93.33%"],
    [5, "030", "Action Link", 100, 95, "95%"],
    [6, "040", "Action CMS", 40, 38, "95%"]
  ];

  // Combine headers and rows
  const data = [headers, ...rows];

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  worksheet["!cols"] = [
    { wch: 6 },  // No
    { wch: 15 }, // Kode Cabang
    { wch: 25 }, // Nama Produk
    { wch: 12 }, // Target
    { wch: 12 }, // Realisasi
    { wch: 25 }  // Persentase Pencapaian
  ];

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Template Digital Bank Aceh");

  // Write and download
  XLSX.writeFile(workbook, "Template_Pencapaian_Produk_Digital_Bank_Aceh.xlsx");
}
