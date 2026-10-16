"""
Regional Smart-Meter Dataset Generator & Non-IID Partitioning for UrjaSetu
Simulates realistic electricity consumption patterns across 5 Indian Regional DISCOMs:
- NR (Northern Grid): Residential-heavy with prominent evening cooling/heating peaks
- WR (Western Grid): Industrial-heavy with steady continuous high-baseload operations
- SR (Southern Grid): Agricultural & Tech hybrid with daytime solar duck-curve & pumping spikes
- ER (Eastern Grid): Commercial & Heavy extraction with elevated non-technical losses
- NER (North-Eastern Grid): Rural & Mountainous seasonal profiles with high precipitation dampening

Zero test-set leakage: A held-out global test set is created before local client partitioning.
"""

from typing import Dict, List, Tuple
import numpy as np

# Regional client metadata aligning with src/constants/gridData.ts
CLIENT_PROFILES: Dict[str, Dict] = {
    "NR": {
        "region_code": "NR",
        "name": "Northern Regional Grid (Delhi / UP / Punjab)",
        "profile_type": "residential-heavy",
        "base_load_mean": 3.4,     # kW average
        "base_load_std": 1.2,
        "peak_hours": [19, 20, 21, 22],
        "offpeak_hours": [2, 3, 4, 5],
        "anomaly_rate": 0.12,
        "sample_count": 800,
    },
    "WR": {
        "region_code": "WR",
        "name": "Western Regional Grid (Maharashtra / Gujarat)",
        "profile_type": "industrial-heavy",
        "base_load_mean": 12.8,    # continuous 3-phase factory baseload
        "base_load_std": 2.1,
        "peak_hours": [9, 10, 11, 14, 15, 16],
        "offpeak_hours": [0, 1, 2],
        "anomaly_rate": 0.08,
        "sample_count": 950,
    },
    "SR": {
        "region_code": "SR",
        "name": "Southern Regional Grid (Karnataka / Tamil Nadu)",
        "profile_type": "agricultural-tech-hybrid",
        "base_load_mean": 5.2,
        "base_load_std": 1.8,
        "peak_hours": [6, 7, 8, 17, 18],  # morning/evening irrigation pump runs
        "offpeak_hours": [12, 13, 14],     # solar rooftop generation suppression
        "anomaly_rate": 0.14,
        "sample_count": 850,
    },
    "ER": {
        "region_code": "ER",
        "name": "Eastern Regional Grid (West Bengal / Bihar / Odisha)",
        "profile_type": "commercial-mining-mixed",
        "base_load_mean": 6.8,
        "base_load_std": 2.6,
        "peak_hours": [10, 11, 12, 18, 19],
        "offpeak_hours": [3, 4, 5],
        "anomaly_rate": 0.18,
        "sample_count": 750,
    },
    "NER": {
        "region_code": "NER",
        "name": "North-Eastern Regional Grid (Assam / Meghalaya)",
        "profile_type": "rural-seasonal",
        "base_load_mean": 2.1,
        "base_load_std": 0.9,
        "peak_hours": [18, 19, 20],
        "offpeak_hours": [1, 2, 3, 4],
        "anomaly_rate": 0.10,
        "sample_count": 650,
    },
}

FEATURE_NAMES: List[str] = [
    f"hour_{h:02d}_load" for h in range(24)
] + [
    "daily_mean",
    "daily_variance",
    "peak_to_average_ratio",
    "night_to_day_ratio",
    "load_factor",
    "zero_reading_fraction",
]


