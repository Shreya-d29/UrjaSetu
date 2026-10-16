"""
Regional DISCOM Edge Client for UrjaSetu Federated Learning
Implements local model training, validation, DP parameter clipping, and reporting.
Guarantees: Raw smart-meter readings NEVER leave the client enclave.
"""

from typing import Dict, Any, Tuple
import numpy as np
from .models import ElectricityAnomalyModel


def compute_binary_metrics(y_true: np.ndarray, y_prob: np.ndarray, threshold: float = 0.5) -> Dict[str, float]:
    """Compute standard anomaly evaluation metrics: Accuracy, Precision, Recall, F1, PR-AUC, ROC-AUC."""
    y_pred = (y_prob >= threshold).astype(np.int64)
    tp = int(np.sum((y_pred == 1) & (y_true == 1)))
    fp = int(np.sum((y_pred == 1) & (y_true == 0)))
    fn = int(np.sum((y_pred == 0) & (y_true == 1)))
    tn = int(np.sum((y_pred == 0) & (y_true == 0)))

    accuracy = (tp + tn) / max(1, len(y_true))
    precision = tp / max(1, (tp + fp))
    recall = tp / max(1, (tp + fn))
    f1 = 2 * precision * recall / max(1e-6, (precision + recall))

    # Fast ROC-AUC calculation
    pos_count = np.sum(y_true == 1)
    neg_count = np.sum(y_true == 0)
    if pos_count > 0 and neg_count > 0:
        ranks = np.argsort(y_prob)
        rank_positions = np.empty_like(ranks)
        rank_positions[ranks] = np.arange(len(y_prob)) + 1
        pos_rank_sum = np.sum(rank_positions[y_true == 1])
        roc_auc = float((pos_rank_sum - pos_count * (pos_count + 1) / 2.0) / (pos_count * neg_count))
        roc_auc = float(np.clip(roc_auc, 0.0, 1.0))
    else:
        roc_auc = 0.5

    return {
        "accuracy": float(accuracy),
        "precision": float(precision),
        "recall": float(recall),
        "f1_score": float(f1),
        "roc_auc": float(roc_auc),
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "tn": tn,
    }


class DiscomClient:
    """
    Simulated DISCOM Edge Node Client.
    Holds local train/val data and trains an edge anomaly model.
    """
    def __init__(
        self,
        client_id: str,
        region_name: str,
        profile_type: str,
        train_data: Dict[str, np.ndarray],
        val_data: Dict[str, np.ndarray],
        input_dim: int = 30,
        lr: float = 0.005,
        seed: int = 42,
    ):
        self.client_id = client_id
        self.region_name = region_name
        self.profile_type = profile_type
        self.train_X = train_data["X"]
        self.train_y = train_data["y"]
        self.val_X = val_data["X"]
        self.val_y = val_data["y"]
        self.n_samples = len(self.train_X)
        self.model = ElectricityAnomalyModel(input_dim=input_dim, lr=lr, seed=seed)

    def train_round(
        self,
        global_weights: Dict[str, np.ndarray],
        epochs: int = 3,
        batch_size: int = 32,
        mu: float = 0.0,
        l2_clip_norm: float = 1.0,
    ) -> Tuple[Dict[str, np.ndarray], int, Dict[str, Any]]:
        """
        Execute local client training round:
        1. Receive global model weights w_t.
        2. Set local model weights to w_t.
        3. Train for `epochs` using local SGD (+ FedProx proximal term if mu > 0).
        4. Compute parameter delta Delta w = w_local - w_t.
        5. Clip parameter update to L2 norm bound C (Differential Privacy primitive).
        6. Return clipped delta or updated weights and sample count.
        """
        self.model.set_weights(global_weights)

        losses = []
        for _ in range(epochs):
            ep_loss = self.model.train_epoch(
                self.train_X,
                self.train_y,
                batch_size=batch_size,
                mu=mu,
                global_weights=global_weights,
            )
            losses.append(ep_loss)

        local_weights = self.model.get_weights()

        # Compute update delta: Delta w = w_local - w_t
        update_delta = {}
        total_sq_norm = 0.0
        for k in local_weights.keys():
            diff = local_weights[k] - global_weights[k]
            update_delta[k] = diff
            total_sq_norm += float(np.sum(diff ** 2))
        
        l2_norm = float(np.sqrt(total_sq_norm))

        # Differential privacy L2 clipping
        clip_factor = 1.0
        if l2_clip_norm > 0.0 and l2_norm > l2_clip_norm:
            clip_factor = l2_clip_norm / (l2_norm + 1e-9)
            for k in update_delta.keys():
                update_delta[k] = update_delta[k] * clip_factor

        # Reconstructed bounded weights: w_bounded = w_t + clipped_delta
        bounded_weights = {
            k: (global_weights[k] + update_delta[k]).astype(np.float32)
            for k in global_weights.keys()
        }

        # Local validation evaluation
        val_probs = self.model.predict_proba(self.val_X)
        val_metrics = compute_binary_metrics(self.val_y, val_probs)

        metadata = {
            "client_id": self.client_id,
            "region_name": self.region_name,
            "sample_count": self.n_samples,
            "train_loss": float(np.mean(losses)),
            "val_f1": val_metrics["f1_score"],
            "val_roc_auc": val_metrics["roc_auc"],
            "raw_l2_norm": l2_norm,
            "clipped": l2_norm > l2_clip_norm if l2_clip_norm > 0 else False,
            "clip_factor": float(clip_factor),
        }

        return bounded_weights, self.n_samples, metadata

    def evaluate(self, weights: Dict[str, np.ndarray]) -> Dict[str, float]:
        """Evaluate specified weights on the client's local validation set."""
        self.model.set_weights(weights)
        probs = self.model.predict_proba(self.val_X)
        return compute_binary_metrics(self.val_y, probs)
