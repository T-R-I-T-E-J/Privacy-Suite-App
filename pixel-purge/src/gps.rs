use anyhow::Result;
use exif::{Exif, Rational, Tag};

pub fn inject_fake_gps(exif_data: &mut Exif, lat: f64, lon: f64) -> Result<()> {
    let lat_rational = decimal_to_rational(lat);
    let lon_rational = decimal_to_rational(lon);
    
    // Set GPS latitude
    let lat_ref = if lat >= 0.0 { "N" } else { "S" };
    let lon_ref = if lon >= 0.0 { "E" } else { "W" };
    
    // Note: The exif crate's API doesn't directly support writing tags
    // This is a placeholder - actual implementation would need to use
    // a lower-level EXIF library or rebuild the EXIF data structure
    // For now, we'll handle GPS injection during image save
    
    Ok(())
}

fn decimal_to_rational(decimal: f64) -> Vec<Rational> {
    let abs_decimal = decimal.abs();
    let degrees = abs_decimal.floor() as i32;
    let minutes_float = (abs_decimal - degrees as f64) * 60.0;
    let minutes = minutes_float.floor() as i32;
    let seconds_float = (minutes_float - minutes as f64) * 60.0;
    let seconds = (seconds_float * 1000.0) as i32;
    
    vec![
        Rational::new(degrees, 1),
        Rational::new(minutes, 1),
        Rational::new(seconds, 1000),
    ]
}

pub fn convert_decimal_to_rational(decimal: f64) -> Vec<Rational> {
    decimal_to_rational(decimal)
}
