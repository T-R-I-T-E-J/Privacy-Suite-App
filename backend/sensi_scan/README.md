# Sensi-Scan: Privacy Analysis Engine

This module provides high-performance detection and redaction of sensitive data (PII).

## Features

- **Local Analysis**: No data ever leaves the device.
- **Smart Key Detection**: Automatically identifies API keys for Stripe, AWS, GitHub, Slack, and universal formats like `pk_test_...`.
- **Credit Card Redaction**: Uses the Luhn algorithm to validate and mask credit card numbers.
- **DOCX & Text Support**: Fully handles Microsoft Word documents (including tables/headers) and plain text files.

## Installation

1. Ensure you have Python 3.10+ installed.
2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

The module is designed to be called via JSON IPC from the Electron main process.

```bash
python -m sensi_scan "path/to/document.docx"
```
