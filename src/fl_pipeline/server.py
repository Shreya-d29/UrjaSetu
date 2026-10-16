"""
Centralized Orchestrator & FedAvg / FedProx Server for UrjaSetu
Implements sample-weighted parameter aggregation, DP noise injection, round tracking, and global validation.
"""

from typing import Dict, List, Any, Optional, Tuple
import numpy as np
from .models import ElectricityAnomalyModel
from .client import DiscomClient, compute_binary_metrics


class FederatedServer:
    """
    UrjaSetu Federated Orchestrator.
    Manages global rounds, parameter aggregation (FedAvg / FedProx), and global evaluation.
    """
    def __init__(
        self,
        clients: List[DiscomClient],
        global_test_data: Dict[str, np.ndarray],
        input_dim: int = 30,
        seed: int = 42,
    ):
        self.clients = {c.client_id: c for c in clients}
        self.test_X = global_test_data["X"]
        self.test_y = global_test_data["y"]
        self.input_dim = input_dim
        self.rng = np.random.default_rng(seed)

        # Initialize global model
        self.global_model = ElectricityAnomalyModel(input_dim=input_dim, seed=seed)
        self.global_weights = self.global_model.get_weights()
        self.round_history: List[Dict[str, Any]] = []

    def validate_parameter_shapes(self, client_weights: Dict[str, np.ndarray]) -> bool:
        """Validate that incoming client weights strictly match global model architecture."""
        for name, global_arr in self.global_weights.items():
            if name not in client_weights:
                return False
            if client_weights[name].shape != global_arr.shape:
                return False
        return True

    def aggregate_fedavg(
        self,
        client_updates: List[Tuple[Dict[str, np.ndarray], int, Dict[str, Any]]],
        dp_sigma: float = 0.0,
        l2_clip_norm: float = 1.0,
    ) -> Dict[str, np.ndarray]:
        """
        FedAvg aggregation: Sample-weighted average of client parameters.
        w_{t+1} = sum_k (n_k / total_n) * w_{t+1}^k
        With optional Gaussian Mechanism DP noise addition:
        noise ~ N(0, (dp_sigma * l2_clip_norm / K)^2)
        """
        if not client_updates:
            raise ValueError("Cannot aggregate empty client updates list.")

        total_samples = sum(n_k for _, n_k, _ in client_updates)
        k_clients = len(client_updates)

        # Initialize zeroed accumulator
        aggregated = {
            name: np.zeros_like(arr, dtype=np.float32)
            for name, arr in self.global_weights.items()
        }

        for weights_k, n_k, _ in client_updates:
            weight_factor = float(n_k) / float(total_samples)
            for name in aggregated.keys():
                aggregated[name] += weight_factor * weights_k[name]

        # Differential Privacy Gaussian noise mechanism
        if dp_sigma > 0.0:
            noise_scale = (dp_sigma * l2_clip_norm) / float(k_clients)
            for name in aggregated.keys():
                noise = self.rng.normal(0.0, noise_scale, size=aggregated[name].shape).astype(np.float32)
                aggregated[name] += noise

        return aggregated

    def evaluate_global(self, weights: Dict[str, np.ndarray]) -> Dict[str, Any]:
        """Evaluate specified weights on the held-out global test set."""
        self.global_model.set_weights(weights)
        test_probs = self.global_model.predict_proba(self.test_X)

        # Cross-entropy loss on test set
        eps = 1e-7
        test_bce = -np.mean(
            self.test_y * np.log(test_probs + eps) + (1.0 - self.test_y) * np.log(1.0 - test_probs + eps)
        )

        metrics = compute_binary_metrics(self.test_y, test_probs)
        metrics["test_loss"] = float(test_bce)
        return metrics

    def run_round(
        self,
        round_num: int,
        client_ids: Optional[List[str]] = None,
        local_epochs: int = 3,
        batch_size: int = 32,
        mu: float = 0.0,
        l2_clip_norm: float = 1.0,
        dp_sigma: float = 0.0,
    ) -> Dict[str, Any]:
        """Execute a full federated round across participating clients."""
        if client_ids is None:
            client_ids = list(self.clients.keys())

        # Collect client updates
        client_updates = []
        client_metadata = []

        for cid in client_ids:
            client = self.clients[cid]
            weights_k, n_k, meta = client.train_round(
                global_weights=self.global_weights,
                epochs=local_epochs,
                batch_size=batch_size,
                mu=mu,
                l2_clip_norm=l2_clip_norm,
            )

            # Validate shapes
            if not self.validate_parameter_shapes(weights_k):
                raise ValueError(f"Client {cid} submitted incompatible parameter tensor shapes.")

            client_updates.append((weights_k, n_k, meta))
            client_metadata.append(meta)

        # Aggregate parameters
        new_global_weights = self.aggregate_fedavg(
            client_updates,
            dp_sigma=dp_sigma,
            l2_clip_norm=l2_clip_norm,
        )

        # Evaluate on held-out test set
        eval_metrics = self.evaluate_global(new_global_weights)

        # Commit new global model weights
        self.global_weights = new_global_weights

        # Differential privacy budget estimate (analytical Moments Accountant approximation)
        dp_epsilon = None
        if dp_sigma > 0.0:
            # RDP / Gaussian composition: eps approx round_num * (1 / (2 * dp_sigma^2))
            dp_epsilon = float(np.sqrt(2.0 * np.log(1.25 / 1e-5)) * (round_num / (dp_sigma * np.sqrt(len(client_ids)) + 1e-5)))
            dp_epsilon = float(min(10.0, dp_epsilon))

        round_record = {
            "round": round_num,
            "participating_clients": client_ids,
            "client_count": len(client_ids),
            "algorithm": "FedProx" if mu > 0.0 else "FedAvg",
            "mu": mu,
            "dp_sigma": dp_sigma,
            "l2_clip_norm": l2_clip_norm,
            "estimated_dp_epsilon": dp_epsilon,
            "client_reports": client_metadata,
            "test_loss": eval_metrics["test_loss"],
            "test_accuracy": eval_metrics["accuracy"],
            "test_precision": eval_metrics["precision"],
            "test_recall": eval_metrics["recall"],
            "test_f1": eval_metrics["f1_score"],
            "test_roc_auc": eval_metrics["roc_auc"],
            "confusion_matrix": {
                "tp": eval_metrics["tp"],
                "fp": eval_metrics["fp"],
                "fn": eval_metrics["fn"],
                "tn": eval_metrics["tn"],
            },
        }

        self.round_history.append(round_record)
        return round_record

    def run_training_loop(
        self,
        total_rounds: int = 25,
        local_epochs: int = 3,
        mu: float = 0.0,
        dp_sigma: float = 0.0,
        l2_clip_norm: float = 1.0,
    ) -> List[Dict[str, Any]]:
        """Run multiple federated training rounds sequentially."""
        for r in range(1, total_rounds + 1):
            self.run_round(
                round_num=r,
                local_epochs=local_epochs,
                mu=mu,
                l2_clip_norm=l2_clip_norm,
                dp_sigma=dp_sigma,
            )
        return self.round_history
