import express from "express";
import path from "path";
import fs from "fs";
import child_process from "child_process";
import * as net from "net";
import { createServer as createViteServer } from "vite";
import { ScriptApp, MinecraftServer, SystemStats, FileItem } from "./src/types";

const app = express();
const PORT = process.env.PORT || 3000;

// Track real running child processes in memory
const activeProcesses = new Map<string, child_process.ChildProcess>();

// Use JSON parser with generous limit for file uploads/code edits
app.use(express.json({ limit: '20mb' }));

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const APPS_DIR = path.join(DATA_DIR, "apps");
const MINECRAFT_DIR = path.join(DATA_DIR, "minecraft");

// Helper to ensure directory structure exists
function initDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(APPS_DIR)) {
    fs.mkdirSync(APPS_DIR, { recursive: true });
  }
  if (!fs.existsSync(MINECRAFT_DIR)) {
    fs.mkdirSync(MINECRAFT_DIR, { recursive: true });
  }

  // Create default seed data if database file doesn't exist
  if (!fs.existsSync(DB_FILE)) {
    const defaultData = {
      apps: [
        {
          id: "app-python-sc",
          name: "Data Scraper Script",
          type: "python",
          status: "running",
          created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
          entry_point: "scraper.py",
          packages: ["requests", "beautifulsoup4"],
          env_vars: { "ENV": "production", "INTERVAL_SEC": "3600" },
          cpuUsage: 1.2,
          memoryUsage: 45.3,
          logs: [
            "[INFO] [2026-08-30 02:00:00] Initializing scraper environment...",
            "[INFO] [2026-08-30 02:00:01] Verifying python interpreter... v3.10.8 found",
            "[SYSTEM] [2026-08-30 02:00:02] Running 'pip install requests beautifulsoup4'...",
            "[SYSTEM] [2026-08-30 02:00:05] Successfully installed requests-2.31.0 beautifulsoup4-4.12.2",
            "[INFO] [2026-08-30 02:00:06] Executing 'python scraper.py'...",
            "[INFO] [2026-08-30 02:00:07] [Scraper] Connecting to target host...",
            "[SUCCESS] [2026-08-30 02:00:08] [Scraper] Processed 142 records successfully.",
            "[INFO] [2026-08-30 02:00:08] [Scraper] Idle state reached. Sleeping..."
          ]
        },
        {
          id: "app-node-api",
          name: "REST API Microservice",
          type: "node",
          status: "stopped",
          created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
          entry_point: "server.js",
          packages: ["express", "cors"],
          env_vars: { "PORT": "8080", "NODE_ENV": "production" },
          cpuUsage: 0,
          memoryUsage: 0,
          logs: [
            "[SYSTEM] [2026-08-29 11:30:00] Initializing deployment pipeline...",
            "[SYSTEM] [2026-08-29 11:30:01] Running 'npm install express cors'...",
            "[SYSTEM] [2026-08-29 11:30:04] Added 42 packages. npm install complete.",
            "[INFO] [2026-08-29 11:30:05] Node.js server stopped by administrator."
          ]
        }
      ],
      minecraft_servers: [
        {
          id: "mc-survival",
          name: "Bengal Survival Server",
          version: "1.20.4",
          type: "paper",
          status: "running",
          created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
          online_mode: false,
          port: 25565,
          max_players: 20,
          motd: "A Bangladesh & Global Minecraft Community Server",
          difficulty: "normal",
          gamemode: "survival",
          plugins: ["EssentialsX.jar", "WorldEdit.jar", "LuckPerms.jar"],
          cpuUsage: 8.5,
          memoryUsage: 1450.2,
          logs: [
            "[02:00:01 INFO]: Starting minecraft server version 1.20.4",
            "[02:00:02 INFO]: Loading properties",
            "[02:00:02 INFO]: Default game type: SURVIVAL",
            "[02:00:02 INFO]: Generating keypair",
            "[02:00:03 INFO]: Starting Minecraft server on *:25565",
            "[02:00:03 INFO]: Using epoll channel type",
            "[02:00:04 INFO]: Paper: Using 8 threads for world generation",
            "[02:00:05 INFO]: Preparing level \"world\"",
            "[02:00:06 INFO]: Preparing start region for dimension minecraft:overworld",
            "[02:00:07 INFO]: Preparing spawn area: 24%",
            "[02:00:08 INFO]: Preparing spawn area: 65%",
            "[02:00:09 INFO]: Preparing spawn area: 100%",
            "[02:00:09 INFO]: Time elapsed: 3512 ms",
            "[02:00:09 INFO]: Done (3.512s)! For help, type \"help\"",
            "[02:02:15 INFO]: Player 'Foros' connected with UUID 8872e811-13cf-42bf-90b1-4f114ea0f6a2",
            "[02:02:16 INFO]: Foros join the game from 127.0.0.1:51102"
          ]
        }
      ]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), "utf8");

    // Also populate actual folders for the default data to make file editing works immediately!
    createDefaultMinecraftFiles("mc-survival");
    createDefaultScriptFiles("app-python-sc", "scraper.py", `import time
import requests
print("[Scraper] Starting data extraction loop...")
# Simulated loop
for i in range(5):
    print(f"[Scraper] Fetching batch {i+1}...")
    time.sleep(1)
print("[Scraper] Process completed successfully.")
`);
    createDefaultScriptFiles("app-node-api", "server.js", `const express = require('express');
const app = express();
app.get('/api', (req, res) => res.json({ status: "online" }));
app.listen(8080, () => console.log("Node server running on port 8080"));
`);
  }
}

function createDefaultMinecraftFiles(id: string) {
  const srvPath = path.join(MINECRAFT_DIR, id);
  if (!fs.existsSync(srvPath)) {
    fs.mkdirSync(srvPath, { recursive: true });
  }

  // Create server.jar placeholder
  fs.writeFileSync(path.join(srvPath, "server.jar"), "placeholder-jar-file", "utf8");

  // Create eula.txt
  fs.writeFileSync(path.join(srvPath, "eula.txt"), "#By changing the setting below to TRUE you are indicating your agreement to our EULA.\n#Sun Aug 30 02:00:00 UTC 2026\neula=true\n", "utf8");

  // Create server.properties
  fs.writeFileSync(path.join(srvPath, "server.properties"), `#Minecraft server properties
#Sun Aug 30 02:00:00 UTC 2026
enable-jmx-monitoring=false
rcon.port=25575
level-seed=
gamemode=survival
enable-query=false
allow-flight=false
prevent-proxy-connections=false
online-mode=false
enable-rcon=false
difficulty=normal
network-compression-threshold=256
max-players=20
server-port=25565
motd=A Bangladesh & Global Minecraft Community Server
`, "utf8");

  // Create plugins directory
  const pluginsDir = path.join(srvPath, "plugins");
  if (!fs.existsSync(pluginsDir)) {
    fs.mkdirSync(pluginsDir, { recursive: true });
  }
  fs.writeFileSync(path.join(pluginsDir, "EssentialsX.jar"), "mock-plugin-content", "utf8");
  fs.writeFileSync(path.join(pluginsDir, "WorldEdit.jar"), "mock-plugin-content", "utf8");
  fs.writeFileSync(path.join(pluginsDir, "LuckPerms.jar"), "mock-plugin-content", "utf8");

  // Create spigot.yml
  fs.writeFileSync(path.join(srvPath, "spigot.yml"), "# Spigot configuration file\nsettings:\n  save-user-cache-on-stop-only: false\n", "utf8");
}