def generate_diurnal_curve(hours: int = 24, profile_type: str = "residential-heavy", rng: np.random.Generator = None) -> np.ndarray:
    """Generate normalized 24-hour baseline diurnal consumption curve."""
    if rng is None:
        rng = np.random.default_rng(42)

    t = np.arange(hours)
    if profile_type == "residential-heavy":
        # Dual peak: minor morning peak (07:00-09:00), major evening peak (19:00-22:00)
        curve = (
            0.3
            + 0.25 * np.exp(-((t - 8) ** 2) / 6.0)
            + 0.55 * np.exp(-((t - 20.5) ** 2) / 8.0)
            + 0.05 * np.sin(2 * np.pi * t / 24.0)
        )
    elif profile_type == "industrial-heavy":
        # High steady shift load from 08:00 to 20:00, moderate night shift
        curve = 0.65 + 0.35 / (1.0 + np.exp(-(t - 7.5) * 1.5)) - 0.25 / (1.0 + np.exp(-(t - 20.5) * 1.5))
    elif profile_type == "agricultural-tech-hybrid":
        # Irrigation spike early morning and dusk; solar duck curve dip at midday
        curve = (
            0.35
            + 0.40 * np.exp(-((t - 7.0) ** 2) / 4.0)
            + 0.45 * np.exp(-((t - 18.5) ** 2) / 5.0)
            - 0.20 * np.exp(-((t - 13.0) ** 2) / 5.0)  # solar duck curve
        )
    elif profile_type == "commercial-mining-mixed":
        # Business hours ramp with high peak variance
        curve = 0.25 + 0.65 * np.exp(-((t - 14.0) ** 2) / 28.0)
    else:  # rural-seasonal
        # Low daytime activity, concentrated dusk illumination
        curve = 0.20 + 0.70 * np.exp(-((t - 19.0) ** 2) / 6.0)

    # Add realistic stochastic micro-variations
    noise = rng.normal(0, 0.03, size=hours)
    curve = np.clip(curve + noise, 0.02, 1.5)
    return curve


def extract_domain_features(hourly: np.ndarray) -> np.ndarray:
    """Compute 6 electricity domain statistical features from 24h readings."""
    daily_mean = float(np.mean(hourly))
    daily_var = float(np.var(hourly))
    peak = float(np.max(hourly))
    par = peak / (daily_mean + 1e-6)
    
    night_mean = float(np.mean(hourly[0:6]))
    day_mean = float(np.mean(hourly[12:18]))
    night_day_ratio = night_mean / (day_mean + 1e-6)

    load_factor = daily_mean / (peak + 1e-6)
    zero_fraction = float(np.mean(hourly < 0.05))

    return np.array([
        daily_mean,
        daily_var,
        par,
        night_day_ratio,
        load_factor,
        zero_fraction,
    ], dtype=np.float32)


def inject_anomaly(hourly: np.ndarray, anomaly_type: str, rng: np.random.Generator) -> np.ndarray:
    """Inject domain-specific electricity theft or meter bypass patterns."""
    mod = hourly.copy()
    if anomaly_type == "bypass":
        # Proportional meter bypass (theft during peak hours)
        factor = rng.uniform(0.25, 0.55)
        mod[16:23] = mod[16:23] * factor
    elif anomaly_type == "shunting":
        # Constant negative offset or phase attenuation
        mod = mod * rng.uniform(0.3, 0.6)
    elif anomaly_type == "zero_tamper":
        # Sudden periodic disconnects / physical mechanical jamming
        jam_start = rng.integers(8, 16)
        jam_len = rng.integers(4, 9)
        mod[jam_start : min(24, jam_start + jam_len)] = 0.0
    elif anomaly_type == "reverse_shift":
        # Nighttime unauthorized manufacturing usage with unmetered day bypass
        mod[0:6] = mod[0:6] * rng.uniform(1.8, 3.2)
        mod[10:18] = mod[10:18] * 0.2
    return np.clip(mod, 0.0, None)


