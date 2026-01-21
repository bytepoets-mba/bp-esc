#!/bin/bash
# Relink Nix library paths to system libraries for portable macOS builds

set -e

APP_NAME="BYTEPOETS - ESC"
BINARY="src-tauri/target/release/bundle/macos/${APP_NAME}.app/Contents/MacOS/${APP_NAME}"

if [ ! -f "$BINARY" ]; then
  echo "Binary not found, skipping dylib fix"
  exit 0
fi

# Check if there are any Nix dependencies
if ! otool -L "$BINARY" | grep -q '/nix/'; then
  echo "No Nix dependencies found - binary is already portable"
  exit 0
fi

echo "Relinking Nix libraries to system equivalents..."

otool -L "$BINARY" | grep '/nix/' | awk '{print $1}' | while read nix_lib; do
  lib_name=$(basename "$nix_lib")
  case "$lib_name" in
    libiconv*) system_lib="/usr/lib/libiconv.2.dylib" ;;
    libz*)     system_lib="/usr/lib/libz.1.dylib" ;;
    libc++*)   system_lib="/usr/lib/libc++.1.dylib" ;;
    *)         echo "  Warning: Unknown lib $lib_name - skipping"; continue ;;
  esac
  echo "  $lib_name -> $system_lib"
  install_name_tool -change "$nix_lib" "$system_lib" "$BINARY"
done

# Verify
if otool -L "$BINARY" | grep -q '/nix/'; then
  echo "ERROR: Nix dependencies remain:"
  otool -L "$BINARY" | grep '/nix/'
  exit 1
fi

echo "Done - binary is now portable"
