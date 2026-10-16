"""
Neural Network Models for Smart-Meter Anomaly Detection in UrjaSetu
Supports PyTorch implementation with seamless fallback to pure NumPy for zero-dependency execution.
"""

from typing import Dict, Tuple, Optional
import numpy as np

try:
    import torch
    import torch.nn as nn
    import torch.optim as optim
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False


class TorchAnomalyModel(nn.Module):
    """Deep Multi-Layer Perceptron for electricity theft and grid anomaly detection."""
    def __init__(self, input_dim: int = 30):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 64),
            nn.LayerNorm(64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
        )

    def forward(self, x: "torch.Tensor") -> "torch.Tensor":
        return self.net(x).squeeze(-1)


class ElectricityAnomalyModel:
    """
    Standardized client/server model interface.
    Implements parameter extraction, injection, local training and inference.
    """
    def __init__(self, input_dim: int = 30, lr: float = 0.01, seed: int = 42):
        self.input_dim = input_dim
        self.lr = lr
        self.seed = seed
        self.rng = np.random.default_rng(seed)

        if HAS_TORCH:
            torch.manual_seed(seed)
            self.model = TorchAnomalyModel(input_dim)
            self.criterion = nn.BCEWithLogitsLoss()
        else:
            # Vectorized 2-layer MLP in NumPy
            limit1 = np.sqrt(6.0 / (input_dim + 64))
            limit2 = np.sqrt(6.0 / (64 + 32))
            limit3 = np.sqrt(6.0 / (32 + 1))
            self.weights = {
                "w1": self.rng.uniform(-limit1, limit1, (input_dim, 64)).astype(np.float32),
                "b1": np.zeros(64, dtype=np.float32),
                "w2": self.rng.uniform(-limit2, limit2, (64, 32)).astype(np.float32),
                "b2": np.zeros(32, dtype=np.float32),
                "w3": self.rng.uniform(-limit3, limit3, (32, 1)).astype(np.float32),
                "b3": np.zeros(1, dtype=np.float32),
            }

    def get_weights(self) -> Dict[str, np.ndarray]:
        """Extract all trainable model parameters as NumPy arrays."""
        if HAS_TORCH:
            return {name: param.detach().cpu().numpy().copy() for name, param in self.model.state_dict().items()}
        return {k: v.copy() for k, v in self.weights.items()}

    def set_weights(self, weights: Dict[str, np.ndarray]) -> None:
        """Inject parameters into model with strict shape validation."""
        if HAS_TORCH:
            state_dict = {}
            for k, v in weights.items():
                expected_shape = self.model.state_dict()[k].shape
                if v.shape != expected_shape:
                    raise ValueError(f"Shape mismatch for {k}: expected {expected_shape}, got {v.shape}")
                state_dict[k] = torch.from_numpy(v.copy())
            self.model.load_state_dict(state_dict)
        else:
            for k, v in weights.items():
                if k not in self.weights:
                    raise ValueError(f"Unknown weight parameter {k}")
                if v.shape != self.weights[k].shape:
                    raise ValueError(f"Shape mismatch for {k}: expected {self.weights[k].shape}, got {v.shape}")
                self.weights[k] = v.copy().astype(np.float32)

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """Compute anomaly probabilities P(y=1|X) in [0, 1]."""
        if HAS_TORCH:
            self.model.eval()
            with torch.no_grad():
                tensor_x = torch.from_numpy(X.astype(np.float32))
                logits = self.model(tensor_x)
                probs = torch.sigmoid(logits).cpu().numpy()
            return probs
        else:
            # NumPy forward pass
            z1 = X @ self.weights["w1"] + self.weights["b1"]
            a1 = np.maximum(0, z1)
            z2 = a1 @ self.weights["w2"] + self.weights["b2"]
            a2 = np.maximum(0, z2)
            z3 = a2 @ self.weights["w3"] + self.weights["b3"]
            probs = 1.0 / (1.0 + np.exp(-np.clip(z3.squeeze(-1), -15.0, 15.0)))
            return probs

    def predict(self, X: np.ndarray, threshold: float = 0.5) -> np.ndarray:
        """Binary anomaly predictions."""
        return (self.predict_proba(X) >= threshold).astype(np.int64)

    def train_epoch(
        self,
        X: np.ndarray,
        y: np.ndarray,
        batch_size: int = 32,
        mu: float = 0.0,
        global_weights: Optional[Dict[str, np.ndarray]] = None,
    ) -> float:
        """
        Train 1 epoch on local data. Supports FedProx proximal loss term:
        L_prox(w) = L_bce(w) + (mu / 2) * ||w - w_t||^2
        """
        n = len(X)
        indices = np.arange(n)
        self.rng.shuffle(indices)

        if HAS_TORCH:
            self.model.train()
            optimizer = optim.Adam(self.model.parameters(), lr=self.lr)

            # PyTorch proximal weights reference
            if mu > 0.0 and global_weights is not None:
                glob_tensors = {k: torch.from_numpy(v).float() for k, v in global_weights.items()}
            else:
                glob_tensors = None

            total_loss = 0.0
            steps = 0

            for i in range(0, n, batch_size):
                b_idx = indices[i : i + batch_size]
                bx = torch.from_numpy(X[b_idx].astype(np.float32))
                by = torch.from_numpy(y[b_idx].astype(np.float32))

                optimizer.zero_grad()
                logits = self.model(bx)
                loss = self.criterion(logits, by)

                # FedProx proximal regularizer
                if mu > 0.0 and glob_tensors is not None:
                    prox_loss = 0.0
                    for name, param in self.model.named_parameters():
                        if name in glob_tensors:
                            prox_loss += torch.sum((param - glob_tensors[name]) ** 2)
                    loss += (mu / 2.0) * prox_loss

                loss.backward()
                optimizer.step()

                total_loss += float(loss.item())
                steps += 1

            return total_loss / max(1, steps)
        else:
            # NumPy vectorized SGD with mini-batches
            total_loss = 0.0
            steps = 0
            for i in range(0, n, batch_size):
                b_idx = indices[i : i + batch_size]
                bx = X[b_idx]
                by = y[b_idx]
                m = len(bx)

                # Forward
                z1 = bx @ self.weights["w1"] + self.weights["b1"]
                a1 = np.maximum(0, z1)
                z2 = a1 @ self.weights["w2"] + self.weights["b2"]
                a2 = np.maximum(0, z2)
                z3 = a2 @ self.weights["w3"] + self.weights["b3"]
                p = 1.0 / (1.0 + np.exp(-np.clip(z3.squeeze(-1), -15.0, 15.0)))

                bce = -np.mean(by * np.log(p + 1e-7) + (1.0 - by) * np.log(1.0 - p + 1e-7))
                total_loss += float(bce)

                # Backward
                dz3 = (p - by)[:, None] / m
                dw3 = a2.T @ dz3
                db3 = np.sum(dz3, axis=0)

                da2 = dz3 @ self.weights["w3"].T
                dz2 = da2 * (z2 > 0)
                dw2 = a1.T @ dz2
                db2 = np.sum(dz2, axis=0)

                da1 = dz2 @ self.weights["w2"].T
                dz1 = da1 * (z1 > 0)
                dw1 = bx.T @ dz1
                db1 = np.sum(dz1, axis=0)

                # FedProx proximal term on weights
                if mu > 0.0 and global_weights is not None:
                    dw1 += mu * (self.weights["w1"] - global_weights["w1"])
                    dw2 += mu * (self.weights["w2"] - global_weights["w2"])
                    dw3 += mu * (self.weights["w3"] - global_weights["w3"])

                self.weights["w1"] -= self.lr * dw1
                self.weights["b1"] -= self.lr * db1
                self.weights["w2"] -= self.lr * dw2
                self.weights["b2"] -= self.lr * db2
                self.weights["w3"] -= self.lr * dw3
                self.weights["b3"] -= self.lr * db3
                steps += 1

            return total_loss / max(1, steps)
