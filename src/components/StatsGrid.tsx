import { SystemStats } from "../types";
import { Cpu, HardDrive, Cpu as MemoryIcon, Clock, Activity, Server } from "lucide-react";

interface StatsGridProps {
  stats: SystemStats | null;
}

export default function StatsGrid({ stats }: StatsGridProps) {
  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 h-28" />
        ))}
      </div>
    );
  }

  const statItems = [
    {
      label: "CPU Usage",
      value: `${stats.cpu}%`,
      subtext: "System wide",
      icon: Cpu,
      color: stats.cpu > 70 ? "text-red-400" : stats.cpu > 40 ? "text-amber-400" : "text-emerald-400",
      progress: stats.cpu,
      bg: "bg-emerald-500/10"
    },
    {
      label: "RAM Usage",
      value: stats.memoryUsed,
      subtext: `Total: ${stats.memoryTotal} (${stats.memory}%)`,
      icon: MemoryIcon,
      color: stats.memory > 80 ? "text-red-400" : stats.memory > 50 ? "text-amber-400" : "text-cyan-400",
      progress: stats.memory,
      bg: "bg-cyan-500/10"
    },
    {
      label: "Disk Storage",
      value: `${stats.disk}%`,
      subtext: "41.7 GB of 120 GB used",
      icon: HardDrive,
      color: "text-indigo-400",
      progress: stats.disk,
      bg: "bg-indigo-500/10"
    },
    {
      label: "System Status",
      value: "Online",
      subtext: `Uptime: ${stats.uptime}`,
      icon: Clock,
      color: "text-emerald-400",
      progress: 100,
      bg: "bg-emerald-500/10"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <div
            key={index}
            id={`stat-card-${index}`}
            className="bg-neutral-900/60 border border-neutral-800/80 rounded-xl p-5 hover:border-neutral-700 transition-all duration-300 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-neutral-400 tracking-wide uppercase">{item.label}</p>
                <h3 className="text-2xl font-bold font-mono tracking-tight mt-1 text-neutral-100">{item.value}</h3>
                <p className="text-xs text-neutral-500 mt-1">{item.subtext}</p>
              </div>
              <div className={`p-2.5 rounded-lg ${item.bg} ${item.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>

            {/* Micro Progress Bar */}
            <div className="w-full bg-neutral-800 h-1.5 rounded-full mt-4 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  item.color.includes("emerald")
                    ? "bg-emerald-500"
                    : item.color.includes("cyan")
                    ? "bg-cyan-500"
                    : item.color.includes("amber")
                    ? "bg-amber-500"
                    : item.color.includes("red")
                    ? "bg-red-500"
                    : "bg-indigo-500"
                }`}
                style={{ width: `${item.progress}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
