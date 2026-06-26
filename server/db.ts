import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { User, Branch, PerformanceRecord } from "../src/types.js";

const DATA_FILE = path.join(process.cwd(), "data-store.json");

interface DataStore {
  users: User[];
  branches: Branch[];
  performanceData: PerformanceRecord[];
  settings: {
    notificationThreshold: number; // e.g. 90 for 90%
  };
}

const DEFAULT_BRANCHES: Branch[] = [
  { code: "010", name: "Cabang Utama Banda Aceh" },
  { code: "020", name: "Cabang Lhokseumawe" },
  { code: "030", name: "Cabang Langsa" },
  { code: "040", name: "Cabang Meulaboh" },
  { code: "050", name: "Cabang Sigli" },
  { code: "060", name: "Cabang Bireuen" },
  { code: "070", name: "Cabang Takengon" },
  { code: "080", name: "Cabang Tapaktuan" },
  { code: "090", name: "Cabang Kutacane" },
  { code: "100", name: "Cabang Subulussalam" }
];

const DIGITAL_PRODUCTS = [
  "Action Mobile",
  "Action Cash",
  "Action Pay (QRIS)",
  "Action Link",
  "Action CMS",
  "Action Card Debit"
];

function generateMockData(branches: Branch[]): PerformanceRecord[] {
  const data: PerformanceRecord[] = [];
  const dates = [
    "2026-06-20",
    "2026-06-21",
    "2026-06-22",
    "2026-06-23",
    "2026-06-24",
    "2026-06-25",
    "2026-06-26"
  ];

  let idCounter = 1;
  let rowCounter = 1;

  dates.forEach(date => {
    // Fill data for some branches
    branches.forEach((branch, bIdx) => {
      // Pick 3-4 products per branch to keep it varied
      DIGITAL_PRODUCTS.forEach((product, pIdx) => {
        // Base targets
        let target = 100;
        if (product === "Action Mobile") target = 500;
        else if (product === "Action Cash") target = 250;
        else if (product === "Action Pay (QRIS)") target = 400;
        else if (product === "Action CMS") target = 50;
        
        // Add variation based on branch and product index
        target = Math.round(target * (0.8 + (bIdx % 5) * 0.1));
        
        // Realisasi (performance) has daily random fluctuation
        const performanceMultiplier = 0.7 + (Math.sin(bIdx + pIdx + idCounter) * 0.25) + 0.1; 
        const realisasi = Math.round(target * performanceMultiplier);
        const persentase = parseFloat(((realisasi / target) * 100).toFixed(2));

        data.push({
          id: `rec-${idCounter++}`,
          no: rowCounter++,
          kodeCabang: branch.code,
          namaCabang: branch.name,
          namaProduk: product,
          target: target,
          realisasi: realisasi,
          persentase: persentase,
          tanggal: date,
          importedAt: new Date().toISOString()
        });
      });
    });
  });

  return data;
}

export function loadData(): DataStore {
  if (!fs.existsSync(DATA_FILE)) {
    const salt = bcrypt.genSaltSync(10);
    const adminPasswordHash = bcrypt.hashSync("admin123", salt);
    const viewerPasswordHash = bcrypt.hashSync("viewer123", salt);

    const store: DataStore = {
      users: [
        {
          id: "usr-1",
          username: "admin",
          name: "Admin Bank Aceh",
          role: "admin",
          passwordHash: adminPasswordHash,
          createdAt: new Date().toISOString()
        },
        {
          id: "usr-2",
          username: "viewer",
          name: "Viewer Bank Aceh",
          role: "viewer",
          passwordHash: viewerPasswordHash,
          createdAt: new Date().toISOString()
        }
      ],
      branches: DEFAULT_BRANCHES,
      performanceData: generateMockData(DEFAULT_BRANCHES),
      settings: {
        notificationThreshold: 90
      }
    };

    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
    return store;
  }

  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading data store file, resetting...", err);
    // Return empty store structure or backup
    return {
      users: [],
      branches: DEFAULT_BRANCHES,
      performanceData: [],
      settings: { notificationThreshold: 90 }
    };
  }
}

export function saveData(data: DataStore) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}
