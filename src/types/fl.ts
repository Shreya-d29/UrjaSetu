export interface ExperimentMetadata {
  experiment_id: string;
  model_architecture: string;
  task: string;
  total_rounds: number;
  local_epochs: number;
  random_seed: number;
  timestamp: string;
  status: 'completed' | 'running' | 'failed';
  device: string;
}

export interface PrivacyBudget {
  mechanism: string;
  clipping_norm_C: number;
  noise_multiplier_sigma: number;
  target_delta: number;
  achieved_epsilon: number;
  raw_data_transmitted: boolean;
  secure_aggregation_status: string;
}

export interface RegionalClientSummary {
  client_id: string;
  region_name: string;
  profile_type: string;
  total_samples: number;
  train_samples: number;
  val_samples: number;
  test_samples_contributed: number;
  train_anomaly_rate: number;
  feature_dim: number;
}

export interface ConfusionMatrix {
  tp: number;
  fp: number;
  fn: number;
  tn: number;
}

export interface ClientReport {
  client_id: string;
  region_name: string;
  sample_count: number;
  train_loss: number;
  val_f1: number;
  val_roc_auc: number;
  raw_l2_norm: number;
  clipped: boolean;
  clip_factor: number;
}

export interface RoundRecord {
  round: number;
  participating_clients: string[];
  client_count: number;
  algorithm: string;
  mu: number;
  dp_sigma: number;
  l2_clip_norm: number;
  estimated_dp_epsilon?: number;
  client_reports: ClientReport[];
  test_loss: number;
  test_accuracy: number;
  test_precision: number;
  test_recall: number;
  test_f1: number;
  test_roc_auc: number;
  confusion_matrix: ConfusionMatrix;
}

export interface CentralizedBenchmark {
  paradigm: string;
  privacy_guarantee: string;
  raw_data_exposure: string;
  total_samples: number;
  epochs_trained: number;
  final_loss: number;
  test_accuracy: number;
  test_precision: number;
  test_recall: number;
  test_f1: number;
  test_roc_auc: number;
  confusion_matrix: ConfusionMatrix;
}

export interface LocalClientResult {
  client_id: string;
  train_samples: number;
  test_f1: number;
  test_roc_auc: number;
  test_precision: number;
  test_recall: number;
  confusion_matrix: ConfusionMatrix;
}

export interface LocalOnlyBenchmark {
  paradigm: string;
  privacy_guarantee: string;
  raw_data_exposure: string;
  average_test_f1: number;
  average_test_roc_auc: number;
  per_client_breakdown: Record<string, LocalClientResult>;
}

export interface FederatedBenchmark {
  paradigm: string;
  privacy_guarantee: string;
  raw_data_exposure: string;
  test_accuracy: number;
  test_precision: number;
  test_recall: number;
  test_f1: number;
  test_roc_auc: number;
  final_loss: number;
  confusion_matrix: ConfusionMatrix;
  rounds_history: RoundRecord[];
}

export interface NonIIDDriftMetrics {
  client_feature_profiles: Record<
    string,
    {
      mean_load: number;
      var_load: number;
      par: number;
      night_day: number;
      anomaly_rate: number;
    }
  >;
  pairwise_divergence: Record<string, Record<string, number>>;
  dirichlet_alpha: number;
  non_iid_level: string;
}

export interface FederatedExperimentPayload {
  metadata: ExperimentMetadata;
  privacy_budget: PrivacyBudget;
  regional_clients: Record<string, RegionalClientSummary>;
  benchmarks: {
    centralized: CentralizedBenchmark;
    local_only: LocalOnlyBenchmark;
    fedavg: FederatedBenchmark;
    fedprox: FederatedBenchmark;
  };
  non_iid_drift: NonIIDDriftMetrics;
}