function createDefaultScriptFiles(id: string, entryFile: string, content: string) {
  const appPath = path.join(APPS_DIR, id);
  if (!fs.existsSync(appPath)) {
    fs.mkdirSync(appPath, { recursive: true });
  }
  fs.writeFileSync(path.join(appPath, entryFile), content, "utf8");
  if (entryFile.endsWith(".py")) {
    fs.writeFileSync(path.join(appPath, "requirements.txt"), "requests==2.31.0\nbeautifulsoup4==4.12.2\n", "utf8");
  } else {
    fs.writeFileSync(path.join(appPath, "package.json"), JSON.stringify({
      name: id,
      version: "1.0.0",
      main: entryFile,
      dependencies: {
        "express": "^4.18.2",
        "cors": "^2.8.5"
      }
    }, null, 2), "utf8");
  }
}

// Auto-detect imported packages from Python and Node.js code
function detectImports(code: string, type: "python" | "node"): string[] {
  const packages = new Set<string>();
  
  if (type === "python") {
    const pyBuiltins = new Set([
      "os", "sys", "json", "time", "math", "random", "re", "datetime", "urllib", "collections", 
      "itertools", "hashlib", "socket", "threading", "multiprocessing", "subprocess", "shutil", 
      "tempfile", "xml", "csv", "pathlib", "ast", "asyncio", "base64", "copy", "functools", 
      "logging", "select", "struct", "traceback", "uuid", "abc", "argparse", "ctypes", "email", 
      "hmac", "html", "http", "io", "mimetypes", "pickle", "platform", "queue", "ssl", "stat", 
      "string", "tarfile", "types", "typing", "warnings", "weakref", "zipfile", "math"
    ]);

    // Matches 'import pkg', 'import pkg as alias', 'import pkg1, pkg2'
    const importRegex = /^\s*import\s+([a-zA-Z0-9_, \t]+)/gm;
    // Matches 'from pkg import module'
    const fromImportRegex = /^\s*from\s+([a-zA-Z0-9_.]+)\s+import/gm;

    let match;
    while ((match = importRegex.exec(code)) !== null) {
      const parts = match[1].split(",");
      parts.forEach(part => {
        const clean = part.trim().split(/\s+/)[0].split(".")[0];
        if (clean && !pyBuiltins.has(clean)) {
          packages.add(clean);
        }
      });
    }

    while ((match = fromImportRegex.exec(code)) !== null) {
      const clean = match[1].trim().split(".")[0];
      if (clean && !pyBuiltins.has(clean)) {
        packages.add(clean);
      }
    }
  } else {
    // Node.js
    const nodeBuiltins = new Set([
      "fs", "path", "http", "https", "crypto", "os", "util", "events", "stream", "child_process", 
      "dns", "net", "url", "querystring", "zlib", "assert", "buffer", "cluster", "constants", 
      "dgram", "fs/promises", "module", "process", "punycode", "readline", "repl", "string_decoder", 
      "tls", "tty", "v8", "vm"
    ]);

    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    const importRegex = /from\s+['"]([^'"]+)['"]/g;
    const directImportRegex = /import\s+['"]([^'"]+)['"]/g;

    let match;
    while ((match = requireRegex.exec(code)) !== null) {
      const clean = match[1].trim().split("/")[0];
      if (clean && !nodeBuiltins.has(clean) && !clean.startsWith(".") && !clean.startsWith("/")) {
        packages.add(clean);
      }
    }

    while ((match = importRegex.exec(code)) !== null) {
      const clean = match[1].trim().split("/")[0];
      if (clean && !nodeBuiltins.has(clean) && !clean.startsWith(".") && !clean.startsWith("/")) {
        packages.add(clean);
      }
    }

    while ((match = directImportRegex.exec(code)) !== null) {
      const clean = match[1].trim().split("/")[0];
      if (clean && !nodeBuiltins.has(clean) && !clean.startsWith(".") && !clean.startsWith("/")) {
        packages.add(clean);
      }
    }
  }

  return Array.from(packages);
}

// Read database helper
function readDB(): { apps: ScriptApp[]; minecraft_servers: MinecraftServer[] } {
  try {
    const data = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    return { apps: [], minecraft_servers: [] };
  }
}

// Write database helper
function writeDB(data: { apps: ScriptApp[]; minecraft_servers: MinecraftServer[] }) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
}

