export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'viewer';
  passwordHash?: string; // Only on backend
  createdAt: string;
}

export interface Branch {
  code: string;
  name: string;
}

export interface PerformanceRecord {
  id: string;
  no: number;
  kodeCabang: string;
  namaCabang: string; // Derived or explicitly set
  namaProduk: string;
  target: number;
  realisasi: number;
  persentase: number; // realisasi / target * 100
  tanggal: string; // YYYY-MM-DD
  importedAt: string;
}

export interface DashboardStats {
  totalTarget: number;
  totalRealisasi: number;
  overallPercentage: number;
  productStats: {
    name: string;
    target: number;
    realisasi: number;
    percentage: number;
  }[];
  branchStats: {
    code: string;
    name: string;
    target: number;
    realisasi: number;
    percentage: number;
  }[];
}

export interface NotificationItem {
  id: string;
  type: 'info' | 'warning' | 'success';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}
