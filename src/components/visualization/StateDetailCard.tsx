import { X, ShieldAlert, TrendingUp, Users, Activity, Database } from 'lucide-react';
import type { GridRegionCode } from '../../types/grid';
import { GRID_REGIONS_CONFIG } from '../../constants/gridData';
import { StatusIndicator } from '../common/StatusIndicator';
import { formatEnergy, formatPower, formatNumber, formatEpsilon } from '../../utils/formatIndian';
import { PRIVACY_BUDGET } from '../../data/projectFacts';

export interface SelectedStateData {
  name: string;
  region: GridRegionCode;
  status: 'optimal' | 'warning' | 'alert' | 'syncing';
}

interface StateDetailCardProps {
  state: SelectedStateData | null;
  onClose: () => void;
}

export const StateDetailCard = ({
  state,
  onClose,
}: StateDetailCardProps) => {
  if (!state) return null;

  const regionConfig = GRID_REGIONS_CONFIG[state.region] || {
    name: 'National Grid',
    label: state.region,
    color: '#38BDF8',
    center: [82.5, 22.0] as const,
  };

  // Simulated demonstration data for selected states
  const getSimulatedStateData = (stateName: string) => {
    // Specific demonstration states
    if (stateName === 'Uttar Pradesh') {
      return {
        meters: 28500000,
        anomalies: 3200,
        consumption: 145000000, // kWh
        avgLoad: 18500, // MW
        dpEpsilon: PRIVACY_BUDGET.epsilon * 0.98, // Slightly lower than global
        lastSync: new Date(Date.now() - 3600000),
      };
    }
    if (stateName === 'Odisha') {
      return {
        meters: 9200000,
        anomalies: 1800,
        consumption: 52000000,
        avgLoad: 6800,
        dpEpsilon: PRIVACY_BUDGET.epsilon * 1.05, // Slightly higher than global
        lastSync: new Date(Date.now() - 7200000),
      };
    }
    if (stateName === 'Maharashtra') {
      return {
        meters: 32000000,
        anomalies: 2100,
        consumption: 195000000,
        avgLoad: 24500,
        dpEpsilon: PRIVACY_BUDGET.epsilon * 0.96,
        lastSync: new Date(Date.now() - 1800000),
      };
    }
    if (stateName === 'Karnataka') {
      return {
        meters: 18500000,
        anomalies: 1450,
        consumption: 98000000,
        avgLoad: 12200,
        dpEpsilon: PRIVACY_BUDGET.epsilon,
        lastSync: new Date(Date.now() - 2400000),
      };
    }

    // Default simulated data
    return {
      meters: Math.floor(Math.random() * 15000000) + 5000000,
      anomalies: Math.floor(Math.random() * 2000) + 500,
      consumption: Math.floor(Math.random() * 100000000) + 20000000,
      avgLoad: Math.floor(Math.random() * 15000) + 3000,
      dpEpsilon: PRIVACY_BUDGET.epsilon * (0.95 + Math.random() * 0.2),
      lastSync: new Date(Date.now() - Math.random() * 7200000),
    };
  };

  const data = getSimulatedStateData(state.name);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-start justify-between p-4 pb-3 border-b border-[#14263D]">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span 
              className="px-2 py-0.5 rounded text-[10px] font-mono font-bold border"
              style={{
                backgroundColor: `${regionConfig.color}15`,
                color: regionConfig.color,
                borderColor: `${regionConfig.color}40`,
              }}
            >
              {state.region}
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {regionConfig.name}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white font-display leading-tight">
            {state.name}
          </h2>
          <div className="mt-2">
            <StatusIndicator 
              status={state.status} 
              label={state.status === 'optimal' ? 'Operational' : 
                     state.status === 'syncing' ? 'Synchronizing' : 
                     state.status === 'warning' ? 'Warning' : 'Alert'} 
              size="sm" 
            />
          </div>
        </div>

        <button
          onClick={onClose}
          className="flex-shrink-0 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#0E2036] transition-colors"
          title="Close state inspector"
          aria-label="Close state inspector"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content — scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Grid Metrics */}
        <section>
          <h3 className="text-xs font-semibold font-mono uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-[#38BDF8]" />
            Grid Intelligence
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-[#0A1422] border border-[#14243A]">
              <div className="text-[10px] font-mono text-slate-400 uppercase mb-1">Smart Meters</div>
              <div className="text-lg font-bold font-mono text-white">
                {formatNumber(data.meters)}
              </div>
              <div className="text-[9px] text-slate-500 mt-0.5">Simulated tracked</div>
            </div>

            <div className="p-3 rounded-lg bg-[#0A1422] border border-[#14243A]">
              <div className="text-[10px] font-mono text-slate-400 uppercase mb-1">Anomalies</div>
              <div className="text-lg font-bold font-mono text-[#F59E0B]">
                {formatNumber(data.anomalies)}
              </div>
              <div className="text-[9px] text-slate-500 mt-0.5">Flagged events</div>
            </div>

            <div className="p-3 rounded-lg bg-[#0A1422] border border-[#14243A]">
              <div className="text-[10px] font-mono text-slate-400 uppercase mb-1">Consumption</div>
              <div className="text-lg font-bold font-mono text-[#38BDF8]">
                {formatEnergy(data.consumption, { decimals: 1 })}
              </div>
              <div className="text-[9px] text-slate-500 mt-0.5">Daily average</div>
            </div>

            <div className="p-3 rounded-lg bg-[#0A1422] border border-[#14243A]">
              <div className="text-[10px] font-mono text-slate-400 uppercase mb-1">Avg Load</div>
              <div className="text-lg font-bold font-mono text-[#B8FF65]">
                {formatPower(data.avgLoad * 1000, { decimals: 1 })}
              </div>
              <div className="text-[9px] text-slate-500 mt-0.5">Current demand</div>
            </div>
          </div>
        </section>

        {/* Federated Learning Status */}
        <section>
          <h3 className="text-xs font-semibold font-mono uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-[#B8FF65]" />
            FL Participation
          </h3>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0A1422] border border-[#14243A]">
              <span className="text-xs text-slate-400">Privacy Budget</span>
              <span className="font-mono text-sm font-semibold text-[#B8FF65]">
                {formatEpsilon(data.dpEpsilon)}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0A1422] border border-[#14243A]">
              <span className="text-xs text-slate-400">Last Sync</span>
              <span className="font-mono text-xs text-slate-300">
                {Math.floor((Date.now() - data.lastSync.getTime()) / 60000)} min ago
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0A1422] border border-[#14243A]">
              <span className="text-xs text-slate-400">Model Version</span>
              <span className="font-mono text-xs text-slate-300">
                v48.2-fedavg
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0A1422] border border-[#14243A]">
              <span className="text-xs text-slate-400">Aggregation Mode</span>
              <span className="font-mono text-xs text-[#38BDF8]">
                DP-FedAvg
              </span>
            </div>
          </div>
        </section>

        {/* Data Sources */}
        <section>
          <h3 className="text-xs font-semibold font-mono uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-[#38BDF8]" />
            Data Sources
          </h3>

          <div className="p-3 rounded-lg bg-[#0A1422] border border-[#14243A] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Telemetry Stream</span>
              <span className="font-mono text-slate-200">
                {state.status === 'alert' ? 'SIMULATED OUTAGE' : 'STABLE'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Data Retention</span>
              <span className="font-mono text-slate-200">Local Only</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Encryption</span>
              <span className="font-mono text-[#B8FF65]">AES-256-GCM</span>
            </div>
          </div>
        </section>

        {/* Important Notice */}
        <div className="p-3 rounded-lg bg-[#38BDF8]/5 border border-[#38BDF8]/20">
          <div className="flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-[#38BDF8] flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-slate-200 mb-1">
                Simulated Benchmark Data
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                This is demonstration data for research and evaluation purposes. All values are synthetically generated and do not represent actual DISCOM measurements or official grid conditions.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex-shrink-0 p-4 border-t border-[#14263D] bg-[#0A1422]/50">
        <button
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#38BDF8]/15 hover:bg-[#38BDF8]/25 border border-[#38BDF8]/40 text-sm font-medium text-[#38BDF8] transition-all"
          onClick={() => {
            // Future: Navigate to detailed state analytics page
            console.log('Navigate to detailed analytics for', state.name);
          }}
        >
          <TrendingUp className="w-4 h-4" />
          <span>View Detailed Analytics</span>
        </button>
      </div>
    </div>
  );
};