def generate_client_dataset(client_id: str, rng: np.random.Generator) -> Tuple[np.ndarray, np.ndarray]:
    """Generate client features X and labels y according to client profile."""
    profile = CLIENT_PROFILES[client_id]
    n_samples = profile["sample_count"]
    anomaly_rate = profile["anomaly_rate"]
    p_type = profile["profile_type"]

    X_list = []
    y_list = []

    anomaly_types = ["bypass", "shunting", "zero_tamper", "reverse_shift"]

    for _ in range(n_samples):
        is_anom = rng.random() < anomaly_rate
        base_curve = generate_diurnal_curve(hours=24, profile_type=p_type, rng=rng)
        scale = rng.normal(profile["base_load_mean"], profile["base_load_std"])
        scale = max(0.5, scale)
        hourly = base_curve * scale

        if is_anom:
            anom_t = rng.choice(anomaly_types)
            hourly = inject_anomaly(hourly, anom_t, rng)
            y = 1
        else:
            y = 0

        # Normalization (standardized per-sample peak to reflect grid telemetry)
        normalized_hourly = hourly / (np.max(hourly) + 1e-6)
        domain_feats = extract_domain_features(normalized_hourly)
        
        feature_vec = np.concatenate([normalized_hourly, domain_feats])
        X_list.append(feature_vec)
        y_list.append(y)

    X = np.array(X_list, dtype=np.float32)
    y = np.array(y_list, dtype=np.int64)
    return X, y


def create_federated_splits(
    seed: int = 42,
    global_test_ratio: float = 0.20,
    client_val_ratio: float = 0.20,
) -> Dict:
    """
    Creates reproducible Non-IID regional client datasets with held-out global test set.
    Guarantees zero data leakage:
    1. Each client's data is generated deterministically.
    2. A stratified fraction from each client forms the Global Test Set.
    3. The remaining data forms each client's private training and validation sets.
    """
    rng = np.random.default_rng(seed)
    
    clients_train_data = {}
    clients_val_data = {}
    global_test_X = []
    global_test_y = []

    client_summaries = {}

    for client_id in CLIENT_PROFILES.keys():
        X, y = generate_client_dataset(client_id, rng)
        n = len(X)
        indices = np.arange(n)
        rng.shuffle(indices)

        # Stratified partition for global test
        pos_idx = indices[y[indices] == 1]
        neg_idx = indices[y[indices] == 0]

        n_test_pos = int(len(pos_idx) * global_test_ratio)
        n_test_neg = int(len(neg_idx) * global_test_ratio)

        test_idx = np.concatenate([pos_idx[:n_test_pos], neg_idx[:n_test_neg]])
        train_val_idx = np.concatenate([pos_idx[n_test_pos:], neg_idx[n_test_neg:]])
        rng.shuffle(train_val_idx)

        # Client-side train vs validation
        n_val = int(len(train_val_idx) * client_val_ratio)
        val_idx = train_val_idx[:n_val]
        train_idx = train_val_idx[n_val:]

        clients_train_data[client_id] = {
            "X": X[train_idx],
            "y": y[train_idx],
        }
        clients_val_data[client_id] = {
            "X": X[val_idx],
            "y": y[val_idx],
        }

        global_test_X.append(X[test_idx])
        global_test_y.append(y[test_idx])

        client_summaries[client_id] = {
            "client_id": client_id,
            "region_name": CLIENT_PROFILES[client_id]["name"],
            "profile_type": CLIENT_PROFILES[client_id]["profile_type"],
            "total_samples": int(n),
            "train_samples": int(len(train_idx)),
            "val_samples": int(len(val_idx)),
            "test_samples_contributed": int(len(test_idx)),
            "train_anomaly_rate": float(np.mean(y[train_idx])),
            "feature_dim": int(X.shape[1]),
        }

    global_test_X = np.concatenate(global_test_X, axis=0)
    global_test_y = np.concatenate(global_test_y, axis=0)

    # Shuffle global test
    test_shuf = np.arange(len(global_test_X))
    rng.shuffle(test_shuf)
    global_test_X = global_test_X[test_shuf]
    global_test_y = global_test_y[test_shuf]

    return {
        "clients_train": clients_train_data,
        "clients_val": clients_val_data,
        "global_test": {"X": global_test_X, "y": global_test_y},
        "client_summaries": client_summaries,
        "feature_names": FEATURE_NAMES,
        "seed": seed,
    }
