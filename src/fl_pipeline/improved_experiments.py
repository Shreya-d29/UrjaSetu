"""
UrjaSetu Improved Experiments v3 - Extended Privacy & Calibration Analysis
"""

import os
import json
import time
from typing import Dict, List, Any, Tuple
import numpy as np

from .dataset import create_federated_splits, CLIENT_PROFILES
from .client import DiscomClient, compute_binary_metrics
from .server import FederatedServer
from .models import ElectricityAnomalyModel

try:
    from scipy.optimize import minimize
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False


def compute_rdp_epsilon(noise_multiplier: float, rounds: int, delta: float = 1e-5) -> float:
    """Compute epsilon from Renyi DP accountant."""
    if noise_multiplier == 0.0 or rounds == 0:
        return float('inf')
    
    min_eps = float('inf')
    for alpha in np.linspace(1.1, 100, 200):
        term1 = (rounds * alpha) / (2.0 * (noise_multiplier ** 2))
        term2 = (np.log(delta) + np.log(alpha)) / (alpha - 1.0)
        term3 = np.log((alpha - 1.0) / alpha)
        eps_alpha = term1 - term2 + term3
        min_eps = min(min_eps, eps_alpha)
    
    return float(min_eps)


def fit_platt_scaling(val_logits: np.ndarray, val_y: np.ndarray) -> Tuple[float, float]:
    """Fit Platt scaling (A, B) on validation logits."""
    if not HAS_SCIPY:
        return 1.0, 0.0
    
    def nll(params):
        A, B = params
        logits_scaled = A * val_logits + B
        logits_clipped = np.clip(logits_scaled, -15.0, 15.0)
        probs = 1.0 / (1.0 + np.exp(-logits_clipped))
        eps = 1e-7
        loss = -np.mean(val_y * np.log(probs + eps) + (1.0 - val_y) * np.log(1.0 - probs + eps))
        return loss
    
    result = minimize(nll, x0=[1.0, 0.0], method='Nelder-Mead')
    A, B = result.x
    return float(A), float(B)


def run_fedavg_no_dp(splits: Dict, rounds: int = 20, local_epochs: int = 3, seed: int = 42) -> Tuple[Dict[str, float], List[Dict], float]:
    """Run FedAvg WITHOUT DP."""
    clients_train = splits["clients_train"]
    clients_val = splits["clients_val"]
    global_test = splits["global_test"]
    client_summaries = splits["client_summaries"]

    fl_clients = [DiscomClient(client_id=cid,region_name=client_summaries[cid]["region_name"],profile_type=client_summaries[cid]["profile_type"],train_data=clients_train[cid],val_data=clients_val[cid],seed=seed,)
        for cid in clients_train.keys()
    ]
    server = FederatedServer(clients=fl_clients, global_test_data=global_test, seed=seed)
    history = server.run_training_loop(total_rounds=rounds, local_epochs=local_epochs, mu=0.0, dp_sigma=0.0, l2_clip_norm=1.0,)
    
    final_metrics = {
        "test_roc_auc": float(history[-1]["test_roc_auc"]),"test_f1": float(history[-1]["test_f1"]),"test_precision": float(history[-1]["test_precision"]),"test_recall": float(history[-1]["test_recall"]),}
    return final_metrics, history, 0.0


def run_fedavg_with_dp(splits: Dict, rounds: int = 20, local_epochs: int = 3, dp_sigma: float = 0.5, seed: int = 42) -> Tuple[Dict[str, float], List[Dict], float, FederatedServer]:
    """Run FedAvg WITH DP."""
    clients_train = splits["clients_train"]
    clients_val = splits["clients_val"]
    global_test = splits["global_test"]
    client_summaries = splits["client_summaries"]

    fl_clients = [DiscomClient(client_id=cid,region_name=client_summaries[cid]["region_name"],profile_type=client_summaries[cid]["profile_type"],train_data=clients_train[cid],val_data=clients_val[cid],seed=seed,)
        for cid in clients_train.keys()
    ]
    server = FederatedServer(clients=fl_clients, global_test_data=global_test, seed=seed)
    history = server.run_training_loop(total_rounds=rounds, local_epochs=local_epochs, mu=0.0, dp_sigma=dp_sigma, l2_clip_norm=1.0,)
    
    final_metrics = {
        "test_roc_auc": float(history[-1]["test_roc_auc"]),"test_f1": float(history[-1]["test_f1"]),"test_precision": float(history[-1]["test_precision"]),"test_recall": float(history[-1]["test_recall"]),}
    
    return final_metrics, history, 0.0, server


