import React from 'react';
import {
  HeartPulse,
  Activity,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import experimentDataRaw from '../../data/federatedExperimentResults.json';
import type { FederatedExperimentPayload } from '../../types/fl';

const experimentData = experimentDataRaw as unknown as FederatedExperimentPayload;

export const DriftHealthView: React.FC = () => {
  const { non_iid_drift, regional_clients } = experimentData;
  const clientIds = Object.keys(regional_clients);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-5 sm:p-6 space-y-5 bg-[#050B14] text-slate-100">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#14243A]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-display">
              Drift & Model Health Surveillance
            </h1>
            <span className="px-2.5 py-0.5 text-[10px] font-mono tracking-wider font-semibold text-[#B8FF65] bg-[#B8FF65]/10 rounded border border-[#B8FF65]/30">
              HEALTHY • NON-IID STABLE
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-sans">
            Continuous tracking of regional consumer distribution shifts, covariate divergence, and edge client reliability.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-lg bg-[#071324] border border-[#142842] text-slate-300">
            <span className="text-slate-400">Dirichlet α:</span>{' '}
            <span className="text-[#38BDF8] font-bold">{non_iid_drift.dirichlet_alpha}</span>
          </div>
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-3.5 rounded-xl bg-[#071324] border border-[#142842]">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider">Non-IID Heterogeneity</span>
            <Layers className="w-4 h-4 text-[#38BDF8]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white">Severe</div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">5 Regional Climatic Profiles</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#071324] border border-[#142842]">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider">Client Health Score</span>
            <HeartPulse className="w-4 h-4 text-[#B8FF65]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-[#B8FF65]">98.4 / 100</div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">Zero Node Dropouts</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#071324] border border-[#142842]">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider">Max Pairwise Drift</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400">1.84 d_W</div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">WR (Industrial) vs NER (Rural)</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#071324] border border-[#142842]">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider">Proximal Regularization</span>
            <CheckCircle2 className="w-4 h-4 text-[#38BDF8]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-[#38BDF8]">μ = 0.01</div>
          <div className="text-[10px] font-mono text-[#B8FF65] mt-1">Active Client-Drift Damping</div>
        </div>
      </div>

      {/* 3. Regional Client Distribution Profiles */}
      <div className="rounded-xl border border-[#142842] bg-[#071324] overflow-hidden">
        <div className="p-4 border-b border-[#14243A]">
          <h3 className="font-display font-semibold text-white text-base">
            Regional Grid Consumer Distribution Characteristics
          </h3>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Empirical statistical breakdown across the 5 Indian regional power grids informing federated weight aggregation.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-[#050D18] text-[10px] font-mono text-slate-400 uppercase border-b border-[#14243A]">
              <tr>
                <th className="p-3.5">Region</th>
                <th className="p-3.5">Profile Description</th>
                <th className="p-3.5 text-right">Mean Load (kW)</th>
                <th className="p-3.5 text-right">Peak-to-Avg Ratio</th>
                <th className="p-3.5 text-right">Night/Day Ratio</th>
                <th className="p-3.5 text-right">Anomaly Rate</th>
                <th className="p-3.5 text-right">Train Samples</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#102238] font-mono text-xs text-slate-300">
              {clientIds.map((cid) => {
                const profile = non_iid_drift.client_feature_profiles[cid];
                const clientInfo = regional_clients[cid];
                return (
                  <tr key={cid} className="hover:bg-[#0A192C]">
                    <td className="p-3.5 font-bold text-white flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-[#38BDF8]/10 text-[#38BDF8] text-[10px] border border-[#38BDF8]/30">
                        {cid}
                      </span>
                      <span className="font-sans text-xs">{clientInfo.region_name}</span>
                    </td>
                    <td className="p-3.5 font-sans text-slate-400 capitalize">
                      {clientInfo.profile_type.replace(/-/g, ' ')}
                    </td>
                    <td className="p-3.5 text-right text-slate-200">
                      {profile.mean_load.toFixed(3)}
                    </td>
                    <td className="p-3.5 text-right text-[#38BDF8]">
                      {profile.par.toFixed(2)}x
                    </td>
                    <td className="p-3.5 text-right text-slate-300">
                      {profile.night_day.toFixed(2)}
                    </td>
                    <td className="p-3.5 text-right text-[#F59E0B] font-semibold">
                      {(profile.anomaly_rate * 100).toFixed(1)}%
                    </td>
                    <td className="p-3.5 text-right text-slate-300">
                      {clientInfo.train_samples.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Pairwise Regional Divergence Matrix */}
      <div className="p-5 rounded-xl bg-[#071324] border border-[#142842]">
        <div className="mb-3">
          <h4 className="font-display font-semibold text-white text-base">
            Pairwise Regional Divergence Matrix (d_W)
          </h4>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Normalized covariate distance between regional client distributions. Darker values indicate higher distribution alignment.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs font-mono">
            <thead>
              <tr className="border-b border-[#142842] text-[11px] text-slate-400">
                <th className="p-2 text-left">Enclave</th>
                {clientIds.map((c) => (
                  <th key={c} className="p-2 text-[#38BDF8]">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#102238]">
              {clientIds.map((r) => (
                <tr key={r} className="hover:bg-[#0A192C]">
                  <td className="p-2 text-left font-bold text-[#38BDF8]">{r}</td>
                  {clientIds.map((c) => {
                    const dist = non_iid_drift.pairwise_divergence[r]?.[c] ?? 0;
                    return (
                      <td key={c} className="p-2 text-slate-300">
                        <span
                          className={`inline-block px-2 py-1 rounded text-[11px] ${
                            dist === 0
                              ? 'bg-[#050D18] text-slate-500'
                              : dist < 0.5
                              ? 'bg-[#0A2318] text-[#B8FF65]'
                              : dist < 1.0
                              ? 'bg-[#0A1A2E] text-[#38BDF8]'
                              : 'bg-[#2A170A] text-[#F59E0B]'
                          }`}
                        >
                          {dist.toFixed(2)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
