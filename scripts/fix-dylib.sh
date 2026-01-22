#!/bin/bash
# Relink Nix library paths to system libraries for portable macOS builds

set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TARGET_DIR="${ROOT_DIR}/src-tauri/target"
BINARIES_FOUND=0
DMGS_FOUND=0

if [ ! -d "$TARGET_DIR" ]; then
  echo "Target directory not found: $TARGET_DIR"
  exit 1
fi

relink_binary() {
  local binary="$1"

# Check if there are any Nix dependencies
  if ! otool -L "$binary" | grep -q '/nix/'; then
    echo "No Nix dependencies found for: $binary"
    return 0
fi

  echo "Relinking Nix libraries to system equivalents for:"
  echo "  $binary"

  otool -L "$binary" | grep '/nix/' | awk '{print $1}' | while read -r nix_lib; do
    local lib_name
    local system_lib
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
}

process_app_binaries() {
  while IFS= read -r -d '' binary; do
    BINARIES_FOUND=1
    relink_binary "$binary"
  done < <(find "$TARGET_DIR" -path "*/bundle/macos/*.app/Contents/MacOS/*" -type f -perm -111 -print0)
}

process_dmg() {
  local dmg="$1"
  local dmg_dir
  local dmg_base
  local tmp_base
  local tmp_dmg
  local out_base
  local out_dmg
  local mount_point

  dmg_dir=$(dirname "$dmg")
  dmg_base=$(basename "$dmg" .dmg)
  tmp_base="${dmg_dir}/${dmg_base}-rw"
  out_base="${dmg_dir}/${dmg_base}-fixed"

  echo "Processing DMG: $dmg"
  hdiutil convert "$dmg" -format UDRW -o "$tmp_base"
  tmp_dmg="${tmp_base}.dmg"

  mount_point=$(hdiutil attach "$tmp_dmg" -nobrowse -readwrite -noverify -noautoopen \
    | awk -F'\t' '/\/Volumes\// {print $NF; exit}')

  if [ -z "$mount_point" ]; then
    echo "ERROR: Failed to mount $tmp_dmg"
    exit 1
  fi

  find "$mount_point" -path "*.app/Contents/MacOS/*" -type f -perm -111 -print0 \
    | while IFS= read -r -d '' binary; do
      relink_binary "$binary"
    done

  hdiutil detach "$mount_point" -force

  hdiutil convert "$tmp_dmg" -format UDZO -o "$out_base"
  out_dmg="${out_base}.dmg"
  mv -f "$out_dmg" "$dmg"

  if command -v trash >/dev/null 2>&1; then
    trash "$tmp_dmg"
  else
    echo "Note: 'trash' not found; leaving temp dmg: $tmp_dmg"
  fi
}

process_app_binaries

while IFS= read -r -d '' dmg; do
  DMGS_FOUND=1
  process_dmg "$dmg"
done < <(find "$TARGET_DIR" -path "*/bundle/dmg/*.dmg" -type f -print0)

if [ "$BINARIES_FOUND" -eq 0 ] && [ "$DMGS_FOUND" -eq 0 ]; then
  echo "No app bundles or dmgs found under $TARGET_DIR"
  exit 1
fi