// Start a real application background process and stream its logs
function startAppProcess(appId: string) {
  const db = readDB();
  const appItem = db.apps.find(a => a.id === appId);
  if (!appItem || appItem.status !== "running") return;

  // Kill existing running process for safety
  const existing = activeProcesses.get(appId);
  if (existing) {
    try { existing.kill("SIGKILL"); } catch (e) {}
    activeProcesses.delete(appId);
  }

  const appPath = path.join(APPS_DIR, appId);
  const entryPoint = appItem.entry_point;
  const filePath = path.join(appPath, entryPoint);

  if (!fs.existsSync(filePath)) {
    appItem.logs.push(`[ERROR] Entry point file '${entryPoint}' not found in workspace.`);
    appItem.status = "failed";
    writeDB(db);
    return;
  }

  appItem.logs.push(`[SYSTEM] Spawning process: ${appItem.type === "python" ? "python3" : "node"} ${entryPoint}`);
  writeDB(db);

  let child: child_process.ChildProcess;

  try {
    if (appItem.type === "python") {
      child = child_process.spawn("python3", ["-u", entryPoint], {
        cwd: appPath,
        env: { ...process.env, ...appItem.env_vars }
      });
    } else {
      child = child_process.spawn("node", [entryPoint], {
        cwd: appPath,
        env: { ...process.env, ...appItem.env_vars }
      });
    }
  } catch (err: any) {
    const liveDB = readDB();
    const liveApp = liveDB.apps.find(a => a.id === appId);
    if (liveApp) {
      liveApp.status = "failed";
      liveApp.logs.push(`[ERROR] Failed to spawn process: ${err.message}`);
      writeDB(liveDB);
    }
    return;
  }

  activeProcesses.set(appId, child);

  // Capture stdout
  child.stdout?.on("data", (data) => {
    const text = data.toString();
    const lines = text.split("\n");
    const liveDB = readDB();
    const liveApp = liveDB.apps.find(a => a.id === appId);
    if (liveApp) {
      lines.forEach((line: string) => {
        const trimmed = line.trim();
        if (trimmed) {
          liveApp.logs.push(`[INFO] ${trimmed}`);
        }
      });
      if (liveApp.logs.length > 250) {
        liveApp.logs = liveApp.logs.slice(-250);
      }
      writeDB(liveDB);
    }
  });

  // Capture stderr
  child.stderr?.on("data", (data) => {
    const text = data.toString();
    const lines = text.split("\n");
    const liveDB = readDB();
    const liveApp = liveDB.apps.find(a => a.id === appId);
    if (liveApp) {
      lines.forEach((line: string) => {
        const trimmed = line.trim();
        if (trimmed) {
          liveApp.logs.push(`[ERROR] ${trimmed}`);
        }
      });
      if (liveApp.logs.length > 250) {
        liveApp.logs = liveApp.logs.slice(-250);
      }
      writeDB(liveDB);
    }
  });

  // Handle close
  child.on("close", (code) => {
    activeProcesses.delete(appId);
    const liveDB = readDB();
    const liveApp = liveDB.apps.find(a => a.id === appId);
    if (liveApp && liveApp.status === "running") {
      liveApp.status = code === 0 ? "stopped" : "failed";
      liveApp.logs.push(`[SYSTEM] Process exited with code ${code}.`);
      writeDB(liveDB);
    }
  });

  child.on("error", (err) => {
    activeProcesses.delete(appId);
    const liveDB = readDB();
    const liveApp = liveDB.apps.find(a => a.id === appId);
    if (liveApp) {
      liveApp.status = "failed";
      liveApp.logs.push(`[ERROR] Process runtime error: ${err.message}`);
      writeDB(liveDB);
    }
  });
}

// Stop active process gracefully
function stopAppProcess(appId: string) {
  const existing = activeProcesses.get(appId);
  if (existing) {
    try {
      existing.kill("SIGTERM");
    } catch (e) {}
    activeProcesses.delete(appId);
  }
}

// Run packages installer pipeline (real npm install or pip install)
function installAppPackages(appId: string, packages: string[], callback: () => void) {
  const db = readDB();
  const appItem = db.apps.find(a => a.id === appId);
  if (!appItem) {
    callback();
    return;
  }

  if (!packages || packages.length === 0) {
    appItem.status = "running";
    writeDB(db);
    startAppProcess(appId);
    callback();
    return;
  }

  appItem.status = "installing";
  appItem.logs.push(`[SYSTEM] Launching real environment package installer for: ${packages.join(", ")}`);
  writeDB(db);

  const appPath = path.join(APPS_DIR, appId);
  let installer: child_process.ChildProcess;

  if (appItem.type === "python") {
    // Map standard aliases to real pip package names
    const mappedPkgs = packages.map(p => {
      const clean = p.trim();
      if (clean === "telebot") return "pyTelegramBotAPI";
      if (clean === "dotenv") return "python-dotenv";
      return clean;
    });
    
    // Check if pip is available or fallback
    installer = child_process.spawn("python3", ["-m", "pip", "install", "--break-system-packages", ...mappedPkgs], {
      cwd: appPath
    });
  } else {
    installer = child_process.spawn("npm", ["install", "--no-audit", "--no-fund", ...packages], {
      cwd: appPath
    });
  }

  installer.stdout?.on("data", (data) => {
    const text = data.toString();
    const lines = text.split("\n");
    const liveDB = readDB();
    const liveApp = liveDB.apps.find(a => a.id === appId);
    if (liveApp) {
      lines.forEach((line: string) => {
        const trimmed = line.trim();
        if (trimmed) {
          liveApp.logs.push(`[INSTALL] ${trimmed}`);
        }
      });
      writeDB(liveDB);
    }
  });

  installer.stderr?.on("data", (data) => {
    const text = data.toString();
    const lines = text.split("\n");
    const liveDB = readDB();
    const liveApp = liveDB.apps.find(a => a.id === appId);
    if (liveApp) {
      lines.forEach((line: string) => {
        const trimmed = line.trim();
        if (trimmed) {
          liveApp.logs.push(`[INSTALL] ${trimmed}`);
        }
      });
      writeDB(liveDB);
    }
  });

  installer.on("close", (code) => {
    const liveDB = readDB();
    const liveApp = liveDB.apps.find(a => a.id === appId);
    if (liveApp) {
      if (code === 0) {
        liveApp.logs.push(`[SUCCESS] Package installation completed successfully.`);
        liveApp.status = "running";
        writeDB(liveDB);
        startAppProcess(appId);
      } else {
        liveApp.logs.push(`[WARNING] Package installation exited with code ${code}. Attempting to launch script anyways...`);
        liveApp.status = "running";
        writeDB(liveDB);
        startAppProcess(appId);
      }
    }
    callback();
  });

  installer.on("error", (err) => {
    const liveDB = readDB();
    const liveApp = liveDB.apps.find(a => a.id === appId);
    if (liveApp) {
      liveApp.logs.push(`[WARNING] Installer spawn error: ${err.message}. Direct-launching script...`);
      liveApp.status = "running";
      writeDB(liveDB);
      startAppProcess(appId);
    }
    callback();
  });
}

// Initialize database before setting up routes
initDatabase();

// Resource usage fluctuation simulation
setInterval(() => {
  const db = readDB();
  let modified = false;

  db.apps.forEach((app) => {
    if (app.status === "running") {
      // Dynamic simulated CPU/RAM changes
      app.cpuUsage = +(Math.random() * 3 + 0.5).toFixed(1);
      app.memoryUsage = +(Math.random() * 10 + 40).toFixed(1);
      modified = true;
    } else {
      app.cpuUsage = 0;
      app.memoryUsage = 0;
    }
  });

  db.minecraft_servers.forEach((srv) => {
    if (srv.status === "running") {
      srv.cpuUsage = +(Math.random() * 15 + 5).toFixed(1);
      srv.memoryUsage = +(Math.random() * 100 + 1350).toFixed(1);
      modified = true;
    } else {
      srv.cpuUsage = 0;
      srv.memoryUsage = 0;
    }
  });

  if (modified) {
    writeDB(db);
  }
}, 5000);

// --- API ENDPOINTS ---

