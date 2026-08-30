/**
 * Types for hosting panel
 */

export interface ScriptApp {
  id: string;
  name: string;
  type: 'python' | 'node';
  status: 'idle' | 'installing' | 'running' | 'stopped' | 'failed';
  created_at: string;
  entry_point: string;
  packages: string[];
  env_vars: Record<string, string>;
  logs: string[];
  cpuUsage: number;
  memoryUsage: number;
}

export interface MinecraftServer {
  id: string;
  name: string;
  version: string;
  type: 'vanilla' | 'paper' | 'forge' | 'bedrock';
  status: 'idle' | 'installing' | 'running' | 'stopped' | 'failed';
  created_at: string;
  online_mode: boolean;
  port: number;
  max_players: number;
  motd: string;
  difficulty: 'peaceful' | 'easy' | 'normal' | 'hard';
  gamemode: 'survival' | 'creative' | 'adventure' | 'spectator';
  plugins: string[];
  logs: string[];
  cpuUsage: number;
  memoryUsage: number;
}

export interface SystemStats {
  cpu: number;
  memory: number;
  memoryTotal: string;
  memoryUsed: string;
  disk: number;
  uptime: string;
  activeApps: number;
  activeMcServers: number;
}

export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  mtime?: string;
}
