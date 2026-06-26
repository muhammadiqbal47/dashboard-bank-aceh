import express from "express";
import path from "path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createServer as createViteServer } from "vite";
import { loadData, saveData } from "./server/db.js";
import { User, PerformanceRecord } from "./src/types.js";

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "bank-aceh-digital-secret-key-2026";

// Middlewares
app.use(express.json({ limit: "50mb" }));

// Helper to get authorization token from headers
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Sesi tidak valid, silakan masuk kembali." });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ message: "Sesi Anda telah berakhir, silakan masuk kembali." });
    }
    req.user = decoded;
    next();
  });
}

// Helper to check admin permission
function requireAdmin(req: any, res: any, next: any) {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Akses ditolak. Fitur ini hanya untuk administrator." });
  }
}

// ==========================================
// API ROUTES
// ==========================================

// Auth Login
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ message: "Username dan password wajib diisi." });
  }

  const db = loadData();
  const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());

  if (!user || !user.passwordHash) {
    return res.status(401).json({ message: "Username atau password salah." });
  }

  const isValid = bcrypt.compareSync(password, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ message: "Username atau password salah." });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt
    }
  });
});

// Auth Get Me
app.get("/api/auth/me", authenticateToken, (req: any, res) => {
  const db = loadData();
  const user = db.users.find(u => u.id === req.user.id);
  
  if (!user) {
    return res.status(404).json({ message: "User tidak ditemukan." });
  }

  res.json({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt
  });
});

// Users List (Admin only)
app.get("/api/users", authenticateToken, requireAdmin, (req, res) => {
  const db = loadData();
  const cleanUsers = db.users.map(u => ({
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt
  }));
  res.json(cleanUsers);
});

// Create User (Admin only)
app.post("/api/users", authenticateToken, requireAdmin, (req, res) => {
  const { username, name, password, role } = req.body;

  if (!username || !name || !password || !role) {
    return res.status(400).json({ message: "Semua kolom wajib diisi." });
  }

  const db = loadData();
  
  // Check if username exists
  const exists = db.users.some(u => u.username.toLowerCase() === username.toLowerCase());
  if (exists) {
    return res.status(400).json({ message: "Username sudah terdaftar." });
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  const newUser: User = {
    id: `usr-${Date.now()}`,
    username: username.toLowerCase(),
    name,
    role,
    passwordHash,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  saveData(db);

  res.status(201).json({
    id: newUser.id,
    username: newUser.username,
    name: newUser.name,
    role: newUser.role,
    createdAt: newUser.createdAt
  });
});

// Update User (Admin only)
app.put("/api/users/:id", authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { username, name, password, role } = req.body;

  const db = loadData();
  const userIdx = db.users.findIndex(u => u.id === id);

  if (userIdx === -1) {
    return res.status(404).json({ message: "Pengguna tidak ditemukan." });
  }

  // If username changed, check uniqueness
  if (username && username.toLowerCase() !== db.users[userIdx].username.toLowerCase()) {
    const exists = db.users.some(u => u.username.toLowerCase() === username.toLowerCase() && u.id !== id);
    if (exists) {
      return res.status(400).json({ message: "Username sudah digunakan." });
    }
    db.users[userIdx].username = username.toLowerCase();
  }

  if (name) db.users[userIdx].name = name;
  if (role) {
    // Prevent admin from removing their own admin status to avoid lockouts
    if (db.users[userIdx].username === "admin" && role !== "admin") {
      return res.status(400).json({ message: "Peran admin utama tidak dapat diubah." });
    }
    db.users[userIdx].role = role;
  }

  if (password) {
    const salt = bcrypt.genSaltSync(10);
    db.users[userIdx].passwordHash = bcrypt.hashSync(password, salt);
  }

  saveData(db);

  res.json({
    id: db.users[userIdx].id,
    username: db.users[userIdx].username,
    name: db.users[userIdx].name,
    role: db.users[userIdx].role,
    createdAt: db.users[userIdx].createdAt
  });
});

// Delete User (Admin only)
app.delete("/api/users/:id", authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const db = loadData();

  const user = db.users.find(u => u.id === id);
  if (!user) {
    return res.status(404).json({ message: "Pengguna tidak ditemukan." });
  }

  if (user.username === "admin") {
    return res.status(400).json({ message: "Akun admin utama tidak dapat dihapus." });
  }

  db.users = db.users.filter(u => u.id !== id);
  saveData(db);

  res.json({ message: `Pengguna ${user.name} berhasil dihapus.` });
});

// Branches list
app.get("/api/branches", (req, res) => {
  const db = loadData();
  res.json(db.branches);
});

// Settings Threshold route
app.get("/api/settings", authenticateToken, (req, res) => {
  const db = loadData();
  res.json({ notificationThreshold: db.settings?.notificationThreshold || 90 });
});

app.post("/api/settings", authenticateToken, requireAdmin, (req, res) => {
  const { notificationThreshold } = req.body;
  if (typeof notificationThreshold !== "number" || notificationThreshold < 1 || notificationThreshold > 100) {
    return res.status(400).json({ message: "Ambangan notifikasi harus berupa angka antara 1 dan 100." });
  }
  const db = loadData();
  db.settings = db.settings || { notificationThreshold: 90 };
  db.settings.notificationThreshold = notificationThreshold;
  saveData(db);
  res.json({ message: "Pengaturan berhasil diperbarui.", notificationThreshold });
});

