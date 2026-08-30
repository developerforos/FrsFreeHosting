import React, { useState, useEffect, useRef } from "react";
import { MinecraftServer, FileItem } from "../types";
import { 
  Play, Square, RotateCw, Terminal, Folder, File, ShieldAlert, 
  Settings, Upload, HardDrive, Cpu, Plus, Sparkles, Sliders, Check, 
  ArrowLeft, Edit, Save, Trash2, Loader, ArrowUpRight
} from "lucide-react";

interface MinecraftHostingProps {
  onNotify: (message: string, type: "success" | "error" | "info") => void;
}

export default function MinecraftHosting({ onNotify }: MinecraftHostingProps) {
  const [servers, setServers] = useState<MinecraftServer[]>([]);
  const [selectedSrvId, setSelectedSrvId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isCreatingSrv, setIsCreatingSrv] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [isDeletingSrv, setIsDeletingSrv] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<"console" | "files" | "plugins" | "properties">("console");

  // New Server Form States
  const [newSrvName, setNewSrvName] = useState("");
  const [newSrvType, setNewSrvType] = useState<'vanilla' | 'paper' | 'forge' | 'bedrock'>("paper");
  const [newSrvVersion, setNewSrvVersion] = useState("1.20.4");
  const [newSrvOnlineMode, setNewSrvOnlineMode] = useState<boolean>(false);

  // Command input
  const [consoleCmd, setConsoleCmd] = useState("");

  // File Manager States
  const [filesList, setFilesList] = useState<FileItem[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string>("");
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  
  // File Editor modal/view
  const [editingFile, setEditingFile] = useState<{ path: string; content: string; isBinary?: boolean } | null>(null);
  const [isSavingFile, setIsSavingFile] = useState<boolean>(false);
  const [isCreatingFile, setIsCreatingFile] = useState<boolean>(false);
  const [newFileName, setNewFileName] = useState<string>("");
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>("");

  // Custom plugin upload state
  const [uploadingPlugin, setUploadingPlugin] = useState<boolean>(false);

  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Popular plugins preset list
  const popularPlugins = [
    { name: "EssentialsX", desc: "Teleportation, economy, warps, and admin controls", id: "EssentialsX" },
    { name: "WorldEdit", desc: "In-game map editing and mass block structures placement", id: "WorldEdit" },
    { name: "LuckPerms", desc: "Advanced player permission management framework", id: "LuckPerms" },
    { name: "Vault", desc: "Essential hook connector for chat, economy & permissions", id: "Vault" },
    { name: "GeyserMC", desc: "Enable Minecraft Bedrock (Mobile/Xbox) users to join java servers", id: "Geyser" }
  ];

  // Versions available per type
  const serverVersions = ["1.20.4", "1.20.2", "1.19.4", "1.18.2", "1.16.5", "1.12.2"];

  // Fetch servers list
  const fetchServers = async (selectFirst = false, overrideSelectedId?: string) => {
    try {
      const res = await fetch("/api/minecraft");
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Response is not JSON");
      }
      const data = await res.json();
      setServers(data);
      if (data.length > 0) {
        if (overrideSelectedId) {
          setSelectedSrvId(overrideSelectedId);
        } else if (selectFirst || !selectedSrvId) {
          setSelectedSrvId(data[data.length - 1].id);
        }
      } else {
        setSelectedSrvId(null);
      }
    } catch (err) {
      console.warn("Failed to fetch servers (backend booting or offline):", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers(true);

    const interval = setInterval(() => {
      fetchServers();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const selectedSrv = servers.find(s => s.id === selectedSrvId);

  // Reset deletion confirmation on server switch
  useEffect(() => {
    setShowDeleteConfirm(false);
  }, [selectedSrvId]);

  // Fetch files whenever selected server or folder changes
  useEffect(() => {
    if (selectedSrvId && activeSubTab === "files") {
      fetchFiles(selectedSrvId, currentFolder);
    }
  }, [selectedSrvId, currentFolder, activeSubTab]);

  // Fetch server file explorer
  const fetchFiles = async (srvId: string, folder: string) => {
    setIsLoadingFiles(true);
    try {
      const res = await fetch(`/api/minecraft/${srvId}/files?subFolder=${encodeURIComponent(folder)}`);
      if (res.ok) {
        const data = await res.json();
        setFilesList(data);
      } else {
        onNotify("Could not read server files from disk", "error");
      }
    } catch (err) {
      onNotify("Error accessing server folder structure", "error");
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // Auto scroll console
  useEffect(() => {
    if (activeSubTab === "console" && consoleEndRef.current) {
      const timer = setTimeout(() => {
        consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [selectedSrv?.id, selectedSrv?.logs?.length, activeSubTab]);

  // Create Minecraft Server
  const handleCreateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSrvName.trim()) {
      onNotify("Please provide a name for the server", "error");
      return;
    }

    setIsCreatingSrv(true);
    onNotify(`Creating Minecraft server: Setting up dependencies, EULA agreements, and initializing configurations...`, "info");

    try {
      const res = await fetch("/api/minecraft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSrvName,
          type: newSrvType,
          version: newSrvVersion,
          online_mode: newSrvOnlineMode
        })
      });

      if (res.ok) {
        const data = await res.json();
        await fetchServers(false, data.id);
        setIsCreating(false);
        setActiveSubTab("console");
        setNewSrvName("");
        onNotify(`Successfully initialized server node ${newSrvName}! Starting setup...`, "success");
      } else {
        onNotify("Failed to schedule server creation", "error");
      }
    } catch (err) {
      onNotify("Error creating server profile", "error");
    } finally {
      setIsCreatingSrv(false);
    }
  };

  // Power action (start, stop, restart)
  const handlePowerAction = async (id: string, action: "start" | "stop" | "restart") => {
    try {
      const res = await fetch(`/api/minecraft/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        onNotify(`Minecraft server was requested to ${action}`, "success");
        fetchServers();
      } else {
        onNotify("Failed to change power status", "error");
      }
    } catch (err) {
      onNotify("Connection failure to server nodes", "error");
    }
  };

  // Delete Minecraft Server
  const handleDeleteServer = async (id: string) => {
    setIsDeletingSrv(true);
    onNotify("Deallocating physical directory and deleting server instance...", "info");
    try {
      const res = await fetch(`/api/minecraft/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        onNotify("Minecraft server deleted successfully", "success");
        setShowDeleteConfirm(false);
        setSelectedSrvId(null);
        await fetchServers(true);
      } else {
        const errData = await res.json();
        onNotify(errData.error || "Failed to delete server profile", "error");
      }
    } catch (err) {
      onNotify("Connection error during server deletion", "error");
    } finally {
      setIsDeletingSrv(false);
    }
  };

  // Send Console command
  const handleSendCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consoleCmd.trim() || !selectedSrvId) return;

    const cmd = consoleCmd;
    setConsoleCmd("");

    try {
      const res = await fetch(`/api/minecraft/${selectedSrvId}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd })
      });
      if (res.ok) {
        fetchServers();
      } else {
        onNotify("Command dispatch error", "error");
      }
    } catch (err) {
      onNotify("Communication error with Minecraft container", "error");
    }
  };

  // Open single file to edit
  const handleOpenFile = async (filePath: string) => {
    if (!selectedSrvId) return;
    try {
      const res = await fetch(`/api/minecraft/${selectedSrvId}/files/read?filePath=${encodeURIComponent(filePath)}`);
      if (res.ok) {
        const data = await res.json();
        setEditingFile({ path: filePath, content: data.content, isBinary: data.isBinary });
      } else {
        onNotify("Unable to load file content", "error");
      }
    } catch (err) {
      onNotify("Error downloading file content", "error");
    }
  };

  // Save single file edit
  const handleSaveFileContent = async () => {
    if (!selectedSrvId || !editingFile) return;
    if (editingFile.isBinary) {
      onNotify("Cannot save binary compiled data file!", "error");
      return;
    }
    setIsSavingFile(true);
    try {
      const res = await fetch(`/api/minecraft/${selectedSrvId}/files/write`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filePath: editingFile.path,
          content: editingFile.content
        })
      });
      if (res.ok) {
        onNotify(`File '${editingFile.path}' saved to filesystem!`, "success");
        setEditingFile(null);
        fetchFiles(selectedSrvId, currentFolder);
      } else {
        onNotify("Error saving changes to disk", "error");
      }
    } catch (err) {
      onNotify("Network issue writing changes", "error");
    } finally {
      setIsSavingFile(false);
    }
  };

  // Create new file
  const handleCreateNewFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim() || !selectedSrvId) return;

    const fullPath = currentFolder ? `${currentFolder}/${newFileName}` : newFileName;

    try {
      const res = await fetch(`/api/minecraft/${selectedSrvId}/files/write`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filePath: fullPath,
          content: "# Created via Panel File Manager\n"
        })
      });
      if (res.ok) {
        onNotify(`File '${newFileName}' added successfully!`, "success");
        setIsCreatingFile(false);
        setNewFileName("");
        fetchFiles(selectedSrvId, currentFolder);
      } else {
        onNotify("Failed to create file", "error");
      }
    } catch (err) {
      onNotify("Error writing blank file", "error");
    }
  };

  // Create new folder (mkdir)
  const handleCreateNewFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !selectedSrvId) return;

    const fullPath = currentFolder ? `${currentFolder}/${newFolderName}` : newFolderName;

    try {
      const res = await fetch(`/api/minecraft/${selectedSrvId}/files/mkdir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderPath: fullPath
        })
      });
      if (res.ok) {
        onNotify(`Folder '${newFolderName}' created successfully!`, "success");
        setIsCreatingFolder(false);
        setNewFolderName("");
        fetchFiles(selectedSrvId, currentFolder);
      } else {
        onNotify("Failed to create folder", "error");
      }
    } catch (err) {
      onNotify("Error creating folder structure", "error");
    }
  };

  // Delete File or Directory
  const handleDeleteFile = async (filePath: string) => {
    if (!selectedSrvId) return;
    const isConfirmed = window.confirm(`Are you sure you want to permanently delete '${filePath}'?`);
    if (!isConfirmed) return;

    try {
      const res = await fetch(`/api/minecraft/${selectedSrvId}/files?filePath=${encodeURIComponent(filePath)}`, {
        method: "DELETE"
      });
      if (res.ok) {
        onNotify(`Permanently deleted '${filePath}'!`, "success");
        fetchFiles(selectedSrvId, currentFolder);
      } else {
        onNotify("Failed to delete file or folder", "error");
      }
    } catch (err) {
      onNotify("Error sending deletion command", "error");
    }
  };

  // 1-Click Install Popular Plugins
  const handleInstallPlugin = async (pluginId: string) => {
    if (!selectedSrvId) return;
    try {
      const res = await fetch(`/api/minecraft/${selectedSrvId}/plugins/install-default`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pluginName: pluginId })
      });
      if (res.ok) {
        onNotify(`Successfully installed ${pluginId} plugin in plugins/ folder!`, "success");
        fetchServers();
      } else {
        onNotify("Plugin installation failed", "error");
      }
    } catch (err) {
      onNotify("Network issue during plugin install", "error");
    }
  };

  // Local Jar file Upload simulate
  const handlePluginFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedSrvId) return;

    if (!file.name.endsWith(".jar")) {
      onNotify("Minecraft plugins must be compiled .jar files!", "error");
      return;
    }

    setUploadingPlugin(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Content = event.target?.result
        ? (event.target.result as string).split(",")[1]
        : "";

      try {
        const res = await fetch(`/api/minecraft/${selectedSrvId}/plugins/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            base64Content
          })
        });

        if (res.ok) {
          onNotify(`Plugin '${file.name}' was successfully uploaded and registered!`, "success");
          fetchServers();
        } else {
          onNotify("Failed to upload plugin jar", "error");
        }
      } catch (err) {
        onNotify("Upload transfer failure", "error");
      } finally {
        setUploadingPlugin(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Navigate back to parent folder in File Manager
  const navigateBack = () => {
    if (!currentFolder) return;
    const segments = currentFolder.split("/");
    segments.pop();
    setCurrentFolder(segments.join("/"));
  };

  // Direct configuration property edits
  const handleUpdateProperties = async (updates: any) => {
    if (!selectedSrvId) return;
    try {
      const res = await fetch(`/api/minecraft/${selectedSrvId}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        onNotify("Server properties synchronized and saved successfully!", "success");
        fetchServers();
      } else {
        onNotify("Failed to save properties", "error");
      }
    } catch (err) {
      onNotify("Error saving properties", "error");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Sidebar - list existing servers & creation toggle */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-wide text-neutral-300 uppercase">Minecraft Servers</h3>
            <button
              onClick={() => setIsCreating(!isCreating)}
              id="new-mc-server-btn"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Server
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-6">
              <Loader className="w-5 h-5 animate-spin text-neutral-500" />
            </div>
          ) : servers.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 border border-dashed border-neutral-800 rounded-lg">
              <p className="text-xs">No Minecraft servers active</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-[350px] overflow-y-auto pr-1">
              {servers.map((srv) => (
                <button
                  key={srv.id}
                  onClick={() => {
                    setSelectedSrvId(srv.id);
                    setIsCreating(false);
                    setCurrentFolder("");
                  }}
                  id={`srv-select-${srv.id}`}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all text-left w-full ${
                    selectedSrvId === srv.id
                      ? "bg-indigo-600/10 border-indigo-500/50 text-indigo-200"
                      : "bg-neutral-950/40 border-neutral-800/80 text-neutral-400 hover:border-neutral-700 hover:bg-neutral-900/40"
                  }`}
                >
                  <div className="truncate pr-2">
                    <p className="text-xs font-semibold text-neutral-200 truncate">{srv.name}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">
                        {srv.type}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-500">v{srv.version}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`w-2 h-2 rounded-full ${
                      srv.status === "running" ? "bg-emerald-500 animate-pulse" :
                      srv.status === "installing" ? "bg-amber-400 animate-bounce" :
                      srv.status === "failed" ? "bg-red-500" : "bg-neutral-600"
                    }`} />
                    <ArrowUpRight className="w-3.5 h-3.5 text-neutral-600" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Global Minecraft quicktip */}
        <div className="bg-neutral-900/30 border border-neutral-800/50 rounded-xl p-4 text-xs text-neutral-500 leading-relaxed flex gap-3">
          <Sparkles className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
          <p>
            The control panel automatically schedules and handles complete Ubuntu container configurations, JVM directory allocations, auto-accepts standard Minecraft EULA, and automatically renames files to <code className="text-neutral-300 font-mono">server.jar</code>.
          </p>
        </div>
      </div>

      {/* Main Panel Content - creation form or selected server manage board */}
      <div className="lg:col-span-8">
        {isCreating ? (
          /* CREATE SERVER FORM */
          <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-5">
              <div>
                <h3 className="text-base font-bold text-neutral-200">Initialize Minecraft Server Node</h3>
                <p className="text-xs text-neutral-500 mt-1">Deploy automated game instance with custom specs</p>
              </div>
              <button
                onClick={() => setIsCreating(false)}
                className="text-xs text-neutral-400 hover:text-white underline font-medium"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateServer} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase">Server Name</label>
                  <input
                    type="text"
                    required
                    placeholder=" Bengal Survival Server"
                    value={newSrvName}
                    onChange={(e) => setNewSrvName(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm text-neutral-200 font-medium placeholder-neutral-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase">Game Version</label>
                  <select
                    value={newSrvVersion}
                    onChange={(e) => setNewSrvVersion(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm text-neutral-300 font-medium outline-none"
                  >
                    {serverVersions.map((v) => (
                      <option key={v} value={v}>Version: {v} (Latest Update)</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase">Server Core Jar Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(["vanilla", "paper", "forge", "bedrock"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewSrvType(type)}
                      className={`py-3 rounded-lg border text-center font-bold capitalize text-xs transition ${
                        newSrvType === type
                          ? "bg-indigo-600/10 border-indigo-500/70 text-indigo-300"
                          : "bg-neutral-950 border-neutral-800 text-neutral-500 hover:border-neutral-700"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border border-neutral-800 bg-neutral-950/30 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-neutral-300">Online Mode Configuration</p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">Toggle True for premium authentication, False to support cracked players</p>
                </div>
                <div className="flex gap-1 bg-neutral-950 border border-neutral-800 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setNewSrvOnlineMode(true)}
                    className={`px-3 py-1 text-xs font-bold rounded ${
                      newSrvOnlineMode ? "bg-indigo-600 text-white" : "text-neutral-500 hover:text-neutral-300"
                    }`}
                  >
                    True
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewSrvOnlineMode(false)}
                    className={`px-3 py-1 text-xs font-bold rounded ${
                      !newSrvOnlineMode ? "bg-indigo-600 text-white" : "text-neutral-500 hover:text-neutral-300"
                    }`}
                  >
                    False
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreatingSrv}
                id="create-server-submit-btn"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold transition-all shadow-md hover:shadow-indigo-500/10 flex items-center justify-center gap-2"
              >
                {isCreatingSrv ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Initializing Node Setup Script...
                  </>
                ) : (
                  "Launch Automation Core (Installs EULA, ubuntu, sudo, nano & Renames to server.jar)"
                )}
              </button>
            </form>
          </div>
        ) : selectedSrv ? (
          /* DETAILED MINECRAFT CONTROL PANEL BOARD */
          <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-xl overflow-hidden flex flex-col h-[650px] shadow-sm">
            {/* Server Header controls */}
            <div className="p-5 border-b border-neutral-800 bg-neutral-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="truncate">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-bold text-neutral-200 truncate">{selectedSrv.name}</h3>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                    selectedSrv.status === "running" ? "bg-emerald-500/10 text-emerald-400" :
                    selectedSrv.status === "installing" ? "bg-amber-400/10 text-amber-400 animate-pulse" :
                    selectedSrv.status === "failed" ? "bg-red-500/10 text-red-400" : "bg-neutral-800 text-neutral-400"
                  }`}>
                    {selectedSrv.status}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-1 font-mono">Port: {selectedSrv.port} | Core: {selectedSrv.type} {selectedSrv.version}</p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {selectedSrv.status !== "running" && selectedSrv.status !== "installing" ? (
                  <button
                    onClick={() => handlePowerAction(selectedSrv.id, "start")}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Start
                  </button>
                ) : (
                  <button
                    onClick={() => handlePowerAction(selectedSrv.id, "stop")}
                    className="flex items-center gap-1 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-bold transition"
                  >
                    <Square className="w-3.5 h-3.5" />
                    Stop
                  </button>
                )}

                <button
                  onClick={() => handlePowerAction(selectedSrv.id, "restart")}
                  className="flex items-center gap-1 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-bold transition"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  Restart
                </button>

                {showDeleteConfirm ? (
                  <div className="flex items-center gap-2 bg-red-950/20 border border-red-900/30 px-3 py-1.5 rounded-lg">
                    <span className="text-[11px] font-semibold text-red-400 hidden md:inline">Are you sure? This will delete all files.</span>
                    <button
                      onClick={() => handleDeleteServer(selectedSrv.id)}
                      disabled={isDeletingSrv}
                      className="px-2 py-1 bg-red-600 hover:bg-red-500 disabled:bg-red-600/50 disabled:cursor-not-allowed text-white rounded text-[10px] font-bold transition flex items-center gap-1"
                    >
                      {isDeletingSrv ? <Loader className="w-2.5 h-2.5 animate-spin" /> : "Yes, Delete"}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeletingSrv}
                      className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-[10px] font-bold transition"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 rounded-lg text-xs font-bold transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Server
                  </button>
                )}
              </div>
            </div>

            {/* Performance Bar (only when running) */}
            {selectedSrv.status === "running" && (
              <div className="grid grid-cols-3 border-b border-neutral-800 divide-x divide-neutral-800 bg-neutral-950/40 text-center py-2.5">
                <div>
                  <span className="text-[10px] text-neutral-500 uppercase font-semibold">Allocated CPU</span>
                  <p className="text-xs font-bold font-mono text-neutral-300">{selectedSrv.cpuUsage}%</p>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 uppercase font-semibold">JVM RAM Allocated</span>
                  <p className="text-xs font-bold font-mono text-neutral-300">{(selectedSrv.memoryUsage / 1024).toFixed(2)} GB</p>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 uppercase font-semibold">Players Online</span>
                  <p className="text-xs font-bold font-mono text-neutral-300">1 / {selectedSrv.max_players}</p>
                </div>
              </div>
            )}

            {/* Tab selection bar */}
            <div className="flex border-b border-neutral-800 bg-neutral-950/20 px-4 overflow-x-auto">
              <button
                onClick={() => setActiveSubTab("console")}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
                  activeSubTab === "console"
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-neutral-500 hover:text-neutral-300"
                }`}
              >
                <Terminal className="w-4 h-4" />
                Live Console
              </button>
              <button
                onClick={() => {
                  setActiveSubTab("files");
                  setCurrentFolder("");
                  setEditingFile(null);
                }}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
                  activeSubTab === "files"
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-neutral-500 hover:text-neutral-300"
                }`}
              >
                <Folder className="w-4 h-4" />
                File Manager
              </button>
              <button
                onClick={() => setActiveSubTab("plugins")}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
                  activeSubTab === "plugins"
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-neutral-500 hover:text-neutral-300"
                }`}
              >
                <Sliders className="w-4 h-4" />
                Plugins & Mods
              </button>
              <button
                onClick={() => setActiveSubTab("properties")}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
                  activeSubTab === "properties"
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-neutral-500 hover:text-neutral-300"
                }`}
              >
                <Settings className="w-4 h-4" />
                Config Settings
              </button>
            </div>

            {/* INNER PANEL BODY */}
            <div className="flex-1 overflow-hidden bg-neutral-950 flex flex-col">
              {activeSubTab === "console" ? (
                /* INTERACTIVE MINECRAFT TERMINAL */
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] text-neutral-300 space-y-1 select-text">
                    {selectedSrv.logs.map((log, index) => (
                      <div
                        key={index}
                        className={`leading-relaxed whitespace-pre-wrap ${
                          log.includes("INFO") ? "text-neutral-400" :
                          log.includes("WARN") ? "text-amber-400" :
                          log.includes("ERROR") ? "text-red-400" :
                          log.includes("[CONSOLE_INPUT]") ? "text-indigo-400 font-bold" : "text-neutral-300"
                        }`}
                      >
                        {log}
                      </div>
                    ))}
                    <div ref={consoleEndRef} />
                  </div>

                  {/* Terminal shortcut triggers */}
                  {selectedSrv.status === "running" && (
                    <div className="px-4 py-1.5 bg-neutral-900/40 border-t border-neutral-900 flex gap-2 overflow-x-auto">
                      <button
                        onClick={() => {
                          setConsoleCmd("op Foros");
                          onNotify("Command scheduled. Click Enter to send.", "info");
                        }}
                        className="text-[10px] font-semibold bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20 transition whitespace-nowrap"
                      >
                        Op Foros
                      </button>
                      <button
                        onClick={() => {
                          setConsoleCmd("gamemode creative Foros");
                        }}
                        className="text-[10px] font-semibold bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20 transition whitespace-nowrap"
                      >
                        Set Creative
                      </button>
                      <button
                        onClick={() => {
                          setConsoleCmd("list");
                        }}
                        className="text-[10px] font-semibold bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20 transition whitespace-nowrap"
                      >
                        List Players
                      </button>
                      <button
                        onClick={() => {
                          setConsoleCmd("help");
                        }}
                        className="text-[10px] font-semibold bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20 transition whitespace-nowrap"
                      >
                        Show Help
                      </button>
                    </div>
                  )}

                  {/* Input box */}
                  <form onSubmit={handleSendCommand} className="p-3 border-t border-neutral-800 bg-neutral-950 flex items-center gap-2">
                    <span className="font-mono text-neutral-500 text-xs select-none">&gt;</span>
                    <input
                      type="text"
                      placeholder={selectedSrv.status === "running" ? "Type console command (e.g. /op username) and press Enter..." : "Server is offline. Start server to execute console commands."}
                      disabled={selectedSrv.status !== "running"}
                      value={consoleCmd}
                      onChange={(e) => setConsoleCmd(e.target.value)}
                      className="flex-1 bg-transparent border-none text-xs font-mono text-neutral-200 placeholder-neutral-700 outline-none"
                    />
                  </form>
                </div>
              ) : activeSubTab === "files" ? (
                /* FILE MANAGER (Supports viewing, editing, creating) */
                <div className="flex-1 flex flex-col overflow-hidden">
                  {editingFile ? (
                    /* FILE EDITOR PANEL */
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <div className="flex items-center justify-between bg-neutral-900 px-4 py-2 border-b border-neutral-800">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingFile(null)}
                            className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition"
                          >
                            <ArrowLeft className="w-4 h-4" />
                          </button>
                          <span className="text-[11px] text-neutral-400 font-mono truncate max-w-sm">Editing: {editingFile.path}</span>
                          {editingFile.isBinary && (
                            <span className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded text-[10px] font-bold">READ ONLY (BINARY)</span>
                          )}
                        </div>
                        {!editingFile.isBinary && (
                          <button
                            onClick={handleSaveFileContent}
                            disabled={isSavingFile}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold transition flex items-center gap-1.5"
                          >
                            {isSavingFile ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            Save Config File
                          </button>
                        )}
                      </div>
                      <textarea
                        value={editingFile.content}
                        readOnly={editingFile.isBinary}
                        onChange={(e) => setEditingFile({ ...editingFile, content: e.target.value })}
                        className={`flex-1 bg-neutral-950 p-4 font-mono text-xs leading-relaxed outline-none resize-none overflow-y-auto select-text ${editingFile.isBinary ? "text-neutral-500 italic bg-neutral-950/60" : "text-neutral-300"}`}
                      />
                    </div>
                  ) : (
                    /* FILE LIST VIEW */
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-850 bg-neutral-900/40">
                        {/* Folder Navigation Path breadcrumbs */}
                        <div className="flex items-center gap-2">
                          {currentFolder && (
                            <button
                              onClick={navigateBack}
                              className="p-1 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded transition"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <span className="text-xs font-mono text-neutral-400">
                            Root / {currentFolder}
                          </span>
                        </div>

                        {/* File & Folder Creators */}
                        <div className="flex items-center gap-2">
                          {isCreatingFile ? (
                            <form onSubmit={handleCreateNewFile} className="flex gap-1.5 items-center">
                              <input
                                type="text"
                                required
                                autoFocus
                                placeholder="e.g. motd.txt"
                                value={newFileName}
                                onChange={(e) => setNewFileName(e.target.value)}
                                className="bg-neutral-950 border border-neutral-850 px-2.5 py-1 rounded text-xs font-mono text-neutral-300 placeholder-neutral-600 outline-none"
                              />
                              <button
                                type="submit"
                                className="p-1 text-emerald-400 hover:text-emerald-300"
                                title="Create file"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsCreatingFile(false);
                                  setNewFileName("");
                                }}
                                className="p-1 text-neutral-500 hover:text-neutral-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </form>
                          ) : isCreatingFolder ? (
                            <form onSubmit={handleCreateNewFolder} className="flex gap-1.5 items-center">
                              <input
                                type="text"
                                required
                                autoFocus
                                placeholder="e.g. logs"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                className="bg-neutral-950 border border-neutral-850 px-2.5 py-1 rounded text-xs font-mono text-neutral-300 placeholder-neutral-600 outline-none"
                              />
                              <button
                                type="submit"
                                className="p-1 text-emerald-400 hover:text-emerald-300"
                                title="Create folder"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsCreatingFolder(false);
                                  setNewFolderName("");
                                }}
                                className="p-1 text-neutral-500 hover:text-neutral-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </form>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  setIsCreatingFile(true);
                                  setIsCreatingFolder(false);
                                }}
                                className="flex items-center gap-1 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded text-xs font-semibold transition"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Add File
                              </button>
                              <button
                                onClick={() => {
                                  setIsCreatingFolder(true);
                                  setIsCreatingFile(false);
                                }}
                                className="flex items-center gap-1 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded text-xs font-semibold transition"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Add Folder
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {isLoadingFiles ? (
                        <div className="flex-1 flex items-center justify-center text-neutral-500">
                          <Loader className="w-5 h-5 animate-spin mr-2" />
                          Reading disk sectors...
                        </div>
                      ) : filesList.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-neutral-600">
                          <Folder className="w-8 h-8 text-neutral-750 mb-2" />
                          <p className="text-xs font-mono">This directory folder is empty</p>
                        </div>
                      ) : (
                        <div className="flex-1 overflow-y-auto">
                          <table className="w-full text-left text-xs font-mono border-collapse">
                            <thead>
                              <tr className="border-b border-neutral-850 bg-neutral-950 text-neutral-500 select-none text-[11px]">
                                <th className="px-4 py-2 font-semibold">File Name</th>
                                <th className="px-4 py-2 font-semibold text-right">Size</th>
                                <th className="px-4 py-2 font-semibold text-right">Last Modified</th>
                                <th className="px-4 py-2 font-semibold text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-850">
                              {filesList.map((file) => (
                                <tr
                                  key={file.path}
                                  onClick={() => {
                                    if (file.isDirectory) {
                                      setCurrentFolder(file.path);
                                    } else {
                                      handleOpenFile(file.path);
                                    }
                                  }}
                                  className="hover:bg-neutral-900/60 cursor-pointer text-neutral-300 transition"
                                >
                                  <td className="px-4 py-3 flex items-center gap-2">
                                    {file.isDirectory ? (
                                      <Folder className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                    ) : (
                                      <File className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                                    )}
                                    <span className="font-semibold truncate max-w-xs">{file.name}</span>
                                  </td>
                                  <td className="px-4 py-3 text-right text-neutral-500">
                                    {file.isDirectory ? "-" : `${(file.size! / 1024).toFixed(1)} KB`}
                                  </td>
                                  <td className="px-4 py-3 text-right text-neutral-500">
                                    {new Date(file.mtime!).toLocaleString()}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteFile(file.path);
                                      }}
                                      className="p-1 text-neutral-500 hover:text-rose-400 rounded transition hover:bg-rose-500/10"
                                      title="Delete file or folder"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : activeSubTab === "plugins" ? (
                /* PLUGINS & MODS MANAGER */
                <div className="flex-1 p-5 space-y-6 overflow-y-auto">
                  {/* Upload custom jar */}
                  <div>
                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Upload Custom Plugin Jar</h4>
                    <div className="border border-dashed border-neutral-800/80 rounded-xl p-5 bg-neutral-950/40 text-center flex flex-col items-center justify-center gap-3">
                      <div>
                        <p className="text-xs font-bold text-neutral-300">Custom Plugin File Uploader</p>
                        <p className="text-[11px] text-neutral-500 mt-0.5">Drag-and-drop or select any compiled plugin jar file (e.g. EssentialsX.jar)</p>
                      </div>
                      <label className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition cursor-pointer disabled:opacity-50">
                        {uploadingPlugin ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        {uploadingPlugin ? "Uploading Jar..." : "Choose Jar File"}
                        <input
                          type="file"
                          accept=".jar"
                          onChange={handlePluginFileUpload}
                          disabled={uploadingPlugin}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Plugin Appstore */}
                  <div>
                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3">Popular Spigot / Paper 1-Click AppStore</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {popularPlugins.map((plugin) => {
                        const isInstalled = selectedSrv.plugins.includes(`${plugin.id}.jar`);
                        return (
                          <div
                            key={plugin.id}
                            className="bg-neutral-900 border border-neutral-800/80 rounded-xl p-4 flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-neutral-200">{plugin.name}</span>
                                {isInstalled && (
                                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <Check className="w-3 h-3" />
                                    Active
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">{plugin.desc}</p>
                            </div>
                            <div className="mt-3.5">
                              <button
                                onClick={() => handleInstallPlugin(plugin.id)}
                                disabled={isInstalled}
                                className={`w-full py-1.5 rounded-lg text-xs font-bold transition ${
                                  isInstalled
                                    ? "bg-neutral-950 border border-neutral-850 text-neutral-600 cursor-not-allowed"
                                    : "bg-neutral-800 hover:bg-neutral-750 text-neutral-300"
                                }`}
                              >
                                {isInstalled ? "Already Installed" : "1-Click Download"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* CONFIG SETTINGS */
                <div className="flex-1 p-5 space-y-5 overflow-y-auto">
                  <div className="bg-neutral-900 border border-neutral-850 rounded-xl p-5 space-y-4">
                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider border-b border-neutral-800 pb-2">Properties File Settings</h4>
                    
                    {/* online-mode toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-neutral-300">Online Mode (BungeeCord connection)</p>
                        <p className="text-[10px] text-neutral-500">Toggling online-mode to False allows non-premium/cracked launchers to connect</p>
                      </div>
                      <div className="flex bg-neutral-950 border border-neutral-800 rounded p-0.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateProperties({ online_mode: true })}
                          className={`px-2.5 py-1 text-[10px] font-bold rounded ${
                            selectedSrv.online_mode ? "bg-indigo-600 text-white" : "text-neutral-500"
                          }`}
                        >
                          True
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateProperties({ online_mode: false })}
                          className={`px-2.5 py-1 text-[10px] font-bold rounded ${
                            !selectedSrv.online_mode ? "bg-indigo-600 text-white" : "text-neutral-500"
                          }`}
                        >
                          False
                        </button>
                      </div>
                    </div>

                    {/* Max players input */}
                    <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
                      <div>
                        <p className="text-xs font-bold text-neutral-300">Max Online Players Limit</p>
                        <p className="text-[10px] text-neutral-500">The total slot capacity of concurrent players on this JVM instance</p>
                      </div>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        defaultValue={selectedSrv.max_players}
                        onBlur={(e) => handleUpdateProperties({ max_players: e.target.value })}
                        className="w-16 bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-xs font-mono text-center text-neutral-300 focus:border-indigo-500 outline-none"
                      />
                    </div>

                    {/* Difficulty */}
                    <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
                      <div>
                        <p className="text-xs font-bold text-neutral-300">Default Game Difficulty</p>
                        <p className="text-[10px] text-neutral-500">Applies hostile mob damage parameters and player hunger multipliers</p>
                      </div>
                      <select
                        value={selectedSrv.difficulty}
                        onChange={(e) => handleUpdateProperties({ difficulty: e.target.value })}
                        className="bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1 text-xs text-neutral-300 focus:border-indigo-500 outline-none"
                      >
                        <option value="peaceful">Peaceful</option>
                        <option value="easy">Easy</option>
                        <option value="normal">Normal</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>

                    {/* Gamemode */}
                    <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
                      <div>
                        <p className="text-xs font-bold text-neutral-300">Default Game Mode</p>
                        <p className="text-[10px] text-neutral-500">Configures starting status behavior of new connection players</p>
                      </div>
                      <select
                        value={selectedSrv.gamemode}
                        onChange={(e) => handleUpdateProperties({ gamemode: e.target.value })}
                        className="bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1 text-xs text-neutral-300 focus:border-indigo-500 outline-none"
                      >
                        <option value="survival">Survival</option>
                        <option value="creative">Creative</option>
                        <option value="adventure">Adventure</option>
                        <option value="spectator">Spectator</option>
                      </select>
                    </div>

                    {/* MOTD text */}
                    <div className="flex flex-col gap-2 pt-3 border-t border-neutral-800">
                      <div>
                        <p className="text-xs font-bold text-neutral-300">Message of the Day (MOTD)</p>
                        <p className="text-[10px] text-neutral-500">The description subtitle line shown under your server in Minecraft server list</p>
                      </div>
                      <input
                        type="text"
                        defaultValue={selectedSrv.motd}
                        onBlur={(e) => handleUpdateProperties({ motd: e.target.value })}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-1.5 text-xs text-neutral-300 focus:border-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-xl h-[550px] flex flex-col items-center justify-center p-8 text-center">
            <Sliders className="w-10 h-10 text-neutral-600 mb-3" />
            <h3 className="text-sm font-bold text-neutral-400">No active server profile selected</h3>
            <p className="text-xs text-neutral-600 mt-1 max-w-sm">Create a new server node or select an existing instance from the sidebar list to view consoles</p>
          </div>
        )}
      </div>
    </div>
  );
}
