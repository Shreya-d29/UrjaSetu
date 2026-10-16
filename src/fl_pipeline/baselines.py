"""
Baseline Comparison Suite for UrjaSetu
Evaluates:
1. Centralized Baseline (Pooled data - empirical upper bound, privacy-violating)
2. Local-Only Baselines (Each DISCOM trains isolated model, evaluated globally)
3. Federated FedAvg (Standard sample-weighted aggregation)
4. Federated FedProx (Heterogeneity-robust proximal aggregation)
All evaluated on the exact same held-out global test set.
"""

from typing import Dict, List, Any
import numpy as np
from .models import ElectricityAnomalyModel
from .client import DiscomClient, compute_binary_metrics
from .server import FederatedServer


def evaluate_model_on_test(model: ElectricityAnomalyModel, test_X: np.ndarray, test_y: np.ndarray) -> Dict[str, Any]:
    """Helper to evaluate model on global test set."""
    probs = model.predict_proba(test_X)
    eps = 1e-7
    test_loss = -float(np.mean(test_y * np.log(probs + eps) + (1.0 - test_y) * np.log(1.0 - probs + eps)))
    metrics = compute_binary_metrics(test_y, probs)
    metrics["test_loss"] = test_loss
    return metrics


def run_centralized_baseline(
    clients_train_data: Dict[str, Dict[str, np.ndarray]],
    global_test_data: Dict[str, np.ndarray],
    epochs: int = 25,
    batch_size: int = 32,
    lr: float = 0.005,
    seed: int = 42,
) -> Dict[str, Any]:
    """
    Train centralized model on pooled data from all 5 regional clients.
    Privacy violation: Requires transmitting all raw smart-meter readings to central repository.
    """
    pooled_X = np.concatenate([d["X"] for d in clients_train_data.values()], axis=0)
    pooled_y = np.concatenate([d["y"] for d in clients_train_data.values()], axis=0)

    model = ElectricityAnomalyModel(input_dim=pooled_X.shape[1], lr=lr, seed=seed)

    losses = []
    for _ in range(epochs):
        ep_loss = model.train_epoch(pooled_X, pooled_y, batch_size=batch_size)
        losses.append(ep_loss)

    metrics = evaluate_model_on_test(model, global_test_data["X"], global_test_data["y"])
    return {
        "paradigm": "Centralized Pooled (Upper Bound)",
        "privacy_guarantee": "None (Raw data fully pooled)",
        "raw_data_exposure": "100% (All client records transmitted)",
        "total_samples": int(len(pooled_X)),
        "epochs_trained": epochs,
        "final_loss": float(np.mean(losses[-3:])),
        "test_accuracy": metrics["accuracy"],
        "test_precision": metrics["precision"],
        "test_recall": metrics["recall"],
        "test_f1": metrics["f1_score"],
        "test_roc_auc": metrics["roc_auc"],
        "confusion_matrix": {
            "tp": metrics["tp"],
            "fp": metrics["fp"],
            "fn": metrics["fn"],
            "tn": metrics["tn"],
        },
    }


def run_local_only_baselines(
    clients_train_data: Dict[str, Dict[str, np.ndarray]],
    global_test_data: Dict[str, np.ndarray],
    epochs: int = 25,
    batch_size: int = 32,
    lr: float = 0.005,
    seed: int = 42,
) -> Dict[str, Any]:
    """
    Train 5 isolated models, each seeing ONLY its regional DISCOM data.
    Evaluated on global test set to show how Non-IID distribution limits generalization.
    """
    client_results = {}
    f1_scores = []
    roc_scores = []
    losses = []

    for cid, data in clients_train_data.items():
        model = ElectricityAnomalyModel(input_dim=data["X"].shape[1], lr=lr, seed=seed)
        c_losses = []
        for _ in range(epochs):
            loss = model.train_epoch(data["X"], data["y"], batch_size=batch_size)
            c_losses.append(loss)

        metrics = evaluate_model_on_test(model, global_test_data["X"], global_test_data["y"])
        client_results[cid] = {
            "client_id": cid,
            "train_samples": int(len(data["X"])),
            "test_f1": metrics["f1_score"],
            "test_roc_auc": metrics["roc_auc"],
            "test_precision": metrics["precision"],
            "test_recall": metrics["recall"],
            "confusion_matrix": {
                "tp": metrics["tp"],
                "fp": metrics["fp"],
                "fn": metrics["fn"],
                "tn": metrics["tn"],
            },
        }
        f1_scores.append(metrics["f1_score"])
        roc_scores.append(metrics["roc_auc"])
        losses.append(float(np.mean(c_losses[-3:])))

    return {
        "paradigm": "Local-Only Enclaves (Isolated)",
        "privacy_guarantee": "High (Zero communication)",
        "raw_data_exposure": "0% (Records never leave client)",
        "average_test_f1": float(np.mean(f1_scores)),
        "average_test_roc_auc": float(np.mean(roc_scores)),
        "per_client_breakdown": client_results,
    }


