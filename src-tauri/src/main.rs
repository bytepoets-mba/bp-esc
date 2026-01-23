// BP Employee Self-Care - OpenRouter Balance Checker
// macOS only application
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;
use std::time::Duration;
use std::os::unix::fs::PermissionsExt; // macOS is Unix

use serde::{Deserialize, Serialize};
use tauri::{
    Manager, WindowEvent, ActivationPolicy, PhysicalPosition, Emitter,
    menu::{Menu, MenuItemBuilder},
    tray::{TrayIconBuilder, TrayIconEvent, MouseButton, MouseButtonState},
    image::Image
};
use image::Rgba;
use imageproc::drawing::draw_text_mut;
use ab_glyph::{FontVec, PxScale};

// ============================================================================
// MENUBAR ICON CONFIGURATION
// ============================================================================
// Adjust these constants to fine-tune the percentage text appearance in the menubar icon

// --- VALUE CONFIGURATION (the number, e.g., "75") ---

/// Font for the percentage value (the number)
/// Examples: "Klavika-Medium", "Klavika-Bold", "Helvetica", "Avenir Next"
const MENUBAR_VALUE_FONT: &str = "Klavika-Medium";

/// Font size for the value in pixels (try 10-14)
const MENUBAR_VALUE_SIZE: f32 = 13.0;

/// Horizontal offset for value from center (-10 to +10)
const MENUBAR_VALUE_OFFSET_X: i32 = 0;

/// Vertical offset for value from center (-10 to +10)
/// Negative = up, Positive = down
const MENUBAR_VALUE_OFFSET_Y: i32 = -2;

// --- UNIT CONFIGURATION (the "%" symbol) ---

/// Font for the unit symbol (the "%")
/// Examples: "Klavika-Light", "Klavika-Regular", "Helvetica"
const MENUBAR_UNIT_FONT: &str = "Klavika-Medium";

/// Font size for the unit in pixels (try 6-10, usually smaller than value)
const MENUBAR_UNIT_SIZE: f32 = 8.0;

/// Horizontal offset for unit from center (-10 to +10)
const MENUBAR_UNIT_OFFSET_X: i32 = 0;

/// Vertical offset for unit from center (-10 to +10)
/// This is positioned relative to icon center, not relative to value
const MENUBAR_UNIT_OFFSET_Y: i32 = 6;

// --- ADVANCED OPTIONS ---

/// Enable auto-centering: text is measured and centered precisely
/// When true: "7%", "55%", "100%" all center the same way
/// When false: uses character-width estimation (may shift slightly)
const MENUBAR_AUTO_CENTER: bool = true;

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
#[derive(Debug, Serialize, Deserialize)]
pub struct BalanceData {
    pub limit: Option<f64>,
    pub usage: Option<f64>,
    pub remaining: Option<f64>,
    pub label: Option<String>,
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
    #[serde(default)]
    label: Option<String>,
}

