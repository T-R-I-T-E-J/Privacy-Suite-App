use clap::Parser;
use pixel_purge::{process_image, ProcessingOptions};
use serde_json;
use std::io::{self, Read};

#[derive(Parser)]
#[command(name = "pixel-purge")]
#[command(about = "Image metadata removal tool")]
struct Args {
    /// Input file path
    #[arg(short, long)]
    input: String,
    
    /// Output file path
    #[arg(short, long)]
    output: String,
    
    /// Tags to strip (comma-separated: GPS,DateTime,Make,Model,Software)
    #[arg(long, default_value = "GPS,DateTime,Make,Model,Software")]
    strip_tags: String,
    
    /// Fake GPS location as "lat,lon" (e.g., "37.7749,-122.4194")
    #[arg(long)]
    fake_gps: Option<String>,
    
    /// Force use of ExifTool
    #[arg(long)]
    force_exiftool: bool,
    
    /// JPEG quality (1-100, default: 100)
    #[arg(long, default_value = "100")]
    quality: u8,
    
    /// Enable verbose logging
    #[arg(short, long)]
    verbose: bool,
    
    /// Read options from JSON stdin
    #[arg(long)]
    json: bool,
}

fn main() {
    let args = Args::parse();
    
    if args.verbose {
        env_logger::Builder::from_default_env()
            .filter_level(log::LevelFilter::Debug)
            .init();
    }
    
    let options = if args.json {
        // Read JSON from stdin
        let mut json_input = String::new();
        io::stdin()
            .read_to_string(&mut json_input)
            .expect("Failed to read JSON from stdin");
        
        serde_json::from_str::<ProcessingOptions>(&json_input)
            .expect("Failed to parse JSON options")
    } else {
        // Parse from command line args
        let strip_tags: Vec<String> = args.strip_tags
            .split(',')
            .map(|s| s.trim().to_string())
            .collect();
        
        let fake_gps = args.fake_gps.map(|s| {
            let parts: Vec<&str> = s.split(',').collect();
            if parts.len() == 2 {
                let lat = parts[0].parse().unwrap_or(0.0);
                let lon = parts[1].parse().unwrap_or(0.0);
                Some((lat, lon))
            } else {
                None
            }
        }).flatten();
        
        ProcessingOptions {
            strip_tags,
            fake_gps,
            force_exiftool: args.force_exiftool,
            quality: args.quality,
        }
    };
    
    let result = process_image(&args.input, &args.output, options);
    
    println!("{}", serde_json::to_string(&result).unwrap());
}
