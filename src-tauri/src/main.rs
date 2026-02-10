// BYTEPOETS - Employee Self-Care App
// macOS only application
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
// Suppress warnings from objc crate macros (msg_send!, class!)
#![allow(unexpected_cfgs)]

use std::fs;
use std::path::PathBuf;
use std::time::Duration;
use std::os::unix::fs::PermissionsExt; // macOS is Unix
use std::sync::{Arc, Mutex};

use serde::{Deserialize, Serialize};
use serde_json::Value;
use chrono::{Datelike, Local, TimeZone, Timelike};
use tauri::{
    AppHandle, Manager, WindowEvent, ActivationPolicy, PhysicalPosition, Emitter, State,
    menu::{Menu, MenuItemBuilder},
    tray::{TrayIconBuilder, TrayIconEvent, MouseButton, MouseButtonState},
    image::Image
};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState, Shortcut};
use image::Rgba;
use tauri_plugin_autostart::MacosLauncher;
use ab_glyph::{FontVec, PxScale};

#[cfg(target_os = "macos")]
use cocoa::base::id;
#[cfg(target_os = "macos")]
use cocoa::foundation::NSString;
#[cfg(target_os = "macos")]
use objc::{class, msg_send, sel, sel_impl};
#[cfg(target_os = "macos")]
use std::ffi::CStr;
#[cfg(target_os = "macos")]
use objc::declare::ClassDecl;
#[cfg(target_os = "macos")]
use objc::runtime::{Class, Object, Sel};
#[cfg(target_os = "macos")]
use std::ffi::c_void;
use imageproc::drawing::draw_text_mut;
use tauri_plugin_clipboard_manager::ClipboardExt;
use tokio::time::{interval, Interval};
use tokio::sync::Mutex as TokioMutex;

// ============================================================================
// AUTO-REFRESH STATE
// ============================================================================

pub struct AutoRefreshState {
    interval: Arc<TokioMutex<Option<Interval>>>,
    is_running: Arc<Mutex<bool>>,
}

impl AutoRefreshState {
    fn new() -> Self {
        Self {
            interval: Arc::new(TokioMutex::new(None)),
            is_running: Arc::new(Mutex::new(false)),
        }
    }
}

/// Start the auto-refresh timer in the background
async fn start_auto_refresh_timer(app: AppHandle, state: State<'_, AutoRefreshState>) -> Result<(), String> {
    let settings = read_settings()?;
    
    if !settings.auto_refresh_enabled {
        return Ok(());
    }
    
    let interval_minutes = settings.refresh_interval_minutes.max(1);
    let interval_duration = Duration::from_secs((interval_minutes * 60) as u64);
    
    // Stop existing timer if any
    stop_auto_refresh_timer(&state)?;
    
    // Create new interval
    let mut interval_guard = state.interval.lock().await;
    let new_interval: Interval = interval(interval_duration);
    *interval_guard = Some(new_interval);
    drop(interval_guard);
    
    // Mark as running
    *state.is_running.lock().map_err(|e| e.to_string())? = true;
    let is_running = state.is_running.clone();
    let interval_arc = state.interval.clone();
    
    // Spawn the timer task
    tokio::spawn(async move {
        loop {
            // Check if we should stop
            if !*is_running.lock().unwrap() {
                break;
            }
            
            // Get the interval and tick
            let should_tick = {
                let mut guard = interval_arc.lock().await;
                if let Some(ref mut int) = *guard {
                    int.tick().await;
                    true
                } else {
                    false
                }
            };
            
            if !should_tick {
                break;
            }
            
            // Check if still enabled before emitting
            if let Ok(settings) = read_settings() {
                if settings.auto_refresh_enabled {
                    // Emit event to frontend to refresh balance
                    let _ = app.emit("rust-auto-refresh", ());
                }
            }
        }
    });
    
    Ok(())
}

/// Stop the auto-refresh timer
fn stop_auto_refresh_timer(state: &AutoRefreshState) -> Result<(), String> {
    *state.is_running.lock().map_err(|e| e.to_string())? = false;
    Ok(())
}

#[tauri::command]
async fn restart_auto_refresh(app: AppHandle, state: State<'_, AutoRefreshState>) -> Result<(), String> {
    start_auto_refresh_timer(app, state).await
}

// ============================================================================
// SETTINGS CONFIGURATION
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ApiKeyConfig {
    pub key: String,
    pub label: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSettings {
    #[serde(default)]
    pub api_keys: Vec<ApiKeyConfig>,
    #[serde(default)]
    pub active_api_key_index: usize,
    #[serde(default)]
    pub api_key: Option<String>, // Legacy field for migration
    #[serde(default = "default_refresh_interval")]
    pub refresh_interval_minutes: u32,
    #[serde(default = "default_true")]
    pub show_percentage: bool,        // true = %, false = $
    #[serde(default = "default_true")]
    pub show_remaining: bool,         // true = remaining, false = usage (for absolute $)
    #[serde(default = "default_true")]
    pub show_unit: bool,              // true = display % or $, false = hide unit
    #[serde(default = "default_true")]
    pub auto_refresh_enabled: bool,
    #[serde(default = "default_true")]
    pub show_window_on_start: bool,
    #[serde(default = "default_true")]
    pub launch_at_login: bool,
    #[serde(default = "default_shortcut")]
    pub global_shortcut: String,
    #[serde(default = "default_true")]
    pub global_shortcut_enabled: bool,
    #[serde(default = "default_false")]
    pub always_on_top: bool,
    #[serde(default = "default_true")]
    pub unfocused_overlay: bool,
    #[serde(default = "default_zero")]
    pub decimal_places: u32,
    #[serde(default = "default_false")]
    pub debug_logging_enabled: bool,
    #[serde(default = "default_false")]
    pub debugging_enabled: bool,
    #[serde(default = "default_false")]
    pub menubar_monochrome: bool,
    #[serde(default = "default_pace_warn_threshold")]
    pub pace_warn_threshold: f64,
    #[serde(default = "default_pace_over_threshold")]
    pub pace_over_threshold: f64,
}

fn default_refresh_interval() -> u32 { 5 }
fn default_true() -> bool { true }
fn default_false() -> bool { false }
fn default_zero() -> u32 { 0 }
fn default_shortcut() -> String { "F19".to_string() }
fn default_pace_warn_threshold() -> f64 { 15.0 }
fn default_pace_over_threshold() -> f64 { 25.0 }

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            api_keys: Vec::new(),
            active_api_key_index: 0,
            api_key: None,
            refresh_interval_minutes: 5,
            show_percentage: true,
            show_remaining: true,
            show_unit: true,
            auto_refresh_enabled: true,
            show_window_on_start: true,
            launch_at_login: true,
            global_shortcut: "F19".to_string(),
            global_shortcut_enabled: true,
            always_on_top: false,
            unfocused_overlay: true,
            decimal_places: 0,
            debug_logging_enabled: false,
            debugging_enabled: false,
            menubar_monochrome: false,
            pace_warn_threshold: 15.0,
            pace_over_threshold: 25.0,
        }
    }
}

