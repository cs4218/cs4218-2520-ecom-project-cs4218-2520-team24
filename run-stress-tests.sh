#!/bin/bash

# Stress testing script with different resource configurations
# This script runs k6 tests with varying CPU and memory limits

echo "=== E-commerce Stress Testing Script ==="

# Function to run test with specific resources
run_test() {
    local cpu=$1
    local mem=$2
    local test_name=$3

    echo "Running test: $test_name (CPU: $cpu, Memory: $mem)"

    # Update docker-compose with new resource limits
    sed -i.bak "s/cpus: [\"']\?[0-9.]*[\"']\?/cpus: \"$cpu\"/" docker-compose.yml
    sed -i.bak "s/memory: [0-9]*M/memory: $mem/" docker-compose.yml

    # Restart services with new limits
    docker compose --compatibility up -d --scale app=1

    # Wait for services to be ready
    sleep 30

    # Run k6 test on macOS using host.docker.internal
    docker run --rm -i \
      -e BASE_URL=http://host.docker.internal:3000 \
      -v $(pwd)/k6:/k6 \
      grafana/k6:latest \
      run --out json=/k6/results-$test_name.json \
      /k6/stress-test.js

    echo "Test $test_name completed. Results saved to k6/results-$test_name.json"
    echo "---"
}

# Test configurations
run_test "0.25" "256M" "low-resources"
run_test "0.5" "512M" "medium-resources"
run_test "1.0" "1024M" "high-resources"
run_test "2.0" "2048M" "very-high-resources"

echo "All stress tests completed!"
echo "Check k6/ directory for results and Grafana dashboard for visualizations."