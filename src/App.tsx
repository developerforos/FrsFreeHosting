import { useState, useEffect } from "react";
import { SystemStats } from "./types";
import StatsGrid from "./components/StatsGrid";
import ScriptHosting from "./components/ScriptHosting";
import MinecraftHosting from "./components/MinecraftHosting";
import { 
  Cpu, Server, Terminal, LayoutDashboard, Globe, ShieldCheck, 
  HelpCircle, LogOut, Bell, Play, Square, RotateCw, Sparkles, CheckCircle, Info, AlertTriangle
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "scripts" | "minecraft">("dashboard");
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Quick action states for the Dashboard list
  const [apps, setApps] = useState<any[]>([]);
  const [mcServers, setMcServers] = useState<any[]>([]);

  // Fetch metrics and server status lists
  const fetchStatsAndLists = async () => {
    // System stats
    try {
      const statsRes = await fetch("/api/status");
      if (statsRes.ok) {
        const contentType = statsRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
      }
    } catch (err) {
      console.warn("Status fetch skipped (backend booting or offline):", err);
    }

    // Script apps
    try {
      const appsRes = await fetch("/api/apps");
      if (appsRes.ok) {
        const contentType = appsRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const appsData = await appsRes.json();
          setApps(appsData);
        }
      }
    } catch (err) {
      console.warn("Apps fetch skipped (backend booting or offline):", err);
    }

    // Minecraft servers
    try {
      const mcRes = await fetch("/api/minecraft");
      if (mcRes.ok) {
        const contentType = mcRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const mcData = await mcRes.json();
          setMcServers(mcData);
        }
      }
    } catch (err) {
      console.warn("Minecraft servers fetch skipped (backend booting or offline):", err);
    }
  };

  useEffect(() => {
    fetchStatsAndLists();
    const interval = setInterval(() => {
      fetchStatsAndLists();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Display notification
  const handleNotify = (message: string, type: "success" | "error" | "info") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Quick trigger action for apps
  const handleAppQuickAction = async (id: string, action: "start" | "stop" | "restart") => {
    try {
      const res = await fetch(`/api/apps/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        handleNotify(`Script application requested to ${action}`, "success");
        fetchStatsAndLists();
      }
    } catch (err) {
      handleNotify("Communication error with script host", "error");
    }
  };

  // Quick trigger action for minecraft
  const handleMcQuickAction = async (id: string, action: "start" | "stop" | "restart") => {
    try {
      const res = await fetch(`/api/minecraft/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        handleNotify(`Minecraft Server requested to ${action}`, "success");
        fetchStatsAndLists();
      }
    } catch (err) {
      handleNotify("Communication error with game server node", "error");
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-indigo-500/25 selection:text-indigo-200">
      
      {/* HEADER SECTION */}
      <header id="main-header" className="border-b border-neutral-900 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600/10 border border-indigo-500/30 rounded-xl text-indigo-400">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-md font-extrabold tracking-tight bg-gradient-to-r from-indigo-200 to-indigo-400 bg-clip-text text-transparent">
              Hoster Server Control Panel
            </h1>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Node-A Bangladesh Node</p>
          </div>
        </div>

        {/* User Email Info */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs font-semibold text-neutral-400">Developer Root</span>
            <span className="text-[10px] text-neutral-500 font-mono">forosboss1@gmail.com</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-400 font-mono select-none" title="Logged in as forosboss1@gmail.com">
            FB
          </div>
        </div>
      </header>

      {/* DASHBOARD CONTAINER */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto p-4 md:p-6 gap-6">
        
        {/* SIDEBAR NAVIGATION */}
        <aside className="md:w-64 flex-shrink-0 flex flex-col gap-2">
          <div className="bg-neutral-900/40 border border-neutral-900 rounded-xl p-2.5 flex flex-col gap-1">
            <button
              onClick={() => setActiveTab("dashboard")}
              id="sidebar-tab-dashboard"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold transition duration-200 ${
                activeTab === "dashboard"
                  ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/20"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/40 border border-transparent"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              General Dashboard
            </button>

            <button
              onClick={() => setActiveTab("scripts")}
              id="sidebar-tab-scripts"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold transition duration-200 ${
                activeTab === "scripts"
                  ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/20"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/40 border border-transparent"
              }`}
            >
              <Globe className="w-4 h-4" />
              Python / Node Deployer
            </button>

            <button
              onClick={() => setActiveTab("minecraft")}
              id="sidebar-tab-minecraft"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold transition duration-200 ${
                activeTab === "minecraft"
                  ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/20"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/40 border border-transparent"
              }`}
            >
              <Server className="w-4 h-4" />
              Minecraft Section
            </button>
          </div>

          {/* Mini node metadata stat card */}
          <div className="bg-neutral-900/10 border border-neutral-900 rounded-xl p-4 text-[11px] text-neutral-500 space-y-2">
            <div className="flex items-center justify-between">
              <span>Node IP:</span>
              <span className="font-mono text-neutral-400">127.0.0.1</span>
            </div>
            <div className="flex items-center justify-between">
              <span>SSH Daemon:</span>
              <span className="text-emerald-500 flex items-center gap-1 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Hypervisor:</span>
              <span className="font-mono text-neutral-400">Ubuntu Docker</span>
            </div>
          </div>
        </aside>

        {/* MAIN BODY CONSOLE CONTENT */}
        <main className="flex-1 min-w-0">
          
          {activeTab === "dashboard" ? (
            /* GENERAL OVERVIEW DASHBOARD TAB */
            <div className="space-y-6">
              
              {/* Top System Gauges Grid */}
              <StatsGrid stats={stats} />

              {/* LIST OF RUNNING SERVERS & QUICK POWER ACTIONS */}
              <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  Active Server Containers
                </h3>

                {apps.length === 0 && mcServers.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-neutral-800 rounded-lg text-neutral-500">
                    <p className="text-xs">No active service workspaces. Deploy your first Node/Python app or create a Minecraft Server to see details!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    
                    {/* Render deployed scripts */}
                    {apps.map((app) => (
                      <div key={app.id} className="bg-neutral-950/40 border border-neutral-850/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${app.type === 'python' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'} mt-0.5`}>
                            <Globe className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-neutral-200">{app.name}</h4>
                              <span className="text-[9px] uppercase tracking-wider font-bold bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-400">Script App</span>
                            </div>
                            <p className="text-[10px] text-neutral-500 font-mono mt-1">Runtime: {app.type === 'python' ? 'Python 3' : 'Node.js'} | Entry: {app.entry_point}</p>
                          </div>
                        </div>

                        {/* Power operations */}
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${app.status === 'running' ? 'bg-emerald-500' : app.status === 'installing' ? 'bg-amber-400' : 'bg-neutral-600'}`} />
                            <span className="text-[10px] uppercase font-mono font-bold text-neutral-400">{app.status}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            {app.status !== 'running' && app.status !== 'installing' ? (
                              <button
                                onClick={() => handleAppQuickAction(app.id, "start")}
                                className="p-1.5 bg-neutral-900 hover:bg-neutral-850 text-emerald-400 hover:text-emerald-300 rounded border border-neutral-800 transition"
                                title="Start application"
                              >
                                <Play className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleAppQuickAction(app.id, "stop")}
                                className="p-1.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-400 hover:text-white rounded border border-neutral-800 transition"
                                title="Stop application"
                              >
                                <Square className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={() => handleAppQuickAction(app.id, "restart")}
                              className="p-1.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 rounded border border-neutral-800 transition"
                              title="Restart application"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Render minecraft servers */}
                    {mcServers.map((srv) => (
                      <div key={srv.id} className="bg-neutral-950/40 border border-neutral-850/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg mt-0.5">
                            <Server className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-neutral-200">{srv.name}</h4>
                              <span className="text-[9px] uppercase tracking-wider font-bold bg-indigo-900/20 px-1.5 py-0.5 rounded text-indigo-400">Minecraft Server</span>
                            </div>
                            <p className="text-[10px] text-neutral-500 font-mono mt-1">Core: {srv.type} | Version: {srv.version} | OnlineMode: {srv.online_mode ? 'True' : 'False'}</p>
                          </div>
                        </div>

                        {/* Power operations */}
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${srv.status === 'running' ? 'bg-emerald-500' : srv.status === 'installing' ? 'bg-amber-400 animate-pulse' : 'bg-neutral-600'}`} />
                            <span className="text-[10px] uppercase font-mono font-bold text-neutral-400">{srv.status}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            {srv.status !== 'running' && srv.status !== 'installing' ? (
                              <button
                                onClick={() => handleMcQuickAction(srv.id, "start")}
                                className="p-1.5 bg-neutral-900 hover:bg-neutral-850 text-emerald-400 hover:text-emerald-300 rounded border border-neutral-800 transition"
                                title="Start server"
                              >
                                <Play className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleMcQuickAction(srv.id, "stop")}
                                className="p-1.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-400 hover:text-white rounded border border-neutral-800 transition"
                                title="Stop server"
                              >
                                <Square className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={() => handleMcQuickAction(srv.id, "restart")}
                              className="p-1.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 rounded border border-neutral-800 transition"
                              title="Restart server"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                  </div>
                )}
              </div>

              {/* Server Host Features overview list */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-neutral-900/30 border border-neutral-900 rounded-xl p-4">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 mb-2" />
                  <h4 className="text-xs font-bold text-neutral-300">Auto EULA and Nano config</h4>
                  <p className="text-[11px] text-neutral-500 leading-relaxed mt-1">Eula acceptance is automatic. Easy file navigation and directory creation speeds up your setup tasks.</p>
                </div>
                <div className="bg-neutral-900/30 border border-neutral-900 rounded-xl p-4">
                  <Sparkles className="w-5 h-5 text-indigo-400 mb-2" />
                  <h4 className="text-xs font-bold text-neutral-300">Paper, Vanilla, Bedrock, Forge</h4>
                  <p className="text-[11px] text-neutral-500 leading-relaxed mt-1">One-click server core provisioning. Choose between popular cores with easy version mapping.</p>
                </div>
                <div className="bg-neutral-900/30 border border-neutral-900 rounded-xl p-4">
                  <Globe className="w-5 h-5 text-cyan-400 mb-2" />
                  <h4 className="text-xs font-bold text-neutral-300">Python & Node Auto Build</h4>
                  <p className="text-[11px] text-neutral-500 leading-relaxed mt-1">Automatically resolves package managers like pip / npm, installs required packages, and hosts scripts.</p>
                </div>
              </div>

            </div>
          ) : activeTab === "scripts" ? (
            /* SCRIPT APPLICATION TAB */
            <ScriptHosting onNotify={handleNotify} />
          ) : (
            /* MINECRAFT GAME SERVER TAB */
            <MinecraftHosting onNotify={handleNotify} />
          )}

        </main>
      </div>

      {/* FIXED FOOTER */}
      <footer className="border-t border-neutral-900 bg-neutral-950/80 py-4 px-6 text-center text-[10px] text-neutral-600 font-mono flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>&copy; 2026 Minecraft & Script Hosting Control Panel. All rights reserved.</p>
        <p>Designed for fast automated deployments | Powered by Ubuntu container hypervisor</p>
      </footer>

      {/* DYNAMIC FLOATING NOTIFICATION BANNER */}
      {notification && (
        <div id="toast-notification" className="fixed bottom-5 right-5 z-50 bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-xl flex items-start gap-3 max-w-sm animate-bounce">
          <div className={`p-1.5 rounded-lg ${
            notification.type === "success" ? "bg-emerald-500/10 text-emerald-400" :
            notification.type === "error" ? "bg-red-500/10 text-red-400" : "bg-indigo-500/10 text-indigo-400"
          }`}>
            {notification.type === "success" ? <CheckCircle className="w-4 h-4" /> :
             notification.type === "error" ? <AlertTriangle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
          </div>
          <div>
            <p className="text-xs font-bold text-neutral-200 capitalize">{notification.type} Alert</p>
            <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">{notification.message}</p>
          </div>
        </div>
      )}

    </div>
  );
}
