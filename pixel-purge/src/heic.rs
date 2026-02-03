use crate::ProcessingOptions;
use anyhow::{Context, Result};

pub fn process_heic(
    _input_path: &str,
    _output_path: &str,
    _options: &ProcessingOptions,
) -> Result<()> {
    // HEIC processing using heif crate
    // This is a placeholder - full implementation would:
    // 1. Decode HEIC using heif::decode
    // 2. Extract metadata
    // 3. Strip specified tags
    // 4. Re-encode with modified metadata
    
    anyhow::bail!("HEIC processing not yet fully implemented - use FFmpeg fallback")
}
