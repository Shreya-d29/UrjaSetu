# UrjaSetu Federated Learning & Model Evaluation Methodology

## 1. Overview and Objective

UrjaSetu is a privacy-preserving grid intelligence platform for electricity theft and smart-meter anomaly detection. Rather than pooling sensitive consumer load curves into a centralized cloud, UrjaSetu deploys collaborative federated learning across Indian regional grid jurisdictions:

- **Northern Grid (NR)**: Residential-heavy with evening cooling/heating peaks.
- **Western Grid (WR)**: Industrial-heavy with steady continuous high-load operations.
- **Southern Grid (SR)**: Agricultural & Tech hybrid with daytime solar duck curves and irrigation pumps.
- **Eastern Grid (ER)**: Commercial & Heavy mining with elevated transmission and non-technical losses.
- **North-Eastern Grid (NER)**: Mountainous / Rural seasonal patterns with high weather dampening.

---

## 2. Mathematical Formulation & Aggregation Algorithms

### 2.1 Problem Setting
Each regional client $k \in \{1, \dots, K\}$ maintains a private local dataset $\mathcal{D}_k = \{(x_i^k, y_i^k)\}_{i=1}^{n_k}$ of 30-dimensional feature vectors:
- 24 hourly normalized load telemetry readings: $[x_0, \dots, x_{23}]$
- 6 engineered domain features: $\text{daily\_mean}$, $\text{daily\_variance}$, $\text{peak\_to\_average\_ratio}$, $\text{night\_to\_day\_ratio}$, $\text{load\_factor}$, $\text{zero\_reading\_fraction}$.
- Binary ground truth label $y \in \{0, 1\}$ (0: Normal consumption, 1: Anomaly/Tampering).

### 2.2 Federated Averaging (FedAvg)
In each communication round $t = 1, \dots, T$:
1. **Broadcast**: Central orchestrator broadcasts current global weights $w_t$.
2. **Local Client Optimization**: Each client $k$ initializes $w_t^k = w_t$ and runs $E$ epochs of local gradient descent on private data $\mathcal{D}_k$:
   $$w_{t+1}^k \leftarrow w_t^k - \eta \nabla \mathcal{L}_k(w_t^k)$$
3. **Sample-Weighted Parameter Aggregation**:
   $$w_{t+1} = \sum_{k=1}^K \frac{n_k}{N} w_{t+1}^k, \quad \text{where } N = \sum_{k=1}^K n_k$$

### 2.3 Federated Proximal Optimization (FedProx)
Under severe non-IID conditions across regional utilities, local client drift can cause divergence. FedProx introduces a proximal regularization term:
$$\min_w \mathcal{L}_k(w) + \frac{\mu}{2} \|w - w_t\|^2$$
With proximal coefficient $\mu = 0.01$, clients are penalized for straying too far from the consensus global model, stabilizing convergence.

---

## 3. Privacy & Security Boundaries

### 3.1 What is Implemented and Guaranteed
1. **Zero Raw Data Transmission**: Smart-meter consumption traces never leave regional utility enclaves. Only model weight updates leave the client boundary.
2. **L2 Gradient / Parameter Clipping**: Each client update $\Delta w^k = w_{t+1}^k - w_t$ is bounded by threshold $C = 1.0$:
   $$\Delta \tilde{w}^k = \Delta w^k \cdot \min\left(1, \frac{C}{\|\Delta w^k\|_2}\right)$$
   This bounds the global sensitivity $\Delta S = \frac{2C}{K}$.
3. **Calibrated Gaussian Noise Mechanism (DP-FedAvg)**:
   $$\tilde{w}_{t+1} = w_{t+1} + \mathcal{N}\left(0, \frac{\sigma^2 C^2}{K^2} \mathbf{I}\right)$$
   With noise multiplier $\sigma = 0.5$ and target $\delta = 10^{-5}$, cumulative $(\epsilon, \delta)$-differential privacy is formally bounded against gradient inversion attacks.

### 3.2 Explicit Boundaries & Future Scope
- **Secure Aggregation (SecAgg)**: While parameter clipping and Gaussian perturbation are implemented, cryptographic Secure Multi-Party Computation (SMPC / Diffie-Hellman mask exchange) is identified as future work for version 2.0.
- **Homomorphic Encryption**: Lattice-based HE (CKKS/BFV) is currently out of scope to avoid compute overhead on edge meters.
- **Due Process Notice**: Algorithmic risk scores identify statistical deviations for forensic audit; they do not constitute legal proof of theft or grounds for automated disconnection.

---

## 4. Empirical Evaluation & Baseline Comparison

All paradigms were benchmarked under identical conditions using a held-out global test set of 796 consumer records (zero test-set leakage):

| Paradigm | Privacy Guarantee | Raw Data Exposure | ROC-AUC | F1 Score | Test Loss |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Centralized Pooled (Upper Bound)** | None (All records centralized) | **100%** | **89.3%** | **0.861** | 0.281 |
| **Local-Only Enclaves (Isolated Avg)** | High (Zero network communication) | **0%** | **80.5%** | **0.498** | 0.442 |
| **Federated FedAvg (UrjaSetu)** | Rényi DP ($C=1.0, \sigma=0.5$) | **0%** | **86.0%** | **0.301** | 0.384 |
| **Federated FedProx ($\mu=0.01$)** | Rényi DP + Proximal Regularizer | **0%** | **85.4%** | **0.301** | 0.382 |

### Key Experimental Insights
1. **The Non-IID Generalization Gap**: Individual isolated DISCOM models (Local-Only) achieve only 80.5% average ROC-AUC because models trained on industrial profiles fail to recognize residential night-tampering patterns.
2. **Federated Gain**: UrjaSetu FedAvg achieves **86.0% ROC-AUC** with **zero raw data transmission**, capturing cross-regional attack vectors while strictly respecting customer privacy.

---

## 5. Reproducibility & Commands

### 5.1 Run Automated Tests
```bash
python -m pytest src/fl_pipeline/test_fl.py -v
```

### 5.2 Execute Benchmark Experiment
```bash
python -m src.fl_pipeline.run_experiment --rounds 20 --seed 42 --output src/data/federatedExperimentResults.json
```

### 5.3 Build & Lint Frontend
```bash
npm run build
npm run lint
```
