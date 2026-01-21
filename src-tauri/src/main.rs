// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;

#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;

/// Get the config directory path: ~/.config/bpesc-balance/
fn get_config_dir() -> Result<PathBuf, String> {
    let home = std::env::var("HOME")
        .map_err(|_| "Could not determine home directory".to_string())?;
    
    let config_dir = PathBuf::from(home)
        .join(".config")
        .join("bpesc-balance");
    
    Ok(config_dir)
}

/// Get the .env file path: ~/.config/bpesc-balance/.env
fn get_env_file_path() -> Result<PathBuf, String> {
    let config_dir = get_config_dir()?;
    Ok(config_dir.join(".env"))
}

/// Read API key from ~/.config/bpesc-balance/.env
#[tauri::command]
fn read_api_key() -> Result<Option<String>, String> {
    let env_path = get_env_file_path()?;
    
    // Check if file exists
    if !env_path.exists() {
        return Ok(None);
    }
    
    // Read file contents
    let contents = fs::read_to_string(&env_path)
        .map_err(|e| format!("Failed to read .env file: {}", e))?;
    
    // Parse OPENROUTER_API_KEY=value
    for line in contents.lines() {
        let line = line.trim();
        if line.starts_with("OPENROUTER_API_KEY=") {
            let key = line.strip_prefix("OPENROUTER_API_KEY=")
                .unwrap_or("")
                .trim()
                .to_string();
            
            if !key.is_empty() {
                return Ok(Some(key));
            }
        }
    }
    
    Ok(None)
}

/// Save API key to ~/.config/bpesc-balance/.env
#[tauri::command]
fn save_api_key(key: String) -> Result<(), String> {
    // Validate key is not empty
    if key.trim().is_empty() {
        return Err("API key cannot be empty".to_string());
    }
    
    let config_dir = get_config_dir()?;
    let env_path = get_env_file_path()?;
    
    // Create config directory if it doesn't exist
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
        
        // Set directory permissions to 755 (rwxr-xr-x)
        #[cfg(unix)]
        {
            let perms = fs::Permissions::from_mode(0o755);
            fs::set_permissions(&config_dir, perms)
                .map_err(|e| format!("Failed to set directory permissions: {}", e))?;
        }
    }
    
    // Write .env file
    let content = format!("OPENROUTER_API_KEY={}\n", key.trim());
    fs::write(&env_path, content)
        .map_err(|e| format!("Failed to write .env file: {}", e))?;
    
    // Set file permissions to 600 (rw-------)
    #[cfg(unix)]
    {
        let perms = fs::Permissions::from_mode(0o600);
        fs::set_permissions(&env_path, perms)
            .map_err(|e| format!("Failed to set file permissions: {}", e))?;
    }
    
    Ok(())
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![read_api_key, save_api_key])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
