#!/bin/bash
# Relink Nix library paths to system libraries for portable macOS builds

set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TARGET_DIR="${ROOT_DIR}/src-tauri/target"
BINARIES_FOUND=0

if [ ! -d "$TARGET_DIR" ]; then
  echo "Target directory not found: $TARGET_DIR"
  exit 1
fi

find "$TARGET_DIR" -path "*/bundle/macos/*.app/Contents/MacOS/*" -type f -perm -111 -print0 \
  | while IFS= read -r -d '' binary; do
    BINARIES_FOUND=1

    # Check if there are any Nix dependencies
    if ! otool -L "$binary" | grep -q '/nix/'; then
      echo "No Nix dependencies found for: $binary"
      continue
    fi

    echo "Relinking Nix libraries to system equivalents for:"
    echo "  $binary"

    otool -L "$binary" | grep '/nix/' | awk '{print $1}' | while read -r nix_lib; do
      lib_name=$(basename "$nix_lib")
      case "$lib_name" in
        libiconv*) system_lib="/usr/lib/libiconv.2.dylib" ;;
        libz*)     system_lib="/usr/lib/libz.1.dylib" ;;
        libc++*)   system_lib="/usr/lib/libc++.1.dylib" ;;
        *)         echo "  Warning: Unknown lib $lib_name - skipping"; continue ;;
      esac
      echo "  $lib_name -> $system_lib"
      install_name_tool -change "$nix_lib" "$system_lib" "$binary"
    done

    # Verify
    if otool -L "$binary" | grep -q '/nix/'; then
      echo "ERROR: Nix dependencies remain for: $binary"
      otool -L "$binary" | grep '/nix/'
      exit 1
    fi

    echo "Done - binary is now portable"
  done

if [ "$BINARIES_FOUND" -eq 0 ]; then
  echo "No app binaries found under $TARGET_DIR"
  exit 1
fi
