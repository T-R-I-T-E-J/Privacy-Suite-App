use crate::ProcessingOptions;
use anyhow::{Context, Result};
use image::{DynamicImage, ImageFormat};
use std::fs;
use std::path::Path;

pub fn process_image(
    input_path: &str,
    output_path: &str,
    options: &ProcessingOptions,
) -> Result<()> {
    let format = detect_format(input_path)?;
    
    match format {
        ImageFormat::Jpeg | ImageFormat::Png => {
            process_jpeg_png(input_path, output_path, options)
        }
        _ => anyhow::bail!("Unsupported format: {:?}", format),
    }
}

fn detect_format(path: &str) -> Result<ImageFormat> {
    let data = fs::read(path).context("Failed to read input file")?;
    image::guess_format(&data)
        .context("Failed to detect image format")
}

fn process_jpeg_png(
    input_path: &str,
    output_path: &str,
    options: &ProcessingOptions,
) -> Result<()> {
    // Read image
    let img = image::open(input_path)
        .context("Failed to open image")?;
    
    // For metadata stripping, we'll save the image without EXIF
    // The image crate's save methods don't preserve EXIF by default
    // This effectively strips all metadata
    
    // Save image (this will strip EXIF)
    save_image(&img, output_path, options.quality)?;
    
    // If fake GPS is requested, we'd need to re-embed EXIF with only GPS data
    // For now, this is a limitation - full EXIF manipulation would require
    // a lower-level library or rebuilding the JPEG structure
    if options.fake_gps.is_some() {
        log::warn!("Fake GPS injection not yet implemented for JPEG/PNG - use FFmpeg fallback");
    }
    
    Ok(())
}

fn save_image(
    img: &DynamicImage,
    output_path: &str,
    _quality: u8,
) -> Result<()> {
    let format = detect_format_from_path(output_path)?;
    
    match format {
        ImageFormat::Jpeg => {
            img.save_with_format(output_path, ImageFormat::Jpeg)?;
            // TODO: Re-embed stripped EXIF if needed
            // For now, saving without EXIF achieves the stripping goal
        }
        ImageFormat::Png => {
            img.save_with_format(output_path, ImageFormat::Png)?;
        }
        _ => anyhow::bail!("Unsupported output format"),
    }
    
    Ok(())
}

fn detect_format_from_path(path: &str) -> Result<ImageFormat> {
    let ext = Path::new(path)
        .extension()
        .and_then(|s| s.to_str())
        .ok_or_else(|| anyhow::anyhow!("No file extension"))?;
    
    match ext.to_lowercase().as_str() {
        "jpg" | "jpeg" => Ok(ImageFormat::Jpeg),
        "png" => Ok(ImageFormat::Png),
        _ => anyhow::bail!("Unsupported extension: {}", ext),
    }
}
