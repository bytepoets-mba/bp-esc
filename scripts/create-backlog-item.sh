#!/bin/bash

# Simple script to create a unique backlog file in the +pm folder.
# 
# USAGE: ./scripts/create-backlog-item.sh [priority] [short-description]
# RUN FROM: Repository root (must have +pm/ directory)
#
# EXAMPLE: ./scripts/create-backlog-item.sh 0100 document-pm-backlog-structure
# 
# ARGUMENTS:
#   priority: Numeric priority (default: 5000 if not provided)
#   short-description: Slug (a-z, 0-9, hyphens) (default: timestamp YYYY-MM-DD-HH-MM-SS)
#
# OUTPUT: +pm/{priority}.{hash}.{description}.md

# Get script directory for sourcing lib
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check we're in repo root with +pm/ directory
if [[ ! -d "+pm" ]]; then
  echo "Error: +pm/ directory not found. Run this script from the repository root."
  exit 1
fi

# Source hash generation library
source "$SCRIPT_DIR/lib/generate-hash.sh"

DIR="+pm/backlog"

# Default priority to P50 if not provided or invalid
if [[ -z "$1" ]] || ! [[ "$1" =~ ^[A-Z][0-9]{2}$ ]]; then
  priority="P50"
else
  priority="$1"
fi

# Generate default name with reverse timestamp if not provided or invalid
if [[ -z "$2" ]] || ! [[ "$2" =~ ^[a-z0-9-]+$ ]]; then
  # Generate reverse timestamp: year-month-day-hour-minute-second
  desc=$(date +"%Y-%m-%d-%H-%M-%S")
else
  desc="$2"
fi

# Generate unique hash (collision-checked)
hash=$(generate_unique_hash)

filename="$DIR/${priority}.${hash}.${desc}.md"

# Create the file with a basic Markdown template
cat > "$filename" <<EOF
# Title: ${desc}

## Description
[Detailed description of the backlog item goes here.]

## Priority
${priority}

## Additional Requirements
[Add any other details, such as dependencies, estimates, or acceptance criteria.]
EOF

echo "Created file: $filename"