/// Get the settings file path: ~/.config/bpesc-balance/settings.json
fn get_settings_file_path() -> Result<PathBuf, String> {
    let config_dir = get_config_dir()?;
    Ok(config_dir.join("settings.json"))
}

/// Internal function to save settings without an AppHandle
fn save_settings_internal(settings: &AppSettings) -> Result<(), String> {
    let config_dir = get_config_dir()?;
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }
    
    let path = get_settings_file_path()?;
    let contents = serde_json::to_string_pretty(settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    
    fs::write(&path, contents)
        .map_err(|e| format!("Failed to write settings: {}", e))?;
    
    let perms = fs::Permissions::from_mode(0o600);
    fs::set_permissions(&path, perms)
        .map_err(|e| format!("Failed to set settings permissions: {}", e))?;
    
    Ok(())
}

#[tauri::command]
fn read_settings() -> Result<AppSettings, String> {
    let path = get_settings_file_path()?;
    let mut settings = if !path.exists() {
        // Migration: try to read old .env file if it exists
        let mut s = AppSettings::default();
        if let Ok(Some(key)) = read_api_key() {
            s.api_key = Some(key.clone());
            s.api_keys.push(ApiKeyConfig { key, label: "OpenRouter".to_string() });
            let _ = save_settings_internal(&s); // Save migrated settings
        }
        s
    } else {
        let contents = fs::read_to_string(&path)
            .map_err(|e| format!("Failed to read settings: {}", e))?;
        serde_json::from_str(&contents)
            .map_err(|e| format!("Failed to parse settings: {}", e))?
    };

    // Migration for 0.3.0: If we have the legacy api_key but no api_keys list
    if settings.api_keys.is_empty() {
        if let Some(key) = settings.api_key.clone() {
            settings.api_keys.push(ApiKeyConfig { key, label: "OpenRouter".to_string() });
            let _ = save_settings_internal(&settings);
        }
    }
    
    Ok(settings)
}

#[tauri::command]
fn read_opencode_openrouter_key() -> Result<String, String> {
    let home = dirs::home_dir()
        .ok_or_else(|| "Could not determine home directory".to_string())?;
    let auth_path = home
        .join(".local")
        .join("share")
        .join("opencode")
        .join("auth.json");

    let contents = fs::read_to_string(&auth_path)
        .map_err(|e| format!("Failed to read OpenCode auth file: {}", e))?;
    let value: Value = serde_json::from_str(&contents)
        .map_err(|e| format!("Failed to parse OpenCode auth file: {}", e))?;

    extract_openrouter_key_from_value(&value)
        .ok_or_else(|| "OpenRouter key not found in OpenCode auth file.".to_string())
}

#[tauri::command]
fn copy_to_clipboard(app: AppHandle, text: String) -> Result<(), String> {
    app.clipboard()
        .write_text(text)
        .map_err(|e| format!("Failed to copy to clipboard: {}", e))?;
    Ok(())
}

#[tauri::command]
async fn save_settings(app: AppHandle, settings: AppSettings) -> Result<(), String> {
    save_settings_internal(&settings)?;
    
    // Update global shortcut
    let _ = update_app_shortcut(&app, &settings.global_shortcut, settings.global_shortcut_enabled);
    
    // Update Always on Top
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_always_on_top(settings.always_on_top);
    }
    
    // Update Autostart
    let autostart_manager = app.autolaunch();
    if settings.launch_at_login {
        let _ = autostart_manager.enable();
    } else {
        let _ = autostart_manager.disable();
    }
    
    Ok(())
}
// MENUBAR ICON CONFIGURATION
// ============================================================================
// Adjust these constants to fine-tune the percentage text appearance in the menubar icon

/// Logical size of the logo in points (square)
const MENUBAR_LOGO_SIZE: u32 = 18;

/// Scaling factor for Retina displays (2.0 for @2x)
const MENUBAR_RENDER_SCALE: f32 = 2.0;

// --- VALUE CONFIGURATION (the number, e.g., "42") ---

/// Font for the value
const MENUBAR_VALUE_FONT: &str = "SF-Pro-Rounded-Semibold";

/// Font size for the value in points
const MENUBAR_VALUE_SIZE: f32 = 18.0;

// --- HEXAGON CONFIGURATION ---

/// Size of the hexagon in logical points (width)
const HEX_SIZE_PTS: f32 = 18.0;

/// Border thickness of the hexagon in logical points
const HEX_BORDER_PTS: f32 = 1.5;

// --- VALUE CONFIGURATION (the number, e.g., "42") ---

/// Font for the unit symbol
const MENUBAR_UNIT_FONT: &str = "SF-Pro-Rounded-Heavy";

/// Font size for the unit in points
const MENUBAR_UNIT_SIZE: f32 = MENUBAR_VALUE_SIZE;

// --- SPACING (logical points) ---
const LOGO_TEXT_GAP: f32 = 6.0;
const UNIT_VALUE_GAP: f32 = 1.0;
const END_PADDING: f32 = 4.0;

// ============================================================================
// macOS Appearance Observation (KVO for effectiveAppearance changes)
// ============================================================================

/// Register KVO observer class for effectiveAppearance changes
#[cfg(target_os = "macos")]
unsafe fn register_appearance_observer_class() -> &'static Class {
    let superclass = class!(NSObject);
    let mut decl = ClassDecl::new("MenubarAppearanceObserver", superclass)
        .expect("Failed to declare MenubarAppearanceObserver class");
    
    // Store AppHandle pointer as ivar
    decl.add_ivar::<*mut c_void>("app_handle_ptr");
    
    // KVO callback: observeValueForKeyPath:ofObject:change:context:
    extern "C" fn observe_value(
        this: &Object,
        _sel: Sel,
        _key_path: id,      // NSString - "effectiveAppearance"
        _object: id,        // The NSView being observed
        _change: id,        // NSDictionary of changes
        _context: *mut c_void,
    ) {
        unsafe {
            let ptr: *mut c_void = *this.get_ivar("app_handle_ptr");
            if ptr.is_null() {
                eprintln!("[KVO] AppHandle pointer is null, cannot trigger re-render");
                return;
            }
            
            // Reconstruct Arc reference (don't drop it)
            let app_handle = &*(ptr as *const AppHandle);
            
            // Re-render menubar icon with new appearance
            if let Some(state) = app_handle.try_state::<MenubarState>() {
                let balance = state.balance.lock().ok().and_then(|stored| stored.clone());
                let settings = state.settings.lock().ok().and_then(|stored| stored.clone());
                
                if let (Some(balance), Some(settings)) = (balance, settings) {
                    if let Err(e) = update_menubar_display(app_handle.clone(), balance, settings) {
                        eprintln!("[KVO] Failed to update menubar on appearance change: {}", e);
                    }
                } else {
                    eprintln!("[KVO] No cached balance/settings available for re-render");
                }
            } else {
                eprintln!("[KVO] MenubarState not found in AppHandle");
            }
        }
    }
    
    unsafe {
        decl.add_method(
            sel!(observeValueForKeyPath:ofObject:change:context:),
            observe_value as extern "C" fn(&Object, Sel, id, id, id, *mut c_void),
        );
    }
    
    decl.register()
}