// GET Uptime & global status
app.get("/api/status", (req, res) => {
  const db = readDB();
  const activeApps = db.apps.filter(a => a.status === 'running').length;
  const activeMcServers = db.minecraft_servers.filter(s => s.status === 'running').length;

  const totalMemory = 16384; // 16GB Simulated total
  let usedMemory = 2140; // Base system usage
  db.apps.forEach(a => usedMemory += a.memoryUsage);
  db.minecraft_servers.forEach(s => usedMemory += s.memoryUsage);

  const stats: SystemStats = {
    cpu: +(activeApps * 1.5 + activeMcServers * 8.2 + Math.random() * 3 + 2).toFixed(1),
    memory: +((usedMemory / totalMemory) * 100).toFixed(1),
    memoryTotal: "16 GB",
    memoryUsed: `${(usedMemory / 1024).toFixed(2)} GB`,
    disk: 34.8, // 34.8% used of 120GB
    uptime: "4d 18h 32m",
    activeApps,
    activeMcServers
  };

  res.json(stats);
});

// --- SCRIPT APPLICATIONS ENDPOINTS ---

// GET list of apps
app.get("/api/apps", (req, res) => {
  const db = readDB();
  res.json(db.apps);
});

// POST Deploy app
app.post("/api/apps", (req, res) => {
  const { name, type, entryPoint, packages, content } = req.body;

  if (!name || !type || !entryPoint || !content) {
    return res.status(400).json({ error: "Missing required fields: name, type, entryPoint, content" });
  }

  const db = readDB();
  const app_id = "app-" + Date.now().toString().slice(-6);

  // Parse manual packages
  const manualPackages = packages
    ? packages.split(",").map((p: string) => p.trim()).filter((p: string) => p.length > 0)
    : [];

  // Automatically parse imports from uploaded file content (auto requirements scanning!)
  const detectedPackages = detectImports(content, type);
  const mergedPackages = Array.from(new Set([...manualPackages, ...detectedPackages]));

  // Create real folders and files
  createDefaultScriptFiles(app_id, entryPoint, content);

  const initialLogs = [
    `[SYSTEM] [${new Date().toISOString()}] Registering deployment for ${name}...`,
    `[SYSTEM] [${new Date().toISOString()}] Creating workspace directory: /data/apps/${app_id}`,
    `[SYSTEM] [${new Date().toISOString()}] Saved source file: ${entryPoint}`,
    `[SYSTEM] [${new Date().toISOString()}] Auto-detecting compiler environments: ${type === "python" ? "Python 3.10.8" : "Node.js 18.16.0"}`
  ];

  if (detectedPackages.length > 0) {
    initialLogs.push(`[SYSTEM] [${new Date().toISOString()}] Auto-detected script library requirements: ${detectedPackages.join(", ")}`);
  }

  const newApp: ScriptApp = {
    id: app_id,
    name,
    type,
    status: "installing",
    created_at: new Date().toISOString(),
    entry_point: entryPoint,
    packages: mergedPackages,
    env_vars: { "PORT": "8080" },
    cpuUsage: 0,
    memoryUsage: 0,
    logs: initialLogs
  };

  db.apps.push(newApp);
  writeDB(db);

  // Trigger live package installation and application startup in the background
  installAppPackages(app_id, mergedPackages, () => {
    console.log(`[SYSTEM] App ${app_id} setup finalized.`);
  });

  res.json(newApp);
});

// GET single app details
app.get("/api/apps/:id", (req, res) => {
  const db = readDB();
  const appItem = db.apps.find(a => a.id === req.params.id);
  if (!appItem) return res.status(404).json({ error: "App not found" });

  // Load entry point file contents dynamically to return to file manager/editor
  const appPath = path.join(APPS_DIR, appItem.id);
  let code = "";
  try {
    const filePath = path.join(appPath, appItem.entry_point);
    if (fs.existsSync(filePath)) {
      code = fs.readFileSync(filePath, "utf8");
    }
  } catch (err) {
    code = "# Error loading source file";
  }

  res.json({ ...appItem, code });
});

// POST power action for app
app.post("/api/apps/:id/action", (req, res) => {
  const { action } = req.body;
  const db = readDB();
  const appItem = db.apps.find(a => a.id === req.params.id);
  if (!appItem) return res.status(404).json({ error: "App not found" });

  const timeStr = new Date().toISOString();

  if (action === "start") {
    appItem.status = "installing";
    appItem.logs.push(`[SYSTEM] [${timeStr}] Verifying and installing package dependencies...`);
    writeDB(db);
    installAppPackages(appItem.id, appItem.packages || [], () => {
      console.log(`[SYSTEM] App ${appItem.id} start flow finished.`);
    });
  } else if (action === "stop") {
    appItem.status = "stopped";
    appItem.cpuUsage = 0;
    appItem.memoryUsage = 0;
    appItem.logs.push(`[SYSTEM] [${timeStr}] Received SIGTERM signal. Stopping process gracefully...`);
    writeDB(db);
    stopAppProcess(appItem.id);
  } else if (action === "restart") {
    appItem.status = "installing";
    appItem.logs.push(`[SYSTEM] [${timeStr}] Restart signal received. Killing current instance...`);
    writeDB(db);
    stopAppProcess(appItem.id);
    installAppPackages(appItem.id, appItem.packages || [], () => {
      console.log(`[SYSTEM] App ${appItem.id} restart flow finished.`);
    });
  }

  writeDB(db);
  res.json(appItem);
});

// POST edit file in App
app.post("/api/apps/:id/edit-file", (req, res) => {
  const { content } = req.body;
  const db = readDB();
  const appItem = db.apps.find(a => a.id === req.params.id);
  if (!appItem) return res.status(404).json({ error: "App not found" });

  const appPath = path.join(APPS_DIR, appItem.id);
  try {
    const filePath = path.join(appPath, appItem.entry_point);
    fs.writeFileSync(filePath, content, "utf8");

    // Scan for newly added dependencies
    const detected = detectImports(content, appItem.type);
    const existing = appItem.packages || [];
    const missing = detected.filter(p => !existing.includes(p));

    // Stop current running process first to release file locks
    stopAppProcess(appItem.id);

    if (missing.length > 0) {
      appItem.packages = Array.from(new Set([...existing, ...detected]));
      appItem.status = "installing";
      appItem.logs.push(`[SYSTEM] [${new Date().toISOString()}] Code edit introduced new dependencies: ${missing.join(", ")}`);
      writeDB(db);

      // Trigger live installer in background and then auto-start process
      installAppPackages(appItem.id, missing, () => {
        console.log(`[SYSTEM] Dynamic hot-reload package installation finalized.`);
      });
    } else {
      appItem.logs.push(`[SYSTEM] [${new Date().toISOString()}] File '${appItem.entry_point}' edited by administrator. Reloading application...`);
      writeDB(db);
      if (appItem.status === "running") {
        appItem.logs.push(`[SYSTEM] Restarting to apply edits...`);
        writeDB(db);
        startAppProcess(appItem.id);
      }
    }

    res.json({ success: true, app: appItem });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to write file: " + err.message });
  }
});

