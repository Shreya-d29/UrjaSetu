"""
District-Level Stream Exporter for UrjaSetu
Generates ~25 simulated test meters per district across all Indian districts.
Districts are grouped into hotspot clusters within each state (neighbouring districts
share elevated anomaly probability).
Trains DP-FedAvg global model (seed 42) and scores each meter with the final model.
Output: src/data/districtStream.json (compact format with state aggregation)
"""

import os
import json
import glob
import numpy as np
from typing import Dict, Any, List, Tuple

from .dataset import create_federated_splits, CLIENT_PROFILES, generate_client_dataset
from .client import DiscomClient
from .server import FederatedServer


# State to region mapping (must match STATE_TO_REGION_MAP from gridData.ts)
STATE_TO_REGION = {
    # Northern Region
    "Delhi": "NR",
    "Haryana": "NR",
    "Punjab": "NR",
    "Rajasthan": "NR",
    "Uttar Pradesh": "NR",
    "Uttarakhand": "NR",
    "Himachal Pradesh": "NR",
    "Jammu and Kashmir": "NR",
    "Ladakh": "NR",
    "Chandigarh": "NR",
    # Western Region
    "Maharashtra": "WR",
    "Gujarat": "WR",
    "Madhya Pradesh": "WR",
    "Chhattisgarh": "WR",
    "Goa": "WR",
    "Dadra and Nagar Haveli and Daman and Diu": "WR",
    # Southern Region
    "Andhra Pradesh": "SR",
    "Telangana": "SR",
    "Karnataka": "SR",
    "Tamil Nadu": "SR",
    "Kerala": "SR",
    "Puducherry": "SR",
    "Lakshadweep": "SR",
    # Eastern Region
    "West Bengal": "ER",
    "Bihar": "ER",
    "Jharkhand": "ER",
    "Odisha": "ER",
    "Sikkim": "ER",
    "Andaman and Nicobar Islands": "ER",
    # North-Eastern Region
    "Assam": "NER",
    "Meghalaya": "NER",
    "Tripura": "NER",
    "Mizoram": "NER",
    "Manipur": "NER",
    "Nagaland": "NER",
    "Arunachal Pradesh": "NER",
}


def load_districts_by_state() -> Dict[str, List[str]]:
    """
    Load district names from GeoJSON files in public/geo/districts/.
    Returns dict: {state_name: [district1, district2, ...]}
    """
    districts_by_state = {}
    
    district_files = glob.glob("public/geo/districts/*.json")
    
    for filepath in sorted(district_files):
        with open(filepath, "r") as f:
            geojson = json.load(f)
        
        # Extract state name from first feature (all have same state)
        features = geojson.get("features", [])
        if not features:
            continue
        
        state = features[0]["properties"]["state"]
        districts = [f["properties"]["name"] for f in features]
        
        districts_by_state[state] = districts
    
    return districts_by_state


