#!/bin/bash

# Matrix test runner - runs combinations of app and db resource tiers
# Usage:
#   ./run-test-matrix.sh [app-tiers] [db-tiers]
#
# Tiers available: low, medium, high, veryhigh
#
# Examples:
#   ./run-test-matrix.sh low,medium low          # Run app low+medium against db low
#   ./run-test-matrix.sh all low                # Run all app tiers against db low
#   ./run-test-matrix.sh high,veryhigh all      # Run app high+veryhigh against all db tiers
#   ./run-test-matrix.sh all all                # Full 4x4 matrix (16 tests total)

set -e

# Define resource tiers
declare -A TIERS=(
    ["low"]="0.25 256M"
    ["medium"]="0.5 512M"
    ["high"]="1.0 1024M"
    ["veryhigh"]="2.0 2048M"
)

ALL_TIERS=("low" "medium" "high" "veryhigh")

if [ $# -ne 2 ]; then
    echo "Usage: $0 <app-tiers> <db-tiers>"
    echo
    echo "Tiers: low, medium, high, veryhigh"
    echo "Use 'all' for all tiers, or comma separated list"
    echo
    echo "Examples:"
    echo "  $0 low,medium low          # Run app low+medium against db low"
    echo "  $0 all low                 # Run all app tiers against db low"
    echo "  $0 high,veryhigh all       # Run app high+veryhigh against all db tiers"
    echo "  $0 all all                 # Full 4x4 matrix (16 tests)"
    exit 1
fi

parse_tiers() {
    local input=$1
    if [ "$input" = "all" ]; then
        echo "${ALL_TIERS[@]}"
    else
        echo "${input//,/ }"
    fi
}

APP_TIERS=$(parse_tiers "$1")
DB_TIERS=$(parse_tiers "$2")

# Count total tests
APP_COUNT=$(echo $APP_TIERS | wc -w | xargs)
DB_COUNT=$(echo $DB_TIERS | wc -w | xargs)
TOTAL_TESTS=$((APP_COUNT * DB_COUNT))

echo "=== Stress Test Matrix Runner ==="
echo "App tiers:  $APP_TIERS ($APP_COUNT)"
echo "DB tiers:   $DB_TIERS ($DB_COUNT)"
echo "Total tests: $TOTAL_TESTS"
echo "---------------------------------"

CURRENT_TEST=1
FAILED_TESTS=()

for APP_TIER in $APP_TIERS; do
    read APP_CPU APP_MEM <<< "${TIERS[$APP_TIER]}"
    
    for DB_TIER in $DB_TIERS; do
        read DB_CPU DB_MEM <<< "${TIERS[$DB_TIER]}"
        TEST_NAME="app-${APP_TIER}-db-${DB_TIER}"
        
        echo
        echo "====================================="
        echo "Test $CURRENT_TEST/$TOTAL_TESTS: $TEST_NAME"
        echo "App:  $APP_TIER ($APP_CPU CPU, $APP_MEM)"
        echo "DB:   $DB_TIER ($DB_CPU CPU, $DB_MEM)"
        echo "====================================="
        
        set +e
        ./run-single-test.sh "$APP_CPU" "$APP_MEM" "$DB_CPU" "$DB_MEM" "$TEST_NAME"
        
        if [ $? -ne 0 ]; then
            echo "⚠️ Test $TEST_NAME failed"
            FAILED_TESTS+=("$TEST_NAME")
        fi
        set -e
        
        # Cool down period between tests
        if [ $CURRENT_TEST -lt $TOTAL_TESTS ]; then
            echo
            echo "Cool down period (30 seconds)..."
            sleep 30
        fi
        
        CURRENT_TEST=$((CURRENT_TEST + 1))
    done
done

echo
echo "=== All tests completed ==="
echo "Total tests run: $((CURRENT_TEST - 1))"
echo "Failed tests: ${#FAILED_TESTS[@]}"

if [ ${#FAILED_TESTS[@]} -gt 0 ]; then
    echo "Failed test list:"
    for failed in "${FAILED_TESTS[@]}"; do
        echo "  ❌ $failed"
    done
else
    echo "✅ All tests passed successfully!"
fi

echo
echo "Results are in k6/ directory"
echo "View dashboard at: http://localhost:3001/d/stress-testing"
