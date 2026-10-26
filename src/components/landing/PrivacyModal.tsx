import React from 'react';
import { X, ShieldCheck, Lock, EyeOff, FileCheck2, Cpu } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExplore: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({
  isOpen,
  onClose,
  onExplore,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-modal-title"
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
              <span className="font-devanagari text-xs font-semibold px-2 py-0.5 rounded bg-[#B8FF65]/10 text-[#B8FF65] border border-[#B8FF65]/30">
                गोपनीयता नीति
              </span>
              <span className="text-[11px] font-mono tracking-wider text-slate-400 uppercase">
                Privacy Architecture Specification
              </span>
            </div>
            <h2 id="privacy-modal-title" className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
              Privacy by Design in UrjaSetu
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 font-sans">
              Rigorous mathematical guarantees, differential privacy accounting, and decentralized perimeter defense.
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

        {/* Technical Safeguards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
          {/* Card 1: Local Computation */}
          <div className="p-4 rounded-xl bg-[#050D18] border border-[#12243B]">
            <div className="flex items-center gap-2.5 mb-2">
              <EyeOff className="w-4 h-4 text-[#38BDF8]" />
              <h3 className="font-display font-semibold text-sm text-white">
                Zero Raw Data Centralization
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Smart meter intervals (15-minute readings), feeder voltage drops, and customer billing histories remain strictly confined within DISCOM boundary enclaves.
            </p>
            <div className="mt-3 text-[10px] font-mono text-slate-500">
              IMPLEMENTED · ON-PREMISE ISOLATION
            </div>
          </div>

          {/* Card 2: Differential Privacy */}
          <div className="p-4 rounded-xl bg-[#050D18] border border-[#12243B]">
            <div className="flex items-center gap-2.5 mb-2">
              <ShieldCheck className="w-4 h-4 text-[#B8FF65]" />
              <h3 className="font-display font-semibold text-sm text-white">
                Differential Privacy (DP-FedAvg)
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Model updates are clipped by L2 norm (<span className="font-mono text-white">C = 1.0</span>) with calibrated Gaussian noise injection (<span className="font-mono text-white">σ = 0.5</span>), with an estimated privacy budget of <span className="font-mono text-[#B8FF65]">ε ≈ 10 (estimated), δ = 10⁻⁵</span>.
            </p>
            <div className="mt-3 text-[10px] font-mono text-slate-500">
              MATHEMATICALLY BOUNDED
            </div>
          </div>

          {/* Card 3: Secure Aggregation */}
          <div className="p-4 rounded-xl bg-[#050D18] border border-[#12243B]">
            <div className="flex items-center gap-2.5 mb-2">
              <Lock className="w-4 h-4 text-[#38BDF8]" />
              <h3 className="font-display font-semibold text-sm text-white">
                Secure Multi-Party Aggregation
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Peer-to-peer secret sharing masks individual gradient vectors so the central coordinator can only observe the sum of regional weights, never an individual client's gradient.
            </p>
            <div className="mt-3 text-[10px] font-mono text-slate-500">
              RESEARCH PROTOTYPE PROTOCOL
            </div>
          </div>

          {/* Card 4: Audit & Non-IID Drift Tracking */}
          <div className="p-4 rounded-xl bg-[#050D18] border border-[#12243B]">
            <div className="flex items-center gap-2.5 mb-2">
              <FileCheck2 className="w-4 h-4 text-[#B8FF65]" />
              <h3 className="font-display font-semibold text-sm text-white">
                Verifiable Audit Trails
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Immutable logging of round participants, convergence metrics, and concept drift without recording consumer identities or physical meter locations.
            </p>
            <div className="mt-3 text-[10px] font-mono text-slate-500">
              TAMPER-EVIDENT LOGGING
            </div>
          </div>
        </div>

        {/* Academic Integrity Clarification */}
        <div className="p-4 rounded-xl bg-[#0A1A2E]/80 border border-[#17355B] mb-6">
          <div className="flex items-start gap-3">
            <Cpu className="w-5 h-5 text-[#38BDF8] shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 font-sans leading-relaxed">
              <strong className="text-white font-medium">Evaluation Framework: </strong>
              UrjaSetu is an academic research platform for Distributed & Federated Learning. All experiments evaluate mathematical resilience against gradient inversion, reconstruction attacks, and poisoning on verified open benchmark testbeds.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
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
            <span>Launch Command Center</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
};
