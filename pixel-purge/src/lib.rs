pub mod processor;
pub mod gps;
pub mod heic;
pub mod ffmpeg;

use serde::{Deserialize, Serialize};
use anyhow::Result;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessingOptions {
    pub strip_tags: Vec<String>,
    pub fake_gps: Option<(f64, f64)>,
    pub force_ffmpeg: bool,
    pub quality: u8,
}

impl Default for ProcessingOptions {
    fn default() -> Self {
        ProcessingOptions {
            strip_tags: vec![
                "GPS".to_string(),
                "DateTime".to_string(),
                "Make".to_string(),
                "Model".to_string(),
                "Software".to_string(),
            ],
            fake_gps: None,
            force_ffmpeg: false,
            quality: 100,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProcessingResult {
    pub success: bool,
    pub output_path: Option<String>,
    pub error: Option<String>,
}

pub fn process_image(
    input_path: &str,
    output_path: &str,
    options: ProcessingOptions,
) -> ProcessingResult {
    // Validate input path
    if input_path.is_empty() {
        return ProcessingResult {
            success: false,
            output_path: None,
            error: Some("Input path is empty".to_string()),
        };
    }

    // Validate output path
    if output_path.is_empty() {
        return ProcessingResult {
            success: false,
            output_path: None,
            error: Some("Output path is empty".to_string()),
        };
    }

    // Validate quality
    if options.quality == 0 || options.quality > 100 {
        return ProcessingResult {
            success: false,
            output_path: None,
            error: Some("Quality must be between 1 and 100".to_string()),
        };
    }

    if options.force_ffmpeg {
        return match ffmpeg::strip_with_ffmpeg(input_path, output_path) {
            Ok(_) => ProcessingResult {
                success: true,
                output_path: Some(output_path.to_string()),
                error: None,
            },
            Err(e) => ProcessingResult {
                success: false,
                output_path: None,
                error: Some(format!("FFmpeg processing failed: {}", e)),
            },
        };
    }

    match processor::process_image(input_path, output_path, &options) {
        Ok(_) => ProcessingResult {
            success: true,
            output_path: Some(output_path.to_string()),
            error: None,
        },
        Err(e) => {
            // Try FFmpeg fallback on error
            log::warn!("Rust processing failed, attempting FFmpeg fallback: {}", e);
            match ffmpeg::strip_with_ffmpeg(input_path, output_path) {
                Ok(_) => ProcessingResult {
                    success: true,
                    output_path: Some(output_path.to_string()),
                    error: None,
                },
                Err(ffmpeg_err) => ProcessingResult {
                    success: false,
                    output_path: None,
                    error: Some(format!(
                        "Processing failed: {}. FFmpeg fallback also failed: {}",
                        e, ffmpeg_err
                    )),
                },
            }
        }
    }
}