def run_full_baseline_comparison(
    splits: Dict,
    rounds: int = 20,
    local_epochs: int = 3,
    seed: int = 42,
) -> Dict[str, Any]:
    """
    Run comprehensive 4-way benchmarking across all paradigms.
    """
    clients_train = splits["clients_train"]
    clients_val = splits["clients_val"]
    global_test = splits["global_test"]
    client_summaries = splits["client_summaries"]

    # 1. Centralized baseline
    centralized_res = run_centralized_baseline(
        clients_train_data=clients_train,
        global_test_data=global_test,
        epochs=rounds,
        seed=seed,
    )

    # 2. Local-only baseline
    local_only_res = run_local_only_baselines(
        clients_train_data=clients_train,
        global_test_data=global_test,
        epochs=rounds,
        seed=seed,
    )

    # 3. Federated FedAvg
    fl_clients_fedavg = [
        DiscomClient(
            client_id=cid,
            region_name=client_summaries[cid]["region_name"],
            profile_type=client_summaries[cid]["profile_type"],
            train_data=clients_train[cid],
            val_data=clients_val[cid],
            seed=seed,
        )
        for cid in clients_train.keys()
    ]
    server_fedavg = FederatedServer(
        clients=fl_clients_fedavg,
        global_test_data=global_test,
        seed=seed,
    )
    history_fedavg = server_fedavg.run_training_loop(
        total_rounds=rounds,
        local_epochs=local_epochs,
        mu=0.0,
        dp_sigma=0.5,
        l2_clip_norm=1.0,
    )
    final_fedavg = history_fedavg[-1]

    # 4. Federated FedProx (mu = 0.01)
    fl_clients_fedprox = [
        DiscomClient(
            client_id=cid,
            region_name=client_summaries[cid]["region_name"],
            profile_type=client_summaries[cid]["profile_type"],
            train_data=clients_train[cid],
            val_data=clients_val[cid],
            seed=seed,
        )
        for cid in clients_train.keys()
    ]
    server_fedprox = FederatedServer(
        clients=fl_clients_fedprox,
        global_test_data=global_test,
        seed=seed,
    )
    history_fedprox = server_fedprox.run_training_loop(
        total_rounds=rounds,
        local_epochs=local_epochs,
        mu=0.01,
        dp_sigma=0.5,
        l2_clip_norm=1.0,
    )
    final_fedprox = history_fedprox[-1]

    return {
        "centralized": centralized_res,
        "local_only": local_only_res,
        "fedavg": {
            "paradigm": "Federated FedAvg",
            "privacy_guarantee": "Differential Privacy (L2-bounded + Gaussian noise)",
            "raw_data_exposure": "0% (Only clipped parameter updates)",
            "test_accuracy": final_fedavg["test_accuracy"],
            "test_precision": final_fedavg["test_precision"],
            "test_recall": final_fedavg["test_recall"],
            "test_f1": final_fedavg["test_f1"],
            "test_roc_auc": final_fedavg["test_roc_auc"],
            "final_loss": final_fedavg["test_loss"],
            "confusion_matrix": final_fedavg["confusion_matrix"],
            "rounds_history": history_fedavg,
        },
        "fedprox": {
            "paradigm": "Federated FedProx (mu=0.01)",
            "privacy_guarantee": "Differential Privacy (L2-bounded + Gaussian noise)",
            "raw_data_exposure": "0% (Only clipped parameter updates)",
            "test_accuracy": final_fedprox["test_accuracy"],
            "test_precision": final_fedprox["test_precision"],
            "test_recall": final_fedprox["test_recall"],
            "test_f1": final_fedprox["test_f1"],
            "test_roc_auc": final_fedprox["test_roc_auc"],
            "final_loss": final_fedprox["test_loss"],
            "confusion_matrix": final_fedprox["confusion_matrix"],
            "rounds_history": history_fedprox,
        },
    }