/// Set up KVO observation for effectiveAppearance changes on a persistent sentinel status item
#[cfg(target_os = "macos")]
unsafe fn setup_appearance_observer(app_handle: AppHandle) {
    // Register observer class
    let observer_class = register_appearance_observer_class();
    let observer: id = msg_send![observer_class, new];
    
    // Store AppHandle pointer in observer (leak Arc to keep it alive)
    let handle_arc = Arc::new(app_handle);
    let handle_ptr = Arc::into_raw(handle_arc) as *mut c_void;
    (*observer).set_ivar("app_handle_ptr", handle_ptr);
    
    // Create a persistent zero-width sentinel status item for KVO observation
    let status_bar: id = msg_send![class!(NSStatusBar), systemStatusBar];
    let sentinel_item: id = msg_send![status_bar, statusItemWithLength: 0.0f64];
    
    if sentinel_item.is_null() {
        eprintln!("[KVO Setup] Warning: failed to create sentinel status item");
        return;
    }
    
    // Retain it permanently (leak for app lifetime)
    let _: id = msg_send![sentinel_item, retain];
    
    let button: id = msg_send![sentinel_item, button];
    
    if button.is_null() {
        eprintln!("[KVO Setup] Warning: sentinel status item has no button, KVO observation failed");
        return;
    }
    
    // Add KVO observer for "effectiveAppearance" key path
    let key_path = NSString::alloc(cocoa::base::nil).init_str("effectiveAppearance");
    let options: usize = 0x01; // NSKeyValueObservingOptionNew
    let context: *mut c_void = std::ptr::null_mut();
    
    let _: () = msg_send![
        button,
        addObserver: observer
        forKeyPath: key_path
        options: options
        context: context
    ];
    
    // Leak observer to keep it alive for app lifetime
    let _: id = msg_send![observer, retain];
    
    println!("[KVO Setup] Appearance observer registered successfully");
}

/// Detect if macOS menubar is using dark appearance
/// This checks the actual menubar tint which adapts to wallpaper, not just dark mode setting
#[cfg(target_os = "macos")]
fn is_macos_dark_mode() -> bool {
    unsafe {
        // Create a temp status item to check appearance (KVO will handle live updates)
        let status_bar: id = msg_send![class!(NSStatusBar), systemStatusBar];
        let temp_item: id = msg_send![status_bar, statusItemWithLength: -1.0];
        
        if temp_item.is_null() {
            return false;
        }
        
        let button: id = msg_send![temp_item, button];
        if button.is_null() {
            let _: () = msg_send![status_bar, removeStatusItem: temp_item];
            return false;
        }
        
        let effective_appearance: id = msg_send![button, effectiveAppearance];
        if effective_appearance.is_null() {
            let _: () = msg_send![status_bar, removeStatusItem: temp_item];
            return false;
        }
        
        let appearance_name: id = msg_send![effective_appearance, name];
        if appearance_name.is_null() {
            let _: () = msg_send![status_bar, removeStatusItem: temp_item];
            return false;
        }
        
        let name_str = NSString::UTF8String(appearance_name);
        if name_str.is_null() {
            let _: () = msg_send![status_bar, removeStatusItem: temp_item];
            return false;
        }
        
        let name = CStr::from_ptr(name_str)
            .to_string_lossy()
            .to_string();
        
        let _: () = msg_send![status_bar, removeStatusItem: temp_item];
        name.contains("Dark")
    }
}

#[cfg(not(target_os = "macos"))]
fn is_macos_dark_mode() -> bool {
    false
}

// ============================================================================

/// Get the config directory path: ~/.config/bpesc-balance/
fn get_config_dir() -> Result<PathBuf, String> {
    let home = dirs::home_dir()
        .ok_or_else(|| "Could not determine home directory".to_string())?;
    
    let config_dir = home
        .join(".config")
        .join("bpesc-balance");
    
    Ok(config_dir)
}

/// Get the .env file path: ~/.config/bpesc-balance/.env
fn get_env_file_path() -> Result<PathBuf, String> {
    let config_dir = get_config_dir()?;
    Ok(config_dir.join(".env"))
}

fn extract_key_from_object(obj: &serde_json::Map<String, Value>) -> Option<String> {
    let key_fields = ["api_key", "apiKey", "key", "token"];
    for field in key_fields {
        if let Some(Value::String(value)) = obj.get(field) {
            let trimmed = value.trim();
            if !trimmed.is_empty() {
                return Some(trimmed.to_string());
            }
        }
    }

    if let Some(Value::Object(creds)) = obj.get("credentials") {
        if let Some(key) = extract_key_from_object(creds) {
            return Some(key);
        }
    }

    None
}

fn is_openrouter_entry(obj: &serde_json::Map<String, Value>) -> bool {
    let keys = ["provider", "name", "id"];
    keys.iter().any(|field| {
        obj.get(*field)
            .and_then(|value| value.as_str())
            .map(|value| value.eq_ignore_ascii_case("openrouter"))
            .unwrap_or(false)
    })
}

fn extract_key_from_provider(value: &Value) -> Option<String> {
    if let Value::Object(obj) = value {
        if let Some(key) = extract_key_from_object(obj) {
            return Some(key);
        }
        if let Some(Value::Object(auth)) = obj.get("auth") {
            if let Some(key) = extract_key_from_object(auth) {
                return Some(key);
            }
        }
    }
    None
}

fn extract_openrouter_key_from_value(value: &Value) -> Option<String> {
    if let Value::Object(obj) = value {
        if let Some(Value::Object(providers)) = obj.get("providers") {
            if let Some(provider) = providers.get("openrouter") {
                if let Some(key) = extract_key_from_provider(provider) {
                    return Some(key);
                }
            }
        }

        if let Some(provider) = obj.get("openrouter") {
            if let Some(key) = extract_key_from_provider(provider) {
                return Some(key);
            }
        }

        if let Some(Value::Array(providers)) = obj.get("providers") {
            for provider in providers {
                if let Value::Object(entry) = provider {
                    if is_openrouter_entry(entry) {
                        if let Some(key) = extract_key_from_object(entry) {
                            return Some(key);
                        }
                        if let Some(key) = extract_key_from_provider(provider) {
                            return Some(key);
                        }
                    }
                }
            }
        }
    }

    if let Value::Array(items) = value {
        for item in items {
            if let Value::Object(obj) = item {
                if is_openrouter_entry(obj) {
                    if let Some(key) = extract_key_from_object(obj) {
                        return Some(key);
                    }
                    if let Some(key) = extract_key_from_provider(item) {
                        return Some(key);
                    }
                }
            }
        }
    }

    None
}

/// Read API key from ~/.config/bpesc-balance/.env
/// Open the error log file in the system default editor
#[tauri::command]
fn open_error_log() -> Result<(), String> {
    let config_dir = get_config_dir()?;
    let log_path = config_dir.join("error.log");
    
    if log_path.exists() {
        open::that(log_path).map_err(|e| e.to_string())?;
    } else {
        return Err("Log file does not exist yet.".to_string());
    }
    Ok(())
}

