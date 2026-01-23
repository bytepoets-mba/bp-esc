{ pkgs, lib, ... }:

{
  packages = with pkgs; [
    rustc
    cargo
    pkg-config
    openssl
    libiconv
  ];

  languages.javascript = {
    enable = true;
    npm = {
      enable = true;
      install.enable = true;  # Runs npm install automatically
    };
  };

  env = {
    PKG_CONFIG_PATH = "${pkgs.openssl.dev}/lib/pkgconfig";
  };

  enterShell = ''
    echo "🦀 BYTEPOETS - ESC Tauri 2.x dev environment"
    echo "Tauri CLI available via: npm run dev | npm run build"
  '';
}
