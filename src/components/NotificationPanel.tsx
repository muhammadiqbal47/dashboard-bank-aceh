import { useMemo } from "react";
import { PerformanceRecord } from "../types";
import { Bell, ArrowUpRight, AlertTriangle, CheckCircle, Flame } from "lucide-react";

interface NotificationPanelProps {
  records: PerformanceRecord[];
  threshold: number;
}

export default function NotificationPanel({ records, threshold = 90 }: NotificationPanelProps) {
  const notifications = useMemo(() => {
    if (!records || records.length === 0) return [];

    // Find the latest date present in the dataset
    const sortedDates = [...new Set(records.map(r => r.tanggal))].sort((a, b) => b.localeCompare(a));
    const latestDate = sortedDates[0];

    // Filter records from the latest date
    const latestRecords = records.filter(r => r.tanggal === latestDate);

    const list: {
      id: string;
      type: "success" | "warning" | "hot";
      title: string;
      message: string;
      percentage: number;
    }[] = [];

    latestRecords.forEach(r => {
      if (r.persentase >= 100) {
        list.push({
          id: `notif-100-${r.id}`,
          type: "success",
          title: `Target Tercapai! 🎉`,
          message: `${r.namaCabang} berhasil melampaui target untuk produk ${r.namaProduk} (${r.realisasi} dari target ${r.target}).`,
          percentage: r.persentase
        });
      } else if (r.persentase >= threshold) {
        list.push({
          id: `notif-90-${r.id}`,
          type: "warning",
          title: `Hampir Mencapai Target ⚠️`,
          message: `${r.namaCabang} mendekati target produk ${r.namaProduk} dengan pencapaian ${r.persentase}% (${r.realisasi} dari target ${r.target}).`,
          percentage: r.persentase
        });
      } else if (r.persentase >= 80 && r.persentase < 90) {
        list.push({
          id: `notif-80-${r.id}`,
          type: "hot",
          title: `Satu Dorongan Lagi 🔥`,
          message: `${r.namaCabang} mencapai ${r.persentase}% untuk produk ${r.namaProduk}. Tersisa ${r.target - r.realisasi} unit lagi menuju target.`,
          percentage: r.persentase
        });
      }
    });

    // Sort: warning/hot first, then success. Within that, highest percentage first.
    return list.sort((a, b) => b.percentage - a.percentage);
  }, [records, threshold]);

  const latestDateText = useMemo(() => {
    if (!records || records.length === 0) return "";
    const sortedDates = [...new Set(records.map(r => r.tanggal))].sort((a, b) => b.localeCompare(a));
    return sortedDates[0];
  }, [records]);

  if (notifications.length === 0) {
    return (
      <div id="no-notifications" className="bg-white border border-slate-100 rounded-2xl p-6 text-center text-slate-400">
        <Bell className="w-10 h-10 mx-auto mb-2 text-slate-300" />
        <p className="text-sm">Tidak ada notifikasi pencapaian baru hari ini.</p>
        <p className="text-xs text-slate-400 mt-1">Sistem memonitor performa harian real-time otomatis.</p>
      </div>
    );
  }

  return (
    <div id="notification-panel" className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-50">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-slate-800 text-sm">Notifikasi Operasional</h3>
        </div>
        <span className="text-[10px] px-2 py-0.5 font-medium bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
          Harian ({latestDateText})
        </span>
      </div>

      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
        {notifications.map(notif => (
          <div
            key={notif.id}
            className={`p-3 rounded-xl border flex gap-3 text-xs transition-all hover:translate-x-0.5 ${
              notif.type === "success"
                ? "bg-emerald-50/50 border-emerald-100/70 text-slate-700"
                : notif.type === "warning"
                ? "bg-amber-50/50 border-amber-100/70 text-slate-700"
                : "bg-orange-50/50 border-orange-100/70 text-slate-700"
            }`}
          >
            <div className="mt-0.5">
              {notif.type === "success" && (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              {notif.type === "warning" && (
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              )}
              {notif.type === "hot" && (
                <Flame className="w-4 h-4 text-orange-500 shrink-0" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <span className={`font-bold ${
                  notif.type === "success" ? "text-emerald-800" : notif.type === "warning" ? "text-amber-800" : "text-orange-800"
                }`}>
                  {notif.title}
                </span>
                <span className="font-semibold">{notif.percentage}%</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">{notif.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