#[tauri::command]
fn open_app_log() -> Result<(), String> {
    let config_dir = get_config_dir()?;
    let log_path = config_dir.join("app.log");
    
    if log_path.exists() {
        open::that(log_path).map_err(|e| e.to_string())?;
    } else {
        return Err("Log file does not exist yet.".to_string());
    }
    Ok(())
}

#[tauri::command]
fn log_message(_app: AppHandle, message: String) -> Result<(), String> {
    let settings = match read_settings() {
        Ok(s) => s,
        Err(_) => return Ok(()), // Silent fail if settings unreadable
    };

    if !settings.debug_logging_enabled {
        return Ok(());
    }

    let config_dir = get_config_dir()?;
    if !config_dir.exists() {
        let _ = fs::create_dir_all(&config_dir);
    }
    let log_path = config_dir.join("app.log");
    let old_log_path = config_dir.join("app.log.old");
    
    // Check file size for rotation (100KB)
    if let Ok(metadata) = fs::metadata(&log_path) {
        if metadata.len() > 100 * 1024 {
            let _ = fs::rename(&log_path, &old_log_path);
        }
    }

    use std::io::Write;
    let mut file = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path)
        .map_err(|e| e.to_string())?;
    
    writeln!(file, "{}", message).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn read_logs() -> Result<Vec<String>, String> {
    let config_dir = get_config_dir()?;
    let log_path = config_dir.join("app.log");
    let old_log_path = config_dir.join("app.log.old");

    let mut all_lines = Vec::new();

    // Read old log first if it exists
    if old_log_path.exists() {
        if let Ok(content) = fs::read_to_string(&old_log_path) {
            all_lines.extend(content.lines().map(|s| s.to_string()));
        }
    }

    // Read current log
    if log_path.exists() {
        if let Ok(content) = fs::read_to_string(&log_path) {
            all_lines.extend(content.lines().map(|s| s.to_string()));
        }
    }

    // Newest first
    all_lines.reverse();
    Ok(all_lines)
}

#[tauri::command]
fn clear_logs() -> Result<(), String> {
    let config_dir = get_config_dir()?;
    let log_path = config_dir.join("app.log");
    let old_log_path = config_dir.join("app.log.old");
    
    let _ = fs::remove_file(log_path);
    let _ = fs::remove_file(old_log_path);
    Ok(())
}

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
        
        // Skip empty lines and comments
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        
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

/// Validate API key format
fn validate_api_key(key: &str) -> Result<(), String> {
    let key = key.trim();
    
    if key.is_empty() {
        return Err("API key cannot be empty".to_string());
    }
    
    if !key.starts_with("sk-") {
        return Err("API key must start with 'sk-'".to_string());
    }
    
    if key.len() < 20 {
        return Err("API key is too short".to_string());
    }
    
    Ok(())
}

/// Save API key to ~/.config/bpesc-balance/.env
#[tauri::command]
fn save_api_key(key: String) -> Result<(), String> {
    // Validate key format
    validate_api_key(&key)?;
    
    let config_dir = get_config_dir()?;
    let env_path = get_env_file_path()?;
    
    // Create config directory if it doesn't exist
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
        
        // Set directory permissions to 755 (rwxr-xr-x) - macOS
        let perms = fs::Permissions::from_mode(0o755);
        fs::set_permissions(&config_dir, perms)
            .map_err(|e| format!("Failed to set directory permissions: {}", e))?;
    }
    
    // Write .env file
    let content = format!("OPENROUTER_API_KEY={}\n", key.trim());
    fs::write(&env_path, content)
        .map_err(|e| format!("Failed to write .env file: {}", e))?;
    
    // Set file permissions to 600 (rw-------) - macOS
    let perms = fs::Permissions::from_mode(0o600);
    fs::set_permissions(&env_path, perms)
        .map_err(|e| format!("Failed to set file permissions: {}", e))?;
    
    Ok(())
}

/// Balance data returned from OpenRouter API
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BalanceData {
    pub limit: Option<f64>,
    pub usage: Option<f64>,
    pub usage_daily: Option<f64>,
    pub usage_weekly: Option<f64>,
    pub usage_monthly: Option<f64>,
    pub remaining: Option<f64>,
    pub remaining_monthly: Option<f64>,
    pub pace_ratio: Option<f64>,
    pub pace_month_target: Option<f64>,
    pub pace_week_target: Option<f64>,
    pub pace_day_target: Option<f64>,
    pub pace_month_delta_percent: Option<f64>,
    pub pace_week_delta_percent: Option<f64>,
    pub pace_day_delta_percent: Option<f64>,
    pub pace_status: Option<String>,
    pub label: Option<String>,
}

#[derive(Default)]
struct MenubarState {
    balance: Mutex<Option<BalanceData>>,
    settings: Mutex<Option<AppSettings>>,
}

/// Response from OpenRouter API /api/v1/key endpoint
#[derive(Debug, Deserialize)]
struct OpenRouterResponse {
    data: Option<OpenRouterData>,
    error: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OpenRouterData {
    limit: Option<f64>,
    usage: Option<f64>,
    usage_daily: Option<f64>,
    usage_weekly: Option<f64>,
    usage_monthly: Option<f64>,
    limit_remaining: Option<f64>,
    #[serde(default)]
    label: Option<String>,
}

/// Fetch balance from OpenRouter API
#[tauri::command]
async fn fetch_balance(app: AppHandle, api_key: String) -> Result<BalanceData, String> {
    // Validate API key format
    validate_api_key(&api_key)?;
    
    // Create HTTP client with timeout
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|_| "Could not initialize network client. Please restart the app.".to_string())?;
    
