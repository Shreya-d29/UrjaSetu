import {
  Globe,
  Activity,
  Share2,
  FlaskConical,
  ShieldCheck,
  SearchCheck,
  Database,
  Sliders,
} from 'lucide-react';
import type { NavItem } from '../types';

// Simplified primary navigation — focused on core features
export const NAV_ITEMS: NavItem[] = [
  // Core Experience: India Grid Explorer
  {
    id: 'india-grid-explorer',
    label: 'India Grid Explorer',
    shortLabel: 'Explorer',
    section: 'CORE',
    icon: Globe,
    description: 'Interactive India power grid with state selection and regional intelligence',
  },

  // Intelligence & Analytics
  {
    id: 'anomaly-intelligence',
    label: 'Anomaly Intelligence',
    shortLabel: 'Anomalies',
    section: 'INTELLIGENCE',
    icon: Activity,
    description: 'Consumption patterns, severity analysis, and investigation workflow',
  },
  {
    id: 'federated-learning',
    label: 'Federated Learning',
    shortLabel: 'FL Engine',
    section: 'INTELLIGENCE',
    icon: Share2,
    badge: 'Round 48',
    description: 'Participating clients, training rounds, and aggregation status',
  },
  {
    id: 'experiments',
    label: 'Experiments & Evaluation',
    shortLabel: 'Experiments',
    section: 'INTELLIGENCE',
    icon: FlaskConical,
    description: 'Model configurations, metrics, and performance comparisons',
  },

  // Trust & Monitoring
  {
    id: 'trust-model-health',
    label: 'Trust & Model Health',
    shortLabel: 'Trust',
    section: 'MONITORING',
    icon: ShieldCheck,
    badge: 'ε=1.28',
    description: 'Privacy configuration, drift detection, and model health monitoring',
  },
  {
    id: 'investigations',
    label: 'Investigations & Reports',
    shortLabel: 'Reports',
    section: 'MONITORING',
    icon: SearchCheck,
    description: 'Detailed cases and exportable findings',
  },

  // System (Secondary)
  {
    id: 'data-sources',
    label: 'Data Sources',
    shortLabel: 'Sources',
    section: 'SYSTEM',
    icon: Database,
    description: 'Synthetic DISCOM connectors & test stream schemas',
  },
  {
    id: 'settings',
    label: 'Settings',
    shortLabel: 'Settings',
    section: 'SYSTEM',
    icon: Sliders,
    description: 'Platform topology, node certificates & display preferences',
  },
];

// Backward compatibility mapping for existing routes
export const ROUTE_ALIASES: Record<string, string> = {
  'overview': 'india-grid-explorer',
  'grid-regions': 'india-grid-explorer',
  'meter-intelligence': 'anomaly-intelligence',
  'fl-lab': 'federated-learning',
  'privacy-security': 'trust-model-health',
  'drift-health': 'trust-model-health',
  'reports': 'investigations',
};
