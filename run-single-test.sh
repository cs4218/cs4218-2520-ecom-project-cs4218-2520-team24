#!/bin/bash

# Single test runner - run individual stress test configurations
# Usage:
#   ./run-single-test.sh [app-cpu] [app-memory] [db-cpu] [db-memory] [test-name]
#
# Examples:
#   ./run-single-test.sh 0.25 256M 0.25 256M app-low-db-low
#   ./run-single-test.sh 1.0 1024M 0.25 256M app-high-db-low
#   ./run-single-test.sh 2.0 2048M 1.0 1024M app-veryhigh-db-high

set -e

if [ $# -ne 5 ]; then
    echo "Usage: $0 <app-cpu> <app-memory> <db-cpu> <db-memory> <test-name>"
    echo
    echo "Available resource tiers:"
    echo "  Low:      0.25 CPU / 256M"
    echo "  Medium:   0.5 CPU / 512M"
    echo "  High:     1.0 CPU / 1024M"
    echo "  VeryHigh: 2.0 CPU / 2048M"
    echo
    echo "Example: ./run-single-test.sh 1.0 1024M 0.25 256M app-high-db-low"
    exit 1
fi

APP_CPU=$1
APP_MEM=$2
DB_CPU=$3
DB_MEM=$4
TEST_NAME=$5

echo "=== Running Individual Stress Test ==="
echo "App:  CPU=$APP_CPU, Memory=$APP_MEM"
echo "DB:   CPU=$DB_CPU, Memory=$DB_MEM"
echo "Test: $TEST_NAME"
echo "--------------------------------------"

# Cleanup previous backups
rm -f docker-compose.yml.bak

echo "Updating resource limits in docker-compose.yml..."

# Update application resources
sed -i.bak -E "/services:/,/cadvisor:/ s/cpus: [\"']?[0-9.]*[\"']?/cpus: \"$APP_CPU\"/" docker-compose.yml
sed -i.bak -E "/services:/,/cadvisor:/ s/memory: [0-9]*M/memory: $APP_MEM/" docker-compose.yml

# Update mongodb resources
sed -i.bak -E "/mongodb:/,/mongodb-exporter:/ s/cpus: [\"']?[0-9.]*[\"']?/cpus: \"$DB_CPU\"/" docker-compose.yml
sed -i.bak -E "/mongodb:/,/mongodb-exporter:/ s/memory: [0-9]*M/memory: $DB_MEM/" docker-compose.yml

# Calculate wiredTiger cache size (max 50% of db memory)
DB_MEM_NUM=${DB_MEM%M}
WT_CACHE=$(awk -v mem="$DB_MEM_NUM" 'BEGIN { print (mem * 0.5) / 1024 }')
sed -i.bak -E "s/--wiredTigerCacheSizeGB\", \"[0-9.]+/--wiredTigerCacheSizeGB\", \"$WT_CACHE/" docker-compose.yml

echo "Restarting services with new resource limits..."
docker compose --compatibility down -v > /dev/null 2>&1 || true
docker compose --compatibility up -d --scale app=1

echo "Waiting 45 seconds for services to initialize..."
sleep 45

echo "Starting k6 load test..."
mkdir -p k6
docker run --rm -i \
  -e BASE_URL=http://host.docker.internal:3000 \
  -v $(pwd)/k6:/k6 \
  grafana/k6:latest \
  run --out json=/k6/results-$TEST_NAME.json \
  /k6/stress-test.js

echo
echo "✅ Test $TEST_NAME completed successfully!"
echo "Results saved to: k6/results-$TEST_NAME.json"
echo
echo "View metrics at: http://localhost:3001/d/stress-testing"
