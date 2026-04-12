# E-commerce Stress Testing Setup

This setup provides comprehensive stress testing for your e-commerce application using Docker Compose, Prometheus, Grafana, and
k6.

## Architecture

- **App**: Your Node.js e-commerce API with Prometheus metrics
- **cAdvisor**: Container metrics collection
- **Prometheus**: Metrics storage and querying
- **Grafana**: Visualization dashboard
- **k6**: Load testing tool

## Quick Start

1. **Install dependencies:**

    ```bash
    npm install
    ```

2. **Start monitoring stack:**

    ```bash
    docker compose up --build
    ```

3. **Access services:**
    - App: http://localhost:3000
    - Metrics: http://localhost:3000/metrics
    - Prometheus: http://localhost:9090
    - Grafana: http://localhost:3001 (admin/admin)
    - cAdvisor: http://localhost:8080

4. **Run stress tests:**
    ```bash
    ./run-stress-tests.sh
    ```

## Dashboard Panels

### 1. The "Elbow" Curve

- **Graph**: Dual-axis line graph
- **Metrics**: RPS vs P95 Latency
- **Queries**:
    - `rate(http_requests_total[5m])`
    - `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))`

### 2. Resource Saturation

- **Graph**: Stacked area graph
- **Metrics**: CPU & Memory usage %
- **Queries**:
    - `rate(container_cpu_usage_seconds_total{name=~"ecom.*"}[5m]) / container_spec_cpu_quota{name=~"ecom.*"} * 100`
    - `container_memory_usage_bytes{name=~"ecom.*"} / container_spec_memory_limit_bytes{name=~"ecom.*"} * 100`

### 3. Node.js Health

- **Graph**: Line/Heatmap
- **Metrics**: Event loop lag & GC duration
- **Queries**:
    - `nodejs_event_loop_lag_seconds_max`
    - `rate(nodejs_gc_duration_seconds_sum[5m])`

### 4. Roofline Plot

- **Graph**: Scatter plot
- **Metrics**: RPS vs Network I/O
- **Queries**:
    - `rate(http_requests_total[5m])`
    - `rate(container_network_receive_bytes_total{name=~"ecom.*"}[5m])`

### 5. Failure Modes

- **Graph**: Table/Pie chart
- **Metrics**: 5xx errors & container status
- **Queries**:
    - `rate(http_requests_total{code=~"5.."}[5m])`
    - `up{job="app"}`

### 6. Scaling Table

- **Graph**: Comparison table
- **Metrics**: Max RPS per resource tier
- **Query**: `max_over_time(rate(http_requests_total[10m])[30m:])`

## Manual k6 Testing

Run individual k6 tests:

```bash
# Basic test
docker run --rm -i --network host -v $(pwd)/k6:/k6 grafana/k6:latest run /k6/stress-test.js

# With custom settings
docker run --rm -i --network host -v $(pwd)/k6:/k6 grafana/k6:latest run \
  --vus 100 --duration 30s /k6/stress-test.js
```

## Troubleshooting

1. **Metrics not showing**: Check `/metrics` endpoint returns data
2. **cAdvisor issues**: Ensure Docker socket is accessible
3. **Grafana dashboards**: Wait for provisioning (may take 30s)
4. **k6 network**: Use `--network host` for local testing

## Scaling Tests

The `run-stress-tests.sh` script automatically tests different resource configurations:

- Low: 0.25 CPU, 256MB RAM
- Medium: 0.5 CPU, 512MB RAM
- High: 1.0 CPU, 1024MB RAM
- Very High: 2.0 CPU, 2048MB RAM

Results are saved as JSON files in the `k6/` directory.
