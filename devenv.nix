{ pkgs, lib, ... }:

{
  packages = with pkgs; [
    # Rust toolchain
    rustc
    cargo
    
    # Node.js for frontend
    nodejs
    
    # Tauri dependencies (macOS)
    pkg-config
    openssl
  ] ++ lib.optionals stdenv.isDarwin [
    # macOS SDK frameworks (needed for Tauri)
    darwin.apple_sdk.frameworks.AppKit
    darwin.apple_sdk.frameworks.WebKit
    darwin.apple_sdk.frameworks.Security
    darwin.apple_sdk.frameworks.CoreServices
  ];
  
  # Environment variables for portable builds
  env = {
    PKG_CONFIG_PATH = "${pkgs.openssl.dev}/lib/pkgconfig";
  };
  
  # Build release and relink to system libraries for portability
  scripts.build-release.exec = ''
    set -e
    echo "Building portable release..."
    
    npm run build:frontend
    cargo tauri build
    
    # Relink Nix libraries to system equivalents for portability
    APP="src-tauri/target/release/bundle/macos/BYTEPOETS - ESC.app/Contents/MacOS/BYTEPOETS - ESC"
    echo "Relinking to system libraries..."
    
    otool -L "$APP" | grep '/nix/' | awk '{print $1}' | while read nix_lib; do
      lib_name=$(basename "$nix_lib")
      case "$lib_name" in
        libiconv*) system_lib="/usr/lib/libiconv.2.dylib" ;;
        libz*)     system_lib="/usr/lib/libz.1.dylib" ;;
        libc++*)   system_lib="/usr/lib/libc++.1.dylib" ;;
        *)         echo "Warning: Unknown lib $lib_name"; continue ;;
      esac
      echo "  $lib_name -> $system_lib"
      install_name_tool -change "$nix_lib" "$system_lib" "$APP"
    done
    
    # Verify
    if otool -L "$APP" | grep -q '/nix/'; then
      echo "ERROR: Nix dependencies remain:"
      otool -L "$APP" | grep '/nix/'
      exit 1
    fi
    
    echo ""
    echo "✅ Build complete - portable app ready!"
    echo "App: src-tauri/target/release/bundle/macos/BYTEPOETS - ESC.app"
  '';
  
  # Auto-run on entering directory
  enterShell = ''
    echo "🦀 BYTEPOETS - ESC Tauri dev environment"
    echo "Rust: $(rustc --version)"
    echo "Cargo: $(cargo --version)"
    echo "Node: $(node --version)"
    echo ""
    echo "Commands:"
    echo "  cargo tauri dev     - Start development"
    echo "  build-release       - Build portable release"
  '';
}
