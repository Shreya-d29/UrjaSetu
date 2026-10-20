/**
 * projectFacts.ts
 * 
 * Single source of truth for all federated learning experiment facts
 * and simulation parameters displayed throughout UrjaSetu.
 * 
 * These values are derived from actual experiment results in
 * federatedExperimentResults.json and should be updated when
 * new experiments are run.
 */

import experimentDataRaw from './federatedExperimentResults.json';
import type { FederatedExperimentPayload } from '../types/fl';

const experimentData = experimentDataRaw as unknown as FederatedExperimentPayload;

// ============================================================================
// PRIVACY BUDGET (from experiment results)
// ============================================================================

export const PRIVACY_BUDGET = {
  /** Achieved epsilon value from experiment */
  epsilon: experimentData.privacy_budget.achieved_epsilon,
  
  /** Target delta (failure probability) */
  delta: experimentData.privacy_budget.target_delta,
  
  /** Noise multiplier (sigma) used in Gaussian mechanism */
  sigma: experimentData.privacy_budget.noise_multiplier_sigma,
  
  /** L2 clipping norm for gradient updates */
  clipNorm: experimentData.privacy_budget.clipping_norm_C,
  
  /** Mechanism description */
  mechanism: experimentData.privacy_budget.mechanism,
} as const;

// ============================================================================
// TRAINING PROGRESS (from experiment metadata)
// ============================================================================

export const TRAINING_STATUS = {
  /** Total rounds completed in the experiment */
  roundsCompleted: experimentData.metadata.total_rounds,
  
  /** Planned total rounds (for simulation context) */
  roundsPlanned: 100,
  
  /** Local epochs per round */
  localEpochs: experimentData.metadata.local_epochs,
  
  /** Experiment status */
  status: experimentData.metadata.status,
} as const;

// ============================================================================
// REGIONAL CLIENTS (from experiment data)
// ============================================================================

export const REGIONAL_CLIENTS = {
  /** Number of regional grid clients */
  count: Object.keys(experimentData.regional_clients).length,
  
  /** Client IDs */
  ids: Object.keys(experimentData.regional_clients) as Array<'NR' | 'WR' | 'SR' | 'ER' | 'NER'>,
  
  /** Client details */
  details: experimentData.regional_clients,
} as const;

// ============================================================================
// DISCOM NODES (simulated distribution)
// ============================================================================

/**
 * Simulated DISCOM node count per region.
 * These represent the granular distribution companies that would
 * participate in federated learning in a production deployment.
 */
export const DISCOM_DISTRIBUTION = {
  NR: 5,  // Northern Regional Grid
  WR: 4,  // Western Regional Grid
  SR: 4,  // Southern Regional Grid
  ER: 3,  // Eastern Regional Grid
  NER: 2, // North-Eastern Regional Grid
} as const;

/** Total simulated DISCOM nodes across all regions */
export const TOTAL_DISCOM_NODES = Object.values(DISCOM_DISTRIBUTION).reduce((a, b) => a + b, 0);

// ============================================================================
// NON-IID DRIFT METRICS (computed from experiment data)
// ============================================================================

/**
 * Compute maximum pairwise divergence from the divergence matrix
 */
function computeMaxPairwiseDrift(): number {
  const divergenceMatrix = experimentData.non_iid_drift.pairwise_divergence;
  let maxDrift = 0;
  
  for (const clientA in divergenceMatrix) {
    for (const clientB in divergenceMatrix[clientA]) {
      const drift = divergenceMatrix[clientA][clientB];
      if (drift > maxDrift) {
        maxDrift = drift;
      }
    }
  }
  
  return maxDrift;
}

export const DRIFT_METRICS = {
  /** Maximum pairwise KL divergence between any two clients */
  maxPairwiseDrift: computeMaxPairwiseDrift(),
  
  /** Dirichlet alpha parameter used for non-IID partitioning */
  dirichletAlpha: experimentData.non_iid_drift.dirichlet_alpha,
  
  /** Full divergence matrix */
  pairwiseDivergence: experimentData.non_iid_drift.pairwise_divergence,
  
  /** Client feature profiles */
  clientProfiles: experimentData.non_iid_drift.client_feature_profiles,
} as const;

// ============================================================================
// MODEL PERFORMANCE (from final round or best round)
// ============================================================================

/**
 * Get the final round metrics from FedAvg benchmark
 */
const finalRound = experimentData.benchmarks.fedavg.rounds_history[
  experimentData.benchmarks.fedavg.rounds_history.length - 1
];

export const MODEL_PERFORMANCE = {
  /** Test loss (Binary Cross Entropy) */
  testLoss: finalRound.test_loss,
  
  /** Test ROC-AUC score */
  testRocAuc: finalRound.test_roc_auc,
  
  /** Test F1 score */
  testF1: finalRound.test_f1,
  
  /** Test accuracy */
  testAccuracy: finalRound.test_accuracy,
  
  /** Test precision */
  testPrecision: finalRound.test_precision,
  
  /** Test recall */
  testRecall: finalRound.test_recall,
} as const;

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

/**
 * Format epsilon value for display
 */
export function formatEpsilon(epsilon: number = PRIVACY_BUDGET.epsilon): string {
  return `ε = ${epsilon.toFixed(2)}`;
}

/**
 * Format delta value for display
 */
export function formatDelta(delta: number = PRIVACY_BUDGET.delta): string {
  return `δ = ${delta.toExponential(0)}`;
}

/**
 * Format complete privacy budget for display
 */
export function formatPrivacyBudget(): string {
  return `${formatEpsilon()}, ${formatDelta()}`;
}

/**
 * Format sigma (noise multiplier) for display
 */
export function formatSigma(sigma: number = PRIVACY_BUDGET.sigma): string {
  return `σ = ${sigma.toFixed(2)}`;
}

/**
 * Format training round status
 */
export function formatRoundStatus(): string {
  return `#${TRAINING_STATUS.roundsCompleted} / ${TRAINING_STATUS.roundsPlanned}`;
}

/**
 * Format drift score for display
 */
export function formatDriftScore(drift: number = DRIFT_METRICS.maxPairwiseDrift): string {
  return drift.toFixed(2);
}

// ============================================================================
// EXPORTS FOR TYPE SAFETY
// ============================================================================

export type RegionCode = keyof typeof DISCOM_DISTRIBUTION;