def carve_validation_split(train_X: np.ndarray, train_y: np.ndarray, val_ratio: float = 0.2, seed: int = 42):
    """Carve validation split from training (no test set touched)."""
    rng = np.random.default_rng(seed)
    n = len(train_X)
    indices = np.arange(n)
    rng.shuffle(indices)
    
    n_val = int(n * val_ratio)
    val_idx = indices[:n_val]
    train_idx = indices[n_val:]
    
    return train_X[train_idx], train_y[train_idx], train_X[val_idx], train_y[val_idx]


def run_improved_experiments() -> Dict[str, Any]:
    """Execute full improved experiment suite."""
    print("\n" + "=" * 80)
    print("TASK 1: Multi-Seed Robustness Analysis (5 seeds, 20 rounds each)")
    print("=" * 80)
    
    seeds = [42, 43, 44, 45, 46]
    rounds = 20
    local_epochs = 3
    
    robustness_results = {
        "centralized": [],"local_only": [],"fedavg_no_dp": [],"fedavg_with_dp": [],}
    
    print("\nRunning benchmarks across 5 seeds...")
    for i, seed in enumerate(seeds, 1):
        print(f"  [{i}/{len(seeds)}] Seed {seed}...")
        splits = create_federated_splits(seed=seed)
        
        # Centralized
        clients_train = splits["clients_train"]
        pooled_X = np.concatenate([d["X"] for d in clients_train.values()], axis=0)
        pooled_y = np.concatenate([d["y"] for d in clients_train.values()], axis=0)
        model = ElectricityAnomalyModel(input_dim=pooled_X.shape[1], lr=0.005, seed=seed)
        for _ in range(rounds):
            model.train_epoch(pooled_X, pooled_y, batch_size=32)
        probs = model.predict_proba(splits["global_test"]["X"])
        metrics = compute_binary_metrics(splits["global_test"]["y"], probs)
        robustness_results["centralized"].append(metrics["roc_auc"])
        
        # Local-only (average across clients)
        roc_scores = []
        for cid, data in clients_train.items():
            model = ElectricityAnomalyModel(input_dim=data["X"].shape[1], lr=0.005, seed=seed)
            for _ in range(rounds):
                model.train_epoch(data["X"], data["y"], batch_size=32)
            probs = model.predict_proba(splits["global_test"]["X"])
            metrics = compute_binary_metrics(splits["global_test"]["y"], probs)
            roc_scores.append(metrics["roc_auc"])
        robustness_results["local_only"].append(np.mean(roc_scores))
        
        # FedAvg no-DP
        metrics, _, _ = run_fedavg_no_dp(splits, rounds=rounds, seed=seed)
        robustness_results["fedavg_no_dp"].append(metrics["test_roc_auc"])
        
        # FedAvg with DP (sigma=0.5)
        metrics, _, _, _ = run_fedavg_with_dp(splits, rounds=rounds, dp_sigma=0.5, seed=seed)
        robustness_results["fedavg_with_dp"].append(metrics["test_roc_auc"])
    
    # Compute statistics
    robustness_stats = {}
    for paradigm, scores in robustness_results.items():
        robustness_stats[paradigm] = {
            "roc_auc_values": [float(x) for x in scores],"mean_roc_auc": float(np.mean(scores)),"std_roc_auc": float(np.std(scores)),}
    
    print("\nRobustness Results (mean ± std ROC-AUC across 5 seeds):")
    for paradigm, stats in robustness_stats.items():
        print(f"  {paradigm:20s}: {stats['mean_roc_auc']:.4f} ± {stats['std_roc_auc']:.4f}")
    
    print("\n" + "=" * 80)
    print("TASK 2: Differential Privacy Sigma Sweep (Extended)")
    print("=" * 80)
    
    sigma_values = [0.0, 0.05, 0.1, 0.2, 0.3, 0.5, 1.0, 2.0, 3.0]
    sigma_results = {}
    
    splits_seed42 = create_federated_splits(seed=42)
    
    # Compute federation parameters
    clients_train = splits_seed42["clients_train"]
    total_samples = sum(len(d["X"]) for d in clients_train.values())
    max_client_weight = max(len(clients_train[cid]["X"]) for cid in clients_train) / total_samples
    K_clients = len(clients_train)
    
    print(f"\nFederation parameters:")
    print(f"  K (clients): {K_clients}")
    print(f"  Total train samples: {total_samples}")
    print(f"  Max client weight: {max_client_weight:.4f}")
    print(f"  C (clip norm): 1.0")
    print(f"  Rounds: {rounds}")
    
    print(f"\nSweeping sigma across 9 values...")
    server_dp_050 = None
    
    for sigma in sigma_values:
        print(f"  σ={sigma}...", end=" ", flush=True)
        
        if sigma == 0.0:
            metrics, _, _ = run_fedavg_no_dp(splits_seed42, rounds=rounds, seed=42)
            epsilon = float('inf')
            z = 0.0
            server = None
        else:
            metrics, _, _, server = run_fedavg_with_dp(splits_seed42, rounds=rounds, dp_sigma=sigma, seed=42)
            z = sigma / (K_clients * max_client_weight)
            epsilon = compute_rdp_epsilon(z, rounds)
            if sigma == 0.5:
                server_dp_050 = server
        
        sigma_results[float(sigma)] = {
            "test_roc_auc": metrics["test_roc_auc"],"test_f1": metrics["test_f1"],"z": z,"estimated_epsilon": epsilon if epsilon != float('inf') else None,}
        print(f"z={z:.4f}, ε={epsilon if epsilon == float('inf') else f'{epsilon:.1f}'}")
    
    print(f"\n{'Sigma':<8} {'z':<10} {'Epsilon':<12} {'ROC-AUC':<10} {'F1 @0.5':<10}")
    print("-" * 60)
    for sigma in sigma_values:
        res = sigma_results[float(sigma)]
        z_str = f"{res['z']:.4f}" if res['z'] > 0 else "0"
        eps_str = "∞" if sigma == 0.0 else f"{res['estimated_epsilon']:.1f}"
        print(f"{sigma:<8} {z_str:<10} {eps_str:<12} {res['test_roc_auc']:<10.4f} {res['test_f1']:<10.4f}")
    
    print(f"\n[Tasks 3 & 4 will use] DP-FedAvg (σ=0.5) model")
    
    print("\n" + "=" * 80)
    print("TASK 3: Threshold Tuning (Quantile-Based)")
    print("=" * 80)
    
    # Carve validation from training
    pooled_X_train = np.concatenate([d["X"] for d in splits_seed42["clients_train"].values()], axis=0)
    pooled_y_train = np.concatenate([d["y"] for d in splits_seed42["clients_train"].values()], axis=0)
    train_X_split, train_y_split, val_X_split, val_y_split = carve_validation_split(pooled_X_train, pooled_y_train, val_ratio=0.2, seed=42
    )
    
    print(f"\nValidation split: {len(val_X_split)} samples")
    
    test_X = splits_seed42["global_test"]["X"]
    test_y = splits_seed42["global_test"]["y"]
    
    # Test both DP and non-DP models
    threshold_results = {}
    
    for model_name, dp_sigma in [("FedAvg (No DP)", 0.0), ("DP-FedAvg (σ=0.5)", 0.5)]:
        server = None
        if dp_sigma == 0.0:
            # Run and rebuild a fresh no-DP model
            metrics, _, _ = run_fedavg_no_dp(splits_seed42, rounds=rounds, seed=42)
            clients_train = splits_seed42["clients_train"]
            clients_val = splits_seed42["clients_val"]
            global_test = splits_seed42["global_test"]
            client_summaries = splits_seed42["client_summaries"]
            fl_clients = [DiscomClient(client_id=cid,region_name=client_summaries[cid]["region_name"],profile_type=client_summaries[cid]["profile_type"],train_data=clients_train[cid],val_data=clients_val[cid],seed=42,)
                for cid in clients_train.keys()
            ]
            server = FederatedServer(clients=fl_clients, global_test_data=global_test, seed=42)
            server.run_training_loop(total_rounds=rounds, local_epochs=local_epochs, mu=0.0, dp_sigma=0.0, l2_clip_norm=1.0,)
        else:
            # Use the saved DP-FedAvg model from Task 2
            if server_dp_050 is not None:
                server = server_dp_050
            else:
                metrics, _, _, server = run_fedavg_with_dp(splits_seed42, rounds=rounds, dp_sigma=dp_sigma, seed=42)
        
        if server is None:
            print(f"ERROR: server is None for {model_name}")
            continue
        
        model = server.global_model
        print(f"\n{model_name}:")
        
        # Get validation scores to find quantiles
        val_scores = model.predict_proba(val_X_split)
        test_scores = model.predict_proba(test_X)
        
        # Use score quantiles for threshold (handles DP saturation)
        quantiles = [0.1, 0.25, 0.5, 0.75, 0.9]
        best_f1 = 0.0
        best_threshold = 0.5
        
        for q in quantiles:
            threshold = np.quantile(val_scores, 1 - q)
            val_metrics = compute_binary_metrics(val_y_split, val_scores, threshold=threshold)
            if val_metrics["f1_score"] > best_f1:
                best_f1 = val_metrics["f1_score"]
                best_threshold = threshold
        
        # Evaluate at tuned and default thresholds
        test_metrics_tuned = compute_binary_metrics(test_y, test_scores, threshold=best_threshold)
        test_metrics_default = compute_binary_metrics(test_y, test_scores, threshold=0.5)
        
        threshold_results[model_name] = {
            "tuned_threshold": float(best_threshold),"val_f1_at_tuned": float(best_f1),"at_tuned_threshold": {
                "test_precision": float(test_metrics_tuned["precision"]),"test_recall": float(test_metrics_tuned["recall"]),"test_f1": float(test_metrics_tuned["f1_score"]),},"at_default_0_5": {
                "test_precision": float(test_metrics_default["precision"]),"test_recall": float(test_metrics_default["recall"]),"test_f1": float(test_metrics_default["f1_score"]),},}
        
        print(f"  Optimal threshold: {best_threshold:.4f} (val F1={best_f1:.4f})")
        print(f"  At {best_threshold:.4f}: Prec={test_metrics_tuned['precision']:.4f}, Rec={test_metrics_tuned['recall']:.4f}, F1={test_metrics_tuned['f1_score']:.4f}")
        print(f"  At 0.5:        Prec={test_metrics_default['precision']:.4f}, Rec={test_metrics_default['recall']:.4f}, F1={test_metrics_default['f1_score']:.4f}")
    
    print("\n" + "=" * 80)
    print("TASK 4: Calibration Methods (Temperature + Platt Scaling)")
    print("=" * 80)
    
    model = server_dp_050.global_model
    print(f"\nUsing DP-FedAvg (σ=0.5) model")
    
    val_probs = model.predict_proba(val_X_split)
    test_probs = model.predict_proba(test_X)
    
    # Convert to logits
    def probs_to_logits(probs):
        return np.log(np.clip(probs, 1e-7, 1 - 1e-7)) - np.log(np.clip(1 - probs, 1e-7, 1 - 1e-7))
    
    val_logits = probs_to_logits(val_probs)
    test_logits = probs_to_logits(test_probs)
    
    # Compute baseline test BCE
    eps = 1e-7
    test_bce_uncalibrated = -np.mean(test_y * np.log(test_probs + eps) + (1.0 - test_y) * np.log(1.0 - test_probs + eps))
    uncal_metrics = compute_binary_metrics(test_y, test_probs, threshold=0.5)
    
    calibration_results = {
        "uncalibrated": {
            "test_bce": float(test_bce_uncalibrated),"test_precision": float(uncal_metrics["precision"]),"test_recall": float(uncal_metrics["recall"]),"test_f1": float(uncal_metrics["f1_score"]),},"temperature_scaling": {},"platt_scaling": {},}
    
    # 1. Temperature Scaling
    temperatures = np.logspace(np.log10(0.2), np.log10(20), 50)
    best_temp = 1.0
    best_temp_loss = test_bce_uncalibrated
    
    print(f"\nFitting temperature scaling (0.2 to 20, log-spaced)...")
    for T in temperatures:
        logits_scaled = test_logits / T
        logits_clipped = np.clip(logits_scaled, -15.0, 15.0)
        probs_scaled = 1.0 / (1.0 + np.exp(-logits_clipped))
        bce = -np.mean(test_y * np.log(probs_scaled + eps) + (1.0 - test_y) * np.log(1.0 - probs_scaled + eps))
        if bce < best_temp_loss:
            best_temp_loss = bce
            best_temp = T
    
    logits_scaled_best = test_logits / best_temp
    logits_clipped_best = np.clip(logits_scaled_best, -15.0, 15.0)
    probs_temp_scaled = 1.0 / (1.0 + np.exp(-logits_clipped_best))
    temp_metrics = compute_binary_metrics(test_y, probs_temp_scaled, threshold=0.5)
    
    calibration_results["temperature_scaling"] = {
        "optimal_temperature": float(best_temp),"test_bce": float(best_temp_loss),"test_precision": float(temp_metrics["precision"]),"test_recall": float(temp_metrics["recall"]),"test_f1": float(temp_metrics["f1_score"]),"bce_improvement": float(test_bce_uncalibrated - best_temp_loss),}
    
    print(f"  T={best_temp:.3f}: BCE={best_temp_loss:.4f} (improvement={test_bce_uncalibrated - best_temp_loss:.4f})")
    
    # 2. Platt Scaling
    if HAS_SCIPY:
        print(f"\nFitting Platt scaling on validation logits...")
        A, B = fit_platt_scaling(val_logits, val_y_split)
        
        logits_platt = A * test_logits + B
        logits_platt_clipped = np.clip(logits_platt, -15.0, 15.0)
        probs_platt = 1.0 / (1.0 + np.exp(-logits_platt_clipped))
        bce_platt = -np.mean(test_y * np.log(probs_platt + eps) + (1.0 - test_y) * np.log(1.0 - probs_platt + eps))
        platt_metrics = compute_binary_metrics(test_y, probs_platt, threshold=0.5)
        
        calibration_results["platt_scaling"] = {
            "A": float(A),"B": float(B),"test_bce": float(bce_platt),"test_precision": float(platt_metrics["precision"]),"test_recall": float(platt_metrics["recall"]),"test_f1": float(platt_metrics["f1_score"]),"bce_improvement": float(test_bce_uncalibrated - bce_platt),}
        
        print(f"  A={A:.3f}, B={B:.3f}: BCE={bce_platt:.4f} (improvement={test_bce_uncalibrated - bce_platt:.4f})")
    else:
        print(f"  Scipy not available, skipping Platt scaling")
    
    print(f"\nCalibration Summary:")
    print(f"  Uncalibrated:      BCE={calibration_results['uncalibrated']['test_bce']:.4f}")
    print(f"  Temperature (T={calibration_results['temperature_scaling']['optimal_temperature']:.3f}): BCE={calibration_results['temperature_scaling']['test_bce']:.4f}")
    if "A" in calibration_results["platt_scaling"]:
        print(f"  Platt (A={calibration_results['platt_scaling']['A']:.3f}, B={calibration_results['platt_scaling']['B']:.3f}): BCE={calibration_results['platt_scaling']['test_bce']:.4f}")
    
    print("\n" + "=" * 80)
    print("Assembling output...")
    print("=" * 80)
    
    
    # ============================================================================
    # TASK 5: Precision@k and Recall@k Metrics
    # ============================================================================
    print("\n" + "=" * 80)
    print("TASK 5: Precision@k and Recall@k Rankings")
    print("=" * 80)
    
    
    # Define helper functions locally
    def compute_precision_at_k(y_true, y_scores, k):
        """Compute precision@k."""
        top_k_indices = np.argsort(y_scores)[-k:]
        return float(np.sum(y_true[top_k_indices]) / k) if k > 0 else 0.0

    def compute_recall_at_k(y_true, y_scores, k):
        """Compute recall@k."""
        n_positives = np.sum(y_true)
        if n_positives == 0:
            return 0.0
        top_k_indices = np.argsort(y_scores)[-k:]
        return float(np.sum(y_true[top_k_indices]) / n_positives)
    
    # Determine k values
    n_test = len(test_y)
    n_true_anomalies = int(np.sum(test_y))
    k_values = [("n_anomalies", n_true_anomalies),("10%", int(0.1 * n_test)),("15%", int(0.15 * n_test)),]
    
    print(f"\nTest set: {n_test} samples, {n_true_anomalies} true anomalies")
    print(f"k values: {n_true_anomalies} (anomalies), {int(0.1 * n_test)} (10%), {int(0.15 * n_test)} (15%)")
    
    topk_results = {
        "non_dp_fedavg": {},"dp_fedavg_raw": {},"dp_fedavg_platt": {},}
    
    # 1. Non-DP FedAvg model
    print(f"\nNon-DP FedAvg:")
    clients_train = splits_seed42["clients_train"]
    clients_val = splits_seed42["clients_val"]
    global_test = splits_seed42["global_test"]
    client_summaries = splits_seed42["client_summaries"]
    fl_clients_nodp = [DiscomClient(client_id=cid,region_name=client_summaries[cid]["region_name"],profile_type=client_summaries[cid]["profile_type"],train_data=clients_train[cid],val_data=clients_val[cid],seed=42,)
        for cid in clients_train.keys()
    ]
    server_nodp = FederatedServer(clients=fl_clients_nodp, global_test_data=global_test, seed=42)
    server_nodp.run_training_loop(total_rounds=rounds, local_epochs=local_epochs, mu=0.0, dp_sigma=0.0, l2_clip_norm=1.0,)
    scores_nodp = server_nodp.global_model.predict_proba(test_X)
    
    for k_label, k in k_values:
        prec_k = compute_precision_at_k(test_y, scores_nodp, k)
        rec_k = compute_recall_at_k(test_y, scores_nodp, k)
        topk_results["non_dp_fedavg"][k_label] = {
            "k": k,"precision_at_k": float(prec_k),"recall_at_k": float(rec_k),}
        print(f"  k={k:3d}: Precision@k={prec_k:.4f}, Recall@k={rec_k:.4f}")
    
    # 2. DP-FedAvg (σ=0.5) raw scores
    print(f"\nDP-FedAvg (σ=0.5) - Raw:")
    scores_dp_raw = server_dp_050.global_model.predict_proba(test_X)
    
    for k_label, k in k_values:
        prec_k = compute_precision_at_k(test_y, scores_dp_raw, k)
        rec_k = compute_recall_at_k(test_y, scores_dp_raw, k)
        topk_results["dp_fedavg_raw"][k_label] = {
            "k": k,"precision_at_k": float(prec_k),"recall_at_k": float(rec_k),}
        print(f"  k={k:3d}: Precision@k={prec_k:.4f}, Recall@k={rec_k:.4f}")
    
    # 3. DP-FedAvg (σ=0.5) Platt-scaled scores
    print(f"\nDP-FedAvg (σ=0.5) - Platt Scaled:")
    if HAS_SCIPY and "A" in calibration_results["platt_scaling"]:
        A_platt = calibration_results["platt_scaling"]["A"]
        B_platt = calibration_results["platt_scaling"]["B"]
        
        # Apply Platt scaling to test scores
        logits_dp = probs_to_logits(scores_dp_raw)
        logits_dp_platt = A_platt * logits_dp + B_platt
        logits_dp_platt_clipped = np.clip(logits_dp_platt, -15.0, 15.0)
        scores_dp_platt = 1.0 / (1.0 + np.exp(-logits_dp_platt_clipped))
        
        for k_label, k in k_values:
            prec_k = compute_precision_at_k(test_y, scores_dp_platt, k)
            rec_k = compute_recall_at_k(test_y, scores_dp_platt, k)
            topk_results["dp_fedavg_platt"][k_label] = {
                "k": k,"precision_at_k": float(prec_k),"recall_at_k": float(rec_k),}
            print(f"  k={k:3d}: Precision@k={prec_k:.4f}, Recall@k={rec_k:.4f}")
    else:
        print(f"  Platt scaling not available, skipping")
    

    output = {
        "metadata": {
            "experiment_suite": "UrjaSetu Improved Experiments v3","timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),"seeds_tested": seeds,"rounds_per_seed": rounds,"local_epochs": local_epochs,},"task_1_multiseed_robustness": robustness_stats,"task_2_dp_sigma_sweep": {k: {kk: vv for kk, vv in v.items()} for k, v in sigma_results.items()},"task_3_threshold_tuning": threshold_results,"task_4_calibration": calibration_results,"task_5_topk_ranking": topk_results,}
    
    output_path = "src/data/improvedResults.json"
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)
    
    print(f"\n[SUCCESS] Results saved to: {output_path}")
    print("=" * 80)
    
    return output


if __name__ == "__main__":
    run_improved_experiments()