// Get Performance Records (with filters)
app.get("/api/performance", (req, res) => {
  const { kodeCabang, startDate, endDate } = req.query;
  const db = loadData();
  
  let records = db.performanceData;

  if (kodeCabang && kodeCabang !== "all") {
    records = records.filter(r => r.kodeCabang === kodeCabang);
  }

  if (startDate) {
    records = records.filter(r => r.tanggal >= (startDate as string));
  }

  if (endDate) {
    records = records.filter(r => r.tanggal <= (endDate as string));
  }

  // Sort by date (descending) then row no (ascending)
  records.sort((a, b) => {
    if (b.tanggal !== a.tanggal) {
      return b.tanggal.localeCompare(a.tanggal);
    }
    return a.no - b.no;
  });

  res.json(records);
});

// Import Performance Records (Admin only)
app.post("/api/performance/import", authenticateToken, requireAdmin, (req, res) => {
  const { tanggal, rows } = req.body; // rows: list of { no, kodeCabang, namaProduk, target, realisasi }

  if (!tanggal) {
    return res.status(400).json({ message: "Tanggal pencapaian data wajib dipilih." });
  }

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ message: "Data excel tidak valid atau kosong." });
  }

  const db = loadData();

  // Validate and parse rows
  const newRecords: PerformanceRecord[] = [];
  let indexCounter = db.performanceData.length + 1;

  for (const row of rows) {
    const { no, kodeCabang, namaProduk, target, realisasi } = row;
    
    if (!kodeCabang || !namaProduk || target === undefined || realisasi === undefined) {
      return res.status(400).json({ message: `Format data pada Baris No ${no || ""} tidak lengkap.` });
    }

    const branch = db.branches.find(b => b.code === String(kodeCabang).trim().padStart(3, '0'));
    const branchName = branch ? branch.name : `Cabang ${kodeCabang}`;
    const branchCode = branch ? branch.code : String(kodeCabang).trim().padStart(3, '0');

    const numTarget = Number(target);
    const numRealisasi = Number(realisasi);
    const persentase = numTarget > 0 ? parseFloat(((numRealisasi / numTarget) * 100).toFixed(2)) : 0;

    newRecords.push({
      id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      no: Number(no) || indexCounter++,
      kodeCabang: branchCode,
      namaCabang: branchName,
      namaProduk: String(namaProduk).trim(),
      target: numTarget,
      realisasi: numRealisasi,
      persentase: persentase,
      tanggal: tanggal,
      importedAt: new Date().toISOString()
    });
  }

  // Remove existing records for this date to prevent duplicate imports for the same date/branch/product combos,
  // or we can append. Standard practice for daily uploads is to overwrite or merge.
  // Let's overwrite records of the same date and branches included in the current import to make re-importing easy!
  const branchesToOverwrite = Array.from(new Set(newRecords.map(r => r.kodeCabang)));
  
  db.performanceData = db.performanceData.filter(
    r => !(r.tanggal === tanggal && branchesToOverwrite.includes(r.kodeCabang))
  );

  // Append new records
  db.performanceData.push(...newRecords);
  saveData(db);

  res.status(201).json({
    message: `Berhasil mengimpor ${newRecords.length} data untuk tanggal ${tanggal}.`,
    count: newRecords.length
  });
});

// Delete specific records or batch delete by date/branch (Admin only)
app.post("/api/performance/delete-batch", authenticateToken, requireAdmin, (req, res) => {
  const { tanggal, kodeCabang } = req.body;

  if (!tanggal) {
    return res.status(400).json({ message: "Tanggal wajib ditentukan untuk penghapusan." });
  }

  const db = loadData();
  const initialLength = db.performanceData.length;

  if (kodeCabang && kodeCabang !== "all") {
    db.performanceData = db.performanceData.filter(
      r => !(r.tanggal === tanggal && r.kodeCabang === kodeCabang)
    );
  } else {
    db.performanceData = db.performanceData.filter(r => r.tanggal !== tanggal);
  }

  saveData(db);

  const deletedCount = initialLength - db.performanceData.length;
  res.json({ message: `Berhasil menghapus ${deletedCount} data pencapaian.` });
});

// Reset database to default mock data (Admin only)
app.post("/api/performance/reset", authenticateToken, requireAdmin, (req, res) => {
  const db = loadData();
  // Clear file and load again, db.ts loadData() automatically regenerates mock if deleted.
  const DATA_FILE = path.join(process.cwd(), "data-store.json");
  try {
    if (path.resolve(DATA_FILE)) {
      import("fs").then((fs) => {
        fs.unlinkSync(DATA_FILE);
        const reloaded = loadData();
        res.json({ message: "Database berhasil di-reset ke data default.", performanceCount: reloaded.performanceData.length });
      });
    }
  } catch (err: any) {
    res.status(500).json({ message: `Gagal me-reset database: ${err.message}` });
  }
});

// Start server function incorporating Vite middleware
async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
