import type { LucideIcon } from 'lucide-react';

export type NavItemId =
  | 'india-grid-explorer'
  | 'anomaly-intelligence'
  | 'federated-learning'
  | 'experiments'
  | 'trust-model-health'
  | 'investigations'
  | 'data-sources'
  | 'settings'
  // Legacy routes for backward compatibility
  | 'overview'
  | 'grid-regions'
  | 'meter-intelligence'
  | 'fl-lab'
  | 'privacy-security'
  | 'drift-health'
  | 'reports';

export type NavSection =
  | 'CORE'
  | 'INTELLIGENCE'
  | 'MONITORING'
  | 'SYSTEM';

export interface NavItem {
  id: NavItemId;
  label: string;
  shortLabel?: string;
  section: NavSection;
  icon: LucideIcon;
  badge?: string;
  description: string;
}

export interface GridRegionSummary {
  code: 'NR' | 'WR' | 'SR' | 'ER' | 'NER';
  name: string;
  discomCount: number;
  simulatedStatus: 'optimal' | 'syncing' | 'alert' | 'standby';
  dpEpsilon: number;
  lastRound: number;
}

export interface SystemStatus {
  simulatedEnvironment: string;
  engineVersion: string;
  privacyGuarantee: string;
  activeRound: number;
  edgeNodesOnline: number;
  totalEdgeNodes: number;
  isSimulatedOnly: boolean;
}