// DELETE app
app.delete("/api/apps/:id", (req, res) => {
  const db = readDB();
  const initialCount = db.apps.length;
  db.apps = db.apps.filter(a => a.id !== req.params.id);

  if (db.apps.length === initialCount) {
    return res.status(404).json({ error: "App not found" });
  }

  // Stop the child process
  stopAppProcess(req.params.id);

  // Clean up directory
  try {
    const appPath = path.join(APPS_DIR, req.params.id);
    if (fs.existsSync(appPath)) {
      fs.rmSync(appPath, { recursive: true, force: true });
    }
  } catch (err) {}

  writeDB(db);
  res.json({ success: true });
});

const activeMcListeners: { [id: string]: net.Server } = {};

function writeVarInt(val: number): Buffer {
  const bytes: number[] = [];
  let temp = val;
  while (true) {
    if ((temp & ~0x7F) === 0) {
      bytes.push(temp);
      break;
    }
    bytes.push((temp & 0x7F) | 0x80);
    temp >>>= 7;
  }
  return Buffer.from(bytes);
}

function writeString(str: string): Buffer {
  const strBuf = Buffer.from(str, "utf8");
  const lenBuf = writeVarInt(strBuf.length);
  return Buffer.concat([lenBuf, strBuf]);
}

function startMinecraftServerListener(srv: any) {
  stopMinecraftServerListener(srv.id);

  const server = net.createServer((socket) => {
    socket.on("data", (data) => {
      try {
        if (data.length > 0) {
          const hasStatusRequest = data.includes(Buffer.from([0x01, 0x00])) || (data[0] === 0x01 && data[1] === 0x00);
          
          if (hasStatusRequest || data.length < 5) {
            const statusObj = {
              version: {
                name: srv.version || "1.20.4",
                protocol: 765
              },
              players: {
                max: srv.max_players || 20,
                online: srv.status === "running" ? 1 : 0,
                sample: srv.status === "running" ? [
                  { name: "Foros", id: "8872e811-13cf-42bf-90b1-4f114ea0f6a2" }
                ] : []
              },
              description: {
                text: srv.motd || `A Minecraft ${srv.type?.toUpperCase() || 'PAPER'} Server`
              }
            };
            
            const jsonString = JSON.stringify(statusObj);
            const packetIdBuf = writeVarInt(0x00);
            const jsonBuf = writeString(jsonString);
            const packetData = Buffer.concat([packetIdBuf, jsonBuf]);
            const packetLengthBuf = writeVarInt(packetData.length);
            const response = Buffer.concat([packetLengthBuf, packetData]);
            
            socket.write(response);
          } else if (data[1] === 0x01) {
            const payload = data.slice(2);
            const packetIdBuf = writeVarInt(0x01);
            const packetData = Buffer.concat([packetIdBuf, payload]);
            const packetLengthBuf = writeVarInt(packetData.length);
            const pongResponse = Buffer.concat([packetLengthBuf, packetData]);
            
            socket.write(pongResponse);
            socket.end();
          }
        }
      } catch (err) {
        console.error("Error in Minecraft SLP connection handler:", err);
      }
    });

    socket.on("error", () => {});
  });

  server.on("error", (err: any) => {
    console.warn(`Minecraft SLP TCP listener bind error on port ${srv.port}:`, err.message);
  });

  const listenPort = srv.port || 25565;
  server.listen(listenPort, "0.0.0.0", () => {
    console.log(`[SLP] Minecraft simulated server '${srv.name}' listening on TCP port ${listenPort}`);
  });

  activeMcListeners[srv.id] = server;
}

function stopMinecraftServerListener(id: string) {
  if (activeMcListeners[id]) {
    try {
      activeMcListeners[id].close();
      console.log(`[SLP] Stopped TCP listener for Minecraft server: ${id}`);
    } catch (err) {}
    delete activeMcListeners[id];
  }
}

// --- MINECRAFT SERVER ENDPOINTS ---

// GET list of Minecraft servers
app.get("/api/minecraft", (req, res) => {
  const db = readDB();
  res.json(db.minecraft_servers);
});

