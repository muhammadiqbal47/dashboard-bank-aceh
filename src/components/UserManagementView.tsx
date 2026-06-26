import React, { useState, useEffect } from "react";
import { User } from "../types";
import { api } from "../utils/api";
import { 
  Users, 
  UserPlus, 
  Edit2, 
  Trash2, 
  Shield, 
  Settings, 
  Save, 
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff
} from "lucide-react";

interface UserManagementViewProps {
  currentUser: User | null;
  onUserUpdate: () => void;
}

export default function UserManagementView({ currentUser, onUserUpdate }: UserManagementViewProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Threshold States
  const [threshold, setThreshold] = useState(90);
  const [savingThreshold, setSavingThreshold] = useState(false);

  // User Form States
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formUsername, setFormUsername] = useState("");
  const [formName, setFormName] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<"admin" | "viewer">("viewer");
  const [showPassword, setShowPassword] = useState(false);

  // Load Users
  const loadUsersAndSettings = async () => {
    setLoading(true);
    setError("");
    try {
      const [uData, sData] = await Promise.all([
        api.getUsers(),
        api.getSettings()
      ]);
      setUsers(uData);
      setThreshold(sData.notificationThreshold);
    } catch (err: any) {
      setError(err.message || "Gagal memuat data pengguna.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsersAndSettings();
  }, []);

  // Handle Form Submit (Add or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUsername || !formName || (!editingUser && !formPassword)) {
      setError("Username, nama, dan kata sandi baru (untuk akun baru) wajib diisi.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (editingUser) {
        // Update user
        await api.updateUser(editingUser.id, {
          username: formUsername,
          name: formName,
          role: formRole,
          password: formPassword || undefined // Optional on edit
        });
        setSuccess(`Akun ${formName} berhasil diperbarui.`);
      } else {
        // Create user
        await api.createUser({
          username: formUsername,
          name: formName,
          role: formRole,
          password: formPassword
        });
        setSuccess(`Akun ${formName} berhasil dibuat.`);
      }
      
      resetForm();
      loadUsersAndSettings();
      onUserUpdate(); // Notify main app to update its state
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan akun.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Delete User
  const handleDelete = async (user: User) => {
    if (user.id === currentUser?.id) {
      setError("Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif.");
      return;
    }
    if (user.username === "admin") {
      setError("Akun administrator utama tidak dapat dihapus.");
      return;
    }

    if (!window.confirm(`Apakah Anda yakin ingin menghapus akun ${user.name}?`)) {
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await api.deleteUser(user.id);
      setSuccess(res.message);
      loadUsersAndSettings();
      onUserUpdate();
    } catch (err: any) {
      setError(err.message || "Gagal menghapus akun.");
    } finally {
      setLoading(false);
    }
  };

  // Populate form for editing
  const handleStartEdit = (user: User) => {
    setEditingUser(user);
    setFormUsername(user.username);
    setFormName(user.name);
    setFormRole(user.role);
    setFormPassword(""); // Password blank for edit
  };

  const resetForm = () => {
    setEditingUser(null);
    setFormUsername("");
    setFormName("");
    setFormPassword("");
    setFormRole("viewer");
  };

  // Save Settings threshold
  const handleSaveThreshold = async () => {
    setSavingThreshold(true);
    setError("");
    setSuccess("");
    try {
      const res = await api.updateSettings(threshold);
      setSuccess(res.message);
      onUserUpdate(); // Re-trigger notification updates in app
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan pengaturan.");
    } finally {
      setSavingThreshold(false);
    }
  };

  return (
    <div id="user-management-view" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Settings & Create User Form Column */}
      <div className="lg:col-span-1 space-y-6">
        
        {/* Threshold Settings Panel */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
            <Settings className="w-5 h-5 text-emerald-700" />
            <h4 className="font-bold text-slate-800 text-sm">Pengaturan Threshold Target</h4>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Tentukan ambang persentase pencapaian (threshold) di mana produk dianggap hampir mencapai target.
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                id="input-threshold-pct"
                type="number"
                min={1}
                max={100}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white text-xs font-mono font-bold text-slate-700"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
            </div>
            <button
              id="btn-save-threshold"
              onClick={handleSaveThreshold}
              disabled={savingThreshold}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-700/10 transition-colors flex items-center gap-1 shrink-0"
            >
              {savingThreshold ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Simpan
            </button>
          </div>
        </div>

        {/* Create/Edit Account Form */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-50 mb-4">
            <UserPlus className="w-5 h-5 text-emerald-700" />
            <h4 className="font-bold text-slate-800 text-sm">
              {editingUser ? "Sunting Akun Pengguna" : "Tambah Pengguna Baru"}
            </h4>
          </div>

          <form id="user-form" onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Name */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nama Lengkap</label>
              <input
                id="input-user-name"
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="cth. Cut Nyak Sarah"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white text-slate-700"
              />
            </div>

            {/* Username */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Username Unik</label>
              <input
                id="input-user-username"
                type="text"
                required
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
                placeholder="cth. sarah99"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white text-slate-700"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                {editingUser ? "Sandi Baru (Kosongkan jika tidak diganti)" : "Sandi Pengguna"}
              </label>
              <div className="relative">
                <input
                  id="input-user-password"
                  type={showPassword ? "text" : "password"}
                  required={!editingUser}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder={editingUser ? "••••••••" : "Masukkan sandi aman"}
                  className="w-full border border-slate-200 rounded-xl pl-3 pr-10 py-2.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white text-slate-700 font-mono"
                />
                <button
                  type="button"
                  id="btn-toggle-user-pass"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Peran Hak Akses</label>
              <select
                id="select-user-role"
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as "admin" | "viewer")}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white text-slate-600"
              >
                <option value="viewer">Staff Monitoring (Hanya Baca)</option>
                <option value="admin">Administrator (Penuh / CRUD)</option>
              </select>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              {editingUser && (
                <button
                  type="button"
                  id="btn-cancel-user-edit"
                  onClick={resetForm}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
              )}
              <button
                type="submit"
                id="btn-save-user"
                disabled={loading}
                className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-semibold shadow-md shadow-emerald-700/10 transition-colors"
              >
                {editingUser ? "Simpan Perubahan" : "Buat Akun Baru"}
              </button>
            </div>
          </form>
        </div>

      </div>

      {/* Accounts List Table Column */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Global Notifications Inside View */}
        {error && (
          <div id="users-error-alert" className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl flex items-start text-xs">
            <AlertCircle className="w-5 h-5 mr-2.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div id="users-success-alert" className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-start text-xs">
            <CheckCircle className="w-5 h-5 mr-2.5 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-700" />
              <h4 className="font-bold text-slate-800 text-sm">Daftar Akun Pengguna Terdaftar</h4>
            </div>
            <button
              id="btn-refresh-users"
              onClick={loadUsersAndSettings}
              className="p-1.5 text-slate-400 hover:text-emerald-700 rounded-xl hover:bg-white transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table id="users-table" className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Nama</th>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Hak Akses</th>
                  <th className="py-3 px-4">Dibuat Pada</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-600">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-slate-800">{u.name}</td>
                    <td className="py-3 px-4 font-mono">{u.username}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                        u.role === "admin" 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}>
                        <Shield className="w-3 h-3" />
                        {u.role === "admin" ? "Admin" : "Viewer"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[10px]">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString("id-ID") : "-"}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="inline-flex gap-1">
                        <button
                          id={`btn-edit-user-${u.id}`}
                          onClick={() => handleStartEdit(u)}
                          className="p-1.5 text-slate-400 hover:text-emerald-700 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`btn-delete-user-${u.id}`}
                          onClick={() => handleDelete(u)}
                          disabled={u.username === "admin" || u.id === currentUser?.id}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
