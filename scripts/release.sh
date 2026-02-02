#!/usr/bin/env bash
set -euo pipefail

# BP-ESC Release Script
# Automates version checking, tagging, and release pipeline triggering

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

Release script for BP-ESC. Checks version sync, creates tags, and triggers CI/CD.

OPTIONS:
    --check             Check version sync across files (no release)
    --sync <version>    Update all version files to <version> (source of truth override)
    -h, --help          Show this help message

EXAMPLES:
    $0                  # Run full release process (checks sync first)
    $0 --check          # Only check if versions are in sync
    $0 --sync 0.3.7     # Force all files to version 0.3.7

VERSION FILES:
    - src-tauri/tauri.conf.json
    - src-tauri/Cargo.toml
    - package.json
EOF
    exit 0
}

get_version_from_tauri_conf() {
    node -e "console.log(require('./src-tauri/tauri.conf.json').version)"
}

get_version_from_cargo_toml() {
    grep '^version = ' src-tauri/Cargo.toml | head -1 | sed 's/version = "\(.*\)"/\1/'
}

get_version_from_package_json() {
    node -e "console.log(require('./package.json').version)"
}

check_version_sync() {
    local quiet="${1:-false}"
    local tauri_version=$(get_version_from_tauri_conf)
    local cargo_version=$(get_version_from_cargo_toml)
    local package_version=$(get_version_from_package_json)

    if [[ "$quiet" != "true" ]]; then
        print_info "Checking version sync..."
        echo "  tauri.conf.json: $tauri_version"
        echo "  Cargo.toml:      $cargo_version"
        echo "  package.json:    $package_version"
    fi

    if [[ "$tauri_version" == "$cargo_version" ]] && [[ "$tauri_version" == "$package_version" ]]; then
        if [[ "$quiet" != "true" ]]; then
            print_success "Versions are in sync: $tauri_version"
        fi
        echo "$tauri_version"
        return 0
    else
        print_error "Version mismatch detected!"
        echo ""
        print_info "To fix, run: $0 --sync <version>"
        return 1
    fi
}

sync_versions() {
    local target_version="$1"
    
    print_info "Syncing all version files to: $target_version"
    
    # Update tauri.conf.json
    local temp_file=$(mktemp)
    node -e "
        const fs = require('fs');
        const config = require('./src-tauri/tauri.conf.json');
        config.version = '$target_version';
        fs.writeFileSync('$temp_file', JSON.stringify(config, null, 2) + '\n');
    "
    mv "$temp_file" src-tauri/tauri.conf.json
    print_success "Updated tauri.conf.json"
    
    # Update Cargo.toml
    sed -i.bak "s/^version = \".*\"/version = \"$target_version\"/" src-tauri/Cargo.toml
    rm src-tauri/Cargo.toml.bak
    print_success "Updated Cargo.toml"
    
    # Update package.json
    temp_file=$(mktemp)
    node -e "
        const fs = require('fs');
        const pkg = require('./package.json');
        pkg.version = '$target_version';
        fs.writeFileSync('$temp_file', JSON.stringify(pkg, null, 2) + '\n');
    "
    mv "$temp_file" package.json
    print_success "Updated package.json"
    
    print_success "All versions synced to $target_version"
}

check_git_status() {
    print_info "Checking git status..."
    
    if ! git diff-index --quiet HEAD --; then
        print_error "Working directory has uncommitted changes"
        echo ""
        git status --short
        echo ""
        print_info "Commit or stash changes before releasing"
        return 1
    fi
    
    print_success "Working directory is clean"
    return 0
}

check_tag_exists() {
    local version="$1"
    local tag="v$version"
    
    print_info "Checking if tag $tag already exists..."
    git fetch --tags --quiet
    
    if git tag -l "$tag" | grep -q "^${tag}$"; then
        print_error "Tag $tag already exists"
        return 1
    fi
    
    print_success "Tag $tag is available"
    return 0
}

create_and_push_tag() {
    local version="$1"
    local tag="v$version"
    
    print_info "Creating tag $tag..."
    git tag "$tag"
    print_success "Tag $tag created"
    
    print_info "Pushing tag to origin..."
    git push origin "$tag"
    print_success "Tag pushed to origin"
}

monitor_ci() {
    print_info "Opening GitHub Actions in Zen browser..."
    open -a "Zen" "https://github.com/bytepoets-mba/bp-esc/actions" 2>/dev/null || true
    
    echo ""
    print_info "Monitoring CI run (this will take ~10 minutes)..."
    print_info "A Draft Release will be created upon completion"
    echo ""
    
    local version="$1"
    local tag="v$version"
    local run_id=""
    local attempts=30
    local delay=10

    print_info "Waiting for CI run to start for $tag..."
    for ((i=1; i<=attempts; i++)); do
        run_id=$(gh run list --limit 20 --json databaseId,headBranch,displayTitle --jq "map(select(.headBranch == \"$tag\" or (.displayTitle | contains(\"$tag\")))) | .[0].databaseId // empty")
        if [[ -n "$run_id" ]]; then
            break
        fi
        sleep "$delay"
    done

    if [[ -z "$run_id" ]]; then
        print_error "No CI run found for $tag"
        print_info "Check GitHub Actions for workflow triggers"
        return 1
    fi

    if gh run watch "$run_id"; then
        print_success "CI run completed successfully"
        
        print_info "Opening releases page in Zen browser..."
        open -a "Zen" "https://github.com/bytepoets-mba/bp-esc/releases" 2>/dev/null || true
        
        echo ""
        print_success "Release workflow complete!"
        print_info "Next steps:"
        echo "  1. Review the draft release on GitHub"
        echo "  2. Edit release notes if needed"
        echo "  3. Publish the release"
    else
        print_error "CI run failed or was cancelled"
        return 1
    fi
}

main() {
    # Parse arguments
    case "${1:-}" in
        --check)
            check_version_sync
            exit $?
            ;;
        --sync)
            if [[ -z "${2:-}" ]]; then
                print_error "Version argument required for --sync"
                echo "Usage: $0 --sync <version>"
                exit 1
            fi
            sync_versions "$2"
            exit 0
            ;;
        -h|--help)
            usage
            ;;
        "")
            # Continue with full release process
            ;;
        *)
            print_error "Unknown option: $1"
            usage
            ;;
    esac
    
    echo ""
    print_info "🚀 Starting BP-ESC Release Process"
    echo ""
    
    # Step 1: Check git status
    if ! check_git_status; then
        exit 1
    fi
    echo ""
    
    # Step 2: Check version sync
    print_info "Checking version sync..."
    version=$(check_version_sync true) || exit 1
    print_success "Versions are in sync: $version"
    echo ""
    
    # Step 3: Check tag doesn't exist
    if ! check_tag_exists "$version"; then
        exit 1
    fi
    echo ""
    
    # Step 4: Confirm with user
    echo ""
    print_warning "About to release version: $version"
    read -p "Continue? [y/N] " -n 1 -r
    echo ""
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Release cancelled"
        exit 0
    fi
    
    # Step 5: Create and push tag
    create_and_push_tag "$version"
    echo ""
    
    # Step 6: Monitor CI
    monitor_ci "$version"
}

main "$@"
