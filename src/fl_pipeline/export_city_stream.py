"""
City-Level Stream Exporter for UrjaSetu
Generates ~5000 simulated test meters assigned to real cities (one per state).
Trains DP-FedAvg global model (seed 42) and scores each meter with the final model.
Output: src/data/cityStream.json with {id, region, state, city, label, score, hourly_load}
"""

import os
import json
import numpy as np
from typing import Dict, Any, List, Tuple

from .dataset import create_federated_splits, CLIENT_PROFILES, generate_client_dataset
from .client import DiscomClient, compute_binary_metrics
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

# Cities per state (must match cityData.ts)
CITIES_BY_STATE = {
    # Northern Region
    "Delhi": ["New Delhi", "Delhi Cantonment", "Noida", "Dwarka"],
    "Haryana": ["Gurgaon", "Faridabad", "Hisar", "Rohtak"],
    "Punjab": ["Amritsar", "Ludhiana", "Chandigarh", "Jalandhar"],
    "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer"],
    "Uttar Pradesh": ["Lucknow", "Kanpur", "Agra", "Varanasi", "Allahabad", "Ghaziabad"],
    "Uttarakhand": ["Dehradun", "Haridwar", "Rishikesh", "Almora"],
    "Himachal Pradesh": ["Shimla", "Mandi", "Solan", "Kangra"],
    "Jammu and Kashmir": ["Srinagar", "Jammu", "Leh", "Kargil"],
    "Ladakh": ["Leh", "Kargil"],
    "Chandigarh": ["Chandigarh"],
    # Western Region
    "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Aurangabad", "Nashik", "Solapur"],
    "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar"],
    "Madhya Pradesh": ["Indore", "Bhopal", "Gwalior", "Jabalpur"],
    "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur", "Durg"],
    "Goa": ["Panaji", "Margao", "Vasco da Gama"],
    "Dadra and Nagar Haveli and Daman and Diu": ["Silvassa", "Daman"],
    # Southern Region
    "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Tirupati", "Nellore"],
    "Telangana": ["Hyderabad", "Secunderabad", "Warangal", "Ramagundam"],
    "Karnataka": ["Bengaluru", "Mangaluru", "Mysore", "Hubballi"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Salem"],
    "Kerala": ["Kochi", "Thiruvananthapuram", "Kozhikode", "Thrissur"],
    "Puducherry": ["Puducherry", "Karaikal"],
    "Lakshadweep": ["Kavaratti"],
    # Eastern Region
    "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol"],
    "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur"],
    "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Giridih"],
    "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Sambalpur"],
    "Sikkim": ["Gangtok", "Siliguri"],
    "Andaman and Nicobar Islands": ["Port Blair"],
    # North-Eastern Region
    "Assam": ["Guwahati", "Silchar", "Dibrugarh", "Tezpur"],
    "Meghalaya": ["Shillong", "Tura"],
    "Tripura": ["Agartala", "Udaipur"],
    "Mizoram": ["Aizawl", "Lunglei"],
    "Manipur": ["Imphal", "Bishnupur"],
    "Nagaland": ["Kohima", "Dimapur"],
    "Arunachal Pradesh": ["Itanagar", "Naharlagun"],
}


def generate_city_meters(
    n_samples: int = 5000,
    seed: int = 42,
) -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
    """
    Generate simulated city-level meters across all states.
    Each meter is assigned to a state, a city (with hotspot weighting), and given a label/score.
    
    Returns:
        - List of meter records (dicts with id, region, state, city, label, score, hourly_load)
        - Dict with counts per state
    """
    rng = np.random.default_rng(seed)
    
    # Calculate meters per state (roughly proportional)
    states = list(STATE_TO_REGION.keys())
    n_states = len(states)
    base_per_state = n_samples // n_states
    remainder = n_samples % n_states
    
    state_counts_target = {}
    for i, state in enumerate(states):
        state_counts_target[state] = base_per_state + (1 if i < remainder else 0)
    
    # Generate sample data for feature extraction (pooled from all clients)
    print("\n[1/4] Generating federated data splits for model training...")
    splits = create_federated_splits(seed=seed)
    client_summaries = splits["client_summaries"]
    
    # Pool client training data
    pooled_X = np.concatenate([d["X"] for d in splits["clients_train"].values()], axis=0)
    pooled_y = np.concatenate([d["y"] for d in splits["clients_train"].values()], axis=0)
    input_dim = pooled_X.shape[1]
    
    # Train DP-FedAvg model (same as export_stream.py)
    print("\n[2/4] Training DP-FedAvg model (seed 42, 20 rounds, σ=0.5)...")
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
    
    # Generate city stream meters
    print("\n[3/4] Generating city-level meters (~5000 samples)...")
    
    meters = []
    state_counts_actual = {state: 0 for state in states}
    meter_id = 0
    
    for state in states:
        n_state = state_counts_target[state]
        region = STATE_TO_REGION[state]
        cities = CITIES_BY_STATE[state]
        
        # Create city weights (some cities are hotspots, get more meters)
        # Hotspot: first city gets 50%, remaining split rest
        city_weights = np.zeros(len(cities))
        city_weights[0] = 0.5
        if len(cities) > 1:
            city_weights[1:] = (1.0 - 0.5) / (len(cities) - 1)
        else:
            city_weights[0] = 1.0
        # Normalize to ensure sum is exactly 1.0
        city_weights = city_weights / np.sum(city_weights)
        
        for _ in range(n_state):
            # Sample city by weight
            city = rng.choice(cities, p=city_weights)
            
            # Generate meter data: sample a random client's profile type, generate sample
            random_client = rng.choice(list(CLIENT_PROFILES.keys()))
            client_profile = CLIENT_PROFILES[random_client]
            
            # Generate one sample using client's profile
            X_sample, y_sample = generate_client_dataset(random_client, rng)
            sample_idx = rng.integers(0, len(X_sample))
            hourly = X_sample[sample_idx, :24].tolist()
            label = int(y_sample[sample_idx])
            
            # Score with trained model
            X_single = X_sample[sample_idx:sample_idx+1]
            score = float(server.global_model.predict_proba(X_single)[0])
            
            record = {
                "id": meter_id,
                "region": region,
                "state": state,
                "city": city,
                "label": label,
                "score": score,
                "hourly_load": hourly,
            }
            meters.append(record)
            meter_id += 1
            state_counts_actual[state] += 1
    
    print(f"  -> Generated {len(meters)} city meters")
    
    return meters, state_counts_actual


