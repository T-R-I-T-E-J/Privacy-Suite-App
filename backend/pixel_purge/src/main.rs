// Pixel Purge - EXIF Metadata Removal Tool
// Remove EXIF data from images for privacy

use clap::Parser;
use std::path::PathBuf;
use std::fs;
use image::io::Reader as ImageReader;

#[derive(Parser)]
#[command(name = "pixel-purge")]
#[command(about = "Remove EXIF metadata from images", long_about = None)]
struct Cli {
    /// Input image file
    #[arg(short, long)]
    input: PathBuf,
    
    /// Output image file
    #[arg(short, long)]
    output: PathBuf,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    env_logger::init();
    
    let cli = Cli::parse();
    
    println!("Pixel Purge - EXIF Metadata Removal Tool");
    println!("Input:  {:?}", cli.input);
    
    // Check if input exists
    if !cli.input.exists() {
        eprintln!("Error: Input file not found: {:?}", cli.input);
        std::process::exit(1);
    }
    
    // 1. Detect and print EXIF data before removal
    match rexif::parse_file(&cli.input) {
        Ok(exif) => {
            println!("Found {} EXIF entries", exif.entries.len());
            for entry in exif.entries.iter().take(5) {
                println!("  - {}: {}", entry.tag, entry.value);
            }
            if exif.entries.len() > 5 {
                println!("  ... and {} more", exif.entries.len() - 5);
            }
        },
        Err(_) => {
            println!("No readable EXIF data found (or format not supported for EXIF reading)");
        }
    }
    
    println!("Purging metadata...");
    
    // 2. Load the image using the `image` crate
    // Loading allows us to interpret the pixels directly
    let img = ImageReader::open(&cli.input)?.decode()?;
    
    // 3. Save the image to the output path
    // The `image` crate's save functionality re-encodes the image data from the pixel buffer.
    // By default, it does NOT copy over arbitrary metadata/EXIF from the source unless strictly managed.
    // This effectively strips the EXIF data.
    img.save(&cli.output)?;
    
    println!("Success! Cleaned image saved to: {:?}", cli.output);
    
    // Verify (optional check)
    match rexif::parse_file(&cli.output) {
        Ok(exif) => {
            println!("Warning: Output still contains {} EXIF entries.", exif.entries.len());
        },
        Err(_) => {
            println!("Verification Passed: No EXIF data found in output.");
        }
    }

    Ok(())
}