    // Make request to OpenRouter API
    let response = client
        .get("https://openrouter.ai/api/v1/key")
        .header("Authorization", format!("Bearer {}", api_key.trim()))
        .header("Content-Type", "application/json")
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                "Request timed out. Check your internet connection.".to_string()
            } else if e.is_connect() {
                "Could not connect to OpenRouter. Check your internet connection.".to_string()
            } else {
                format!("Network error: {}", e)
            }
        })?;
    
    // Check HTTP status
    let status = response.status();
    
    if status == 401 {
        return Err("Invalid API key. Please check your key and try again.".to_string());
    }
    
    if !status.is_success() {
        return Err(format!("API request failed with status: {}", status));
    }
    
    // Parse JSON response
    let raw_body = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response body: {}", e))?;
    
    // Log raw body for debugging
    let _ = log_message(app, format!("[INFO] Raw OpenRouter response: {}", raw_body));

    let api_response: OpenRouterResponse = serde_json::from_str(&raw_body)
        .map_err(|e| {
            eprintln!("JSON parse error: {}", e);
            format!("Failed to parse API response: {}. Body: {}", e, raw_body)
        })?;
    
    // Check for API error
    if let Some(error) = api_response.error {
        eprintln!("OpenRouter API error: {}", error);
        return Err(format!("API error: {}", error));
    }
    
    // Extract data
    let data = api_response.data
        .ok_or_else(|| {
            eprintln!("No data field in API response");
            "API response missing data. Please try again.".to_string()
        })?;
    
    // Calculate remaining balance (legacy) and monthly remaining
    let remaining = match (data.limit, data.usage) {
        (Some(limit), Some(usage)) => Some(limit - usage),
        _ => None,
    };
    let usage_monthly = match (data.limit, data.limit_remaining) {
        (Some(limit), Some(limit_remaining)) => Some(limit - limit_remaining),
        _ => data.usage_monthly,
    };
    let remaining_monthly = match (data.limit, usage_monthly) {
        (Some(limit), Some(usage_monthly)) => Some(limit - usage_monthly),
        _ => data.limit_remaining,
    };

    // Pace ratio: how far through the month we are (0..1), using local time + fractional day
    let now = Local::now();
    let day_fraction = (now.hour() as f64 + (now.minute() as f64 / 60.0) + (now.second() as f64 / 3600.0)) / 24.0;
    let day_of_month = now.day() as f64;
    let days_in_month = {
        let year = now.year();
        let month = now.month();
        let first_next_month = if month == 12 {
            Local.with_ymd_and_hms(year + 1, 1, 1, 0, 0, 0).unwrap()
        } else {
            Local.with_ymd_and_hms(year, month + 1, 1, 0, 0, 0).unwrap()
        };
        let last_this_month = first_next_month - chrono::Duration::days(1);
        last_this_month.day() as f64
    };
    let elapsed_days = (day_of_month - 1.0) + day_fraction;
    let pace_ratio = if days_in_month > 0.0 {
        Some((elapsed_days / days_in_month).clamp(0.0, 1.0))
    } else {
        None
    };

    let (pace_month_target, pace_week_target, pace_day_target, pace_month_delta_percent, pace_week_delta_percent, pace_day_delta_percent) =
        if let (Some(limit), Some(usage_monthly)) = (data.limit, usage_monthly) {
            if limit > 0.0 && days_in_month > 0.0 {
                let daily_budget = limit / days_in_month;
                let pace_month_target = (daily_budget * elapsed_days).clamp(0.0, limit);

                let weekday_index = now.weekday().num_days_from_monday() as f64;
                let elapsed_week_days = (weekday_index + day_fraction).clamp(0.0, 7.0);
                let pace_week_target = (daily_budget * elapsed_week_days).clamp(0.0, limit);
                let pace_day_target = (daily_budget * day_fraction).clamp(0.0, limit);

                let percent_from_target = |usage: f64, target: f64| {
                    if target > 0.0 {
                        Some(((usage - target) / target) * 100.0)
                    } else {
                        None
                    }
                };

                let pace_month_delta_percent = percent_from_target(usage_monthly, pace_month_target);
                let pace_week_delta_percent = data
                    .usage_weekly
                    .and_then(|usage_weekly| percent_from_target(usage_weekly, pace_week_target));
                let pace_day_delta_percent = data
                    .usage_daily
                    .and_then(|usage_daily| percent_from_target(usage_daily, pace_day_target));

                (
                    Some(pace_month_target),
                    Some(pace_week_target),
                    Some(pace_day_target),
                    pace_month_delta_percent,
                    pace_week_delta_percent,
                    pace_day_delta_percent,
                )
            } else {
                (None, None, None, None, None, None)
            }
        } else {
            (None, None, None, None, None, None)
        };

    let pace_status = pace_month_delta_percent.map(|delta| {
        let warn = default_pace_warn_threshold();
        let over = default_pace_over_threshold();
        pace_status_from_delta(delta, warn, over).to_string()
    });
    
    Ok(BalanceData {
        limit: data.limit,
        usage: data.usage,
        usage_daily: data.usage_daily,
        usage_weekly: data.usage_weekly,
        usage_monthly,
        remaining,
        remaining_monthly,
        pace_ratio,
        pace_month_target,
        pace_week_target,
        pace_day_target,
        pace_month_delta_percent,
        pace_week_delta_percent,
        pace_day_delta_percent,
        pace_status,
        label: data.label,
    })
}

/// Reset settings by deleting the config directory
#[tauri::command]
fn reset_settings(app: AppHandle) -> Result<(), String> {
    let config_dir = get_config_dir()?;
    if config_dir.exists() {
        fs::remove_dir_all(&config_dir)
            .map_err(|e| format!("Failed to delete config directory: {}", e))?;
    }
    
    // Unregister shortcuts
    let _ = app.global_shortcut().unregister_all();
    
    Ok(())
}

/// Get app version from Cargo.toml
#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Quit the application
#[tauri::command]
fn quit_app(app_handle: tauri::AppHandle) {
    app_handle.exit(0);
}

/// Toggle window visibility (show/hide)
#[tauri::command]
fn toggle_window_visibility(app: tauri::AppHandle) {
    toggle_window(&app);
}

/// Notify that API key is valid
#[tauri::command]
async fn notify_api_key_valid(app: tauri::AppHandle) {
    let _ = app.emit("api-key-valid", ());
}

/// Notify that API key is invalid
#[tauri::command]
async fn notify_api_key_invalid(app: tauri::AppHandle) {
    let _ = app.emit("api-key-invalid", ());
}

/// Open a URL in the default browser
#[tauri::command]
fn open_external_url(url: String) -> Result<(), String> {
    open::that(url).map_err(|e| e.to_string())
}

/// Try to load a font from the filesystem
fn try_load_font(font_name: &str) -> Option<(FontVec, String)> {
    // Determine if font name already includes weight (e.g., "Klavika-Bold")
    let has_weight = font_name.contains("-Bold") 
        || font_name.contains("-Light")
        || font_name.contains("-Medium")
        || font_name.contains("-Regular")
        || font_name.contains(" Bold")
        || font_name.ends_with("_Bd");
    
    // Font directories to search (in order of preference)
    let font_dirs = vec![
        dirs::home_dir().map(|h| h.join("Library/Fonts")),
        Some(PathBuf::from("/Library/Fonts")),
        Some(PathBuf::from("/System/Library/Fonts")),
        Some(PathBuf::from("/System/Library/Fonts/Supplemental")),
    ];
    
    // Build candidate filenames to try
    let mut candidates = Vec::new();
    
    // If name already has weight, use it directly
    if has_weight {
        candidates.push(format!("{}.otf", font_name));
        candidates.push(format!("{}.ttf", font_name));
        candidates.push(format!("{}.ttc", font_name));
    } else {
        // Try various common patterns
        candidates.push(format!("{}-Regular.otf", font_name));
        candidates.push(format!("{}-Regular.ttf", font_name));
        candidates.push(format!("{}.otf", font_name));
        candidates.push(format!("{}.ttf", font_name));
        candidates.push(format!("{}.ttc", font_name));
    }
    
    // Add Helvetica as ultimate fallback
    if font_name != "Helvetica" {
        candidates.push("Helvetica.ttc".to_string());
        candidates.push("Arial.ttf".to_string());
    }
    
    // Try each combination of directory + filename
    for dir in &font_dirs {
        if let Some(dir_path) = dir {
            for filename in &candidates {
                let font_path = dir_path.join(filename);
                if let Ok(font_data) = std::fs::read(&font_path) {
                    if let Ok(font) = FontVec::try_from_vec(font_data) {
                        return Some((font, font_path.display().to_string()));
                    }
                }
            }
        }
    }
    
    None
}

