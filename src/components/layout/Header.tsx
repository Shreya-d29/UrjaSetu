import React, { useState } from 'react';
import {
  Search,
  Bell,
  Terminal,
  X,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { StatusIndicator } from '../common/StatusIndicator';
import { 
  formatEpsilon, 
  TRAINING_STATUS, 
  PRIVACY_BUDGET,
  REGIONAL_CLIENTS 
} from '../../data/projectFacts';

interface HeaderProps {
  onSearchFocus?: () => void;
}

export const Header: React.FC<HeaderProps> = () => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const notifications = [
    {
      id: 1,
      type: 'info',
      title: `FL Aggregation Round #${TRAINING_STATUS.roundsCompleted} Complete`,
      desc: 'Northern & Western regional model weights federated with DP guarantee.',
      time: '4m ago',
    },
    {
      id: 2,
      type: 'warning',
      title: 'Simulated Non-IID Drift Detected',
      desc: 'Synthetic feeder feeder_north_delhi_04 flagged subtle variance shift.',
      time: '18m ago',
    },
    {
      id: 3,
      type: 'success',
      title: 'DP Privacy Budget Verification',
      desc: `Cumulative epsilon expenditure on schedule (${formatEpsilon()} / target ε ≤ ${PRIVACY_BUDGET.epsilon.toFixed(1)}).`,
      time: '1h ago',
    },
  ];

  return (
    <header className="relative flex items-center justify-between h-16 px-6 border-b border-[#14243A] bg-[#060E1A]/95 backdrop-blur-md z-20 shrink-0">
      {/* Left: Global Search & Quick Command trigger */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative w-full group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#38BDF8] transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search simulated nodes, DISCOMs, FL rounds, anomalies..."
            className="w-full h-9 pl-9 pr-14 text-xs rounded-lg bg-[#081525] border border-[#162C48] text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#38BDF8]/60 focus:ring-1 focus:ring-[#38BDF8]/40 transition-all font-sans"
            aria-label="Global platform search"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pointer-events-none">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-[#0C1E34] rounded border border-[#183658]">
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right: Environment status, live telemetry pills, notification, user */}
      <div className="flex items-center gap-4">
        {/* Environment Indicator: Clear SIMULATION SANDBOX notice */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#081525] border border-[#17304F]">
          <span className="flex h-1.5 w-1.5 rounded-full bg-[#38BDF8] animate-pulse" />
          <span className="text-[10px] font-mono font-semibold tracking-wider text-[#38BDF8]">
            SIMULATION SANDBOX
          </span>
          <span className="text-[9px] font-mono text-slate-400 border-l border-[#17304F] pl-1.5">
            BENCHMARK v2.4
          </span>
        </div>

        {/* System Status Indicator */}
        <div className="hidden md:flex items-center gap-3 px-3 py-1 rounded-lg bg-[#071322] border border-[#142842]">
          <StatusIndicator
            status="optimal"
            label={`${REGIONAL_CLIENTS.count} REGIONAL GRIDS ONLINE`}
            sublabel={`${formatEpsilon().replace(' ', '')} DP`}
            size="sm"
          />
        </div>

        {/* Action button: Quick CLI / Logs Modal Toggle */}
        <button
          className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#0E1F36] border border-transparent hover:border-[#1E3A60] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#38BDF8]"
          title="Simulated Engine Telemetry Logs"
          aria-label="View engine logs"
        >
          <Terminal className="w-4 h-4 text-slate-400" />
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#0E1F36] border border-transparent hover:border-[#1E3A60] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#38BDF8]"
            aria-label="Notifications"
            title="System notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#38BDF8] ring-2 ring-[#060E1A]" />
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl bg-[#071324] border border-[#173050] shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#14263E]">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-200 font-sans">
                    System Event Stream
                  </span>
                  <span className="px-1.5 py-0.2 text-[9px] font-mono text-[#38BDF8] bg-[#38BDF8]/10 rounded border border-[#38BDF8]/30">
                    3 New
                  </span>
                </div>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-slate-400 hover:text-slate-200 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-2.5 rounded-lg bg-[#050D18] border border-[#122338] hover:border-[#1A375A] transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      {n.type === 'warning' ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B] shrink-0 mt-0.5" />
                      ) : n.type === 'success' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#B8FF65] shrink-0 mt-0.5" />
                      ) : (
                        <Info className="w-3.5 h-3.5 text-[#38BDF8] shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-medium text-slate-200 truncate">
                          {n.title}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                          {n.desc}
                        </div>
                        <div className="text-[9px] font-mono text-slate-500 mt-1">
                          {n.time}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-2 pt-2 border-t border-[#14263E] text-center">
                <span className="text-[10px] font-mono text-slate-500">
                  ALL TELEMETRY PRESERVES LOCAL PRIVACY
                </span>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Area */}
        <div className="flex items-center gap-3 pl-2 border-l border-[#14243A]">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-[#0C1E34] border border-[#183658] text-[#38BDF8] font-mono font-semibold text-xs shadow-sm">
              AS
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-[#B8FF65] ring-2 ring-[#060E1A]" />
            </div>
            <div className="hidden xl:flex flex-col">
              <span className="text-xs font-medium text-slate-200 leading-tight">
                Dr. A. Sharma
              </span>
              <span className="text-[10px] font-mono text-slate-400 leading-tight">
                Lead FL Grid Architect
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
