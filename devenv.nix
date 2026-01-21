{ pkgs, ... }:

{
  packages = with pkgs; [
    # Rust toolchain
    rustc
    cargo
    
    # Node.js for frontend
    nodejs
    
    # Tauri dependencies
    pkg-config
    openssl
  ];
  
  # Environment variables
  env = {
    PKG_CONFIG_PATH = "${pkgs.openssl.dev}/lib/pkgconfig";
  };
  
  
  # Auto-run on entering directory
  enterShell = ''
    echo "🦀 BYTEPOETS - ESC Tauri dev environment"
    echo "Rust: $(rustc --version)"
    echo "Cargo: $(cargo --version)"
    echo "Node: $(node --version)"
    echo ""
    echo "Commands:"
    echo "  cargo tauri dev  - Start development"
    echo "  npm run build    - Build portable release"
  '';
}
