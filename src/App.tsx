import { useState, useEffect, useMemo, useCallback } from "react";
import { api } from "./utils/api";
import { User, Branch, PerformanceRecord } from "./types";
import { 
  Bell, 
  LogOut, 
  Menu, 
  X, 
  LayoutDashboard, 
  Table, 
  FileSpreadsheet, 
  Users, 
  Landmark,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import Login from "./components/Login";
import DashboardView from "./components/DashboardView";
import DataTableView from "./components/DataTableView";
import ImportView from "./components/ImportView";
import UserManagementView from "./components/UserManagementView";
import NotificationPanel from "./components/NotificationPanel";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [activeTab, setActiveTab] = useState<"dashboard" | "datatable" | "import" | "users">("dashboard");

  // Global Data
  const [branches, setBranches] = useState<Branch[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceRecord[]>([]);
  const [threshold, setThreshold] = useState(90);
  const [loadingData, setLoadingData] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Filters
  const [filterBranch, setFilterBranch] = useState("all");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  // UI state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);

  // Load initial dataset
  const loadBranches = async () => {
    try {
      const bList = await api.getBranches();
      setBranches(bList);
    } catch (err) {
      console.error("Error loading branches", err);
    }
  };

  const loadData = useCallback(async () => {
    setLoadingData(true);
    setErrorMsg("");
    try {
      const [pData, sData] = await Promise.all([
        api.getPerformance({
          kodeCabang: filterBranch,
          startDate: filterStartDate || undefined,
          endDate: filterEndDate || undefined
        }),
        api.getSettings().catch(() => ({ notificationThreshold: 90 }))
      ]);
      setPerformanceData(pData);
      setThreshold(sData.notificationThreshold);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal mengambil data pencapaian.");
    } finally {
      setLoadingData(false);
    }
  }, [filterBranch, filterStartDate, filterEndDate]);

  // Auth bootstrap check
  useEffect(() => {
    const checkAuth = async () => {
      const savedUser = api.getCurrentUser();
      const token = localStorage.getItem("bank_aceh_token");
      if (savedUser && token) {
        try {
          const verifiedUser = await api.getMe();
          setCurrentUser(verifiedUser);
        } catch (err) {
          console.error("Auth validation failed", err);
          api.logout();
          setCurrentUser(null);
        }
      }
      setLoadingUser(false);
    };

    checkAuth();
    loadBranches();

    // Listen to expired auth events
    const handleAuthExpired = () => {
      setCurrentUser(null);
      alert("Sesi Anda telah berakhir. Silakan masuk kembali.");
    };
    window.addEventListener("auth-expired", handleAuthExpired);

    return () => {
      window.removeEventListener("auth-expired", handleAuthExpired);
    };
  }, []);

  // Fetch performance data when authenticated or filters change
  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser, loadData]);

  // Pre-fill dates default filter once data loads
  useEffect(() => {
    if (performanceData.length > 0 && !filterStartDate && !filterEndDate) {
      const dates = [...new Set(performanceData.map(r => r.tanggal))].sort();
      // Default to displaying all loaded dates in the initial view
      setFilterStartDate(dates[0] || "");
      setFilterEndDate(dates[dates.length - 1] || "");
    }
  }, [performanceData, filterStartDate, filterEndDate]);

  // Calculate alerts badge count (percentage >= threshold)
  const activeAlertsCount = useMemo(() => {
    if (performanceData.length === 0) return 0;
    
    // Get latest date present
    const sortedDates = [...new Set(performanceData.map(r => r.tanggal))].sort((a, b) => (b as string).localeCompare(a as string));
    const latestDate = sortedDates[0];
    
    // Count records on latest date exceeding threshold (>= threshold, and < 100 for almost reached + >= 100 for reached)
    const latestRecords = performanceData.filter(r => r.tanggal === latestDate);
    return latestRecords.filter(r => r.persentase >= threshold).length;
  }, [performanceData, threshold]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setActiveTab("dashboard");
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setMobileMenuOpen(false);
    setShowNotificationDrawer(false);
  };

  if (loadingUser) {
    return (
      <div id="loader-full" className="min-h-screen bg-slate-50 flex flex-col justify-center items-center text-slate-500 gap-2 font-sans">
        <Landmark className="w-12 h-12 text-emerald-700 animate-pulse" />
        <span className="text-xs font-semibold">Menginisialisasi sistem monitoring...</span>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div id="app-container" className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      
      {/* Top Header Navigation Bar */}
      <header id="app-header" className="bg-emerald-800 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo Group */}
            <div className="flex items-center gap-2">
              <img
                src="/logo-bank-aceh.png?v=2"
                className="w-10 h-10 object-contain bg-white p-1 rounded-lg shrink-0 select-none shadow-sm"
                referrerPolicy="no-referrer"
                alt="Logo Bank Aceh"
              />
              <div>
                <span className="font-extrabold text-lg tracking-tight block text-white">BANK ACEH</span>
                <span className="text-[9px] uppercase tracking-wider text-emerald-100 font-semibold -mt-1 block">Digital Performance Portal</span>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav id="desktop-nav" className="hidden md:flex space-x-2">
              <button
                id="btn-nav-dashboard"
                onClick={() => setActiveTab("dashboard")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  activeTab === "dashboard"
                    ? "bg-emerald-700/60 text-white shadow-inner border border-emerald-600/40"
                    : "text-emerald-100 hover:bg-emerald-700/30 hover:text-white"
                }`}
              >
                <LayoutDashboard className="w-4 h-4" /> Visualisasi Grafik
              </button>

              <button
                id="btn-nav-datatable"
                onClick={() => setActiveTab("datatable")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  activeTab === "datatable"
                    ? "bg-emerald-700/60 text-white shadow-inner border border-emerald-600/40"
                    : "text-emerald-100 hover:bg-emerald-700/30 hover:text-white"
                }`}
              >
                <Table className="w-4 h-4" /> Data Tabel & Ekspor
              </button>

              {currentUser.role === "admin" && (
                <>
                  <button
                    id="btn-nav-import"
                    onClick={() => setActiveTab("import")}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                      activeTab === "import"
                        ? "bg-emerald-700/60 text-white shadow-inner border border-emerald-600/40"
                        : "text-emerald-100 hover:bg-emerald-700/30 hover:text-white"
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Impor Excel
                  </button>

                  <button
                    id="btn-nav-users"
                    onClick={() => setActiveTab("users")}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                      activeTab === "users"
                        ? "bg-emerald-700/60 text-white shadow-inner border border-emerald-600/40"
                        : "text-emerald-100 hover:bg-emerald-700/30 hover:text-white"
                    }`}
                  >
                    <Users className="w-4 h-4" /> Kelola Pengguna
                  </button>
                </>
              )}
            </nav>

            {/* Profile and Action Group */}
            <div className="flex items-center gap-2.5">
              
              {/* Notification bell trigger */}
              <button
                id="btn-bell"
                onClick={() => setShowNotificationDrawer(!showNotificationDrawer)}
                className="p-2 text-emerald-100 hover:text-amber-400 hover:bg-emerald-700/50 rounded-xl relative transition-all focus:outline-none"
              >
                <Bell className="w-5 h-5" />
                {activeAlertsCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-amber-500 text-slate-900 border-2 border-emerald-800 rounded-full flex items-center justify-center font-mono font-black text-[8px] animate-bounce">
                    {activeAlertsCount}
                  </span>
                )}
              </button>

              {/* User Identity profile label */}
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-white truncate max-w-[120px]">{currentUser.name}</span>
                <span className="text-[10px] text-emerald-200 font-semibold flex items-center gap-0.5 justify-end uppercase tracking-wider">
                  <ShieldCheck className="w-3 h-3 text-amber-400" />
                  {currentUser.role}
                </span>
              </div>

              {/* Log out trigger */}
              <button
                id="btn-logout"
                onClick={handleLogout}
                className="hidden md:flex p-2 text-emerald-100 hover:text-rose-300 hover:bg-emerald-700/50 rounded-xl transition-all font-semibold items-center text-xs"
              >
                <LogOut className="w-4 h-4" />
              </button>

              {/* Mobile Menu burger trigger */}
              <button
                id="btn-mobile-burger"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-emerald-100 hover:text-white hover:bg-emerald-700/50 rounded-xl transition-all focus:outline-none"
              >
                {mobileMenuOpen ? <X className="w-5.5 h-5.5" /> : <Menu className="w-5.5 h-5.5" />}
              </button>

            </div>

          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer Overlay */}
      {mobileMenuOpen && (
        <div id="mobile-menu-overlay" className="md:hidden bg-slate-900/40 fixed inset-0 z-40" onClick={() => setMobileMenuOpen(false)}>
          <div 
            className="w-64 bg-emerald-800 text-white h-full p-5 space-y-4 shadow-2xl flex flex-col justify-between" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-6">
              {/* Profile Block */}
              <div className="flex items-center gap-3 border-b border-emerald-700/70 pb-4">
                <div className="bg-emerald-700 p-2 rounded-xl text-amber-400">
                  <Landmark className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-xs">{currentUser.name}</h4>
                  <p className="text-[10px] text-emerald-200 uppercase tracking-wider">{currentUser.role}</p>
                </div>
              </div>

              {/* Mobile Navigation Links */}
              <nav className="flex flex-col gap-2.5">
                <button
                  id="btn-mob-nav-dashboard"
                  onClick={() => { setActiveTab("dashboard"); setMobileMenuOpen(false); }}
                  className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-3 transition-colors ${
                    activeTab === "dashboard" ? "bg-emerald-700 text-white" : "text-emerald-100 hover:bg-emerald-700/40"
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" /> Visualisasi Grafik
                </button>

                <button
                  id="btn-mob-nav-datatable"
                  onClick={() => { setActiveTab("datatable"); setMobileMenuOpen(false); }}
                  className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-3 transition-colors ${
                    activeTab === "datatable" ? "bg-emerald-700 text-white" : "text-emerald-100 hover:bg-emerald-700/40"
                  }`}
                >
                  <Table className="w-4 h-4" /> Data Tabel & Ekspor
                </button>

                {currentUser.role === "admin" && (
                  <>
                    <button
                      id="btn-mob-nav-import"
                      onClick={() => { setActiveTab("import"); setMobileMenuOpen(false); }}
                      className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-3 transition-colors ${
                        activeTab === "import" ? "bg-emerald-700 text-white" : "text-emerald-100 hover:bg-emerald-700/40"
                      }`}
                    >
                      <FileSpreadsheet className="w-4 h-4" /> Impor Excel
                    </button>

                    <button
                      id="btn-mob-nav-users"
                      onClick={() => { setActiveTab("users"); setMobileMenuOpen(false); }}
                      className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-3 transition-colors ${
                        activeTab === "users" ? "bg-emerald-700 text-white" : "text-emerald-100 hover:bg-emerald-700/40"
                      }`}
                    >
                      <Users className="w-4 h-4" /> Kelola Pengguna
                    </button>
                  </>
                )}
              </nav>
            </div>

            {/* Logout anchor in menu footer */}
            <button
              id="btn-mob-logout"
              onClick={handleLogout}
              className="w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-3 bg-emerald-900/60 text-emerald-200 hover:bg-rose-900/40 hover:text-white transition-all"
            >
              <LogOut className="w-4 h-4" /> Keluar Aplikasi
            </button>
          </div>
        </div>
      )}

      {/* Main Body Content wrapping layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Error Alert Display */}
        {errorMsg && (
          <div id="main-error-alert" className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-2xl flex items-center text-xs">
            <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Global Notifications Drawer inside Body when open */}
        {showNotificationDrawer && (
          <div id="notif-dropdown-wrapper" className="mb-6">
            <NotificationPanel records={performanceData} threshold={threshold} />
          </div>
        )}

        {/* Active Tab rendering */}
        <div id="tab-content-render" className="transition-opacity duration-200">
          
          {activeTab === "dashboard" && (
            <DashboardView
              records={performanceData}
              branches={branches}
              loading={loadingData}
              onRefresh={loadData}
              filterBranch={filterBranch}
              setFilterBranch={setFilterBranch}
              filterStartDate={filterStartDate}
              setFilterStartDate={setFilterStartDate}
              filterEndDate={filterEndDate}
              setFilterEndDate={setFilterEndDate}
            />
          )}

          {activeTab === "datatable" && (
            <DataTableView
              records={performanceData}
              branches={branches}
              loading={loadingData}
              onRefresh={loadData}
              currentUser={currentUser}
            />
          )}

          {activeTab === "import" && currentUser.role === "admin" && (
            <ImportView onImportSuccess={loadData} />
          )}

          {activeTab === "users" && currentUser.role === "admin" && (
            <UserManagementView currentUser={currentUser} onUserUpdate={loadData} />
          )}

        </div>

      </main>

      {/* Corporate humble footer */}
      <footer id="app-footer" className="bg-white border-t border-slate-100 py-6 text-center text-[10px] text-slate-400 font-medium font-mono space-y-1 mt-10">
        <div>SISTEM MONITORING PENCAPAIAN PRODUK DIGITAL (SMPPD)</div>
        <div className="text-slate-300">© 2026 PT. BANK ACEH SYARIAH. ALL RIGHTS RESERVED.</div>
      </footer>

    </div>
  );
}
