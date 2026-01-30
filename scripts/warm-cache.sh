#!/usr/bin/env bash
set -euo pipefail

# BP-ESC Cache Warming Script
# Manually triggers GitHub Actions cache warming workflow

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# ANSI colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_error() { echo -e "${RED}✗ $1${NC}" >&2; }
print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }

usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Trigger cache warming workflow to speed up future releases.

Run this after updating Rust dependencies (Cargo.lock or Cargo.toml changes).
Typically needed once per month or less.

OPTIONS:
    -h, --help          Show this help message

COST:
    ~10 minutes × 10x macOS multiplier = 100 GitHub Actions minutes per run

WORKFLOW:
    .github/workflows/cache-warming.yml
EOF
    exit 0
}

check_branch() {
    local current_branch=$(git branch --show-current)
    
    if [[ "$current_branch" != "main" ]]; then
        print_warning "Current branch is '$current_branch', but cache warming should run on 'main'"
        echo ""
        read -p "Continue anyway? [y/N] " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Cache warming cancelled"
            exit 0
        fi
    fi
}

trigger_workflow() {
    print_info "Triggering cache warming workflow on main branch..."
    
    if gh workflow run cache-warming.yml --ref main 2>&1 | grep -q "403"; then
        print_error "GitHub CLI lacks workflow permission"
        echo ""
        print_info "Fix with: gh auth refresh -h github.com -s workflow"
        echo ""
        print_info "Or trigger manually via web UI:"
        echo "  https://github.com/bytepoets-mba/bp-esc/actions/workflows/cache-warming.yml"
        echo "  Click 'Run workflow' → Select 'main' → Click 'Run workflow'"
        return 1
    fi
    
    if gh workflow run cache-warming.yml --ref main; then
        print_success "Workflow triggered successfully"
        return 0
    else
        print_error "Failed to trigger workflow"
        return 1
    fi
}

monitor_workflow() {
    print_info "Opening GitHub Actions in browser..."
    open "https://github.com/bytepoets-mba/bp-esc/actions/workflows/cache-warming.yml" 2>/dev/null || true
    
    echo ""
    print_info "Waiting for workflow to start..."
    sleep 3
    
    echo ""
    print_info "Monitoring workflow (this will take ~10 minutes)..."
    echo ""
    
    if gh run watch; then
        print_success "Cache warming completed successfully"
        echo ""
        print_info "Next release will restore from this cache"
        return 0
    else
        print_error "Cache warming failed or was cancelled"
        return 1
    fi
}

main() {
    # Parse arguments
    case "${1:-}" in
        -h|--help)
            usage
            ;;
    esac
    
    echo ""
    print_info "🔥 Starting Cache Warming Process"
    echo ""
    
    # Check branch
    check_branch
    echo ""
    
    # Trigger workflow
    if ! trigger_workflow; then
        exit 1
    fi
    echo ""
    
    # Monitor workflow
    monitor_workflow
}

main "$@"