/// Calculate the visual width of text for centering
fn calculate_text_width(text: &str, font: &FontVec, scale: PxScale) -> i32 {
    use ab_glyph::{Font, ScaleFont};
    
    // Measure actual glyph widths for precise centering
    let scaled_font = font.as_scaled(scale);
    let mut width = 0.0;
    
    for c in text.chars() {
        let glyph_id = font.glyph_id(c);
        width += scaled_font.h_advance(glyph_id);
    }
    
    width as i32
}

fn normalized_pace_thresholds(settings: &AppSettings) -> (f64, f64) {
    let warn = settings.pace_warn_threshold.max(0.0);
    let over = settings.pace_over_threshold.max(warn + 1.0);
    (warn, over)
}

fn pace_status_from_delta(delta_percent: f64, warn: f64, over: f64) -> &'static str {
    if delta_percent > over {
        "ahead"
    } else if delta_percent > warn {
        "behind"
    } else {
        "on_track"
    }
}

fn compute_pace_status(balance: &BalanceData, settings: &AppSettings) -> Option<&'static str> {
    let (warn, over) = normalized_pace_thresholds(settings);
    if let Some(delta_percent) = balance.pace_month_delta_percent {
        return Some(pace_status_from_delta(delta_percent, warn, over));
    }

    let pace_ratio = balance.pace_ratio?;
    let limit = balance.limit?;
    if limit <= 0.0 {
        return None;
    }

    let usage = balance.usage_monthly.or(balance.usage)?;
    let usage_ratio = (usage / limit) * 100.0;
    let pace_percent = (pace_ratio * 100.0).clamp(0.0, 100.0);
    let delta_percent = usage_ratio - pace_percent;
    Some(pace_status_from_delta(delta_percent, warn, over))
}

/// Update system tray icon with current balance percentage or absolute value
#[tauri::command]
fn update_menubar_display(app_handle: tauri::AppHandle, balance: BalanceData, settings: AppSettings) -> Result<(), String> {
    if let Some(state) = app_handle.try_state::<MenubarState>() {
        if let Ok(mut stored) = state.balance.lock() {
            *stored = Some(balance.clone());
        }
        if let Ok(mut stored) = state.settings.lock() {
            *stored = Some(settings.clone());
        }
    }
    let display_value = if settings.show_percentage {
        // Percentage logic: relative to limit
        let val = if let Some(limit) = balance.limit {
            if limit > 0.0 {
                if settings.show_remaining {
                    (balance.remaining_monthly.or(balance.remaining).unwrap_or(0.0) / limit) * 100.0
                } else {
                    (balance.usage_monthly.or(balance.usage).unwrap_or(0.0) / limit) * 100.0
                }
            } else {
                0.0
            }
        } else {
            0.0
        };
        val
    } else {
        // Absolute $ logic: directly from balance
        if settings.show_remaining {
            balance.remaining_monthly.or(balance.remaining).unwrap_or(0.0)
        } else {
            balance.usage_monthly.or(balance.usage).unwrap_or(0.0)
        }
    };
    
    // floor to int as requested unless fractional is enabled
    let final_value = if settings.decimal_places > 0 {
        let factor = 10.0f64.powi(settings.decimal_places as i32);
        (display_value * factor).round() / factor
    } else {
        display_value.floor()
    };
    
    // Check if we have valid data (monthly, legacy, or limit/usage exists)
    let has_data = balance.remaining_monthly.is_some()
        || balance.usage_monthly.is_some()
        || balance.remaining.is_some()
        || balance.usage.is_some()
        || balance.limit.is_some();
    
    let is_dark = is_macos_dark_mode();
    let icon = generate_hybrid_menubar_icon(final_value, settings.show_percentage, has_data, settings.show_unit, &settings, &balance, is_dark)?;
    if let Some(tray) = app_handle.tray_by_id("main-tray") {
        tray.set_icon(Some(icon))
            .map_err(|e| format!("Failed to update tray icon: {}", e))?;
        
        #[cfg(target_os = "macos")]
        {
            tray.set_icon_as_template(settings.menubar_monochrome)
                .map_err(|e| format!("Failed to set icon template mode: {}", e))?;
        }
    }
    Ok(())
}

