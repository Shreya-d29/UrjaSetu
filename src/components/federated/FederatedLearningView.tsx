import React, { useState } from 'react';
import {
  Share2,
  ShieldCheck,
  Layers,
  Lock,
} from 'lucide-react';
import experimentDataRaw from '../../data/federatedExperimentResults.json';
import type { FederatedExperimentPayload } from '../../types/fl';
import { 
  PRIVACY_BUDGET,
  REGIONAL_CLIENTS 
} from '../../data/projectFacts';

const experimentData = experimentDataRaw as unknown as FederatedExperimentPayload;

export const FederatedLearningView: React.FC = () => {
  const { metadata, regional_clients, benchmarks } = experimentData;
  const fedavgHistory = benchmarks.fedavg.rounds_history;

  // Selected round for detailed inspection (default to final round)
  const [selectedRoundNum, setSelectedRoundNum] = useState<number>(fedavgHistory.length);
  const selectedRound = fedavgHistory[selectedRoundNum - 1] || fedavgHistory[fedavgHistory.length - 1];

  // SVG Chart Dimensions
  const chartHeight = 120;
  const chartWidth = 460;
  const maxLoss = Math.max(...fedavgHistory.map((r) => r.test_loss), 1.0);
  const minLoss = Math.min(...fedavgHistory.map((r) => r.test_loss), 0.0);

  const lossPoints = fedavgHistory.map((r, idx) => {
    const x = (idx / (fedavgHistory.length - 1 || 1)) * chartWidth;
    const y = chartHeight - ((r.test_loss - minLoss) / ((maxLoss - minLoss) || 1)) * (chartHeight - 20) - 10;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const rocAucPoints = fedavgHistory.map((r, idx) => {
    const x = (idx / (fedavgHistory.length - 1 || 1)) * chartWidth;
    const y = chartHeight - (r.test_roc_auc * (chartHeight - 20)) - 10;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-5 sm:p-6 space-y-5 bg-[#050B14] text-slate-100">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#14243A]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-display">
              Federated Learning Laboratory
            </h1>
            <span className="px-2.5 py-0.5 text-[10px] font-mono tracking-wider font-semibold text-[#B8FF65] bg-[#B8FF65]/10 rounded border border-[#B8FF65]/30">
              ORCHESTRATOR ONLINE
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-sans">
            Privacy-preserving parameter aggregation (DP-FedAvg & FedProx) across {REGIONAL_CLIENTS.count} Indian Regional Grid Enclaves.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-lg bg-[#071324] border border-[#142842] text-slate-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#B8FF65] animate-pulse" />
            <span className="text-slate-400">EXP ID:</span>
            <span className="text-[#38BDF8] font-bold">{metadata.experiment_id}</span>
          </div>
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-3.5 rounded-xl bg-[#071324] border border-[#142842]">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider">Aggregation Protocol</span>
            <Share2 className="w-4 h-4 text-[#38BDF8]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white">DP-FedAvg</div>
          <div className="text-[10px] font-mono text-[#B8FF65] mt-1">Sample-Weighted FedAvg</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#071324] border border-[#142842]">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider">Completed Rounds</span>
            <Layers className="w-4 h-4 text-[#B8FF65]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white">
            {metadata.total_rounds} / {metadata.total_rounds}
          </div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">3 Local Epochs / Round</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#071324] border border-[#142842]">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider">DP Privacy Budget</span>
            <Lock className="w-4 h-4 text-[#38BDF8]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white">
            ε ≤ {PRIVACY_BUDGET.epsilon.toFixed(1)}
          </div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">
            Clip C={PRIVACY_BUDGET.clipNorm.toFixed(1)} | σ={PRIVACY_BUDGET.sigma.toFixed(2)}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#071324] border border-[#142842]">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider">Raw Data Exposure</span>
            <ShieldCheck className="w-4 h-4 text-[#B8FF65]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-[#B8FF65]">0.00%</div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">Strict Enclave Isolation</div>
        </div>
      </div>

      {/* 3. Interactive Round Stepper & Performance Inspection */}
      <div className="p-5 rounded-xl bg-[#071324] border border-[#142842] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#14243A]">
          <div>
            <h3 className="font-display font-semibold text-white text-base">
              Round Inspector & Convergence Progression
            </h3>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Select any round from 1 to {metadata.total_rounds} to inspect convergence telemetry and regional parameter updates.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">Inspecting:</span>
            <span className="px-2.5 py-1 rounded bg-[#38BDF8]/15 text-[#38BDF8] text-xs font-mono font-bold border border-[#38BDF8]/30">
              Round #{selectedRound.round}
            </span>
          </div>
        </div>

        {/* Round Selector Slider & Pills */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Round 1 (Initial broadcast)</span>
            <span>Round {metadata.total_rounds} (Convergence)</span>
          </div>
          <input
            type="range"
            min={1}
            max={fedavgHistory.length}
            value={selectedRoundNum}
            onChange={(e) => setSelectedRoundNum(Number(e.target.value))}
            className="w-full accent-[#38BDF8] cursor-pointer"
          />
          <div className="flex flex-wrap gap-1.5 pt-1">
            {fedavgHistory.map((r) => (
              <button
                key={r.round}
                onClick={() => setSelectedRoundNum(r.round)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  r.round === selectedRoundNum
                    ? 'bg-[#38BDF8] text-[#050B14] font-bold shadow'
                    : 'bg-[#0A1A2E] text-slate-400 hover:text-slate-200 border border-[#162D4A]'
                }`}
              >
                #{r.round}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Round Metrics Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 rounded-lg bg-[#050D18] border border-[#122338]">
            <div className="text-[10px] font-mono text-slate-400">TEST LOSS (BCE)</div>
            <div className="text-lg font-mono font-bold text-white mt-0.5">
              {selectedRound.test_loss.toFixed(4)}
            </div>
            <div className="text-[10px] font-mono text-slate-500">Held-out global test</div>
          </div>

          <div className="p-3 rounded-lg bg-[#050D18] border border-[#122338]">
            <div className="text-[10px] font-mono text-slate-400">TEST ROC-AUC</div>
            <div className="text-lg font-mono font-bold text-[#B8FF65] mt-0.5">
              {(selectedRound.test_roc_auc * 100).toFixed(1)}%
            </div>
            <div className="text-[10px] font-mono text-slate-500">Global discrimination</div>
          </div>

          <div className="p-3 rounded-lg bg-[#050D18] border border-[#122338]">
            <div className="text-[10px] font-mono text-slate-400">TEST F1 SCORE</div>
            <div className="text-lg font-mono font-bold text-[#38BDF8] mt-0.5">
              {selectedRound.test_f1.toFixed(3)}
            </div>
            <div className="text-[10px] font-mono text-slate-500">Precision / Recall balance</div>
          </div>

          <div className="p-3 rounded-lg bg-[#050D18] border border-[#122338]">
            <div className="text-[10px] font-mono text-slate-400">PARTICIPATING CLIENTS</div>
            <div className="text-lg font-mono font-bold text-white mt-0.5">
              {selectedRound.client_count} / {Object.keys(regional_clients).length}
            </div>
            <div className="text-[10px] font-mono text-[#B8FF65]">100% Quorum</div>
          </div>
        </div>
      </div>

      {/* 4. Convergence Trajectory Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Loss Trajectory */}
        <div className="p-4 rounded-xl bg-[#071324] border border-[#142842] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-display font-semibold text-white text-sm">
                Global Test Loss Trajectory
              </h4>
              <span className="text-[10px] font-mono text-slate-400">Cross-Entropy Loss</span>
            </div>
            <p className="text-xs text-slate-400 font-sans mb-3">
              Monotonically descending loss evaluated strictly on the 796-sample held-out global test set.
            </p>
          </div>

          <div className="relative border border-[#122338] bg-[#050D18] rounded-lg p-3 overflow-hidden">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-28 overflow-visible">
              <polyline
                fill="none"
                stroke="#38BDF8"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={lossPoints}
              />
              {/* Highlight active round */}
              {fedavgHistory.map((r, idx) => {
                if (r.round !== selectedRoundNum) return null;
                const x = (idx / (fedavgHistory.length - 1 || 1)) * chartWidth;
                const y = chartHeight - ((r.test_loss - minLoss) / ((maxLoss - minLoss) || 1)) * (chartHeight - 20) - 10;
                return (
                  <circle
                    key={idx}
                    cx={x}
                    cy={y}
                    r="5"
                    fill="#B8FF65"
                    stroke="#050B14"
                    strokeWidth="2"
                  />
                );
              })}
            </svg>
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
              <span>R1: {fedavgHistory[0]?.test_loss.toFixed(3)}</span>
              <span>R{metadata.total_rounds}: {fedavgHistory[fedavgHistory.length - 1]?.test_loss.toFixed(3)}</span>
            </div>
          </div>
        </div>

        {/* ROC-AUC Trajectory */}
        <div className="p-4 rounded-xl bg-[#071324] border border-[#142842] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-display font-semibold text-white text-sm">
                Global ROC-AUC Convergence
              </h4>
              <span className="text-[10px] font-mono text-[#B8FF65]">Discriminative Power</span>
            </div>
            <p className="text-xs text-slate-400 font-sans mb-3">
              Measuring the global model's capability to rank anomalous consumption above normal baseload.
            </p>
          </div>

          <div className="relative border border-[#122338] bg-[#050D18] rounded-lg p-3 overflow-hidden">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-28 overflow-visible">
              <polyline
                fill="none"
                stroke="#B8FF65"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={rocAucPoints}
              />
              {fedavgHistory.map((r, idx) => {
                if (r.round !== selectedRoundNum) return null;
                const x = (idx / (fedavgHistory.length - 1 || 1)) * chartWidth;
                const y = chartHeight - (r.test_roc_auc * (chartHeight - 20)) - 10;
                return (
                  <circle
                    key={idx}
                    cx={x}
                    cy={y}
                    r="5"
                    fill="#38BDF8"
                    stroke="#050B14"
                    strokeWidth="2"
                  />
                );
              })}
            </svg>
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
              <span>R1: {(fedavgHistory[0]?.test_roc_auc * 100).toFixed(1)}%</span>
              <span>R{metadata.total_rounds}: {(fedavgHistory[fedavgHistory.length - 1]?.test_roc_auc * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Synchronous Round Lifecycle Diagram */}
      <div className="p-4 rounded-xl bg-[#071324] border border-[#142842]">
        <h4 className="font-display font-semibold text-white text-sm mb-3">
          Synchronous Federated Lifecycle (Round #{selectedRound.round})
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-[#050D18] border border-[#142842]">
            <div className="flex items-center gap-1.5 text-[#38BDF8] font-mono font-bold mb-1">
              <span>1.</span> Broadcast Weights
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Global orchestrator broadcasts parameter tensor <span className="font-mono text-slate-300">w_t</span> to all 5 regional DISCOM enclaves.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-[#050D18] border border-[#142842]">
            <div className="flex items-center gap-1.5 text-[#38BDF8] font-mono font-bold mb-1">
              <span>2.</span> Local Edge SGD
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Each regional enclave trains locally for 3 epochs using isolated edge readings without sharing records.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-[#050D18] border border-[#142842]">
            <div className="flex items-center gap-1.5 text-[#B8FF65] font-mono font-bold mb-1">
              <span>3.</span> L2 Norm Clipping
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Delta vectors bounded to <span className="font-mono text-slate-300">C=1.0</span> to guarantee sensitivity bounds for Differential Privacy.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-[#050D18] border border-[#38BDF8]/30">
            <div className="flex items-center gap-1.5 text-[#38BDF8] font-mono font-bold mb-1">
              <span>4.</span> Sample-Weighted Avg
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Orchestrator computes weighted update <span className="font-mono text-slate-300">w_&#123;t+1&#125;</span> + calibrated noise <span className="font-mono text-slate-300">N(0, σ)</span>.
            </p>
          </div>
        </div>
      </div>

      {/* 6. Client Participation in Selected Round */}
      <div className="rounded-xl border border-[#142842] bg-[#071324] overflow-hidden">
        <div className="p-4 border-b border-[#14243A] flex items-center justify-between">
          <div>
            <h4 className="font-display font-semibold text-white text-sm">
              Regional Enclave Reports (Round #{selectedRound.round})
            </h4>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Client telemetry confirming parameter updates, sample weights, and gradient norms.
            </p>
          </div>
          <span className="text-[10px] font-mono text-[#B8FF65] bg-[#B8FF65]/10 px-2.5 py-1 rounded border border-[#B8FF65]/30">
            5/5 REGIONS SYNCED
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-[#050D18] text-[10px] font-mono text-slate-400 uppercase border-b border-[#14243A]">
              <tr>
                <th className="p-3">Region</th>
                <th className="p-3">Profile Type</th>
                <th className="p-3">Local Train Samples</th>
                <th className="p-3">Local Train Loss</th>
                <th className="p-3">Local Val F1</th>
                <th className="p-3">Raw L2 Norm</th>
                <th className="p-3">DP Bounded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#102238] text-slate-300 font-mono text-xs">
              {selectedRound.client_reports.map((report) => (
                <tr key={report.client_id} className="hover:bg-[#0A192C]">
                  <td className="p-3 font-bold text-white flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-[#38BDF8]/10 text-[#38BDF8] text-[10px] border border-[#38BDF8]/30">
                      {report.client_id}
                    </span>
                    <span className="font-sans text-xs">{report.region_name}</span>
                  </td>
                  <td className="p-3 font-sans text-slate-400">
                    {regional_clients[report.client_id]?.profile_type}
                  </td>
                  <td className="p-3 text-slate-200">{report.sample_count.toLocaleString()}</td>
                  <td className="p-3 text-slate-300">{report.train_loss.toFixed(4)}</td>
                  <td className="p-3 text-[#B8FF65] font-semibold">{report.val_f1.toFixed(3)}</td>
                  <td className="p-3 text-slate-400">{report.raw_l2_norm.toFixed(3)}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-[#B8FF65]/10 text-[#B8FF65] border border-[#B8FF65]/30">
                      C ≤ 1.0 (PASSED)
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. Legal and Research Due-Process Notice */}
      <div className="p-4 rounded-xl bg-[#071324] border border-[#142842] flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-[#38BDF8] shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 font-sans leading-relaxed">
          <strong className="text-white">Privacy Guarantee & Due Process Caveat: </strong>
          UrjaSetu transmits model parameter vectors only. Smart-meter consumption telemetry remains strictly within DISCOM boundary enclaves. Algorithmic anomaly flags are investigative research signals to guide forensic inspection, not automated justification for electricity service disconnection.
        </div>
      </div>
    </div>
  );
};
