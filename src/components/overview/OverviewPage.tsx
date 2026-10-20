import React from 'react';
import {
  Share2,
  Lock,
  ArrowUpRight,
  TrendingUp,
  Cpu,
  RefreshCw,
  Users,
  Layers,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import { IndiaGrid3D } from '../visualization/IndiaGrid3D';
import { StatusIndicator } from '../common/StatusIndicator';
import type { GridRegionSummary } from '../../types';
import { 
  formatEpsilon, 
  formatRoundStatus,
  TOTAL_DISCOM_NODES,
  TRAINING_STATUS,
  REGIONAL_CLIENTS,
  DISCOM_DISTRIBUTION,
  PRIVACY_BUDGET 
} from '../../data/projectFacts';

// Simulated benchmark grid regions using actual DISCOM distribution
const SIMULATED_REGIONS: GridRegionSummary[] = [
  { code: 'NR', name: 'Northern Grid', discomCount: DISCOM_DISTRIBUTION.NR, simulatedStatus: 'optimal', dpEpsilon: 1.15, lastRound: TRAINING_STATUS.roundsCompleted },
  { code: 'WR', name: 'Western Grid', discomCount: DISCOM_DISTRIBUTION.WR, simulatedStatus: 'optimal', dpEpsilon: 1.22, lastRound: TRAINING_STATUS.roundsCompleted },
  { code: 'SR', name: 'Southern Grid', discomCount: DISCOM_DISTRIBUTION.SR, simulatedStatus: 'syncing', dpEpsilon: 1.28, lastRound: TRAINING_STATUS.roundsCompleted - 1 },
  { code: 'ER', name: 'Eastern Grid', discomCount: DISCOM_DISTRIBUTION.ER, simulatedStatus: 'optimal', dpEpsilon: 1.10, lastRound: TRAINING_STATUS.roundsCompleted },
  { code: 'NER', name: 'North-Eastern Grid', discomCount: DISCOM_DISTRIBUTION.NER, simulatedStatus: 'optimal', dpEpsilon: 0.95, lastRound: TRAINING_STATUS.roundsCompleted },
];

export const OverviewPage: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-5 sm:p-6 space-y-5 bg-[#050B14]">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#14243A]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-display">
              National Overview
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-mono tracking-wider font-semibold text-[#38BDF8] bg-[#38BDF8]/10 rounded border border-[#38BDF8]/30">
              SIMULATED MESH
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-sans">
            Monitor regional activity, federated learning progress, and electricity-anomaly intelligence across participating clients.
          </p>
        </div>

        {/* Header Action controls */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto font-mono text-xs">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#071324] border border-[#142842] text-slate-300">
            <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse" />
            <span className="text-[11px] text-slate-400">ROUND:</span>
            <span className="text-[#B8FF65] font-semibold">{formatRoundStatus()}</span>
          </div>

          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A1A2E] hover:bg-[#0E2440] border border-[#173050] text-slate-200 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#38BDF8]"
            title="Refresh simulated state"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Sync Status</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary Metrics (4 Key Focused Indicators) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Participating Clients */}
        <div className="p-3.5 rounded-xl bg-[#071324] border border-[#142842]">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[10px] font-mono tracking-wider uppercase">Participating Clients</span>
            <Users className="w-4 h-4 text-[#38BDF8]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold font-mono text-white">{TOTAL_DISCOM_NODES}</span>
            <span className="text-[11px] text-slate-400 font-sans">Simulated DISCOMs</span>
          </div>
          <div className="text-[10px] font-mono text-[#B8FF65] mt-1 flex items-center gap-1">
            <span>●</span> 100% Client Availability
          </div>
        </div>

        {/* Metric 2: Active Federated Round */}
        <div className="p-3.5 rounded-xl bg-[#071324] border border-[#142842]">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[10px] font-mono tracking-wider uppercase">Active FL Round</span>
            <Layers className="w-4 h-4 text-[#B8FF65]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold font-mono text-white">#{TRAINING_STATUS.roundsCompleted}</span>
            <span className="text-[11px] text-slate-400 font-sans">of {TRAINING_STATUS.roundsPlanned} Target</span>
          </div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">
            DP-FedAvg Convergence
          </div>
        </div>

        {/* Metric 3: Regional Availability */}
        <div className="p-3.5 rounded-xl bg-[#071324] border border-[#142842]">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[10px] font-mono tracking-wider uppercase">Regional Synchrony</span>
            <ShieldCheck className="w-4 h-4 text-[#38BDF8]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold font-mono text-white">{REGIONAL_CLIENTS.count} / {REGIONAL_CLIENTS.count}</span>
            <span className="text-[11px] text-slate-400 font-sans">Grids Online</span>
          </div>
          <div className="text-[10px] font-mono text-[#38BDF8] mt-1">
            {formatEpsilon()} DP Budget Spent
          </div>
        </div>

        {/* Metric 4: Current Anomaly Alerts */}
        <div className="p-3.5 rounded-xl bg-[#071324] border border-[#142842]">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[10px] font-mono tracking-wider uppercase">Current Anomaly Flags</span>
            <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold font-mono text-white">3</span>
            <span className="text-[11px] text-slate-400 font-sans">Feeders Flagged</span>
          </div>
          <div className="text-[10px] font-mono text-[#F59E0B] mt-1">
            Non-IID Variance Drift
          </div>
        </div>
      </div>

      {/* 3. Main Content: 3D Visualization + Regional Intelligence */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-5 min-h-0">
        {/* Left Section: 3D India Grid Visualization + Model Convergence */}
        <div className="xl:col-span-8 flex flex-col space-y-4">
          {/* Framed Interactive 3D India Grid Visualization */}
          <IndiaGrid3D />

          {/* Model Convergence & Performance Analytics Panel */}
          <div className="p-4 rounded-xl border border-[#14243A] bg-[#071324] flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-[#14243A]">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#38BDF8]" />
                <h3 className="text-xs font-semibold tracking-wide text-slate-200 uppercase font-mono">
                  Convergence & Telemetry Streams
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-[#0A1A2E] px-2 py-0.5 rounded border border-[#142842]">
                SIMULATED BENCHMARK EVALUATION
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
              <div className="p-3 rounded-lg bg-[#050D18] border border-[#122338]">
                <div className="text-[10px] font-mono text-slate-400 uppercase">
                  Global Test Loss (Simulated)
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-lg font-mono font-bold text-white">0.0382</span>
                  <span className="text-[10px] font-mono text-[#B8FF65]">↓ -14.2%</span>
                </div>
                <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                  DP-FedAvg epoch 48
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#050D18] border border-[#122338]">
                <div className="text-[10px] font-mono text-slate-400 uppercase">
                  Anomaly Detection F1 Score
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-lg font-mono font-bold text-[#38BDF8]">0.941</span>
                  <span className="text-[10px] font-mono text-slate-400">synthetic test suite</span>
                </div>
                <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                  Zero raw data exposure
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#050D18] border border-[#122338]">
                <div className="text-[10px] font-mono text-slate-400 uppercase">
                  DP Privacy Budget Spent
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-lg font-mono font-bold text-[#B8FF65]">{formatEpsilon()}</span>
                  <span className="text-[10px] font-mono text-slate-400">δ = {PRIVACY_BUDGET.delta.toExponential(0)}</span>
                </div>
                <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                  Rényi Differential Privacy
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section: Regional Intelligence & Federated Status Panels */}
        <div className="xl:col-span-4 flex flex-col space-y-4">
          {/* Panel 1: Regional Status (5 Synchronous Grids) */}
          <div className="p-4 rounded-xl border border-[#14243A] bg-[#071324] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#14243A]">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#38BDF8]" />
                <h3 className="text-xs font-semibold tracking-wide text-slate-200 uppercase font-mono">
                  Regional Intelligence
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                5 REGIONS
              </span>
            </div>

            <div className="mt-3 space-y-2.5">
              {SIMULATED_REGIONS.map((region) => (
                <div
                  key={region.code}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#050D18] border border-[#122338] hover:border-[#1E3656] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 flex items-center justify-center rounded-md bg-[#0C1E34] text-[10px] font-mono font-bold text-[#38BDF8] border border-[#183658]">
                      {region.code}
                    </span>
                    <div>
                      <div className="text-xs font-medium text-slate-200">
                        {region.name}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        {region.discomCount} simulated edge clients
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <StatusIndicator
                      status={region.simulatedStatus}
                      label={region.simulatedStatus === 'optimal' ? 'SYNC' : 'BUSY'}
                      size="sm"
                    />
                    <span className="text-[9px] font-mono text-slate-500 mt-0.5">
                      ε = {region.dpEpsilon.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-2.5 border-t border-[#14243A] text-[10px] font-mono text-slate-500 flex items-center justify-between">
              <span>ALL 5 REGIONS SYNCHRONIZED</span>
              <span className="text-slate-400">18 DISCOM CLIENTS</span>
            </div>
          </div>

          {/* Panel 2: Federated Learning Status */}
          <div className="p-4 rounded-xl border border-[#14243A] bg-[#071324] flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#14243A]">
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-[#B8FF65]" />
                  <h3 className="text-xs font-semibold tracking-wide text-slate-200 uppercase font-mono">
                    Federated Learning Engine
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-[#38BDF8] bg-[#38BDF8]/10 px-1.5 py-0.2 rounded border border-[#38BDF8]/30">
                  ACTIVE
                </span>
              </div>

              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Aggregation Protocol</span>
                  <span className="font-mono text-slate-200">DP-FedAvg (Clustered)</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Participant Quorum</span>
                  <span className="font-mono text-[#B8FF65]">100% (18/18 Synced)</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Clipping Norm (C)</span>
                  <span className="font-mono text-slate-200">1.0 L2-norm</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Gaussian Noise Scale (σ)</span>
                  <span className="font-mono text-[#38BDF8]">0.85 (DP-Guaranteed)</span>
                </div>

                {/* Progress Bar */}
                <div className="pt-2">
                  <div className="flex justify-between text-[10px] font-mono mb-1 text-slate-400">
                    <span>ROUND PROGRESS</span>
                    <span className="text-[#38BDF8]">48%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#050D18] rounded-full overflow-hidden border border-[#14243A]">
                    <div
                      className="h-full bg-gradient-to-r from-[#38BDF8] to-[#B8FF65] rounded-full transition-all"
                      style={{ width: '48%' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy Architecture Notice */}
            <div className="mt-4 p-2.5 rounded-lg bg-[#050D18] border border-[#122338]">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-300">
                <Lock className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span>Zero Raw Data Sharing Policy</span>
              </div>
              <p className="text-[10px] text-slate-400 font-sans mt-1 leading-snug">
                Raw smart-meter readings remain strictly on DISCOM premises. Only encrypted, differentially private gradient updates are transmitted to the coordinator.
              </p>
              <div className="mt-2 flex items-center justify-between text-[9px] font-mono text-slate-500 pt-1.5 border-t border-[#122338]">
                <span>BENCHMARK DATA ONLY</span>
                <span className="text-[#38BDF8] flex items-center gap-0.5">
                  AUDITED <ArrowUpRight className="w-2.5 h-2.5" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