/// Generate hybrid menubar icon with logo and adaptive text color
fn generate_hybrid_menubar_icon(value: f64, is_percentage: bool, has_data: bool, show_unit: bool, settings: &AppSettings, balance: &BalanceData, is_dark_mode: bool) -> Result<Image<'static>, String> {
    let scale = MENUBAR_RENDER_SCALE;
    
    // Load Logo
    let logo_data = include_bytes!("../icons/32x32.png");
    let logo_img = image::load_from_memory(logo_data)
        .map_err(|e| format!("Failed to load logo: {}", e))?
        .to_rgba8();
    
    let logo_physical_size = (MENUBAR_LOGO_SIZE as f32 * scale) as u32;
    let logo_scaled = image::imageops::resize(
        &logo_img,
        logo_physical_size,
        logo_physical_size,
        image::imageops::FilterType::Lanczos3
    );

    // If no data, show logo only (centered in a standard 22pt-equivalent box for consistency)
    if !has_data {
        let canvas_size = (22.0 * scale) as u32;
        let mut img = image::RgbaImage::new(canvas_size, canvas_size);
        let x = (canvas_size - logo_physical_size) / 2;
        let y = (canvas_size - logo_physical_size) / 2;
        image::imageops::overlay(&mut img, &logo_scaled, x as i64, y as i64);
        let rgba = img.into_raw();
        return Ok(Image::new_owned(rgba, canvas_size, canvas_size));
    }

    // Prepare text
    let value_text = if settings.decimal_places > 0 {
        format!("{:.1$}", value, settings.decimal_places as usize)
    } else {
        format!("{}", value.round() as i32)
    };
    let unit_text = if is_percentage { "%" } else { "$" };
    
    let (val_font, _) = try_load_font(MENUBAR_VALUE_FONT).ok_or("Value font not found")?;
    let (unt_font, _) = try_load_font(MENUBAR_UNIT_FONT).ok_or("Unit font not found")?;
    
    let val_scale = PxScale::from(MENUBAR_VALUE_SIZE * scale);
    let unt_scale = PxScale::from(MENUBAR_UNIT_SIZE * scale);
    
    let val_width = calculate_text_width(&value_text, &val_font, val_scale);
    let unt_width = calculate_text_width(unit_text, &unt_font, unt_scale);
    
    // Calculate total width (logical points then scale)
    // Layout: [hexagon] [gap] [unit/val] [val/unit] [padding]
    let mut total_width_pts = HEX_SIZE_PTS;
    
    if has_data {
        let text_part_width = if show_unit {
            (val_width as f32 / scale) + UNIT_VALUE_GAP + (unt_width as f32 / scale)
        } else {
            val_width as f32 / scale
        };
        total_width_pts += LOGO_TEXT_GAP + text_part_width + END_PADDING;
    }
        
    let canvas_width = (total_width_pts * scale) as u32;
    let canvas_height = (22.0 * scale) as u32; // Standard macOS height
    
    let mut img = image::RgbaImage::new(canvas_width, canvas_height);
    
    // 1. Draw Programmatic Hexagon
    let hex_width = (HEX_SIZE_PTS * scale) as f32;
    // For a pointy-top hexagon with straight vertical sides:
    // height = width / cos(30) = width / 0.866
    let hex_height = hex_width / 0.866;
    let hex_x_offset = 0.0;
    let hex_y_offset = (canvas_height as f32 - hex_height) / 2.0;

    // We calculate the 6 points of the hexagon
    // Pointy top: [width/2, 0], [width, height/4], [width, 3height/4], [width/2, height], [0, 3height/4], [0, height/4]
    let points = [
        (hex_x_offset + hex_width / 2.0, hex_y_offset),
        (hex_x_offset + hex_width, hex_y_offset + hex_height * 0.25),
        (hex_x_offset + hex_width, hex_y_offset + hex_height * 0.75),
        (hex_x_offset + hex_width / 2.0, hex_y_offset + hex_height),
        (hex_x_offset, hex_y_offset + hex_height * 0.75),
        (hex_x_offset, hex_y_offset + hex_height * 0.25),
    ];

    // Calculate fill level (rising from bottom)
    // Percentage used for the fill should be the selected balance %
    let fill_pct = if has_data {
        if let Some(limit) = balance.limit {
            if limit > 0.0 {
                let fill_val = if settings.show_remaining {
                    balance.remaining_monthly.or(balance.remaining).unwrap_or(0.0)
                } else {
                    balance.usage_monthly.or(balance.usage).unwrap_or(0.0)
                };
                (fill_val as f32 / limit as f32).clamp(0.0, 1.0)
            } else {
                1.0f32
            }
        } else {
            1.0f32
        }
    } else {
        0.0f32
    };

    let border_thickness = (HEX_BORDER_PTS * scale) as i32;
    // Adaptive stroke/text color based on macOS appearance
    let stroke_color = if is_dark_mode {
        Rgba([255, 255, 255, 255])  // White for dark mode
    } else {
        Rgba([0, 0, 0, 255])        // Black for light mode
    };
    let transparent = Rgba([0, 0, 0, 0]);
    let fill_color = if settings.menubar_monochrome {
        Rgba([255, 255, 255, 180])
    } else {
        match compute_pace_status(balance, settings) {
            Some("ahead") => Rgba([239, 68, 68, 200]),
            Some("behind") => Rgba([234, 179, 8, 210]),
            Some("on_track") => Rgba([16, 185, 129, 200]),
            _ => Rgba([255, 255, 255, 128]),
        }
    };

    // Rasterize Hexagon
    for y in 0..canvas_height {
        for x in 0..(hex_width as u32) {
            if is_inside_hexagon(x as f32, y as f32, &points) {
                let dist = distance_to_hexagon_border(x as f32, y as f32, &points);
                
                if dist < border_thickness as f32 {
                    // Border
                    img.put_pixel(x, y, stroke_color);
                } else {
                    // Interior - vertical fill logic
                    let relative_y = (y as f32 - hex_y_offset) / hex_height;
                    let fill_from_top = !settings.show_remaining;
                    let is_filled = if fill_from_top {
                        relative_y < fill_pct
                    } else {
                        relative_y > (1.0f32 - fill_pct)
                    };
                    if is_filled {
                        img.put_pixel(x, y, fill_color);
                    } else {
                        img.put_pixel(x, y, transparent);
                    }
                }
            }
        }
    }
    
    if !has_data {
        let rgba = img.into_raw();
        return Ok(Image::new_owned(rgba, canvas_width, canvas_height));
    }

    // 2. Draw Text (White)
    let text_color = stroke_color;
    let mut current_x = (HEX_SIZE_PTS + LOGO_TEXT_GAP) * scale;
    
    if is_percentage {
        // Percent mode: 75 %
        let val_y = (canvas_height as f32 - (MENUBAR_VALUE_SIZE * scale)) / 2.0;
        draw_text_mut(&mut img, text_color, current_x as i32, val_y as i32, val_scale, &val_font, &value_text);
        
        if show_unit {
            current_x += val_width as f32 + (UNIT_VALUE_GAP * scale);
            let unt_y = (canvas_height as f32 - (MENUBAR_UNIT_SIZE * scale)) / 2.0;
            draw_text_mut(&mut img, text_color, current_x as i32, unt_y as i32, unt_scale, &unt_font, unit_text);
        }
    } else {
        // Dollar mode: $ 42
        if show_unit {
            let unt_y = (canvas_height as f32 - (MENUBAR_UNIT_SIZE * scale)) / 2.0;
            draw_text_mut(&mut img, text_color, current_x as i32, unt_y as i32, unt_scale, &unt_font, unit_text);
            current_x += unt_width as f32 + (UNIT_VALUE_GAP * scale);
        }
        
        let val_y = (canvas_height as f32 - (MENUBAR_VALUE_SIZE * scale)) / 2.0;
        draw_text_mut(&mut img, text_color, current_x as i32, val_y as i32, val_scale, &val_font, &value_text);
    }
    
    let rgba = img.into_raw();
    Ok(Image::new_owned(rgba, canvas_width, canvas_height))
}

fn is_inside_hexagon(x: f32, y: f32, p: &[(f32, f32); 6]) -> bool {
    // Simple point-in-polygon for convex hexagon
    let mut inside = true;
    for i in 0..6 {
        let p1 = p[i];
        let p2 = p[(i + 1) % 6];
        // Cross product to check side
        if (p2.0 - p1.0) * (y - p1.1) - (p2.1 - p1.1) * (x - p1.0) < 0.0 {
            inside = false;
            break;
        }
    }
    inside
}

fn distance_to_hexagon_border(x: f32, y: f32, p: &[(f32, f32); 6]) -> f32 {
    let mut min_dist = f32::MAX;
    for i in 0..6 {
        let p1 = p[i];
        let p2 = p[(i + 1) % 6];
        
        let dx = p2.0 - p1.0;
        let dy = p2.1 - p1.1;
        let l2 = dx * dx + dy * dy;
        
        let t = ((x - p1.0) * dx + (y - p1.1) * dy) / l2;
        let t = t.clamp(0.0, 1.0);
        
        let px = p1.0 + t * dx;
        let py = p1.1 + t * dy;
        
        let dist = ((x - px).powi(2) + (y - py).powi(2)).sqrt();
        if dist < min_dist {
            min_dist = dist;
        }
    }
    min_dist
}


