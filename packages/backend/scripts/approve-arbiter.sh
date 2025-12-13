#!/bin/bash

# Pythia Arbiter Approval Script
# Usage: ./approve-arbiter.sh <ARBITER_ADDRESS>

set -e

# Configuration
PACKAGE_ID="0xf2f120774db3ff98dc4a7cdf638b19a7454c8b21aa0312b04dafe3a55911cc6b"
CONFIG_ID="0x0996292b26d2ff7b7aa809fe79cb101db161b7a1d1e149063a7c02a252f8b90d"
GAS_BUDGET="100000000"

# Check if arbiter address is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <ARBITER_ADDRESS>"
    echo "Example: $0 0xe81f7726e202928f389e6409d173c0d5798b29d4cb3991dcb71265cc75c83f95"
    exit 1
fi

ARBITER_ADDRESS="$1"

# Validate address format (basic check)
if [[ ! "$ARBITER_ADDRESS" =~ ^0x[a-fA-F0-9]{64}$ ]]; then
    echo "Error: Invalid address format. Expected 0x followed by 64 hex characters."
    exit 1
fi

echo "Approving arbiter: $ARBITER_ADDRESS"
echo "Package ID: $PACKAGE_ID"
echo "Config ID: $CONFIG_ID"
echo "Gas Budget: $GAS_BUDGET MIST"
echo ""

# Execute the transaction
sui client call \
    --package "$PACKAGE_ID" \
    --module pythia \
    --function approve_arbiter_entry \
    --args "$CONFIG_ID" "$ARBITER_ADDRESS" \
    --gas-budget "$GAS_BUDGET"

echo ""
echo "Arbiter approval transaction completed successfully!"
