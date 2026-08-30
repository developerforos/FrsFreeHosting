import React, { useState, useEffect, useRef } from "react";
import { ScriptApp } from "../types";
import { 
  Play, Square, RotateCw, Terminal, Code, Settings, Plus, Trash2, 
  ChevronRight, Upload, Globe, FileText, CheckCircle, Info, RefreshCw
} from "lucide-react";

interface ScriptHostingProps {
  onNotify: (message: string, type: "success" | "error" | "info") => void;
}

export default function ScriptHosting({ onNotify }: ScriptHostingProps) {
  const [apps, setApps] = useState<ScriptApp[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [deploying, setDeploying] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [isDeletingApp, setIsDeletingApp] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<"console" | "editor" | "settings">("console");

  // New App Form States
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newAppName, setNewAppName] = useState("");
  const [newAppType, setNewAppType] = useState<"python" | "node">("python");
  const [newAppEntryPoint, setNewAppEntryPoint] = useState("main.py");
  const [newAppPackages, setNewAppPackages] = useState("");
  const [newAppCode, setNewAppCode] = useState(
`# Sample Python Script
import time
import sys

print("[SYSTEM] Starting script initialization...")
print(f"Python interpreter: {sys.version}")

for i in range(1, 6):
    print(f"[INFO] Running operation step {i}/5...")
    time.sleep(1)

print("[SUCCESS] Python script executed perfectly.")
`
  );

  // Edit file states
  const [editingCode, setEditingCode] = useState<string>("");
  const [isSavingCode, setIsSavingCode] = useState<boolean>(false);

  // Env variables state
  const [newEnvKey, setNewEnvKey] = useState("");
  const [newEnvVal, setNewEnvVal] = useState("");

  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Load apps
  const fetchApps = async (selectFirst = false, overrideSelectedId?: string) => {
    try {
      const res = await fetch("/api/apps");
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Response is not JSON");
      }
      const data = await res.json();
      setApps(data);
      if (data.length > 0) {
        if (overrideSelectedId) {
          setSelectedAppId(overrideSelectedId);
        } else if (selectFirst || !selectedAppId) {
          setSelectedAppId(data[data.length - 1].id);
        }
      } else {
        setSelectedAppId(null);
      }
    } catch (err) {
      console.warn("Failed to fetch apps (backend booting or offline):", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps(true);

    // Poll for app updates (to get log changes/status installation progress)
    const interval = setInterval(() => {
      fetchApps();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Fetch single app code when editor subtab or app changes
  const selectedApp = apps.find(a => a.id === selectedAppId);

  useEffect(() => {
    setShowDeleteConfirm(false);
  }, [selectedAppId]);

  useEffect(() => {
    if (selectedAppId && activeSubTab === "editor") {
      loadAppCode(selectedAppId);
    }
  }, [selectedAppId, activeSubTab]);

  const loadAppCode = async (id: string) => {
    try {
      const res = await fetch(`/api/apps/${id}`);
      const data = await res.json();
      if (data.code !== undefined) {
        setEditingCode(data.code);
      }
    } catch (err) {
      onNotify("Failed to fetch file contents", "error");
    }
  };

  // Auto-scroll console logs
  useEffect(() => {
    if (activeSubTab === "console" && consoleEndRef.current) {
      const timer = setTimeout(() => {
        consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [selectedApp?.id, selectedApp?.logs?.length, activeSubTab]);

  // Handle local file uploads to form
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split(".").pop();
    const isPython = extension === "py";
    const isNode = extension === "js";

    if (!isPython && !isNode) {
      onNotify("Invalid file type. Please upload a .py (Python) or .js (Node.js) file.", "error");
      return;
    }

    setNewAppEntryPoint(file.name);
    setNewAppType(isPython ? "python" : "node");
    setNewAppName(file.name.split(".")[0].replace(/[-_]/g, " ") + " App");

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const codeText = event.target.result as string;
        setNewAppCode(codeText);

        // Auto-detect imports
        const packages = new Set<string>();
        if (isPython) {
          const pyBuiltins = new Set([
            "os", "sys", "json", "time", "math", "random", "re", "datetime", "urllib", "collections", 
            "itertools", "hashlib", "socket", "threading", "multiprocessing", "subprocess", "shutil", 
            "tempfile", "xml", "csv", "pathlib", "ast", "asyncio", "base64", "copy", "functools", 
            "logging", "select", "struct", "traceback", "uuid", "abc", "argparse", "ctypes", "email", 
            "hmac", "html", "http", "io", "mimetypes", "pickle", "platform", "queue", "ssl", "stat", 
            "string", "tarfile", "types", "typing", "warnings", "weakref", "zipfile", "math"
          ]);
          const importRegex = /^\s*import\s+([a-zA-Z0-9_, \t]+)/gm;
          const fromImportRegex = /^\s*from\s+([a-zA-Z0-9_.]+)\s+import/gm;
          let m;
          while ((m = importRegex.exec(codeText)) !== null) {
            m[1].split(",").forEach(part => {
              const clean = part.trim().split(/\s+/)[0].split(".")[0];
              if (clean && !pyBuiltins.has(clean)) packages.add(clean);
            });
          }
          while ((m = fromImportRegex.exec(codeText)) !== null) {
            const clean = m[1].trim().split(".")[0];
            if (clean && !pyBuiltins.has(clean)) packages.add(clean);
          }
        } else {
          const nodeBuiltins = new Set([
            "fs", "path", "http", "https", "crypto", "os", "util", "events", "stream", "child_process", 
            "dns", "net", "url", "querystring", "zlib", "assert", "buffer", "cluster", "constants", 
            "dgram", "fs/promises", "module", "process", "punycode", "readline", "repl", "string_decoder", 
            "tls", "tty", "v8", "vm"
          ]);
          const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
          const importRegex = /from\s+['"]([^'"]+)['"]/g;
          let m;
          while ((m = requireRegex.exec(codeText)) !== null) {
            const clean = m[1].trim().split("/")[0];
            if (clean && !nodeBuiltins.has(clean) && !clean.startsWith(".") && !clean.startsWith("/")) packages.add(clean);
          }
          while ((m = importRegex.exec(codeText)) !== null) {
            const clean = m[1].trim().split("/")[0];
            if (clean && !nodeBuiltins.has(clean) && !clean.startsWith(".") && !clean.startsWith("/")) packages.add(clean);
          }
        }

        if (packages.size > 0) {
          const autoList = Array.from(packages).join(", ");
          setNewAppPackages(autoList);
          onNotify(`Successfully loaded ${file.name} and auto-detected imports: ${autoList}!`, "success");
        } else {
          setNewAppPackages("");
          onNotify(`Successfully loaded ${file.name}!`, "success");
        }
      }
    };
    reader.readAsText(file);
  };

  // Change default entry point and boilerplate when switching type
  const handleTypeChange = (type: "python" | "node") => {
    setNewAppType(type);
    if (type === "python") {
      setNewAppEntryPoint("main.py");
      setNewAppCode(
`# Sample Python Script
import time
import sys

print("[SYSTEM] Starting script initialization...")
print(f"Python interpreter: {sys.version}")

for i in range(1, 6):
    print(f"[INFO] Running operation step {i}/5...")
    time.sleep(1)

print("[SUCCESS] Python script executed perfectly.")
`
      );
    } else {
      setNewAppEntryPoint("index.js");
      setNewAppCode(
`// Sample Node.js Application
const http = require('http');

console.log("[SYSTEM] Initializing Node.js microservice...");
console.log("Runtime version: " + process.version);

const server = http.createServer((req, res) => {
  console.log(\`[HTTP] Request received: \${req.method} \${req.url}\`);
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.end(JSON.stringify({ status: "active", message: "Hello from Node.js Panel!" }));
});

const PORT = 8080;
server.listen(PORT, () => {
  console.log(\`[SUCCESS] Node server successfully listening on port \${PORT}\`);
});
`
      );
    }
  };

  // Deploy Script App
  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName.trim()) {
      onNotify("Please enter an application name", "error");
      return;
    }

    setDeploying(true);
    try {
      const res = await fetch("/api/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAppName,
          type: newAppType,
          entryPoint: newAppEntryPoint,
          packages: newAppPackages,
          content: newAppCode
        })
      });

      const data = await res.json();
      if (res.ok) {
        onNotify(`Deploying ${newAppName} automatically! Installing packages and launching...`, "success");
        setIsCreating(false);
        setNewAppName("");
        setNewAppPackages("");
        await fetchApps(false, data.id);
      } else {
        onNotify(data.error || "Deployment failed", "error");
      }
    } catch (err) {
      onNotify("Network error during deployment", "error");
    } finally {
      setDeploying(false);
    }
  };

  // Trigger app action (start, stop, restart)
  const triggerAction = async (id: string, action: "start" | "stop" | "restart") => {
    try {
      const res = await fetch(`/api/apps/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (res.ok) {
        onNotify(`Application ${action}ed successfully`, "success");
        fetchApps();
      } else {
        onNotify(data.error || `Failed to ${action} app`, "error");
      }
    } catch (err) {
      onNotify("Failed to communicate with panel host", "error");
    }
  };

  // Edit current file content
  const handleSaveCode = async () => {
    if (!selectedAppId) return;
    setIsSavingCode(true);
    try {
      const res = await fetch(`/api/apps/${selectedAppId}/edit-file`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editingCode })
      });
      if (res.ok) {
        onNotify("File content updated! Application restarted to apply changes.", "success");
        fetchApps();
      } else {
        onNotify("Failed to save changes", "error");
      }
    } catch (err) {
      onNotify("Error saving file content", "error");
    } finally {
      setIsSavingCode(false);
    }
  };

  // Delete App
  const handleDeleteApp = async (id: string) => {
    setIsDeletingApp(true);
    onNotify("Erasing script files and removing application workspace...", "info");

    try {
      const res = await fetch(`/api/apps/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        onNotify("Application deleted successfully", "success");
        setShowDeleteConfirm(false);
        setSelectedAppId(null);
        await fetchApps(true);
      } else {
        const errData = await res.json();
        onNotify(errData.error || "Failed to delete app", "error");
      }
    } catch (err) {
      onNotify("Error deleting app", "error");
    } finally {
      setIsDeletingApp(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Sidebar - Application selector & create trigger */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-wide text-neutral-300 uppercase">Deployed Scripts</h3>
            <button
              onClick={() => setIsCreating(!isCreating)}
              id="new-script-btn"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              New Deploy
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-6 text-neutral-500">
              <RefreshCw className="w-5 h-5 animate-spin" />
            </div>
          ) : apps.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 border border-dashed border-neutral-800 rounded-lg">
              <p className="text-xs">No deployments active</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-[350px] overflow-y-auto pr-1">
              {apps.map((app) => (
                <button
                  key={app.id}
                  onClick={() => {
                    setSelectedAppId(app.id);
                    setIsCreating(false);
                  }}
                  id={`app-select-${app.id}`}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all text-left w-full ${
                    selectedAppId === app.id
                      ? "bg-indigo-600/10 border-indigo-500/50 text-indigo-200"
                      : "bg-neutral-950/40 border-neutral-800/80 text-neutral-400 hover:border-neutral-700 hover:bg-neutral-900/40"
                  }`}
                >
                  <div className="truncate pr-2">
                    <p className="text-xs font-semibold text-neutral-200 truncate">{app.name}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded ${
                        app.type === "python" ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"
                      }`}>
                        {app.type}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-500">{app.entry_point}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`w-2 h-2 rounded-full ${
                      app.status === "running" ? "bg-emerald-500 animate-pulse" :
                      app.status === "installing" ? "bg-amber-400 animate-bounce" :
                      app.status === "failed" ? "bg-red-500" : "bg-neutral-600"
                    }`} />
                    <ChevronRight className="w-3.5 h-3.5 text-neutral-600" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Global info tip */}
        <div className="bg-neutral-900/30 border border-neutral-800/50 rounded-xl p-4 text-xs text-neutral-500 leading-relaxed flex gap-3">
          <Info className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
          <p>
            This server panel runs inside an automatic isolated sandboxed environment. Whenever you upload a Python script (`.py`) or Node script (`.js`), dependencies are read and installed dynamically via **npm** or **pip** before deploying the code.
          </p>
        </div>
      </div>

      {/* Main Content Pane - form or selected app panel */}
      <div className="lg:col-span-8">
        {isCreating ? (
          /* DEPLOYMENT BUILD FORM */
          <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-5">
              <div>
                <h3 className="text-base font-bold text-neutral-200">Deploy Python / Node.js Workspace</h3>
                <p className="text-xs text-neutral-500 mt-1">Upload a script or write raw code to deploy automatically</p>
              </div>
              <button
                onClick={() => setIsCreating(false)}
                className="text-xs text-neutral-400 hover:text-white underline font-medium"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleDeploy} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase">Application Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Discord Bot scraper"
                    value={newAppName}
                    onChange={(e) => setNewAppName(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm text-neutral-200 font-medium placeholder-neutral-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase">Runtime Language</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleTypeChange("python")}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg border transition ${
                        newAppType === "python"
                          ? "bg-amber-500/10 border-amber-500/60 text-amber-400"
                          : "bg-neutral-950 border-neutral-800 text-neutral-500 hover:border-neutral-700"
                      }`}
                    >
                      Python 3.10
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTypeChange("node")}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg border transition ${
                        newAppType === "node"
                          ? "bg-emerald-500/10 border-emerald-500/60 text-emerald-400"
                          : "bg-neutral-950 border-neutral-800 text-neutral-500 hover:border-neutral-700"
                      }`}
                    >
                      Node.js 18
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase">Main Entry File</label>
                  <input
                    type="text"
                    required
                    placeholder={newAppType === "python" ? "main.py" : "index.js"}
                    value={newAppEntryPoint}
                    onChange={(e) => setNewAppEntryPoint(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm text-neutral-200 font-mono placeholder-neutral-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase">Install Packages (Comma Separated)</label>
                  <input
                    type="text"
                    placeholder={newAppType === "python" ? "requests, beautifulsoup4" : "express, cors, dotenv"}
                    value={newAppPackages}
                    onChange={(e) => setNewAppPackages(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm text-neutral-200 font-mono placeholder-neutral-600 outline-none"
                  />
                </div>
              </div>

              {/* Upload alternative */}
              <div className="border border-dashed border-neutral-800/80 rounded-xl p-4 bg-neutral-950/20">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                  <div>
                    <p className="text-xs font-semibold text-neutral-300">Quick File Upload</p>
                    <p className="text-[11px] text-neutral-500 mt-0.5">Drag-and-drop or select any python/node file to auto-populate the layout</p>
                  </div>
                  <label className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-white rounded-lg text-xs font-bold transition cursor-pointer flex-shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    Select File
                    <input
                      type="file"
                      accept=".py,.js"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Code Box */}
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase">Source Code ({newAppEntryPoint})</label>
                <div className="relative font-mono rounded-lg border border-neutral-800 overflow-hidden bg-neutral-950">
                  <div className="flex items-center justify-between bg-neutral-900/50 border-b border-neutral-800 px-3 py-1.5">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Workspace Editor</span>
                    <span className="text-[10px] text-neutral-500">{newAppEntryPoint}</span>
                  </div>
                  <textarea
                    rows={12}
                    value={newAppCode}
                    onChange={(e) => setNewAppCode(e.target.value)}
                    className="w-full bg-neutral-950 p-4 text-xs font-mono text-neutral-300 border-none outline-none resize-y leading-relaxed"
                    style={{ whiteSpace: "pre", overflowX: "auto" }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={deploying}
                id="deploy-submit-btn"
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition-all shadow-md hover:shadow-indigo-500/10 disabled:opacity-50"
              >
                {deploying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Deploying Build Environment...
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4" />
                    Launch Automatic Script Deployment
                  </>
                )}
              </button>
            </form>
          </div>
        ) : selectedApp ? (
          /* MAIN SCRIPT APP PANEL */
          <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-xl overflow-hidden flex flex-col h-[650px] shadow-sm">
            {/* Header controls */}
            <div className="p-5 border-b border-neutral-800 bg-neutral-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="truncate">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-bold text-neutral-200 truncate">{selectedApp.name}</h3>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold capitalize ${
                    selectedApp.status === "running" ? "bg-emerald-500/10 text-emerald-400" :
                    selectedApp.status === "installing" ? "bg-amber-400/10 text-amber-400 animate-pulse" :
                    selectedApp.status === "failed" ? "bg-red-500/10 text-red-400" : "bg-neutral-800 text-neutral-400"
                  }`}>
                    {selectedApp.status}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-1 font-mono">Workspace directory: /data/apps/{selectedApp.id}</p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {selectedApp.status !== "running" && selectedApp.status !== "installing" ? (
                  <button
                    onClick={() => triggerAction(selectedApp.id, "start")}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Start
                  </button>
                ) : (
                  <button
                    onClick={() => triggerAction(selectedApp.id, "stop")}
                    className="flex items-center gap-1 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-bold transition"
                  >
                    <Square className="w-3.5 h-3.5" />
                    Stop
                  </button>
                )}

                <button
                  onClick={() => triggerAction(selectedApp.id, "restart")}
                  className="flex items-center gap-1 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-bold transition"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  Restart
                </button>

                {showDeleteConfirm ? (
                  <div className="flex items-center gap-2 bg-red-950/20 border border-red-900/30 px-3 py-1.5 rounded-lg">
                    <span className="text-[11px] font-semibold text-red-400 hidden md:inline font-sans">Delete workspace & files?</span>
                    <button
                      onClick={() => handleDeleteApp(selectedApp.id)}
                      disabled={isDeletingApp}
                      className="px-2 py-1 bg-red-600 hover:bg-red-500 disabled:bg-red-600/50 disabled:cursor-not-allowed text-white rounded text-[10px] font-bold transition flex items-center gap-1"
                    >
                      {isDeletingApp ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : "Yes"}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeletingApp}
                      className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-[10px] font-bold transition"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 rounded-lg text-xs font-bold transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete App
                  </button>
                )}
              </div>
            </div>

            {/* Micro Dashboard graphs */}
            {selectedApp.status === "running" && (
              <div className="grid grid-cols-2 border-b border-neutral-800 divide-x divide-neutral-800 bg-neutral-950/40 text-center py-2.5">
                <div>
                  <span className="text-[10px] text-neutral-500 uppercase font-semibold">Instance CPU</span>
                  <p className="text-sm font-bold font-mono text-neutral-300">{selectedApp.cpuUsage}%</p>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 uppercase font-semibold">Instance Memory</span>
                  <p className="text-sm font-bold font-mono text-neutral-300">{selectedApp.memoryUsage} MB</p>
                </div>
              </div>
            )}

            {/* Secondary navigation tabs */}
            <div className="flex border-b border-neutral-800 bg-neutral-950/20 px-4">
              <button
                onClick={() => setActiveSubTab("console")}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition ${
                  activeSubTab === "console"
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-neutral-500 hover:text-neutral-300"
                }`}
              >
                <Terminal className="w-4 h-4" />
                Console Logs
              </button>
              <button
                onClick={() => setActiveSubTab("editor")}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition ${
                  activeSubTab === "editor"
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-neutral-500 hover:text-neutral-300"
                }`}
              >
                <Code className="w-4 h-4" />
                Code Editor ({selectedApp.entry_point})
              </button>
              <button
                onClick={() => setActiveSubTab("settings")}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition ${
                  activeSubTab === "settings"
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-neutral-500 hover:text-neutral-300"
                }`}
              >
                <Settings className="w-4 h-4" />
                Deployment Spec
              </button>
            </div>

            {/* TAB PANELS */}
            <div className="flex-1 overflow-hidden bg-neutral-950 flex flex-col">
              {activeSubTab === "console" ? (
                /* CONSOLE TERMINAL */
                <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-neutral-300 space-y-1.5 select-text">
                  {selectedApp.logs.map((log, idx) => (
                    <div
                      key={idx}
                      className={`leading-relaxed whitespace-pre-wrap ${
                        log.includes("[SUCCESS]") ? "text-emerald-400" :
                        log.includes("[SYSTEM]") ? "text-indigo-400" :
                        log.includes("[INFO]") ? "text-neutral-400" :
                        log.includes("[ERROR]") || log.includes("failed") ? "text-red-400" : "text-neutral-300"
                      }`}
                    >
                      {log}
                    </div>
                  ))}
                  <div ref={consoleEndRef} />
                </div>
              ) : activeSubTab === "editor" ? (
                /* LIVE CODE EDITOR */
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between bg-neutral-900 px-4 py-2 border-b border-neutral-800">
                    <span className="text-[10px] text-neutral-400 font-mono">Editing /data/apps/{selectedApp.id}/{selectedApp.entry_point}</span>
                    <button
                      onClick={handleSaveCode}
                      disabled={isSavingCode}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold transition flex items-center gap-1"
                    >
                      {isSavingCode && <RefreshCw className="w-3 h-3 animate-spin" />}
                      Save & Restart
                    </button>
                  </div>
                  <textarea
                    value={editingCode}
                    onChange={(e) => setEditingCode(e.target.value)}
                    className="flex-1 bg-neutral-950 p-4 font-mono text-xs text-neutral-300 leading-relaxed outline-none resize-none overflow-y-auto select-text"
                  />
                </div>
              ) : (
                /* DEPLOYMENT SETTINGS SPEC */
                <div className="p-5 space-y-6 overflow-y-auto flex-1">
                  <div>
                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Package Manifest (Dependencies)</h4>
                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                      <p className="text-xs text-neutral-400 mb-2 font-medium">Packages automatically configured and installed on deploy:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedApp.packages.length === 0 ? (
                          <span className="text-xs text-neutral-500 italic">No external packages configured</span>
                        ) : (
                          selectedApp.packages.map((pkg, idx) => (
                            <span key={idx} className="bg-neutral-850 border border-neutral-800 text-neutral-300 px-2 py-0.5 rounded font-mono text-xs">
                              {pkg}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Environment Configuration</h4>
                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-3">
                      <div className="space-y-1.5">
                        {Object.entries(selectedApp.env_vars).map(([key, val]) => (
                          <div key={key} className="flex items-center justify-between bg-neutral-950 p-2 border border-neutral-800 rounded font-mono text-xs">
                            <span className="text-neutral-400 font-semibold">{key}</span>
                            <span className="text-neutral-500 truncate max-w-xs">{val}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-neutral-800/60">
                        <input
                          type="text"
                          placeholder="ENV_KEY"
                          value={newEnvKey}
                          onChange={(e) => setNewEnvKey(e.target.value.toUpperCase())}
                          className="flex-1 bg-neutral-950 border border-neutral-800 text-xs px-2.5 py-1.5 font-mono text-neutral-300 rounded outline-none"
                        />
                        <input
                          type="text"
                          placeholder="value"
                          value={newEnvVal}
                          onChange={(e) => setNewEnvVal(e.target.value)}
                          className="flex-1 bg-neutral-950 border border-neutral-800 text-xs px-2.5 py-1.5 font-mono text-neutral-300 rounded outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!newEnvKey.trim()) return;
                            selectedApp.env_vars[newEnvKey] = newEnvVal;
                            setNewEnvKey("");
                            setNewEnvVal("");
                            onNotify("Environment variable updated", "success");
                            fetchApps();
                          }}
                          className="px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-xs font-bold"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-xl h-[550px] flex flex-col items-center justify-center p-8 text-center">
            <Terminal className="w-10 h-10 text-neutral-600 mb-3" />
            <h3 className="text-sm font-bold text-neutral-400">No deployment workspace selected</h3>
            <p className="text-xs text-neutral-600 mt-1 max-w-sm">Create a new script deployment or select an existing workspace from the list to view consoles</p>
          </div>
        )}
      </div>
    </div>
  );
}
