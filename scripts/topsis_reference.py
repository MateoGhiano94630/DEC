"""
Implementación de referencia de TOPSIS en numpy, escrita de forma independiente
del motor TypeScript. Genera tests/fixtures/reference.json, que los tests de
vitest usan para comparar resultado por resultado (paso a paso).

Uso:  python3 scripts/topsis_reference.py
"""
import json
import pathlib

import numpy as np


def topsis(X, w, benefit):
    X = np.asarray(X, dtype=float)
    w = np.asarray(w, dtype=float)
    benefit = np.asarray(benefit, dtype=bool)
    norms = np.linalg.norm(X, axis=0)
    R = np.divide(X, norms, out=np.zeros_like(X), where=norms != 0)
    V = R * w
    a_pos = np.where(benefit, V.max(axis=0), V.min(axis=0))
    a_neg = np.where(benefit, V.min(axis=0), V.max(axis=0))
    d_pos = np.linalg.norm(V - a_pos, axis=1)
    d_neg = np.linalg.norm(V - a_neg, axis=1)
    c = d_neg / (d_pos + d_neg)
    return dict(
        columnNorms=norms.tolist(),
        normalized=R.tolist(),
        weighted=V.tolist(),
        idealPositive=a_pos.tolist(),
        idealNegative=a_neg.tolist(),
        distancePositive=d_pos.tolist(),
        distanceNegative=d_neg.tolist(),
        closeness=c.tolist(),
    )


# Matriz semilla de la app (C1 ya calculado como (3·in + out) / 4)
SEED = [
    [8.0, 53.58, 1_000_000, 87.4, 2, 4],
    [20.0, 50.92, 1_000_000, 56.0, 2, 4],
    [1.5, 40.93, 1_000_000, 338.2, 4, 4],
    [3.0, 46.33, 500_000, 58.3, 2, 4],
    [2.0, 48.09, 1_000_000, 226.8, 3, 2],
    [0.525, 39.46, 1_000_000, 236.1, 2, 5],
    [3.0, 14.19, 256_000, 144.1, 2, 5],
    [3.0, 45.42, 983_616, 39.7, 2, 3],
]
SEED_BENEFIT = [False, True, True, True, True, True]
PROFILES = {
    "equilibrado": [0.2, 0.2, 0.15, 0.15, 0.15, 0.15],
    "programacion": [0.1, 0.35, 0.25, 0.15, 0.05, 0.1],
    "economico": [0.4, 0.2, 0.1, 0.15, 0.05, 0.1],
    "datos-sensibles": [0.1, 0.2, 0.15, 0.1, 0.05, 0.4],
    "multimodal": [0.15, 0.2, 0.1, 0.1, 0.35, 0.1],
    "tiempo-real": [0.2, 0.15, 0.05, 0.4, 0.1, 0.1],
}

cases = []
for name, w in PROFILES.items():
    cases.append(dict(name=f"seed/{name}", matrix=SEED, weights=w, benefit=SEED_BENEFIT, expected=topsis(SEED, w, SEED_BENEFIT)))

# Matrices aleatorias con mezcla de criterios de costo y beneficio
rng = np.random.default_rng(20260925)
for k in range(25):
    m = int(rng.integers(2, 12))
    n = int(rng.integers(1, 9))
    X = rng.uniform(0, 1000, size=(m, n)).round(4)
    w = rng.dirichlet(np.ones(n))
    w[-1] = 1 - w[:-1].sum()
    benefit = rng.random(n) < 0.6
    cases.append(
        dict(name=f"random/{k}", matrix=X.tolist(), weights=w.tolist(), benefit=benefit.tolist(), expected=topsis(X, w, benefit))
    )

out = pathlib.Path(__file__).resolve().parent.parent / "tests" / "fixtures" / "reference.json"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(cases, indent=1))
print(f"{len(cases)} casos escritos en {out}")