/// Fetch balance from OpenRouter API
#[tauri::command]
async fn fetch_balance(api_key: String) -> Result<BalanceData, String> {
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
    let api_response: OpenRouterResponse = response
        .json()
        .await
        .map_err(|e| {
            eprintln!("JSON parse error: {}", e);
            "Failed to parse API response. The service may be temporarily unavailable.".to_string()
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
    
    // Calculate remaining balance
    let remaining = match (data.limit, data.usage) {
        (Some(limit), Some(usage)) => Some(limit - usage),
        _ => None,
    };
    
    Ok(BalanceData {
        limit: data.limit,
        usage: data.usage,
        remaining,
        label: data.label,
    })
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

/// Update menubar icon with balance percentage
#[tauri::command]
fn update_menubar_percentage(app_handle: tauri::AppHandle, percentage: f64) -> Result<(), String> {
    update_tray_icon(&app_handle, percentage)
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
    
    if !MENUBAR_AUTO_CENTER {
        // Fallback: estimate based on character count
        return (text.len() as f32 * scale.x * 0.5) as i32;
    }
    
    // Measure actual glyph widths for precise centering
    let scaled_font = font.as_scaled(scale);
    let mut width = 0.0;
    
    for c in text.chars() {
        let glyph_id = font.glyph_id(c);
        width += scaled_font.h_advance(glyph_id);
    }
    
    width as i32
}

/// Generate menubar icon with percentage overlay (transparent cutout for macOS template)
fn generate_icon_with_percentage(percentage: f64) -> Result<Image<'static>, String> {
    // Create a transparent 34x34 canvas (increased from 32x32)
    let mut img = image::RgbaImage::from_pixel(34, 34, Rgba([0u8, 0u8, 0u8, 0u8]));
    
    // Separate value and unit
    let value_text = format!("{}", percentage.round() as i32);
    let unit_text = "%";
    
    // --- RENDER VALUE (the number) ---
    if let Some((value_font, font_path)) = try_load_font(MENUBAR_VALUE_FONT) {
        eprintln!("✓ Loaded value font: {}", font_path);
        
        let scale = PxScale::from(MENUBAR_VALUE_SIZE);
        
        // Calculate precise centering (adjusted for 34x34 canvas)
        let text_width = calculate_text_width(&value_text, &value_font, scale);
        
        // Center position with configurable offsets
        let x = ((34 - text_width) / 2) + MENUBAR_VALUE_OFFSET_X;
        let y = ((34 - MENUBAR_VALUE_SIZE as i32) / 2) + MENUBAR_VALUE_OFFSET_Y;
        
        // Draw text as OPAQUE BLACK (alpha = 255) for visibility
        draw_text_mut(&mut img, Rgba([0u8, 0u8, 0u8, 255u8]), x, y, scale, &value_font, &value_text);
    } else {
        eprintln!("✗ Warning: Could not load value font '{}'", MENUBAR_VALUE_FONT);
    }
    
    // --- RENDER UNIT (the "%" symbol) ---
    if let Some((unit_font, font_path)) = try_load_font(MENUBAR_UNIT_FONT) {
        eprintln!("✓ Loaded unit font: {}", font_path);
        
        let scale = PxScale::from(MENUBAR_UNIT_SIZE);
        
        // Calculate precise centering (adjusted for 34x34 canvas)
        let text_width = calculate_text_width(unit_text, &unit_font, scale);
        
        // Center position with configurable offsets
        let x = ((34 - text_width) / 2) + MENUBAR_UNIT_OFFSET_X;
        let y = ((34 - MENUBAR_UNIT_SIZE as i32) / 2) + MENUBAR_UNIT_OFFSET_Y;
        
        // Draw text as OPAQUE BLACK
        draw_text_mut(&mut img, Rgba([0u8, 0u8, 0u8, 255u8]), x, y, scale, &unit_font, unit_text);
    } else {
        eprintln!("✗ Warning: Could not load unit font '{}'", MENUBAR_UNIT_FONT);
    }
    
    // Convert to Image with explicit dimensions
    let rgba = img.into_raw();
    Ok(Image::new_owned(rgba, 34, 34))
}

/// Update system tray icon with current balance percentage
fn update_tray_icon(app_handle: &tauri::AppHandle, percentage: f64) -> Result<(), String> {
    let icon = generate_icon_with_percentage(percentage)?;
    if let Some(tray) = app_handle.tray_by_id("main-tray") {
        tray.set_icon(Some(icon))
            .map_err(|e| format!("Failed to update tray icon: {}", e))?;
        
        // Set as template icon for macOS (allows proper rendering with system theme)
        #[cfg(target_os = "macos")]
        tray.set_icon_as_template(true)
            .map_err(|e| format!("Failed to set icon as template: {}", e))?;
    }
    Ok(())
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

fn main() {
  tauri::Builder::default()
    .setup(|app| {
      #[cfg(target_os = "macos")]
      {
        app.set_activation_policy(ActivationPolicy::Accessory);
      }
      
      // Create tray menu
      let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
      let show_hide = MenuItemBuilder::with_id("show_hide", "Show/Hide").build(app)?;
      let menu = Menu::with_items(app, &[&show_hide, &quit])?;
      
      // Create tray icon
      let _tray = TrayIconBuilder::with_id("main-tray")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| {
          match event.id().as_ref() {
            "quit" => {
              app.exit(0);
            }
            "show_hide" => {
              if let Some(window) = app.get_webview_window("main") {
                // Only hide if window is visible AND focused
                if window.is_visible().unwrap_or(false) && window.is_focused().unwrap_or(false) {
                  let _ = window.hide();
                } else {
                  let _ = position_window_below_menubar(&window);
                  let _ = window.show();
                  let _ = window.set_focus();
                  let _ = window.emit("refresh-balance", ());
                }
              }
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
            let app = tray.app_handle();
            if let Some(window) = app.get_webview_window("main") {
              // Only hide if window is visible AND focused
              if window.is_visible().unwrap_or(false) && window.is_focused().unwrap_or(false) {
                let _ = window.hide();
              } else {
                // Show and focus the window
                let _ = position_window_below_menubar(&window);
                let _ = window.show();
                let _ = window.set_focus();
                let _ = window.emit("refresh-balance", ());
              }
            }
          }
        })
        .build(app)?;
      
      // Position window below menubar on initial launch
      if let Some(window) = app.get_webview_window("main") {
        let _ = position_window_below_menubar(&window);
      }
      
      Ok(())
    })
    .on_window_event(|window, event| {
      // Hide window instead of closing when user clicks X
      if let WindowEvent::CloseRequested { api, .. } = event {
        window.hide().unwrap();
        api.prevent_close();
      }
    })
    .invoke_handler(tauri::generate_handler![
        read_api_key, 
        save_api_key,
        fetch_balance,
        get_app_version,
        update_menubar_percentage,
        quit_app
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
