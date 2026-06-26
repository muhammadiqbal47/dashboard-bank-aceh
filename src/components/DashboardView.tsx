import { useMemo, useState } from "react";
import { PerformanceRecord, Branch } from "../types";
import { 
  TrendingUp, 
  Target, 
  Award, 
  Activity, 
  Filter, 
  RefreshCw, 
  Calendar,
  Layers,
  MapPin
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  LineChart,
  Line
} from "recharts";

interface DashboardViewProps {
  records: PerformanceRecord[];
  branches: Branch[];
  loading: boolean;
  onRefresh: () => void;
  filterBranch: string;
  setFilterBranch: (code: string) => void;
  filterStartDate: string;
  setFilterStartDate: (date: string) => void;
  filterEndDate: string;
  setFilterEndDate: (date: string) => void;
}

export default function DashboardView({
  records,
  branches,
  loading,
  onRefresh,
  filterBranch,
  setFilterBranch,
  filterStartDate,
  setFilterStartDate,
  filterEndDate,
  setFilterEndDate
}: DashboardViewProps) {
  const [activeChartTab, setActiveChartTab] = useState<"trend" | "products" | "branches">("trend");

  // Reset Filters helper
  const resetFilters = () => {
    setFilterBranch("all");
    
    // Set start date to 7 days ago, end date to today based on records
    if (records.length > 0) {
      const dates = [...new Set(records.map(r => r.tanggal))].sort();
      setFilterStartDate(dates[0] || "");
      setFilterEndDate(dates[dates.length - 1] || "");
    } else {
      setFilterStartDate("");
      setFilterEndDate("");
    }
  };

  // KPI Calculations
  const kpi = useMemo(() => {
    let targetSum = 0;
    let realisasiSum = 0;
    
    records.forEach(r => {
      targetSum += r.target;
      realisasiSum += r.realisasi;
    });

    const percentage = targetSum > 0 ? parseFloat(((realisasiSum / targetSum) * 100).toFixed(2)) : 0;

    return {
      totalTarget: targetSum,
      totalRealisasi: realisasiSum,
      percentage: percentage
    };
  }, [records]);

  // Daily Trend Chart Data (grouped by date)
  const trendData = useMemo(() => {
    const dailyMap: { [date: string]: { target: number; realisasi: number } } = {};
    
    records.forEach(r => {
      if (!dailyMap[r.tanggal]) {
        dailyMap[r.tanggal] = { target: 0, realisasi: 0 };
      }
      dailyMap[r.tanggal].target += r.target;
      dailyMap[r.tanggal].realisasi += r.realisasi;
    });

    return Object.keys(dailyMap)
      .sort()
      .map(date => {
        const target = dailyMap[date].target;
        const realisasi = dailyMap[date].realisasi;
        const pct = target > 0 ? parseFloat(((realisasi / target) * 100).toFixed(1)) : 0;
        return {
          tanggal: date,
          "Total Target": target,
          "Total Realisasi": realisasi,
          "Pencapaian (%)": pct
        };
      });
  }, [records]);

  // Product Comparison Chart Data
  const productData = useMemo(() => {
    const productMap: { [prod: string]: { target: number; realisasi: number } } = {};
    
    records.forEach(r => {
      if (!productMap[r.namaProduk]) {
        productMap[r.namaProduk] = { target: 0, realisasi: 0 };
      }
      productMap[r.namaProduk].target += r.target;
      productMap[r.namaProduk].realisasi += r.realisasi;
    });

    return Object.keys(productMap).map(prod => {
      const target = productMap[prod].target;
      const realisasi = productMap[prod].realisasi;
      const pct = target > 0 ? parseFloat(((realisasi / target) * 100).toFixed(1)) : 0;
      return {
        name: prod,
        Target: target,
        Realisasi: realisasi,
        "Pencapaian (%)": pct
      };
    }).sort((a, b) => b.Realisasi - a.Realisasi);
  }, [records]);

  // Branch Performance Ranking Data
  const branchLeaderboard = useMemo(() => {
    const branchMap: { [code: string]: { name: string; target: number; realisasi: number } } = {};
    
    records.forEach(r => {
      if (!branchMap[r.kodeCabang]) {
        // Find human readable branch name
        const b = branches.find(br => br.code === r.kodeCabang);
        branchMap[r.kodeCabang] = { 
          name: b ? b.name.replace("Cabang ", "") : r.namaCabang.replace("Cabang ", ""), 
          target: 0, 
          realisasi: 0 
        };
      }
      branchMap[r.kodeCabang].target += r.target;
      branchMap[r.kodeCabang].realisasi += r.realisasi;
    });

    return Object.keys(branchMap).map(code => {
      const target = branchMap[code].target;
      const realisasi = branchMap[code].realisasi;
      const pct = target > 0 ? parseFloat(((realisasi / target) * 100).toFixed(1)) : 0;
      return {
        code,
        name: branchMap[code].name,
        Target: target,
        Realisasi: realisasi,
        "Pencapaian (%)": pct
      };
    }).sort((a, b) => b["Pencapaian (%)"] - a["Pencapaian (%)"]);
  }, [records, branches]);

  // Custom Tooltip component for better charts look
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-800 shadow-md text-xs font-sans">
          <p className="font-bold text-[11px] mb-1.5 border-b border-slate-700 pb-1 text-slate-300">{label}</p>
          {payload.map((p: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between gap-4 py-0.5">
              <span className="text-slate-400 font-medium" style={{ color: p.color }}>{p.name}:</span>
              <span className="font-bold text-white">
                {p.name.includes("Pencapaian") ? `${p.value}%` : p.value.toLocaleString("id-ID")}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div id="dashboard-view" className="space-y-6">
      
      {/* Search and Filters Drawer / Bar */}
      <div id="filters-card" className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-50">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-emerald-700" />
            <h3 className="font-bold text-slate-800 text-sm">Filter Pencarian Data</h3>
          </div>
          <button
            id="btn-reset-filters"
            onClick={resetFilters}
            className="text-xs text-emerald-700 font-semibold hover:text-emerald-800"
          >
            Reset Filter
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Branch Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Unit Cabang
            </label>
            <select
              id="select-branch-filter"
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white text-slate-700"
            >
              <option value="all">Semua Cabang / Konsolidasi</option>
              {branches.map(b => (
                <option key={b.code} value={b.code}>
                  [{b.code}] {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Tanggal Mulai
            </label>
            <input
              id="input-start-date"
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white text-slate-700"
            />
          </div>

          {/* End Date Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Tanggal Akhir
            </label>
            <input
              id="input-end-date"
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white text-slate-700"
            />
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div id="kpi-grid" className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        
        {/* KPI Target */}
        <div id="kpi-target-card" className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm relative overflow-hidden flex items-center gap-4">
          <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl border border-emerald-100">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Target Produk</p>
            <h3 id="txt-kpi-target" className="text-xl font-bold text-slate-800 mt-1">
              {loading ? "..." : kpi.totalTarget.toLocaleString("id-ID")}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">Unit target operasional</p>
          </div>
        </div>

        {/* KPI Realisasi */}
        <div id="kpi-realisasi-card" className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm relative overflow-hidden flex items-center gap-4">
          <div className="bg-teal-50 text-teal-700 p-3 rounded-xl border border-teal-100">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Realisasi</p>
            <h3 id="txt-kpi-realisasi" className="text-xl font-bold text-slate-800 mt-1">
              {loading ? "..." : kpi.totalRealisasi.toLocaleString("id-ID")}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">Akumulasi pencapaian riil</p>
          </div>
        </div>

        {/* KPI Persentase */}
        <div id="kpi-achievement-card" className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm relative overflow-hidden flex items-center gap-4">
          <div className={`p-3 rounded-xl border ${
            kpi.percentage >= 100 
              ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
              : kpi.percentage >= 90 
              ? "bg-amber-50 text-amber-700 border-amber-100" 
              : "bg-rose-50 text-rose-700 border-rose-100"
          }`}>
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Rata-Rata Pencapaian</p>
            <h3 id="txt-kpi-percentage" className="text-xl font-bold text-slate-800 mt-1">
              {loading ? "..." : `${kpi.percentage}%`}
            </h3>
            <div className="flex items-center gap-1 mt-1 text-[10px]">
              <span className={`font-bold ${kpi.percentage >= 90 ? "text-emerald-700" : "text-rose-600"}`}>
                {kpi.percentage >= 100 ? "Melampaui Target" : kpi.percentage >= 90 ? "Hampir Tercapai" : "Kurang"}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Main Graph Card */}
      <div id="visualization-card" className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Graph Tabs */}
        <div className="bg-slate-50 border-b border-slate-100 px-5 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1">
            <button
              id="tab-chart-trend"
              onClick={() => setActiveChartTab("trend")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeChartTab === "trend"
                  ? "bg-white text-emerald-700 shadow-sm border border-slate-100"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              }`}
            >
              <TrendingUp className="w-4 h-4" /> Trend Pencapaian Harian
            </button>
            <button
              id="tab-chart-products"
              onClick={() => setActiveChartTab("products")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeChartTab === "products"
                  ? "bg-white text-emerald-700 shadow-sm border border-slate-100"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              }`}
            >
              <Layers className="w-4 h-4" /> Performa per Produk
            </button>
            <button
              id="tab-chart-branches"
              onClick={() => setActiveChartTab("branches")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeChartTab === "branches"
                  ? "bg-white text-emerald-700 shadow-sm border border-slate-100"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              }`}
            >
              <MapPin className="w-4 h-4" /> Peringkat Pencapaian Cabang
            </button>
          </div>

          <button
            id="btn-refresh-data"
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-emerald-700 rounded-xl hover:bg-slate-100 transition-colors shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Graph Display Area */}
        <div className="p-6">
          {loading ? (
            <div className="h-[320px] flex flex-col justify-center items-center text-slate-400 gap-2">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
              <span className="text-xs">Memuat visualisasi grafik harian...</span>
            </div>
          ) : records.length === 0 ? (
            <div className="h-[320px] flex flex-col justify-center items-center text-slate-400 text-center">
              <TrendingUp className="w-12 h-12 text-slate-200 mb-2" />
              <span className="text-sm font-semibold text-slate-500">Tidak ada data untuk rentang waktu ini</span>
              <span className="text-xs text-slate-400 mt-1">Gunakan tab excel untuk mengimpor atau ubah filter pencarian.</span>
            </div>
          ) : (
            <div className="h-[320px] w-full font-sans">
              
              {/* Chart 1: Trend Line/Area Chart */}
              {activeChartTab === "trend" && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRealisasi" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#047857" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#047857" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="tanggal" 
                      tick={{ fill: '#64748b', fontSize: 10 }} 
                      stroke="#cbd5e1"
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: '#64748b', fontSize: 10 }} 
                      stroke="#cbd5e1"
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="Total Realisasi" stroke="#047857" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRealisasi)" />
                    <Area type="monotone" dataKey="Total Target" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" fillOpacity={1} fill="url(#colorTarget)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {/* Chart 2: Product Bar Chart */}
              {activeChartTab === "products" && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#64748b', fontSize: 10 }} 
                      stroke="#cbd5e1"
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: '#64748b', fontSize: 10 }} 
                      stroke="#cbd5e1"
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Realisasi" fill="#047857" radius={[6, 6, 0, 0]} barSize={35} />
                    <Bar dataKey="Target" fill="#cbd5e1" radius={[6, 6, 0, 0]} barSize={35} />
                  </BarChart>
                </ResponsiveContainer>
              )}

              {/* Chart 3: Branch Leaderboard Bar Chart */}
              {activeChartTab === "branches" && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={branchLeaderboard} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#64748b', fontSize: 9 }} 
                      stroke="#cbd5e1"
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: '#64748b', fontSize: 10 }} 
                      stroke="#cbd5e1"
                      tickLine={false}
                      domain={[0, 'auto']}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Pencapaian (%)" fill="#0d9488" radius={[4, 4, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
