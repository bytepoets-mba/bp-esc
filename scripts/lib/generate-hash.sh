#!/bin/bash

# Shared function to generate unique 7-character hex hash
# Checks for collisions in +pm/ directory
#
# USAGE (source this file):
#   source scripts/lib/generate-hash.sh
#   hash=$(generate_unique_hash)

generate_unique_hash() {
  local dir="+pm"
  
  # Create +pm if it doesn't exist (for first-time use)
  mkdir -p "$dir"
  
  while true; do
    # Generate a 7-character hex hash using $RANDOM
    local full_hash=$(printf "%04x%04x" $RANDOM $RANDOM)
    local hash=${full_hash:0:7}
    
    # Check for collision by seeing if any file uses this hash
    if ! ls "$dir"/*."${hash}".*.md > /dev/null 2>&1; then
      echo "$hash"
      return 0
    fi
  done
}

# Allow direct execution for testing
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  generate_unique_hash
fi
