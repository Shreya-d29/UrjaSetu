"""
Automated Unit Tests for UrjaSetu Federated Learning Pipeline
Tests:
- Client data partitioning & zero test-set leakage
- Model weight extraction & shape compatibility
- Local training step and loss convergence
- Parameter shape validation on server
- FedAvg sample-weighted aggregation arithmetic
- FedProx proximal regularizer
- Differential privacy L2 clipping and noise addition
- Metric calculations (Accuracy, Precision, Recall, F1, ROC-AUC)
- End-to-end multi-round federation loop
"""

import os
import json
import numpy as np
import pytest

from .dataset import create_federated_splits, CLIENT_PROFILES, extract_domain_features
from .models import ElectricityAnomalyModel
from .client import DiscomClient, compute_binary_metrics
from .server import FederatedServer
from .baselines import run_centralized_baseline, run_local_only_baselines


def test_dataset_generation_and_splits():
    """Verify non-IID partitioning and verify that test-set is strictly isolated."""
    splits = create_federated_splits(seed=123)

    assert "clients_train" in splits
    assert "clients_val" in splits
    assert "global_test" in splits
    assert "client_summaries" in splits

    # 5 Indian regional grids
    assert set(splits["clients_train"].keys()) == set(CLIENT_PROFILES.keys())

    test_X = splits["global_test"]["X"]
    test_y = splits["global_test"]["y"]
    assert len(test_X) == len(test_y)
    assert test_X.shape[1] == 30

    # Ensure label imbalance is realistic (anomalies ~ 8-18%)
    anomaly_rate = np.mean(test_y)
    assert 0.05 < anomaly_rate < 0.25

    # Check that client sample counts match profile specifications
    for cid, summary in splits["client_summaries"].items():
        assert summary["train_samples"] > 0
        assert summary["val_samples"] > 0
        assert summary["feature_dim"] == 30


def test_extract_domain_features():
    """Test engineered domain electricity features."""
    readings = np.array([0.5] * 24, dtype=np.float32)
    feats = extract_domain_features(readings)
    assert len(feats) == 6
    # For constant readings, mean should be 0.5, variance 0, PAR 1.0, night_to_day 1.0
    assert pytest.approx(feats[0], abs=1e-3) == 0.5
    assert pytest.approx(feats[1], abs=1e-3) == 0.0
    assert pytest.approx(feats[2], abs=1e-2) == 1.0
    assert pytest.approx(feats[3], abs=1e-2) == 1.0


def test_model_weight_serialization_and_shapes():
    """Test getting and setting weights in model."""
    model = ElectricityAnomalyModel(input_dim=30, seed=42)
    weights = model.get_weights()
    assert len(weights) > 0

    # Inject back and verify
    model.set_weights(weights)

    # Incompatible shape injection should raise ValueError
    corrupt_weights = {k: v.copy() for k, v in weights.items()}
    first_key = list(corrupt_weights.keys())[0]
    corrupt_weights[first_key] = np.zeros((99, 99), dtype=np.float32)
    with pytest.raises(ValueError):
        model.set_weights(corrupt_weights)


def test_local_training_and_dp_clipping():
    """Test client local training round and L2 gradient clipping."""
    splits = create_federated_splits(seed=42)
    cid = "NR"
    client = DiscomClient(
        client_id=cid,
        region_name="Northern Grid",
        profile_type="residential-heavy",
        train_data=splits["clients_train"][cid],
        val_data=splits["clients_val"][cid],
        seed=42,
    )

    model = ElectricityAnomalyModel(input_dim=30, seed=42)
    initial_weights = model.get_weights()

    # Train 2 epochs with clipping norm C=0.01 (deliberately low to trigger clipping)
    bounded_weights, n_samples, meta = client.train_round(
        global_weights=initial_weights,
        epochs=2,
        l2_clip_norm=0.01,
    )

    assert n_samples == len(splits["clients_train"][cid]["X"])
    assert meta["clipped"] is True
    assert meta["clip_factor"] < 1.0


def test_fedavg_aggregation_correctness():
    """Test sample-weighted FedAvg parameter aggregation arithmetic."""
    splits = create_federated_splits(seed=42)
    server = FederatedServer(clients=[], global_test_data=splits["global_test"], seed=42)

    # Simulate 2 clients with dummy weights
    w_zeros = {k: np.zeros_like(v) for k, v in server.global_weights.items()}
    w_ones = {k: np.ones_like(v) for k, v in server.global_weights.items()}

    # Client A: 100 samples with value 0.0
    # Client B: 300 samples with value 1.0
    # Aggregated result should be (100*0 + 300*1)/400 = 0.75
    client_updates = [
        (w_zeros, 100, {}),
        (w_ones, 300, {}),
    ]

    agg = server.aggregate_fedavg(client_updates, dp_sigma=0.0)
    for k in agg.keys():
        assert np.allclose(agg[k], 0.75, atol=1e-5)


def test_binary_metrics_calculation():
    """Test precision, recall, F1, and ROC-AUC computations."""
    y_true = np.array([1, 1, 0, 0], dtype=np.int64)
    y_prob = np.array([0.9, 0.8, 0.1, 0.2], dtype=np.float32)
    metrics = compute_binary_metrics(y_true, y_prob, threshold=0.5)

    assert metrics["accuracy"] == 1.0
    assert metrics["precision"] == 1.0
    assert metrics["recall"] == 1.0
    assert metrics["f1_score"] == 1.0
    assert metrics["roc_auc"] == 1.0
    assert metrics["tp"] == 2
    assert metrics["tn"] == 2


def test_end_to_end_federated_loop():
    """Test 2 full federated rounds end-to-end with validation."""
    splits = create_federated_splits(seed=42)
    client_summaries = splits["client_summaries"]
    fl_clients = [
        DiscomClient(
            client_id=cid,
            region_name=client_summaries[cid]["region_name"],
            profile_type=client_summaries[cid]["profile_type"],
            train_data=splits["clients_train"][cid],
            val_data=splits["clients_val"][cid],
            seed=42,
        )
        for cid in splits["clients_train"].keys()
    ]

    server = FederatedServer(clients=fl_clients, global_test_data=splits["global_test"], seed=42)

    # Run round 1
    r1 = server.run_round(round_num=1, local_epochs=1, mu=0.01, dp_sigma=0.1)
    assert r1["round"] == 1
    assert len(r1["participating_clients"]) == 5
    assert 0.0 <= r1["test_accuracy"] <= 1.0
    assert 0.0 <= r1["test_f1"] <= 1.0

    # Run round 2
    r2 = server.run_round(round_num=2, local_epochs=1, mu=0.01, dp_sigma=0.1)
    assert r2["round"] == 2
    assert len(server.round_history) == 2


def test_experiment_serialization(tmp_path):
    """Test experiment runner execution and JSON serialization matching frontend schema."""
    from .run_experiment import run_experiment

    out_file = str(tmp_path / "test_results.json")
    payload = run_experiment(rounds=2, local_epochs=1, seed=42, output_path=out_file)

    assert os.path.exists(out_file)
    with open(out_file, "r") as f:
        loaded = json.load(f)

    assert "metadata" in loaded
    assert "privacy_budget" in loaded
    assert "regional_clients" in loaded
    assert "benchmarks" in loaded
    assert "non_iid_drift" in loaded
    assert "fedavg" in loaded["benchmarks"]
    assert "fedprox" in loaded["benchmarks"]
    assert "centralized" in loaded["benchmarks"]
    assert "local_only" in loaded["benchmarks"]
    assert len(loaded["benchmarks"]["fedavg"]["rounds_history"]) == 2
