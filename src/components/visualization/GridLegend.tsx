import { useState } from 'react';
import { Activity, ShieldCheck, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { formatEpsilon } from '../../data/projectFacts';

export const GridLegend = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="absolute bottom-4 left-4 z-20 rounded-lg bg-[#07111F]/90 backdrop-blur-md border border-[#14263D] shadow-xl text-[10px] font-mono select-none pointer-events-auto max-w-xs transition-all duration-200">
      <div className="flex items-center justify-between p-2.5 cursor-pointer gap-3" onClick={() => setCollapsed(!collapsed)}>
        <div className="flex items-center gap-1.5 text-slate-300 font-medium">
          <Activity className="w-3 h-3 text-[#B8FF65]" />
          <span>TELEMETRY RISK SPECTRUM</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-slate-500">[SIMULATED]</span>
          <button
            type="button"
            className="p-0.5 rounded text-slate-400 hover:text-slate-200"
            title={collapsed ? 'Expand Legend' : 'Collapse Legend'}
            aria-label={collapsed ? 'Expand Legend' : 'Collapse Legend'}
          >
            {collapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="px-2.5 pb-2.5 pt-0 border-t border-[#14243A]/60">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-2 text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#B8FF65] shadow-[0_0_6px_rgba(184,255,101,0.8)]" />
              <span>Optimal Sync</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#38BDF8] shadow-[0_0_6px_rgba(56,189,248,0.8)]" />
              <span>FL Round Sync</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B] shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
              <span>Anomaly Watch</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#EF4444] shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
              <span>Elevated Risk</span>
            </div>
          </div>

          <div className="mt-2 pt-1.5 border-t border-[#14243A] flex items-center justify-between text-[9px] text-slate-500">
            <div className="flex items-center gap-1">
              <Zap className="w-2.5 h-2.5 text-[#38BDF8]" />
              <span>765kV Synchronous Mesh</span>
            </div>
            <div className="flex items-center gap-1 text-[#B8FF65]">
              <ShieldCheck className="w-2.5 h-2.5" />
              <span>{formatEpsilon().replace(' ', '')} DP</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