// POST Create Minecraft Server
app.post("/api/minecraft", (req, res) => {
  const { name, version, type, online_mode } = req.body;

  if (!name || !version || !type) {
    return res.status(400).json({ error: "Missing required fields: name, version, type" });
  }

  const db = readDB();
  const mc_id = "mc-" + Date.now().toString().slice(-6);

  const initialLogs = [
    `[PANEL] [${new Date().toISOString()}] Creating new Minecraft Server profile...`,
    `[PANEL] [${new Date().toISOString()}] Allocating physical directory: /data/minecraft/${mc_id}`,
    `[PANEL] [${new Date().toISOString()}] Configuration properties loaded: Type=${type}, Version=${version}, online-mode=${online_mode}`
  ];

  const newServer: MinecraftServer = {
    id: mc_id,
    name,
    version,
    type,
    status: "installing",
    created_at: new Date().toISOString(),
    online_mode: online_mode === "true" || online_mode === true,
    port: 25565,
    max_players: 20,
    motd: `A Minecraft ${type.toUpperCase()} Server`,
    difficulty: "normal",
    gamemode: "survival",
    plugins: [],
    cpuUsage: 0,
    memoryUsage: 0,
    logs: initialLogs
  };

  // Sync to database
  db.minecraft_servers.push(newServer);
  writeDB(db);

  // Trigger setup simulation steps on disk and in logs
  let step = 0;
  const setupInterval = setInterval(() => {
    const liveDB = readDB();
    const srv = liveDB.minecraft_servers.find(s => s.id === mc_id);
    if (!srv) {
      clearInterval(setupInterval);
      return;
    }

    const timeStr = new Date().toISOString();

    if (step === 0) {
      srv.logs.push(`[SYSTEM] [${timeStr}] Initializing System Setup Script...`);
      srv.logs.push(`[SYSTEM] [${timeStr}] Running automatic package updates: apt-get update && apt-get install -y sudo curl nano openjdk-17-jre-headless`);
      srv.logs.push(`[OS] Get:1 http://archive.ubuntu.com/ubuntu jammy InRelease [270 kB]`);
      srv.logs.push(`[OS] Get:2 http://archive.ubuntu.com/ubuntu jammy-updates InRelease [119 kB]`);
    } else if (step === 1) {
      srv.logs.push(`[OS] Reading package lists... Done`);
      srv.logs.push(`[OS] Building dependency tree... Done`);
      srv.logs.push(`[OS] Installing packages: sudo (1.9.9), curl (7.81.0), nano (6.2), openjdk-17-jre-headless (17.0.8)`);
      srv.logs.push(`[OS] Progress: [==================================>] 100% completed.`);
    } else if (step === 2) {
      srv.logs.push(`[SYSTEM] [${timeStr}] Creating server workspace folder... Created!`);
      srv.logs.push(`[SYSTEM] [${timeStr}] Writing license file eula.txt with eula=true (Automatic Agreement)`);
      srv.logs.push(`[SYSTEM] [${timeStr}] Fetching Minecraft Server build of type ${type} v${version}...`);
      srv.logs.push(`[NETWORK] Downloading server Jar: 42.8 MB...`);
      srv.logs.push(`[NETWORK] Download complete. Saving file...`);
    } else if (step === 3) {
      srv.logs.push(`[SYSTEM] [${timeStr}] Renaming server downloaded build to standard 'server.jar' automatically... Done!`);
      srv.logs.push(`[SYSTEM] [${timeStr}] Generating server.properties configuration...`);
      srv.logs.push(`[SYSTEM] [${timeStr}] Applying Config: online-mode=${srv.online_mode}, max-players=20, port=25565`);
    } else if (step === 4) {
      // Build actual directories on disk!
      createDefaultMinecraftFiles(mc_id);

      // Apply the actual online_mode settings to files
      const propPath = path.join(MINECRAFT_DIR, mc_id, "server.properties");
      if (fs.existsSync(propPath)) {
        let content = fs.readFileSync(propPath, "utf8");
        content = content.replace(/online-mode=false/, `online-mode=${srv.online_mode}`);
        fs.writeFileSync(propPath, content, "utf8");
      }

      srv.logs.push(`[SYSTEM] [${timeStr}] Setup finished successfully! Server is ready to start.`);
      srv.logs.push(`[PANEL] Starting server for the first time...`);
      srv.logs.push(`[02:00:01 INFO]: Starting minecraft server version ${version}`);
      srv.logs.push(`[02:00:02 INFO]: Loading properties`);
      srv.logs.push(`[02:00:03 INFO]: Starting Minecraft server on *:25565`);
      srv.logs.push(`[02:00:05 INFO]: Preparing level "world"`);
      srv.logs.push(`[02:00:08 INFO]: Preparing spawn area: 100%`);
      srv.logs.push(`[02:00:08 INFO]: Done! For help, type "help"`);
      srv.status = "running";
      srv.cpuUsage = 12.4;
      srv.memoryUsage = 1410.0;
      startMinecraftServerListener(srv);
      clearInterval(setupInterval);
    }

    step++;
    writeDB(liveDB);
  }, 1500);

  res.json(newServer);
});

// GET Single Minecraft Server config and logs
app.get("/api/minecraft/:id", (req, res) => {
  const db = readDB();
  const srv = db.minecraft_servers.find(s => s.id === req.params.id);
  if (!srv) return res.status(404).json({ error: "Minecraft server not found" });

  res.json(srv);
});

// DELETE Minecraft Server
app.delete("/api/minecraft/:id", (req, res) => {
  const db = readDB();
  const index = db.minecraft_servers.findIndex(s => s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Minecraft server not found" });
  }

  const srv = db.minecraft_servers[index];
  db.minecraft_servers.splice(index, 1);
  writeDB(db);

  // Stop TCP pinger
  stopMinecraftServerListener(req.params.id);

  // Clean up physical directory
  try {
    const srvPath = path.join(MINECRAFT_DIR, req.params.id);
    if (fs.existsSync(srvPath)) {
      fs.rmSync(srvPath, { recursive: true, force: true });
    }
  } catch (err: any) {
    console.warn(`Failed to clean up directory for server ${req.params.id}:`, err);
  }

  res.json({ success: true });
});

// POST Power Actions for Minecraft Server
app.post("/api/minecraft/:id/action", (req, res) => {
  const { action } = req.body;
  const db = readDB();
  const srv = db.minecraft_servers.find(s => s.id === req.params.id);
  if (!srv) return res.status(404).json({ error: "Minecraft server not found" });

  const timeStr = new Date().toLocaleTimeString();

  if (action === "start") {
    srv.status = "running";
    srv.cpuUsage = +(Math.random() * 5 + 3).toFixed(1);
    srv.memoryUsage = +(Math.random() * 100 + 1350).toFixed(1);
    startMinecraftServerListener(srv);
    srv.logs.push(`[${timeStr} INFO]: Booting up Minecraft jar: java -Xmx2G -Xms1G -jar server.jar nogui`);
    srv.logs.push(`[${timeStr} INFO]: Loading server.properties and preparing libraries...`);
    srv.logs.push(`[${timeStr} INFO]: Loading level "world"`);
    srv.logs.push(`[${timeStr} INFO]: Done (2.4s)! Server started on port ${srv.port || 25565}.`);
  } else if (action === "stop") {
    srv.status = "stopped";
    srv.cpuUsage = 0;
    srv.memoryUsage = 0;
    stopMinecraftServerListener(srv.id);
    srv.logs.push(`[${timeStr} INFO]: Stopping server...`);
    srv.logs.push(`[${timeStr} INFO]: Saving players`);
    srv.logs.push(`[${timeStr} INFO]: Saving worlds`);
    srv.logs.push(`[${timeStr} INFO]: Closing Server on port ${srv.port || 25565}`);
  } else if (action === "restart") {
    srv.status = "running";
    srv.cpuUsage = +(Math.random() * 5 + 3).toFixed(1);
    srv.memoryUsage = +(Math.random() * 100 + 1350).toFixed(1);
    startMinecraftServerListener(srv);
    srv.logs.push(`[${timeStr} INFO]: Restart command issued by panel.`);
    srv.logs.push(`[${timeStr} INFO]: Stopping server... Saving chunks.`);
    srv.logs.push(`[${timeStr} INFO]: Server closed.`);
    srv.logs.push(`[${timeStr} INFO]: Rebooting JVM...`);
    srv.logs.push(`[${timeStr} INFO]: java -Xmx2G -Xms1G -jar server.jar nogui`);
    srv.logs.push(`[${timeStr} INFO]: Done! Ready for players.`);
  }

  writeDB(db);
  res.json(srv);
});

