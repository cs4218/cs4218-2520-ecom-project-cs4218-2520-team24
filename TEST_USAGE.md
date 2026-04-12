# Stress Test Usage Guide

## New Test Scripts

### 1. run-single-test.sh
Run individual test with independent app and db resource configurations

```bash
./run-single-test.sh <app-cpu> <app-memory> <db-cpu> <db-memory> <test-name>
```

**Examples:**
```bash
# App low, DB low
./run-single-test.sh 0.25 256M 0.25 256M app-low-db-low

# App high, DB low (original configuration)
./run-single-test.sh 1.0 1024M 0.25 256M app-high-db-low

# App very high, DB high
./run-single-test.sh 2.0 2048M 1.0 1024M app-veryhigh-db-high
```

---

### 2. run-test-matrix.sh
Run combinations of app and db tiers automatically

```bash
./run-test-matrix.sh <app-tiers> <db-tiers>
```

**Available tiers:** `low`, `medium`, `high`, `veryhigh`

**Examples:**
```bash
# Run all app tiers against DB low (original test sequence)
./run-test-matrix.sh all low

# Run app high/veryhigh against all DB tiers
./run-test-matrix.sh high,veryhigh all

# Full 4x4 matrix (16 total tests)
./run-test-matrix.sh all all

# Specific combinations
./run-test-matrix.sh low,medium low,medium
```

---

## Resource Tiers

| Tier       | CPU    | Memory |
|------------|--------|--------|
| low        | 0.25   | 256M   |
| medium     | 0.5    | 512M   |
| high       | 1.0    | 1024M  |
| veryhigh   | 2.0    | 2048M  |

---

## Original Behaviour
To reproduce exactly what the old `run-stress-tests.sh` did:
```bash
./run-test-matrix.sh all low
```

---

## Results
All test results are saved to:
```
k6/results-<test-name>.json
```

Grafana dashboard remains available at:
```
http://localhost:3001/d/stress-testing
```
