use anyhow::{Context, Result};
use std::process::Command;
use crate::ProcessingOptions;
use rand::Rng;

pub fn find_exiftool() -> Option<String> {
    // Check exiftool-13.48_64 directory first (relative to project root)
    let current_dir = std::env::current_dir().ok()?;
    let project_root = current_dir
        .ancestors()
        .find(|p| p.join("exiftool-13.48_64").exists())?;
    
    // Try exiftool(-k).exe first (Windows executable name)
    let exiftool_dir = project_root.join("exiftool-13.48_64");
    let exiftool_exe = exiftool_dir.join("exiftool(-k).exe");
    let exiftool_exe_alt = exiftool_dir.join("exiftool.exe");
    
    if exiftool_exe.exists() {
        return exiftool_exe.to_str().map(|s| s.to_string());
    }
    if exiftool_exe_alt.exists() {
        return exiftool_exe_alt.to_str().map(|s| s.to_string());
    }
    
    // Check system PATH
    if Command::new("exiftool")
        .arg("-ver")
        .output()
        .is_ok()
    {
        return Some("exiftool".to_string());
    }
    
    // Check for exiftool.exe on Windows
    #[cfg(target_os = "windows")]
    {
        if Command::new("exiftool.exe")
            .arg("-ver")
            .output()
            .is_ok()
        {
            return Some("exiftool.exe".to_string());
        }
    }
    
    None
}

fn generate_random_gps() -> (f64, f64) {
    let mut rng = rand::rng();
    // Generate random latitude: -90 to 90
    let lat = rng.random_range(-90.0..=90.0);
    // Generate random longitude: -180 to 180
    let lon = rng.random_range(-180.0..=180.0);
    (lat, lon)
}

pub fn strip_with_exiftool(input_path: &str, output_path: &str, options: &ProcessingOptions) -> Result<()> {
    let exiftool_path = find_exiftool()
        .ok_or_else(|| anyhow::anyhow!("ExifTool not found in exiftool-13.48_64 directory or system PATH"))?;
    
    // If output_path is different from input_path, copy first
    if input_path != output_path {
        std::fs::copy(input_path, output_path)
            .context("Failed to copy file to output path")?;
    }
    
    // Build ExifTool command arguments
    let mut args = Vec::new();
    
    // First, remove all metadata
    args.push("-all=".to_string());
    
    // Determine GPS coordinates: use provided ones or generate random
    let (lat, lon) = options.fake_gps.unwrap_or_else(|| generate_random_gps());
    
    // Set GPS coordinates
    args.push(format!("-GPSLatitude={}", lat));
    args.push(format!("-GPSLongitude={}", lon));
    args.push(format!("-GPSLatitudeRef={}", if lat >= 0.0 { "N" } else { "S" }));
    args.push(format!("-GPSLongitudeRef={}", if lon >= 0.0 { "E" } else { "W" }));
    
    // Generate random date/time (within last 2 years)
    let mut rng = rand::rng();
    let year = rng.random_range(2022..=2024);
    let month = rng.random_range(1..=12);
    let day = rng.random_range(1..=28); // Use 28 to avoid month/day issues
    let hour = rng.random_range(0..=23);
    let minute = rng.random_range(0..=59);
    let second = rng.random_range(0..=59);
    let datetime = format!("{:04}:{:02}:{:02} {:02}:{:02}:{:02}", year, month, day, hour, minute, second);
    
    // Inject fake metadata values
    args.push(format!("-DateTimeOriginal={}", datetime));
    args.push(format!("-DateTimeDigitized={}", datetime));
    args.push(format!("-DateTime={}", datetime));
    
    // Random camera make/model combinations
    let makes = vec!["Canon", "Nikon", "Sony", "Fujifilm", "Olympus", "Panasonic"];
    let models = vec!["EOS R5", "D850", "Alpha 7 III", "X-T4", "OM-D E-M1", "Lumix GH5"];
    let make_idx = rng.random_range(0..makes.len());
    let model_idx = rng.random_range(0..models.len());
    
    args.push(format!("-Make={}", makes[make_idx]));
    args.push(format!("-Model={}", models[model_idx]));
    args.push("-Software=Image Processor v1.0".to_string());
    args.push("-Artist=Anonymous".to_string());
    args.push("-Copyright=".to_string()); // Clear copyright
    
    // Overwrite the file
    args.push("-overwrite_original".to_string());
    args.push(output_path.to_string());
    
    // Execute ExifTool
    let output = Command::new(&exiftool_path)
        .args(&args)
        .output()
        .context("Failed to execute ExifTool")?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        anyhow::bail!("ExifTool failed: {}\n{}", stderr, stdout);
    }
    
    Ok(())
}
