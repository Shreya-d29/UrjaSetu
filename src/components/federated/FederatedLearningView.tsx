import React, { useState, useEffect } from 'react';
import {
  Share2,
  ShieldCheck,
  Layers,
  Lock,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';
import experimentDataRaw from '../../data/federatedExperimentResults.json';
import type { FederatedExperimentPayload } from '../../types/fl';
import { 
  PRIVACY_BUDGET,
  REGIONAL_CLIENTS 
} from '../../data/projectFacts';

const experimentData = experimentDataRaw as unknown as FederatedExperimentPayload;

// CSS for animations
const animationStyles = `
  @keyframes dotUpload {
    0% { offset-distance: 0%; }
    50% { offset-distance: 100%; opacity: 1; }
    50.1% { opacity: 0; }
    100% { opacity: 0; }
  }

  @keyframes serverPulse {
    0%, 30% { r: 28; fill: #38BDF8; }
    40%, 60% { r: 40; fill: #38BDF8; opacity: 0.4; }
    70%, 100% { r: 28; fill: #38BDF8; opacity: 1; }
  }

  @keyframes dotDownload {
    0%, 50% { opacity: 0; }
    50.1% { offset-distance: 0%; opacity: 1; }
    100% { offset-distance: 100%; }
  }

  @keyframes reducedMotionPause {
    0%, 100% { animation-play-state: paused !important; }
  }

  .fed-dot-upload {
    animation: dotUpload 3s ease-in-out infinite;
  }

  .fed-dot-upload.paused {
    animation-play-state: paused;
  }

  .fed-server-pulse {
    animation: serverPulse 3s ease-in-out infinite;
  }

  .fed-server-pulse.paused {
    animation-play-state: paused;
  }

  .fed-dot-download {
    animation: dotDownload 3s ease-in-out infinite;
  }

  .fed-dot-download.paused {
    animation-play-state: paused;
  }

  @media (prefers-reduced-motion: reduce) {
    .fed-dot-upload,
    .fed-server-pulse,
    .fed-dot-download {
      animation: none !important;
    }
  }
`;

export const FederatedLearningView: React.FC = () => {
  const { metadata, regional_clients, benchmarks } = experimentData;
  const fedavgHistory = benchmarks.fedavg.rounds_history;

  // Selected round for detailed inspection (default to round 1)
  const [selectedRoundNum, setSelectedRoundNum] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState<1 | 2>(1);
  const selectedRound = fedavgHistory[selectedRoundNum - 1] || fedavgHistory[fedavgHistory.length - 1];

  // Auto-advance round when playing
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setSelectedRoundNum((prev) => {
        if (prev >= fedavgHistory.length) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 800 / playSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, playSpeed, fedavgHistory.length]);

  const handlePlayPause = () => {
    if (selectedRoundNum >= fedavgHistory.length) {
      setSelectedRoundNum(1);
    }
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    setSelectedRoundNum(1);
    setIsPlaying(false);
  };

  const cycleSpeed = () => {
    setPlaySpeed((prev) => (prev === 1 ? 2 : 1));
  };

  // SVG Chart Dimensions
  const chartHeight = 120;
  const chartWidth = 460;

  // Get only the rounds up to selectedRound (for progressive drawing)
  const visibleRounds = fedavgHistory.slice(0, selectedRoundNum);

  const maxLoss = Math.max(...fedavgHistory.map((r) => r.test_loss), 1.0);
  const minLoss = Math.min(...fedavgHistory.map((r) => r.test_loss), 0.0);

  // Progressive loss points (only up to selected round)
  const lossPoints = visibleRounds.map((r, idx) => {
    const x = (idx / (fedavgHistory.length - 1 || 1)) * chartWidth;
    const y = chartHeight - ((r.test_loss - minLoss) / ((maxLoss - minLoss) || 1)) * (chartHeight - 20) - 10;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  // Progressive ROC-AUC points (only up to selected round)
  const rocAucPoints = visibleRounds.map((r, idx) => {
    const x = (idx / (fedavgHistory.length - 1 || 1)) * chartWidth;
    const y = chartHeight - (r.test_roc_auc * (chartHeight - 20)) - 10;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-5 sm:p-6 space-y-5 bg-[#050B14] text-slate-100">
      <style>{animationStyles}</style>
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#14243A]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-display">
              Federated Learning Laboratory
            </h1>
            <span className="px-2.5 py-0.5 text-[10px] font-mono tracking-wider font-semibold text-[#B8FF65] bg-[#B8FF65]/10 rounded border border-[#B8FF65]/30">
              SIMULATED ORCHESTRATOR
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
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePlayPause}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#38BDF8] hover:bg-[#0EA5E9] text-white font-semibold text-sm transition-colors"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Play Training</span>
                  </>
                )}
              </button>

              <button
                onClick={cycleSpeed}
                className="px-2.5 py-1.5 rounded-lg bg-[#0A1A2E] border border-[#162D4A] text-slate-300 text-xs font-mono hover:bg-[#0E2436] transition-colors"
              >
                {playSpeed}x
              </button>

              <button
                onClick={handleRestart}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0A1A2E] border border-[#162D4A] text-slate-300 hover:bg-[#0E2436] transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400">Inspecting:</span>
              <span className="px-2.5 py-1 rounded bg-[#38BDF8]/15 text-[#38BDF8] text-xs font-mono font-bold border border-[#38BDF8]/30">
                Round #{selectedRound.round}
              </span>
            </div>
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
              Held-out BCE loss across rounds. ROC-AUC is the primary metric: loss can rise while AUC stays stable, likely because of growing overconfidence under class imbalance and DP noise.
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
              {/* Highlight active round on loss chart */}
              {fedavgHistory.slice(0, selectedRoundNum).map((r, idx) => {
                if (idx !== selectedRoundNum - 1) return null;
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
              {/* Highlight active round on ROC-AUC chart */}
              {fedavgHistory.slice(0, selectedRoundNum).map((r, idx) => {
                if (idx !== selectedRoundNum - 1) return null;
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

      {/* 4b. Client updates this round */}
      <div className="rounded-xl border border-[#142842] bg-[#071324] overflow-hidden">
        <div className="p-4 border-b border-[#14243A]">
          <h4 className="font-display font-semibold text-white text-sm">
            Client updates this round
          </h4>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Round #{selectedRound.round} — Train loss, update L2 norm, and sample count per regional client.
          </p>
        </div>
        <div className="p-4 grid grid-cols-5 gap-3">
          {selectedRound.client_reports.map((report) => {
            // Find max values across all rounds for scaling bars
            const maxTrainLoss = Math.max(
              ...fedavgHistory.flatMap((r) => r.client_reports.map((c) => c.train_loss))
            );
            const maxL2Norm = Math.max(
              ...fedavgHistory.flatMap((r) => r.client_reports.map((c) => c.raw_l2_norm))
            );
            const maxSampleCount = Math.max(
              ...fedavgHistory.flatMap((r) => r.client_reports.map((c) => c.sample_count))
            );

            const lossBarWidth = (report.train_loss / maxTrainLoss) * 100;
            const l2BarWidth = (report.raw_l2_norm / maxL2Norm) * 100;
            const sampleBarWidth = (report.sample_count / maxSampleCount) * 100;

            return (
              <div key={report.client_id} className="p-3 rounded-lg bg-[#050D18] border border-[#122338]">
                <div className="text-xs font-mono font-bold text-[#38BDF8] mb-2">
                  {report.client_id}
                </div>

                {/* Train Loss */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-400">Train Loss</span>
                    <span className="text-[10px] font-mono text-slate-300">
                      {report.train_loss.toFixed(3)}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#0A1A2E] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#F59E0B] to-[#DC2626]"
                      style={{ width: `${lossBarWidth}%` }}
                    />
                  </div>
                </div>

                {/* L2 Norm */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-400">L2 Norm</span>
                    <span className="text-[10px] font-mono text-slate-300">
                      {report.raw_l2_norm.toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#0A1A2E] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6]"
                      style={{ width: `${l2BarWidth}%` }}
                    />
                  </div>
                </div>

                {/* Sample Count */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-400">Samples</span>
                    <span className="text-[10px] font-mono text-slate-300">
                      {report.sample_count}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#0A1A2E] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#10B981] to-[#06B6D4]"
                      style={{ width: `${sampleBarWidth}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Synchronous Round Lifecycle Diagram - Animated SVG */}
      <div className="p-4 rounded-xl bg-[#071324] border border-[#142842]">
        <h4 className="font-display font-semibold text-white text-sm mb-3">
          Federated Aggregation Flow (Round #{selectedRound.round})
        </h4>
        
        <div className="relative w-full h-80 flex items-center justify-center bg-[#050D18] rounded-lg border border-[#122338]">
          <svg viewBox="0 0 600 300" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            {/* Define paths for animation */}
            <defs>
              {/* Paths from each region to center */}
              <path id="path-nr" d="M 300 50 Q 300 50 300 130" fill="none" />
              <path id="path-wr" d="M 520 130 Q 410 90 300 130" fill="none" />
              <path id="path-sr" d="M 480 250 Q 390 190 300 250" fill="none" />
              <path id="path-er" d="M 120 250 Q 210 190 300 250" fill="none" />
              <path id="path-ner" d="M 80 130 Q 190 90 300 130" fill="none" />

              {/* Return paths from center */}
              <path id="return-nr" d="M 300 130 Q 300 90 300 50" fill="none" />
              <path id="return-wr" d="M 300 130 Q 410 90 520 130" fill="none" />
              <path id="return-sr" d="M 300 250 Q 390 190 480 250" fill="none" />
              <path id="return-er" d="M 300 250 Q 210 190 120 250" fill="none" />
              <path id="return-ner" d="M 300 130 Q 190 90 80 130" fill="none" />
            </defs>

            {/* Regional nodes */}
            <g>
              {/* NR - North */}
              <circle cx="300" cy="50" r="24" fill="#0A1A2E" stroke="#38BDF8" strokeWidth="2" />
              <text x="300" y="56" textAnchor="middle" className="text-xs font-bold fill-[#38BDF8]">
                NR
              </text>

              {/* WR - East */}
              <circle cx="520" cy="130" r="24" fill="#0A1A2E" stroke="#38BDF8" strokeWidth="2" />
              <text x="520" y="136" textAnchor="middle" className="text-xs font-bold fill-[#38BDF8]">
                WR
              </text>

              {/* SR - South */}
              <circle cx="480" cy="250" r="24" fill="#0A1A2E" stroke="#38BDF8" strokeWidth="2" />
              <text x="480" y="256" textAnchor="middle" className="text-xs font-bold fill-[#38BDF8]">
                SR
              </text>

              {/* ER - West */}
              <circle cx="120" cy="250" r="24" fill="#0A1A2E" stroke="#38BDF8" strokeWidth="2" />
              <text x="120" y="256" textAnchor="middle" className="text-xs font-bold fill-[#38BDF8]">
                ER
              </text>

              {/* NER - Northwest */}
              <circle cx="80" cy="130" r="24" fill="#0A1A2E" stroke="#38BDF8" strokeWidth="2" />
              <text x="80" y="136" textAnchor="middle" className="text-xs font-bold fill-[#38BDF8]">
                NER
              </text>
            </g>

            {/* Central aggregator node with pulse */}
            <g>
              <circle
                cx="300"
                cy="150"
                r="28"
                fill="#38BDF8"
                className={`fed-server-pulse ${!isPlaying ? 'paused' : ''}`}
              />
              <text
                x="300"
                y="156"
                textAnchor="middle"
                className="text-sm font-bold fill-[#050B14]"
              >
                {selectedRound.round}
              </text>
            </g>

            {/* Animated upload dots from regions to server */}
            {['nr', 'wr', 'sr', 'er', 'ner'].map((region, idx) => (
              <circle
                key={`up-${region}`}
                r="4"
                fill="#B8FF65"
                className={`fed-dot-upload ${!isPlaying ? 'paused' : ''}`}
                style={{
                  offsetPath: `url(#path-${region})`,
                  offsetDistance: '0%',
                  animation: `dotUpload 3s ease-in-out infinite ${idx * 0.1}s`,
                } as React.CSSProperties}
              />
            ))}

            {/* Animated download dots from server to regions */}
            {['nr', 'wr', 'sr', 'er', 'ner'].map((region, idx) => (
              <circle
                key={`down-${region}`}
                r="3"
                fill="#0EA5E9"
                className={`fed-dot-download ${!isPlaying ? 'paused' : ''}`}
                style={{
                  offsetPath: `url(#return-${region})`,
                  offsetDistance: '0%',
                  animation: `dotDownload 3s ease-in-out infinite ${idx * 0.1}s`,
                } as React.CSSProperties}
              />
            ))}

            {/* Labels on paths */}
            <text x="300" y="95" textAnchor="middle" className="text-[9px] fill-slate-400 font-mono">
              clipped
            </text>
            <text x="300" y="106" textAnchor="middle" className="text-[9px] fill-slate-400 font-mono">
              C=1.0
            </text>

            <text x="300" y="175" textAnchor="middle" className="text-[9px] fill-[#B8FF65] font-mono font-bold">
              noise σ=0.5
            </text>
            <text x="300" y="186" textAnchor="middle" className="text-[9px] fill-[#B8FF65] font-mono font-bold">
              weighted avg
            </text>

            <text x="300" y="220" textAnchor="middle" className="text-[9px] fill-[#0EA5E9] font-mono">
              global model
            </text>
          </svg>

          {/* Legend */}
          <div className="absolute bottom-3 left-3 flex gap-4 text-[10px]">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#B8FF65]" />
              <span className="text-slate-400">Upload</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#0EA5E9]" />
              <span className="text-slate-400">Download</span>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-[#050D18] border border-[#122338]">
            <p className="text-slate-300 font-sans leading-relaxed">
              <span className="font-mono text-[#B8FF65] font-bold">Regional updates:</span> Each enclave trains locally for 3 epochs, clips gradients to C=1.0 for DP privacy, and sends bounded update deltas to orchestrator.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-[#050D18] border border-[#122338]">
            <p className="text-slate-300 font-sans leading-relaxed">
              <span className="font-mono text-[#38BDF8] font-bold">Aggregation:</span> Orchestrator computes sample-weighted average of clipped updates, adds calibrated Gaussian noise σ=0.5 for DP guarantee, and broadcasts new model.
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