def export_city_stream(
    rounds: int = 20,
    local_epochs: int = 3,
    seed: int = 42,
    dp_sigma: float = 0.5,
    n_samples: int = 5000,
    output_path: str = "src/data/cityStream.json",
) -> Dict[str, Any]:
    """
    Export city-level stream with simulated meters from all Indian states.
    """
    print("=" * 70)
    print(" UrjaSetu: City-Level Stream Exporter")
    print(f" Generating ~{n_samples} simulated city meters")
    print(f" Training DP-FedAvg: {rounds} rounds | sigma={dp_sigma}")
    print("=" * 70)
    
    # Generate meters
    meters, state_counts = generate_city_meters(n_samples=n_samples, seed=seed)
    
    # Compute export metrics
    labels = [m["label"] for m in meters]
    scores = [m["score"] for m in meters]
    
    export_metrics = compute_binary_metrics(np.array(labels), np.array(scores))
    
    # Count per state
    print("\n[4/4] Assembling export payload...")
    print("\nMeters per state:")
    for state in sorted(state_counts.keys()):
        count = state_counts[state]
        region = STATE_TO_REGION[state]
        print(f"  {state:40s} ({region:3s}): {count:4d} meters")
    
    total_anomaly_count = sum(labels)
    print(f"\nTotal meters: {len(meters)}")
    print(f"Total anomalies (label=1): {total_anomaly_count} ({100*total_anomaly_count/len(meters):.1f}%)")
    
    # Assemble payload
    export_payload = {
        "metadata": {
            "description": "City-level simulated smart meter stream with DP-FedAvg scores",
            "experiment_id": "EXP-URJA-CITY-STREAM",
            "seed": seed,
            "total_rounds": rounds,
            "local_epochs": local_epochs,
            "dp_sigma": dp_sigma,
            "total_meters": len(meters),
            "total_anomalies": int(total_anomaly_count),
            "anomaly_rate": float(total_anomaly_count / len(meters)),
        },
        "metrics": {
            "roc_auc": export_metrics["roc_auc"],
            "f1_score": export_metrics["f1_score"],
            "precision": export_metrics["precision"],
            "recall": export_metrics["recall"],
            "accuracy": export_metrics["accuracy"],
        },
        "state_counts": state_counts,
        "stream": meters,
    }
    
    # Write to file
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(export_payload, f, indent=2)
    
    print(f"\n[OK] City stream exported to: {output_path}")
    print(f"  -> Records written: {len(meters)}")
    print(f"  -> File size: {os.path.getsize(output_path) / 1024:.1f} KB")
    print(f"  -> ROC-AUC: {export_metrics['roc_auc']:.4f}")
    print(f"  -> F1 Score: {export_metrics['f1_score']:.4f}")
    
    return export_payload


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="UrjaSetu City-Level Stream Exporter")
    parser.add_argument("--n-samples", type=int, default=5000, help="Number of city meters to generate")
    parser.add_argument("--rounds", type=int, default=20, help="Number of federated rounds")
    parser.add_argument("--local-epochs", type=int, default=3, help="Local epochs per round")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    parser.add_argument("--dp-sigma", type=float, default=0.5, help="DP noise multiplier")
    parser.add_argument("--output", type=str, default="src/data/cityStream.json", help="Output path")
    
    args = parser.parse_args()
    
    export_city_stream(
        rounds=args.rounds,
        local_epochs=args.local_epochs,
        seed=args.seed,
        dp_sigma=args.dp_sigma,
        n_samples=args.n_samples,
        output_path=args.output,
    )
