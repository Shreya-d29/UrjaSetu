import React from 'react';
import { X, ShieldCheck, Cpu, Share2, Layers, AlertTriangle } from 'lucide-react';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExplore: () => void;
}

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({
  isOpen,
  onClose,
  onExplore,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="how-it-works-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#030712]/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl bg-[#071324] border border-[#162D4C] shadow-2xl p-6 sm:p-8 overflow-y-auto max-h-[90vh] text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#14263E]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-devanagari text-xs font-semibold px-2 py-0.5 rounded bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/30">
                ऊर्जाSetu वास्तुकला
              </span>
              <span className="text-[11px] font-mono tracking-wider text-slate-400 uppercase">
                Architecture & Workflow
              </span>
            </div>
            <h2 id="how-it-works-title" className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
              How UrjaSetu Works
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 font-sans">
              Decentralized anomaly detection across regional electricity networks through privacy-preserving distributed intelligence.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#0E1F36] border border-transparent hover:border-[#1E3656] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#38BDF8]"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Core Federated Learning Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
          {/* Step 1 */}
          <div className="p-5 rounded-xl bg-[#050D18] border border-[#12243B] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs font-bold text-[#38BDF8]">
                  01
                </span>
                <Cpu className="w-5 h-5 text-[#38BDF8]" />
              </div>
              <h3 className="font-display font-semibold text-sm text-white mb-2">
                Learn Locally
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Each participating client trains on its own local or assigned dataset, identifying consumption anomalies without exposing raw telemetry.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#12243B] text-[10px] font-mono text-slate-500">
              LOCAL EDGE COMPUTE
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-5 rounded-xl bg-[#050D18] border border-[#12243B] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs font-bold text-[#B8FF65]">
                  02
                </span>
                <Share2 className="w-5 h-5 text-[#B8FF65]" />
              </div>
              <h3 className="font-display font-semibold text-sm text-white mb-2">
                Share Model Updates
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Clients contribute model updates rather than directly transferring their raw meter readings, ensuring granular consumer patterns never leave the substation.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#12243B] text-[10px] font-mono text-slate-500">
              ENCRYPTED GRADIENT UPLINK
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-5 rounded-xl bg-[#050D18] border border-[#12243B] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs font-bold text-[#38BDF8]">
                  03
                </span>
                <Layers className="w-5 h-5 text-[#38BDF8]" />
              </div>
              <h3 className="font-display font-semibold text-sm text-white mb-2">
                Improve Shared Intelligence
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                The coordinator aggregates eligible updates and distributes the resulting global model, boosting theft detection across all regions.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#12243B] text-[10px] font-mono text-slate-500">
              FEDAVG + DP AGGREGATION
            </div>
          </div>
        </div>

        {/* Academic Privacy Note */}
        <div className="p-4 rounded-xl bg-[#0A1A2E]/80 border border-[#17355B] mb-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#38BDF8] shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 font-sans leading-relaxed">
              <strong className="text-white font-medium">Privacy Architecture Note: </strong>
              Federated learning reduces the need to centralize raw data, but does not automatically guarantee privacy. UrjaSetu evaluates additional protections such as differential privacy (<span className="font-mono text-[#B8FF65]">ε ≈ 10</span>) and secure aggregation where implemented.
            </div>
          </div>
        </div>

        {/* Simulation Sandbox Notice */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-[#050D18] border border-[#14263E] text-[11px] font-mono text-slate-400 mb-6">
          <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0" />
          <span>
            ACADEMIC BENCHMARK: All DISCOM client partitions and consumption records operate on verified synthetic testbeds.
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#14263E]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-[#0E1F36] transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => {
              onClose();
              onExplore();
            }}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#38BDF8] hover:bg-[#0EA5E9] text-slate-950 text-xs font-semibold tracking-wide transition-all shadow-[0_0_15px_rgba(56,189,248,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#38BDF8]"
          >
            <span>Explore UrjaSetu Platform</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
};
