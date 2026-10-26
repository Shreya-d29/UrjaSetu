/**
 * IndiaGridExplorer — The core immersive experience of UrjaSetu.
 * 
 * A full-screen interactive globe focused on India with:
 * - Selectable state boundaries
 * - Smooth camera transitions
 * - Contextual state intelligence panels
 * - Regional grid node visualization
 * - Transmission corridor overlays
 * 
 * This is the primary landing experience after the cinematic Earth intro.
 */

import { useState } from 'react';
import { IndiaGrid3D } from '../visualization/IndiaGrid3D';
import { StateDetailCard, type SelectedStateData } from '../visualization/StateDetailCard';
import { 
  TRAINING_STATUS, 
  REGIONAL_CLIENTS, 
  TOTAL_DISCOM_NODES,
  MODEL_PERFORMANCE 
} from '../../data/projectFacts';

export const IndiaGridExplorer: React.FC<{ onNavigateToStateAnalysis?: (state: string) => void }> = ({ onNavigateToStateAnalysis }) => {
  const [selectedState, setSelectedState] = useState<SelectedStateData | null>(null);

  return (
    <div className="relative w-full h-full flex overflow-hidden bg-[#050B14]">
      {/* Main Column: Globe + Metrics */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Globe Section - flexible height */}
        <div className="flex-1 relative p-4 min-h-0">
          <IndiaGrid3D 
            onStateSelect={setSelectedState}
          />
        </div>

        {/* Metrics Section - below globe */}
        <div className="flex-shrink-0 px-4 pb-4 space-y-3 overflow-y-auto max-h-[300px]">
          {/* Top Row: 4 Metrics */}
          <div className="grid grid-cols-4 gap-3">
            <MetricCard 
              label="Regions"
              value={REGIONAL_CLIENTS.count}
              unit={`${TOTAL_DISCOM_NODES} DISCOMs`}
            />
            <MetricCard 
              label="FL Rounds"
              value={`${TRAINING_STATUS.roundsCompleted} / ${TRAINING_STATUS.roundsPlanned}`}
              unit="completed"
            />
            <MetricCard 
              label="Global ROC-AUC"
              value={`${(MODEL_PERFORMANCE.testRocAuc * 100).toFixed(1)}%`}
              unit="test set"
            />
            <MetricCard 
              label="Test Samples"
              value="796"
              unit="held-out"
            />
          </div>

          {/* Bottom Row: 3 Comparison Cards */}
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-3">
              <ComparisonCard 
                paradigm="Local-only"
                rocAuc={0.805}
                note="Isolated per-region"
              />
              <ComparisonCard 
                paradigm="Federated (UrjaSetu)"
                rocAuc={0.860}
                note="DP-FedAvg"
                highlight={true}
              />
              <ComparisonCard 
                paradigm="Centralized"
                rocAuc={0.893}
                note="Upper bound"
              />
            </div>
            <div className="text-xs text-slate-400 text-center font-sans px-3">
              Federated learning approaches the centralized ceiling without sharing raw data
            </div>
          </div>
        </div>
      </div>

      {/* State Detail Panel - fixed width on the right, hidden when no state selected */}
      {selectedState && (
        <div className="w-[340px] h-full border-l border-[#14243A] bg-[#060E1A] flex flex-col overflow-hidden shrink-0">
          <StateDetailCard
            state={selectedState}
            onClose={() => setSelectedState(null)}
            onNavigateToAnalysis={onNavigateToStateAnalysis}
          />
        </div>
      )}
    </div>
  );
};

interface MetricCardProps {
  label: string;
  value: string | number;
  unit: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, unit }) => (
  <div className="p-3 rounded-lg bg-[#0A1422] border border-[#14243A] flex flex-col justify-center">
    <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
      {label}
    </div>
    <div className="text-lg font-bold font-mono text-[#B8FF65]">
      {value}
    </div>
    <div className="text-[9px] text-slate-500 font-mono mt-0.5">
      {unit}
    </div>
  </div>
);

interface ComparisonCardProps {
  paradigm: string;
  rocAuc: number;
  note: string;
  highlight?: boolean;
}

const ComparisonCard: React.FC<ComparisonCardProps> = ({ paradigm, rocAuc, note, highlight }) => (
  <div className={`p-3 rounded-lg border ${
    highlight 
      ? 'bg-[#38BDF8]/10 border-[#38BDF8]/40' 
      : 'bg-[#0A1422] border-[#14243A]'
  }`}>
    <div className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider mb-2">
      {paradigm}
    </div>
    <div className={`text-2xl font-bold font-mono ${
      highlight ? 'text-[#38BDF8]' : 'text-[#B8FF65]'
    }`}>
      {(rocAuc * 100).toFixed(1)}%
    </div>
    <div className="text-[9px] text-slate-500 mt-1">
      {note}
    </div>
  </div>
);
