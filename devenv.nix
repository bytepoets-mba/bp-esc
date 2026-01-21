{ pkgs, ... }:

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
  ];
  
  # Environment variables
  env = {
    PKG_CONFIG_PATH = "${pkgs.openssl.dev}/lib/pkgconfig";
  };
  
  # Auto-run on entering directory
  enterShell = ''
    echo "🦀 BP Employee Self-Care - Tauri dev environment"
    echo "Rust: $(rustc --version)"
    echo "Cargo: $(cargo --version)"
    echo "Node: $(node --version)"
    echo ""
    echo "Ready to develop! Run 'cargo tauri dev' to start."
  '';
}
