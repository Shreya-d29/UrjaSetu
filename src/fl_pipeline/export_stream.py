"""
Stream Replay Exporter for UrjaSetu
Trains DP-FedAvg global model and exports per-sample predictions on the held-out test set.
Output: src/data/streamReplay.json with {id, region, label, score, hourly_load} for each test sample.
"""

import os
import json
import numpy as np
from typing import Dict, Any, List

from .dataset import create_federated_splits, CLIENT_PROFILES
from .client import DiscomClient, compute_binary_metrics
from .server import FederatedServer


def export_stream_replay(
    rounds: int = 20,
    local_epochs: int = 3,
    seed: int = 42,
    dp_sigma: float = 0.5,
    l2_clip_norm: float = 1.0,
    output_path: str = "src/data/streamReplay.json",
) -> Dict[str, Any]:
    """
    Train DP-FedAvg model with same settings as run_experiment.py,
    then export per-sample predictions on the global test set.
    """
    print("=" * 70)
    print(" UrjaSetu: Stream Replay Exporter")
    print(f" Training DP-FedAvg: {rounds} rounds | sigma={dp_sigma} | clip={l2_clip_norm}")
    print("=" * 70)

    # Step 1: Create federated data splits
    print("\n[1/4] Generating federated data splits...")
    splits = create_federated_splits(seed=seed)
    client_summaries = splits["client_summaries"]
    global_test = splits["global_test"]
    
    test_X = global_test["X"]
    test_y = global_test["y"]
    n_test = len(test_y)
    
    print(f"  -> Total test samples: {n_test}")
    
    # Step 2: Initialize clients
    print("\n[2/4] Initializing regional DISCOM clients...")
    clients = []
    for client_id in CLIENT_PROFILES.keys():
        client = DiscomClient(
            client_id=client_id,
            region_name=CLIENT_PROFILES[client_id]["name"],
            profile_type=CLIENT_PROFILES[client_id]["profile_type"],
            train_data=splits["clients_train"][client_id],
            val_data=splits["clients_val"][client_id],
            input_dim=30,
            lr=0.005,
            seed=seed,
        )
        clients.append(client)
    print(f"  -> Initialized {len(clients)} regional clients")
    
    # Step 3: Train DP-FedAvg
    print(f"\n[3/4] Training DP-FedAvg for {rounds} rounds...")
    server = FederatedServer(
        clients=clients,
        global_test_data=global_test,
        input_dim=30,
        seed=seed,
    )
    
    history = server.run_training_loop(
        total_rounds=rounds,
        local_epochs=local_epochs,
        mu=0.0,  # FedAvg (no proximal term)
        dp_sigma=dp_sigma,
        l2_clip_norm=l2_clip_norm,
    )
    
    final_metrics = history[-1]
    print(f"  -> Final Test ROC-AUC: {final_metrics['test_roc_auc']:.4f}")
    print(f"  -> Final Test F1: {final_metrics['test_f1']:.4f}")
    
    # Step 4: Export per-sample predictions
    print("\n[4/4] Exporting per-sample predictions...")
    
    # Get predictions for all test samples
    test_probs = server.global_model.predict_proba(test_X)
    
    # Build region mapping (which client contributed each test sample)
    # We need to track the original source of each test sample
    region_mapping = []
    test_sample_idx = 0
    
    for client_id in CLIENT_PROFILES.keys():
        n_contrib = client_summaries[client_id]["test_samples_contributed"]
        for _ in range(n_contrib):
            region_mapping.append(client_id)
            test_sample_idx += 1
    
    # Create stream records
    stream_records = []
    for idx in range(n_test):
        record = {
            "id": int(idx),
            "region": region_mapping[idx],
            "label": int(test_y[idx]),
            "score": float(test_probs[idx]),
            "hourly_load": test_X[idx, :24].tolist(),  # First 24 features are hourly loads
        }
        stream_records.append(record)
    
    # Compute metrics from exported scores
    exported_metrics = compute_binary_metrics(test_y, test_probs)
    
    # Assemble export payload
    export_payload = {
        "metadata": {
            "description": "Per-sample predictions from trained DP-FedAvg global model",
            "experiment_id": "EXP-URJA-STREAM-REPLAY",
            "seed": seed,
            "total_rounds": rounds,
            "local_epochs": local_epochs,
            "dp_sigma": dp_sigma,
            "l2_clip_norm": l2_clip_norm,
            "total_test_samples": n_test,
            "achieved_epsilon": final_metrics.get("estimated_dp_epsilon", 10.0),
        },
        "metrics": {
            "roc_auc": exported_metrics["roc_auc"],
            "f1_score": exported_metrics["f1_score"],
            "precision": exported_metrics["precision"],
            "recall": exported_metrics["recall"],
            "accuracy": exported_metrics["accuracy"],
            "confusion_matrix": {
                "tp": exported_metrics["tp"],
                "fp": exported_metrics["fp"],
                "fn": exported_metrics["fn"],
                "tn": exported_metrics["tn"],
            },
        },
        "stream": stream_records,
    }
    
    # Write to file
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(export_payload, f, indent=2)
    
    print(f"\n[OK] Stream replay exported to: {output_path}")
    print(f"  -> Records written: {len(stream_records)}")
    print(f"  -> ROC-AUC: {exported_metrics['roc_auc']:.4f}")
    print(f"  -> F1 Score: {exported_metrics['f1_score']:.4f}")
    print(f"  -> Precision: {exported_metrics['precision']:.4f}")
    print(f"  -> Recall: {exported_metrics['recall']:.4f}")
    
    return export_payload


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="UrjaSetu Stream Replay Exporter")
    parser.add_argument("--rounds", type=int, default=20, help="Number of federated rounds")
    parser.add_argument("--local-epochs", type=int, default=3, help="Local epochs per round")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    parser.add_argument("--dp-sigma", type=float, default=0.5, help="DP noise multiplier")
    parser.add_argument("--l2-clip", type=float, default=1.0, help="L2 clipping norm")
    parser.add_argument("--output", type=str, default="src/data/streamReplay.json", help="Output path")
    
    args = parser.parse_args()
    
    export_stream_replay(
        rounds=args.rounds,
        local_epochs=args.local_epochs,
        seed=args.seed,
        dp_sigma=args.dp_sigma,
        l2_clip_norm=args.l2_clip,
        output_path=args.output,
    )