def create_hotspot_clusters(
    districts: List[str],
    n_clusters: int = 2,
    rng: np.random.Generator = None,
) -> Dict[str, float]:
    """
    Create hotspot clusters within a state.
    Neighbouring districts in a cluster share elevated anomaly probability.
    
    Returns:
        Dict mapping district name to anomaly probability (0.0-1.0)
    """
    if rng is None:
        rng = np.random.default_rng(42)
    
    anomaly_probs = {}
    
    # Assign districts to clusters (roughly equal size)
    n_districts = len(districts)
    cluster_size = max(1, n_districts // max(1, n_clusters))
    
    for i, district in enumerate(districts):
        cluster_idx = i // cluster_size
        
        if cluster_idx < n_clusters - 1:
            # Non-hotspot cluster: low anomaly probability (2-5%)
            prob = rng.uniform(0.02, 0.05)
        else:
            # Hotspot cluster: elevated anomaly probability (15-25%)
            prob = rng.uniform(0.15, 0.25)
        
        anomaly_probs[district] = prob
    
    return anomaly_probs


def generate_district_meters(
    meters_per_district: int = 25,
    seed: int = 42,
) -> Tuple[List[Dict[str, Any]], Dict[str, Dict[str, int]]]:
    """
    Generate simulated district-level meters across all districts in all states.
    Each district has ~25 meters, with some districts having elevated anomaly probability
    (hotspots created by spatial clustering).
    
    Returns:
        - List of meter records (dicts with id, state, district, label, score, hourly_load)
        - Dict with aggregated stats per state/district: {state: {district: {n, flagged, trueAnomalies, avgScore}}}
    """
    rng = np.random.default_rng(seed)
    
    # Load districts from GeoJSON files
    print("\n[1/5] Loading districts from GeoJSON files...")
    districts_by_state = load_districts_by_state()
    
    total_districts = sum(len(d) for d in districts_by_state.values())
    total_meters_target = total_districts * meters_per_district
    
    print(f"  -> Loaded {len(districts_by_state)} states")
    print(f"  -> Loaded {total_districts} districts")
    print(f"  -> Target: {total_meters_target} meters ({meters_per_district} per district)")
    
    # Generate sample data for feature extraction (pooled from all clients)
    print("\n[2/5] Generating federated data splits for model training...")
    splits = create_federated_splits(seed=seed)
    client_summaries = splits["client_summaries"]
    
    # Pool client training data
    pooled_X = np.concatenate([d["X"] for d in splits["clients_train"].values()], axis=0)
    pooled_y = np.concatenate([d["y"] for d in splits["clients_train"].values()], axis=0)
    input_dim = pooled_X.shape[1]
    
    # Train DP-FedAvg model (same as export_city_stream.py)
    print("\n[3/5] Training DP-FedAvg model (seed 42, 20 rounds, σ=0.5)...")
    clients = []
    for client_id in CLIENT_PROFILES.keys():
        client = DiscomClient(
            client_id=client_id,
            region_name=CLIENT_PROFILES[client_id]["name"],
            profile_type=CLIENT_PROFILES[client_id]["profile_type"],
            train_data=splits["clients_train"][client_id],
            val_data=splits["clients_val"][client_id],
            input_dim=input_dim,
            lr=0.005,
            seed=seed,
        )
        clients.append(client)
    
    server = FederatedServer(
        clients=clients,
        global_test_data=splits["global_test"],
        input_dim=input_dim,
        seed=seed,
    )
    
    history = server.run_training_loop(
        total_rounds=20,
        local_epochs=3,
        mu=0.0,
        dp_sigma=0.5,
        l2_clip_norm=1.0,
    )
    
    final_metrics = history[-1]
    print(f"  -> Final Test ROC-AUC: {final_metrics['test_roc_auc']:.4f}")
    print(f"  -> Final Test F1: {final_metrics['test_f1']:.4f}")
    
    # Generate district stream meters (batch processing for speed)
    print("\n[4/5] Generating district-level meters (~25 per district)...")
    
    meters = []
    state_district_stats = {}
    meter_id = 0
    
    # Pre-generate all X,y samples for all clients (batch)
    all_X_samples = []
    all_y_samples = []
    sample_client_ids = []
    
    total_samples_needed = sum(len(districts_by_state[state]) for state in districts_by_state.keys()) * meters_per_district
    
    for _ in range(total_samples_needed):
        random_client = rng.choice(list(CLIENT_PROFILES.keys()))
        X_sample, y_sample = generate_client_dataset(random_client, rng)
        sample_idx = rng.integers(0, len(X_sample))
        
        all_X_samples.append(X_sample[sample_idx:sample_idx+1])
        all_y_samples.append(y_sample[sample_idx])
        sample_client_ids.append(random_client)
    
    # Batch score all samples
    print("  -> Batch scoring all samples...")
    all_X = np.vstack(all_X_samples)
    all_scores = server.global_model.predict_proba(all_X).flatten()
    
    sample_idx_counter = 0
    
    for state in sorted(districts_by_state.keys()):
        districts = districts_by_state[state]
        region = STATE_TO_REGION.get(state, "XX")
        
        # Create hotspot clusters for this state (2-3 clusters)
        n_clusters = max(2, len(districts) // 10)
        anomaly_probs = create_hotspot_clusters(districts, n_clusters=n_clusters, rng=rng)
        
        state_district_stats[state] = {}
        
        for district in districts:
            district_anomaly_prob = anomaly_probs[district]
            
            district_stats = {
                "n": 0,
                "flagged": 0,
                "trueAnomalies": 0,
                "avgScore": 0.0,
            }
            
            district_scores = []
            
            for _ in range(meters_per_district):
                # Use pre-generated sample
                hourly = all_X_samples[sample_idx_counter][:, :24].tolist()[0]
                original_label = int(all_y_samples[sample_idx_counter])
                score = float(all_scores[sample_idx_counter])
                
                # Adjust label based on district hotspot probability
                if rng.random() < district_anomaly_prob:
                    label = 1
                else:
                    label = original_label
                
                record = {
                    "id": meter_id,
                    "state": state,
                    "district": district,
                    "label": label,
                    "score": score,
                    "hourly_load": hourly,
                }
                meters.append(record)
                district_scores.append(score)
                
                district_stats["n"] += 1
                if label == 1:
                    district_stats["trueAnomalies"] += 1
                
                meter_id += 1
                sample_idx_counter += 1
            
            # Store stats
            if district_scores:
                district_stats["avgScore"] = float(np.mean(district_scores))
            
            state_district_stats[state][district] = district_stats
    
    print(f"  -> Generated {len(meters)} district meters")
    
    return meters, state_district_stats


def compute_flag_threshold(meters: List[Dict[str, Any]]) -> float:
    """
    Compute 85th percentile of scores (top 15%).
    """
    scores = np.array([m["score"] for m in meters])
    threshold = float(np.percentile(scores, 85))
    return threshold


def compute_districtstream_aggregates(
    meters: List[Dict[str, Any]],
    state_district_stats: Dict[str, Dict[str, Dict[str, Any]]],
    flag_threshold: float,
) -> Dict[str, Dict[str, Dict[str, Any]]]:
    """
    Compute final aggregated stats using the global flag threshold.
    Returns: {state: {district: {n, flagged, trueAnomalies, avgScore}}}
    """
    result = {}
    
    for state in sorted(state_district_stats.keys()):
        result[state] = {}
        
        for district in sorted(state_district_stats[state].keys()):
            stats = state_district_stats[state][district]
            
            # Recount flagged using the global threshold
            district_meters = [m for m in meters if m["state"] == state and m["district"] == district]
            flagged_count = sum(1 for m in district_meters if m["score"] >= flag_threshold)
            
            result[state][district] = {
                "n": stats["n"],
                "flagged": flagged_count,
                "trueAnomalies": stats["trueAnomalies"],
                "avgScore": stats["avgScore"],
            }
    
    return result


def export_district_stream(
    meters_per_district: int = 25,
    seed: int = 42,
    output_path: str = "src/data/districtStream.json",
) -> Dict[str, Any]:
    """
    Export district-level stream with simulated meters from all Indian districts.
    """
    print("=" * 70)
    print(" UrjaSetu: District-Level Stream Exporter")
    print(f" Generating ~25 simulated district meters across all Indian districts")
    print(f" Training DP-FedAvg: 20 rounds | sigma=0.5")
    print("=" * 70)
    
    # Generate meters
    meters, state_district_stats = generate_district_meters(
        meters_per_district=meters_per_district,
        seed=seed,
    )
    
    # Compute global flag threshold (top 15%)
    flag_threshold = compute_flag_threshold(meters)
    print(f"\n[5/5] Computing aggregates and flag threshold...")
    print(f"  -> Flag threshold (85th percentile): {flag_threshold:.4f}")
    
    # Recompute aggregates with global threshold
    district_data = compute_districtstream_aggregates(
        meters,
        state_district_stats,
        flag_threshold,
    )
    
    # Compute global metrics
    labels = np.array([m["label"] for m in meters])
    scores = np.array([m["score"] for m in meters])
    
    total_anomalies = int(np.sum(labels))
    total_flagged = int(np.sum(scores >= flag_threshold))
    
    # Print results
    print("\nDistrict counts and statistics:")
    print("-" * 70)
    
    total_states = 0
    total_districts = 0
    
    for state in sorted(district_data.keys()):
        state_districts = district_data[state]
        print(f"\n{state} ({len(state_districts)} districts):")
        
        state_meters = sum(d["n"] for d in state_districts.values())
        state_flagged = sum(d["flagged"] for d in state_districts.values())
        state_anomalies = sum(d["trueAnomalies"] for d in state_districts.values())
        
        print(f"  Total: {state_meters} meters, {state_flagged} flagged, {state_anomalies} true anomalies")
        
        total_states += 1
        total_districts += len(state_districts)
    
    print("-" * 70)
    print(f"\nGlobal summary:")
    print(f"  States: {total_states}")
    print(f"  Districts: {total_districts}")
    print(f"  Total meters: {len(meters)}")
    print(f"  Flagged (threshold={flag_threshold:.4f}): {total_flagged} ({100*total_flagged/len(meters):.1f}%)")
    print(f"  True anomalies (label=1): {total_anomalies} ({100*total_anomalies/len(meters):.1f}%)")
    
    # Assemble payload
    export_payload = {
        "metadata": {
            "description": "District-level simulated smart meter stream with spatial anomaly clustering",
            "experiment_id": "EXP-URJA-DISTRICT-STREAM",
            "seed": seed,
            "meters_per_district": meters_per_district,
            "total_rounds": 20,
            "local_epochs": 3,
            "dp_sigma": 0.5,
            "total_meters": len(meters),
            "total_districts": total_districts,
            "total_states": total_states,
            "flag_threshold": flag_threshold,
        },
        "metrics": {
            "total_meters": len(meters),
            "total_flagged": int(total_flagged),
            "flagged_rate": float(total_flagged / len(meters)),
            "true_anomalies": int(total_anomalies),
            "anomaly_rate": float(total_anomalies / len(meters)),
        },
        "data": district_data,
    }
    
    # Write to file (compact format)
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(export_payload, f, separators=(",", ":"))
    
    print(f"\n[OK] District stream exported to: {output_path}")
    print(f"  -> File size: {os.path.getsize(output_path) / 1024:.1f} KB")
    
    return export_payload


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="UrjaSetu District-Level Stream Exporter")
    parser.add_argument("--meters-per-district", type=int, default=25, help="Meters per district")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    parser.add_argument("--output", type=str, default="src/data/districtStream.json", help="Output path")
    
    args = parser.parse_args()
    
    export_district_stream(
        meters_per_district=args.meters_per_district,
        seed=args.seed,
        output_path=args.output,
    )
