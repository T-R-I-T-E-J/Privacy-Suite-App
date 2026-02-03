use anyhow::{Context, Result};
use std::path::Path;
use std::process::Command;

pub fn find_ffmpeg() -> Option<String> {
    // Check tools/ directory first (relative to project root)
    let project_root = std::env::current_dir()
        .ok()?
        .ancestors()
        .find(|p| p.join("tools").exists())?;
    
    let tools_ffmpeg = project_root.join("tools").join("ffmpeg");
    let tools_ffmpeg_exe = project_root.join("tools").join("ffmpeg.exe");
    
    if tools_ffmpeg.exists() {
        return tools_ffmpeg.to_str().map(|s| s.to_string());
    }
    if tools_ffmpeg_exe.exists() {
        return tools_ffmpeg_exe.to_str().map(|s| s.to_string());
    }
    
    // Check system PATH
    if Command::new("ffmpeg")
        .arg("-version")
        .output()
        .is_ok()
    {
        return Some("ffmpeg".to_string());
    }
    
    // Check for ffmpeg.exe on Windows
    #[cfg(target_os = "windows")]
    {
        if Command::new("ffmpeg.exe")
            .arg("-version")
            .output()
            .is_ok()
        {
            return Some("ffmpeg.exe".to_string());
        }
    }
    
    None
}

pub fn strip_with_ffmpeg(input_path: &str, output_path: &str) -> Result<()> {
    let ffmpeg_path = find_ffmpeg()
        .ok_or_else(|| anyhow::anyhow!("FFmpeg not found in tools/ directory or system PATH"))?;
    
    let output = Command::new(&ffmpeg_path)
        .arg("-i")
        .arg(input_path)
        .arg("-map_metadata")
        .arg("-1")
        .arg("-c:v")
        .arg("copy")
        .arg("-c:a")
        .arg("copy")
        .arg(output_path)
        .output()
        .context("Failed to execute FFmpeg")?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!("FFmpeg failed: {}", stderr);
    }
    
    Ok(())
}
