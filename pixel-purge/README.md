# Pixel Purge

Rust-based image metadata removal tool.

## Dependencies

### libheif (static)

This project requires a statically linked `libheif` library. Build instructions:

```bash
# Clone libheif repository
git clone https://github.com/strukturag/libheif.git
cd libheif

# Build static library
cmake -DCMAKE_BUILD_TYPE=Release \
      -DBUILD_SHARED_LIBS=OFF \
      -DCMAKE_POSITION_INDEPENDENT_CODE=ON \
      ..
make -j$(nproc)

# Copy the resulting libheif.a to this directory's lib/ folder
mkdir -p ../pixel-purge/lib
cp libheif/libheif.a ../pixel-purge/lib/
```

Alternatively, place `libheif.a` in the `lib/` directory where Cargo can find it.

## Building

```bash
cargo build --release
```

## Usage

```bash
cargo run --release -- [options]
```
