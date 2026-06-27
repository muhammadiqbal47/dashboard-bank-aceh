import React, { useState } from "react";
import { api } from "../utils/api";
import { User } from "../types";
import { Shield, KeyRound, AlertCircle, RefreshCw, Landmark } from "lucide-react";
import { motion } from "motion/react";

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Silakan isi username dan password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await api.login(username, password);
      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message || "Gagal masuk. Username atau password salah.");
    } finally {
      setLoading(false);
    }
  };

  const autofill = (userType: "admin" | "viewer") => {
    if (userType === "admin") {
      setUsername("admin");
      setPassword("admin123");
    } else {
      setUsername("viewer");
      setPassword("viewer123");
    }
  };

  return (
    <div id="login-container" className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className="flex justify-center">
          <img
            src="/logo-bank-aceh.png?v=2" 
            className="w-20 h-20 object-contain bg-white p-2 rounded-2xl border border-emerald-100 shadow-sm"
            referrerPolicy="no-referrer"
            alt="Logo Bank Aceh"
          />
        </div>
        <h2 id="login-title" className="mt-6 text-center text-3xl font-extrabold tracking-tight text-slate-800">
          Bank Aceh
        </h2>
        <p id="login-subtitle" className="mt-2 text-center text-sm text-slate-600">
          Sistem Monitoring Target & Pencapaian Produk Digital
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }} 
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className="bg-white py-8 px-4 shadow-xl border border-slate-100 rounded-2xl sm:px-10">
          {error && (
            <div id="error-alert" className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl flex items-start text-sm">
              <AlertCircle className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form id="login-form" className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-slate-700">
                Username Pengguna
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-sm transition-all"
                  placeholder="Masukkan username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                Password / Kata Sandi
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-sm transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                id="btn-login-submit"
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 shadow-lg shadow-emerald-700/10 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <KeyRound className="w-5 h-5 mr-2" />
                )}
                {loading ? "Memverifikasi..." : "Masuk Ke Aplikasi"}
              </button>
            </div>
          </form>

          {/* Quick Login / Sandbox credentials block */}
          <div className="mt-8 border-t border-slate-100 pt-6">
            <h4 id="demo-title" className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center">
              <Shield className="w-3.5 h-3.5 mr-1" /> Akun Demo Pengujian
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <button
                id="btn-fill-admin"
                onClick={() => autofill("admin")}
                className="flex flex-col items-start p-2.5 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-100 rounded-xl transition-colors text-left"
              >
                <span className="font-semibold text-emerald-800">Akses Admin</span>
                <span className="text-[10px] text-emerald-600 mt-0.5">user: admin</span>
                <span className="text-[10px] text-emerald-600">pass: admin123</span>
              </button>
              <button
                id="btn-fill-viewer"
                onClick={() => autofill("viewer")}
                className="flex flex-col items-start p-2.5 bg-slate-100 hover:bg-slate-200/70 border border-slate-200 rounded-xl transition-colors text-left"
              >
                <span className="font-semibold text-slate-700">Akses Viewer</span>
                <span className="text-[10px] text-slate-500 mt-0.5">user: viewer</span>
                <span className="text-[10px] text-slate-500">pass: viewer123</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