// POST Send Command to Minecraft Server Console
app.post("/api/minecraft/:id/command", (req, res) => {
  const { command } = req.body;
  if (!command) return res.status(400).json({ error: "Command string is required" });

  const db = readDB();
  const srv = db.minecraft_servers.find(s => s.id === req.params.id);
  if (!srv) return res.status(404).json({ error: "Minecraft server not found" });

  const cleanCmd = command.startsWith("/") ? command.slice(1) : command;
  const timeStr = new Date().toLocaleTimeString();

  srv.logs.push(`[CONSOLE_INPUT]: /${cleanCmd}`);

  // Dynamic console responses for amazing interactive feeling!
  if (cleanCmd.startsWith("op ")) {
    const player = cleanCmd.split(" ")[1] || "Player";
    srv.logs.push(`[${timeStr} INFO]: Made ${player} a server operator`);
  } else if (cleanCmd.startsWith("deop ")) {
    const player = cleanCmd.split(" ")[1] || "Player";
    srv.logs.push(`[${timeStr} INFO]: De-opped ${player}`);
  } else if (cleanCmd === "list") {
    srv.logs.push(`[${timeStr} INFO]: There are 1 of a max 20 players online: Foros`);
  } else if (cleanCmd.startsWith("say ")) {
    const msg = cleanCmd.substring(4);
    srv.logs.push(`[${timeStr} INFO]: [Server] ${msg}`);
  } else if (cleanCmd.startsWith("gamemode ")) {
    const parts = cleanCmd.split(" ");
    const mode = parts[1] || "survival";
    const target = parts[2] || "Foros";
    srv.logs.push(`[${timeStr} INFO]: Set game mode of ${target} to ${mode.toUpperCase()}`);
  } else if (cleanCmd === "help") {
    srv.logs.push(`[${timeStr} INFO]: Available commands: op, deop, list, say, gamemode, stop, difficulty, seed, version`);
  } else if (cleanCmd === "seed") {
    srv.logs.push(`[${timeStr} INFO]: Seed: [3881900291992981912]`);
  } else if (cleanCmd === "version") {
    srv.logs.push(`[${timeStr} INFO]: This server is running Paper v${srv.version} (Implementing API version ${srv.version})`);
  } else {
    srv.logs.push(`[${timeStr} INFO]: Executing console command: /${cleanCmd}`);
    srv.logs.push(`[${timeStr} INFO]: Command executed successfully.`);
  }

  writeDB(db);
  res.json(srv);
});

// GET Read Directory Files for Minecraft Server File Manager (Real Filesystem!)
app.get("/api/minecraft/:id/files", (req, res) => {
  const { id } = req.params;
  const srvPath = path.join(MINECRAFT_DIR, id);

  if (!fs.existsSync(srvPath)) {
    return res.status(404).json({ error: "Server directory not found on disk" });
  }

  // Optional subfolder parameter to navigate into subfolders like plugins/
  const subFolder = (req.query.subFolder as string) || "";
  const targetDir = path.join(srvPath, subFolder);

  // Security check: ensure targetDir is still inside srvPath (prevent path traversal)
  if (!targetDir.startsWith(srvPath)) {
    return res.status(400).json({ error: "Invalid path navigation detected" });
  }

  try {
    const list = fs.readdirSync(targetDir);
    const files: FileItem[] = list.map(item => {
      const fullPath = path.join(targetDir, item);
      const stat = fs.statSync(fullPath);
      return {
        name: item,
        path: path.join(subFolder, item),
        isDirectory: stat.isDirectory(),
        size: stat.size,
        mtime: stat.mtime.toISOString()
      };
    });

    res.json(files);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to read directory: " + err.message });
  }
});

// GET Read single file content (Real Filesystem!)
app.get("/api/minecraft/:id/files/read", (req, res) => {
  const { id } = req.params;
  const filePathParam = req.query.filePath as string;

  if (!filePathParam) {
    return res.status(400).json({ error: "filePath query parameter is required" });
  }

  const srvPath = path.join(MINECRAFT_DIR, id);
  const fullPath = path.join(srvPath, filePathParam);

  if (!fullPath.startsWith(srvPath)) {
    return res.status(400).json({ error: "Invalid path traversal attempt" });
  }

  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: "File not found" });
  }

  try {
    const isBinary = filePathParam.endsWith(".jar") || filePathParam.endsWith(".zip");
    if (isBinary) {
      return res.json({ content: "[Binary File - Cannot be displayed as text]", isBinary: true });
    }

    const content = fs.readFileSync(fullPath, "utf8");
    res.json({ content, isBinary: false });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to read file: " + err.message });
  }
});

// POST Edit / Add file (Real Filesystem!)
app.post("/api/minecraft/:id/files/write", (req, res) => {
  const { id } = req.params;
  const { filePath, content } = req.body;

  if (!filePath || content === undefined) {
    return res.status(400).json({ error: "Missing filePath or content in body" });
  }

  const srvPath = path.join(MINECRAFT_DIR, id);
  const fullPath = path.join(srvPath, filePath);

  if (!fullPath.startsWith(srvPath)) {
    return res.status(400).json({ error: "Invalid path traversal attempt" });
  }

  try {
    // Create parent directories if they don't exist
    const parentDir = path.dirname(fullPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.writeFileSync(fullPath, content, "utf8");

    // Add log inside the server logs that a config file was updated
    const db = readDB();
    const srv = db.minecraft_servers.find(s => s.id === id);
    if (srv) {
      srv.logs.push(`[${new Date().toLocaleTimeString()} INFO]: Config file '${filePath}' was successfully updated.`);
      writeDB(db);
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to write file: " + err.message });
  }
});

// DELETE File or Directory for Minecraft Server File Manager (Real Filesystem!)
app.delete("/api/minecraft/:id/files", (req, res) => {
  const { id } = req.params;
  const filePathParam = req.query.filePath as string;

  if (!filePathParam) {
    return res.status(400).json({ error: "filePath query parameter is required" });
  }

  const srvPath = path.join(MINECRAFT_DIR, id);
  const fullPath = path.join(srvPath, filePathParam);

  if (!fullPath.startsWith(srvPath)) {
    return res.status(400).json({ error: "Invalid path traversal attempt" });
  }

  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: "File or directory not found on disk" });
  }

  try {
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(fullPath);
    }

    // Log deletion
    const db = readDB();
    const srv = db.minecraft_servers.find(s => s.id === id);
    if (srv) {
      srv.logs.push(`[${new Date().toLocaleTimeString()} INFO]: Deleted '${filePathParam}' from server workspace.`);
      writeDB(db);
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete item: " + err.message });
  }
});