/// Position window centered on the current monitor
fn position_window_below_menubar(window: &tauri::WebviewWindow) -> Result<(), String> {
    // Get the monitor the window is on (or primary monitor)
    let monitor = window.current_monitor()
        .map_err(|e| format!("Failed to get monitor: {}", e))?
        .ok_or_else(|| "No monitor available".to_string())?;
    
    let monitor_pos = monitor.position();
    let monitor_size = monitor.size();
    let window_size = window.outer_size()
        .map_err(|e| format!("Failed to get window size: {}", e))?;
    
    // Center both horizontally and vertically on the monitor
    let x = monitor_pos.x + (monitor_size.width as i32 / 2) - (window_size.width as i32 / 2);
    let y = monitor_pos.y + (monitor_size.height as i32 / 2) - (window_size.height as i32 / 2);
    
    window.set_position(PhysicalPosition::new(x, y))
        .map_err(|e| format!("Failed to set position: {}", e))?;
    
    Ok(())
}

fn toggle_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) && window.is_focused().unwrap_or(false) {
            let _ = window.hide();
        } else {
            let _ = window.show();
            let _ = window.set_focus();
            let _ = window.emit("refresh-balance", ());
        }
    }
}

fn update_app_shortcut(app: &AppHandle, shortcut_str: &str, enabled: bool) -> Result<(), String> {
    let shortcut_ext = app.global_shortcut();
    
    // Unregister all existing shortcuts first to be safe
    let _ = shortcut_ext.unregister_all();
    
    // Register new one only if enabled
    if enabled && !shortcut_str.is_empty() {
        if let Ok(shortcut) = shortcut_str.parse::<Shortcut>() {
            shortcut_ext.on_shortcut(shortcut, |app, _shortcut, event| {
                if event.state() == ShortcutState::Pressed {
                    toggle_window(app);
                }
            }).map_err(|e| format!("Failed to register shortcut: {}", e))?;
        }
    }
    
    Ok(())
}

#[tauri::command]
async fn set_window_height(window: tauri::Window, height: f64) -> Result<(), String> {
    use tauri::LogicalSize;
    window.set_size(LogicalSize::new(800.0, height))
        .map_err(|e| e.to_string())
}

fn main() {
  let mut builder = tauri::Builder::default()
    .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, Some(vec!["--quiet"])))
    .plugin(tauri_plugin_window_state::Builder::default().build())
    .plugin(tauri_plugin_global_shortcut::Builder::new().build())
    .plugin(tauri_plugin_clipboard_manager::init());
  
  #[cfg(target_os = "macos")]
  {
    builder = builder.plugin(tauri_plugin_sparkle_updater::init());
  }
  
  builder
    .manage(AutoRefreshState::new())
    .manage(MenubarState::default())
    .setup(|app| {
      #[cfg(target_os = "macos")]
      {
        app.set_activation_policy(ActivationPolicy::Accessory);
      }
      
      // Start the auto-refresh timer
      let app_handle = app.app_handle().clone();
      tauri::async_runtime::spawn(async move {
        let app_clone = app_handle.clone();
        if let Some(state) = app_handle.try_state::<AutoRefreshState>() {
          let _ = start_auto_refresh_timer(app_clone, state).await;
        }
      });
      
      // Create tray menu
      let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
      let show_hide = MenuItemBuilder::with_id("show_hide", "Show/Hide").build(app)?;
      let menu = Menu::with_items(app, &[&show_hide, &quit])?;
      
      // Create tray icon
  let is_dark = is_macos_dark_mode();
  let initial_icon = generate_hybrid_menubar_icon(0.0, true, false, true, &AppSettings::default(), &BalanceData {
      limit: None,
      usage: None,
      usage_daily: None,
      usage_weekly: None,
      usage_monthly: None,
      remaining: None,
      remaining_monthly: None,
      pace_ratio: None,
      pace_month_target: None,
      pace_week_target: None,
      pace_day_target: None,
      pace_month_delta_percent: None,
      pace_week_delta_percent: None,
      pace_day_delta_percent: None,
      pace_status: None,
      label: None,
  }, is_dark).ok();
      let _tray = TrayIconBuilder::with_id("main-tray")
        .icon(initial_icon.unwrap_or_else(|| Image::from_bytes(include_bytes!("../icons/32x32.png")).unwrap()))
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| {
          match event.id().as_ref() {
            "quit" => {
              app.exit(0);
            }
            "show_hide" => {
              toggle_window(app);
            }
            _ => {}
          }
        })
        .on_tray_icon_event(|tray, event| {
          if let TrayIconEvent::Click {
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            ..
          } = event
          {
            toggle_window(tray.app_handle());
          }
        })
        .build(app)?;
      
      // Set up KVO observation for menubar appearance changes (wallpaper-driven tint)
      #[cfg(target_os = "macos")]
      {
        let handle = app.app_handle().clone();
        unsafe {
          setup_appearance_observer(handle);
        }
      }
      
      // Register global shortcut
      let settings = read_settings().unwrap_or_default();
      let _ = update_app_shortcut(app.app_handle(), &settings.global_shortcut, settings.global_shortcut_enabled);
      
      // Sync autostart setting with system
      let autostart_manager = app.autolaunch();
      if settings.launch_at_login {
          let _ = autostart_manager.enable();
      } else {
          let _ = autostart_manager.disable();
      }
      
      // Position window initially (hidden) - simplified without event listeners
      if let Some(window) = app.get_webview_window("main") {
          let _ = position_window_below_menubar(&window);
          
          // Check settings to determine initial visibility and always_on_top
          match read_settings() {
              Ok(settings) => {
                  let _ = window.set_always_on_top(settings.always_on_top);
                  if settings.api_key.is_some() && settings.show_window_on_start {
                      // Will be shown by frontend after validation
                      let _ = window.show();
                      let _ = window.set_focus();
                  } else {
                      let _ = window.hide();
                  }
              }
              Err(_) => {
                  let _ = window.hide();
              }
          }
      }
      
      Ok(())
    })
    .on_window_event(|window, event| {
      // Hide window instead of closing when user clicks X
      if let WindowEvent::CloseRequested { api, .. } = event {
        window.hide().unwrap();
        api.prevent_close();
      }

      #[cfg(target_os = "macos")]
      if let WindowEvent::ThemeChanged(_) = event {
        let app_handle = window.app_handle();
        if let Some(state) = app_handle.try_state::<MenubarState>() {
          let balance = state.balance.lock().ok().and_then(|stored| stored.clone());
          let settings = state.settings.lock().ok().and_then(|stored| stored.clone());
          if let (Some(balance), Some(settings)) = (balance, settings) {
            let _ = update_menubar_display(app_handle.clone(), balance, settings);
          }
        }
      }
    })
    .invoke_handler(tauri::generate_handler![
        read_api_key, 
        save_api_key,
        read_settings,
        read_opencode_openrouter_key,
        copy_to_clipboard,
        save_settings,
        reset_settings,
        fetch_balance,
        get_app_version,
        update_menubar_display,
        log_message,
        read_logs,
        clear_logs,
        open_app_log,
        open_error_log,
        quit_app,
        open_external_url,
        toggle_window_visibility,
        notify_api_key_valid,
        notify_api_key_invalid,
        restart_auto_refresh,
        set_window_height
    ])


    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