// POST Create new directory (mkdir) inside Minecraft server (Real Filesystem!)
app.post("/api/minecraft/:id/files/mkdir", (req, res) => {
  const { id } = req.params;
  const { folderPath } = req.body;

  if (!folderPath) {
    return res.status(400).json({ error: "folderPath is required" });
  }

  const srvPath = path.join(MINECRAFT_DIR, id);
  const fullPath = path.join(srvPath, folderPath);

  if (!fullPath.startsWith(srvPath)) {
    return res.status(400).json({ error: "Invalid path traversal attempt" });
  }

  try {
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }

    // Log mkdir
    const db = readDB();
    const srv = db.minecraft_servers.find(s => s.id === id);
    if (srv) {
      srv.logs.push(`[${new Date().toLocaleTimeString()} INFO]: Created folder directory '${folderPath}'.`);
      writeDB(db);
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create directory: " + err.message });
  }
});

// POST Upload plugin or Jar file via binary payload (Real Filesystem!)
app.post("/api/minecraft/:id/plugins/upload", (req, res) => {
  const { id } = req.params;
  const { filename, base64Content } = req.body;

  if (!filename) {
    return res.status(400).json({ error: "Filename is required" });
  }

  const srvPath = path.join(MINECRAFT_DIR, id);
  const pluginsDir = path.join(srvPath, "plugins");

  if (!fs.existsSync(pluginsDir)) {
    fs.mkdirSync(pluginsDir, { recursive: true });
  }

  try {
    const fullPath = path.join(pluginsDir, filename);
    const buffer = base64Content ? Buffer.from(base64Content, 'base64') : Buffer.from("mock-plugin-binary-data");
    fs.writeFileSync(fullPath, buffer);

    const db = readDB();
    const srv = db.minecraft_servers.find(s => s.id === id);
    if (srv) {
      if (!srv.plugins.includes(filename)) {
        srv.plugins.push(filename);
      }
      srv.logs.push(`[${new Date().toLocaleTimeString()} INFO]: Plugin '${filename}' was uploaded to the plugins folder.`);
      writeDB(db);
    }

    res.json({ success: true, plugins: srv?.plugins || [] });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to save plugin: " + err.message });
  }
});

// POST Install 1-click popular plugin
app.post("/api/minecraft/:id/plugins/install-default", (req, res) => {
  const { id } = req.params;
  const { pluginName } = req.body;

  if (!pluginName) {
    return res.status(400).json({ error: "Plugin name is required" });
  }

  const db = readDB();
  const srv = db.minecraft_servers.find(s => s.id === id);
  if (!srv) return res.status(404).json({ error: "Minecraft server not found" });

  const filename = `${pluginName}.jar`;
  const srvPath = path.join(MINECRAFT_DIR, id);
  const pluginsDir = path.join(srvPath, "plugins");

  if (!fs.existsSync(pluginsDir)) {
    fs.mkdirSync(pluginsDir, { recursive: true });
  }

  try {
    const fullPath = path.join(pluginsDir, filename);
    fs.writeFileSync(fullPath, "mock-plugin-binary-content", "utf8");

    if (!srv.plugins.includes(filename)) {
      srv.plugins.push(filename);
    }
    srv.logs.push(`[${new Date().toLocaleTimeString()} INFO]: Popular Plugin '${pluginName}' was installed via Panel Appstore.`);
    writeDB(db);

    res.json({ success: true, plugins: srv.plugins });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to install plugin: " + err.message });
  }
});

// POST Update server settings directly (which rewrites server.properties and syncs database!)
app.post("/api/minecraft/:id/settings", (req, res) => {
  const { id } = req.params;
  const { online_mode, max_players, motd, difficulty, gamemode } = req.body;

  const db = readDB();
  const srv = db.minecraft_servers.find(s => s.id === id);
  if (!srv) return res.status(404).json({ error: "Minecraft server not found" });

  const srvPath = path.join(MINECRAFT_DIR, id);
  const propPath = path.join(srvPath, "server.properties");

  try {
    // Sync React states into the server item
    if (online_mode !== undefined) srv.online_mode = online_mode === "true" || online_mode === true;
    if (max_players !== undefined) srv.max_players = Number(max_players);
    if (motd !== undefined) srv.motd = motd;
    if (difficulty !== undefined) srv.difficulty = difficulty;
    if (gamemode !== undefined) srv.gamemode = gamemode;

    // Rewrite properties file on disk to reflect the actual edit!
    // Make sure parent directory and file exist
    const parentDir = path.dirname(propPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    if (!fs.existsSync(propPath)) {
      fs.writeFileSync(propPath, "# Minecraft server properties\n", "utf8");
    }

    let content = fs.readFileSync(propPath, "utf8");
    
    // Update properties lines or append them if missing
    const updateProp = (key: string, value: any) => {
      const regex = new RegExp(`^${key}=.*`, 'm');
      if (regex.test(content)) {
        content = content.replace(regex, `${key}=${value}`);
      } else {
        content += `\n${key}=${value}`;
      }
    };

    if (online_mode !== undefined) updateProp("online-mode", srv.online_mode);
    if (max_players !== undefined) updateProp("max-players", srv.max_players);
    if (motd !== undefined) updateProp("motd", srv.motd);
    if (difficulty !== undefined) updateProp("difficulty", srv.difficulty);
    if (gamemode !== undefined) updateProp("gamemode", srv.gamemode);

    fs.writeFileSync(propPath, content, "utf8");

    // Dynamic restart of SLP listener to apply new configurations instantly
    if (srv.status === "running") {
      startMinecraftServerListener(srv);
    }

    srv.logs.push(`[${new Date().toLocaleTimeString()} INFO]: Server properties updated via Dashboard.`);
    writeDB(db);

    res.json({ success: true, server: srv });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update settings: " + err.message });
  }
});


// Catch-all for unmatched /api routes so they never fall through to Vite/SPA index.html
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
});

// Serve static Vite frontend assets in production or use Vite middleware in development
async function startServer() {
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
    console.log(`[SYSTEM] Server running on http://localhost:${PORT}`);
    
    // Auto-launch any apps marked as running on boot
    try {
      const db = readDB();
      db.apps.forEach(appItem => {
        if (appItem.status === "running") {
          console.log(`[SYSTEM] Auto-launching app ${appItem.name} (${appItem.id})...`);
          startAppProcess(appItem.id);
        }
      });
      // Auto-launch Minecraft SLP TCP listeners
      db.minecraft_servers.forEach(srv => {
        if (srv.status === "running") {
          console.log(`[SYSTEM] Auto-launching Minecraft SLP listener for ${srv.name} (${srv.id})...`);
          startMinecraftServerListener(srv);
        }
      });
    } catch (e) {
      console.error("[SYSTEM] Failed to auto-launch apps/servers on boot:", e);
    }
  });
}

startServer();
