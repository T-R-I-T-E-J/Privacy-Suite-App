# Off-Grid Leak Prevention Architecture

**Version:** 1.0  
**Date:** 2026-02-04  
**Status:** Implementation Ready

---

## Executive Summary

This document outlines the architecture for three privacy-first, locally-executed modules that prevent accidental secret leaks before code or files are shared:

1. **Pre-Commit Leak Guard** - Git hook that blocks commits containing secrets
2. **Config File Sanitizer** - Redacts secrets from configuration files
3. **Log Scrubber** - Cleans sensitive data from log files

All modules share a **centralized detection engine** based on the existing Sensi-Scan regex and context-aware pattern matching system.

---

## Core Principles

### Privacy-First Design

- ✅ 100% local execution
- ✅ No cloud APIs or external services
- ✅ No telemetry or analytics
- ✅ No background network calls
- ✅ Deterministic behavior
- ✅ No data persistence (except user-approved outputs)

### Security Constraints

- Never upload code or files
- Never store scanned data
- Never modify files without explicit user approval
- Never auto-push changes to Git
- Never modify Git history

### User Experience

- Clear, human-readable output
- Explicit user control at every step
- Safe defaults (read-only, preview-first)
- Actionable error messages
- Consistent CLI interface

---

## Shared Detection Engine

### Architecture

All three modules use the **same detection engine** to ensure consistency:

```
┌─────────────────────────────────────────────────────────────┐
│                  SHARED DETECTION ENGINE                     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │         Rule Registry (rule_registry.py)            │    │
│  │  • 30+ pre-defined detection rules                  │    │
│  │  • Category-based weights                           │    │
│  │  • Context-aware patterns                           │    │
│  │  • Validators (Luhn, etc.)                          │    │
│  └────────────────────────────────────────────────────┘    │
│                           ↓                                  │
│  ┌────────────────────────────────────────────────────┐    │
│  │      Detection Engine (detection_engine.py)         │    │
│  │  • Pattern matching                                 │    │
│  │  • Context extraction                               │    │
│  │  • Confidence scoring                               │    │
│  └────────────────────────────────────────────────────┘    │
│                           ↓                                  │
│  ┌────────────────────────────────────────────────────┐    │
│  │         Redaction Engine (redaction_engine.py)      │    │
│  │  • Consistent masking                               │    │
│  │  • Placeholder generation                           │    │
│  │  • Structure preservation                           │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Detection Categories

The engine detects 30+ categories including:

**Personal Identifiers:**

- SSN, Email, Phone

**Financial Data:**

- Credit Cards (with Luhn validation)
- Bank Accounts

**API Keys & Secrets:**

- Stripe, AWS, GitHub, Google, OpenAI
- Generic secrets (key=, token=, password=)
- Private keys (RSA, etc.)

**Network Identifiers:**

- IPv4 addresses

**Legal/PII:**

- Employee IDs, Salaries, Addresses

**Image-based:**

- QR codes

### Redaction Strategy

**Consistent placeholders:**

- `[REDACTED-SSN]`
- `[REDACTED-CC]`
- `[REDACTED-API-KEY]`
- etc.

**Partial masking (for debugging):**

- `ab***cd` (show first/last 2 chars)

---

## Module 1: Pre-Commit Leak Guard

### Purpose

Block Git commits that contain secrets before they reach the repository.

### Implementation

**Location:** `backend/off_grid/pre_commit_guard/`

**Files:**

```
pre_commit_guard/
├── __init__.py
├── hook_installer.py      # Installs Git hook
├── commit_scanner.py      # Scans staged files
├── git_hook_template.py   # Template for .git/hooks/pre-commit
└── README.md              # Installation instructions
```

### Workflow

```
┌─────────────────────────────────────────────────────────────┐
│  Developer runs: git commit -m "message"                     │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Pre-commit hook executes                                    │
│  • Get list of staged files (git diff --cached --name-only) │
│  • Filter by supported extensions (.js, .py, .env, etc.)    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  For each staged file:                                       │
│  • Read file content                                         │
│  • Run through Detection Engine                             │
│  • Collect all detections                                    │
└─────────────────────────────────────────────────────────────┘
                           ↓
                    ┌──────┴──────┐
                    │             │
              Secrets Found?   No Secrets
                    │             │
                   Yes            ↓
                    ↓        ┌─────────────┐
         ┌──────────────────┐│ Allow Commit│
         │  Block Commit    ││             │
         │  • Print warning ││  Exit 0     │
         │  • List secrets  │└─────────────┘
         │  • Exit 1        │
         └──────────────────┘
                    ↓
         ┌──────────────────┐
         │ Override option: │
         │ git commit       │
         │   --no-verify    │
         └──────────────────┘
```

### Supported File Types

- `.js`, `.ts`, `.jsx`, `.tsx`
- `.py`
- `.env`, `.env.local`, `.env.production`
- `.json`
- `.yaml`, `.yml`
- `.toml`
- `.sh`, `.bash`

### Output Example

```
╔══════════════════════════════════════════════════════════════╗
║              🚨 PRE-COMMIT LEAK GUARD 🚨                      ║
╚══════════════════════════════════════════════════════════════╝

❌ COMMIT BLOCKED - Secrets detected in staged files

File: backend/config.py
  Line 12: [REDACTED-AWS-KEY] (AWS Access Key)
  Line 15: [REDACTED-STRIPE-KEY] (Stripe API Key)

File: .env
  Line 3: [REDACTED-SECRET] (Generic secret)

Total: 3 secrets found in 2 files

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  ACTION REQUIRED:
1. Remove secrets from the files above
2. Use environment variables or secret management
3. Run 'git commit' again

To bypass this check (NOT RECOMMENDED):
  git commit --no-verify

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Installation

```bash
# Install the hook
python backend/off_grid/pre_commit_guard/hook_installer.py install

# Uninstall
python backend/off_grid/pre_commit_guard/hook_installer.py uninstall

# Test without committing
python backend/off_grid/pre_commit_guard/hook_installer.py test
```

### Exit Codes

- `0` - No secrets found, commit allowed
- `1` - Secrets found, commit blocked
- `2` - Error during scanning

---

## Module 2: Config File Sanitizer

### Purpose

Detect and redact secrets in configuration files before sharing.

### Implementation

**Location:** `backend/off_grid/config_sanitizer/`

**Files:**

```
config_sanitizer/
├── __init__.py
├── sanitizer.py           # Main sanitizer logic
├── parsers.py             # Format-specific parsers
├── cli.py                 # CLI interface
└── README.md
```

### Workflow

```
┌─────────────────────────────────────────────────────────────┐
│  User runs: python -m config_sanitizer scan config.json     │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Parse file based on extension:                              │
│  • .env    → Key-value parser                               │
│  • .json   → JSON parser                                    │
│  • .yaml   → YAML parser                                    │
│  • .toml   → TOML parser                                    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  For each value in config:                                   │
│  • Run through Detection Engine                             │
│  • Mark for redaction if secret detected                    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Generate preview:                                           │
│  • Show original vs sanitized side-by-side                  │
│  • Highlight what will be redacted                          │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Prompt user:                                                │
│  • "Save sanitized version? [y/N]"                          │
│  • Default: No (safe default)                               │
└─────────────────────────────────────────────────────────────┘
                           ↓
                    ┌──────┴──────┐
                    │             │
                  Yes            No
                    │             │
                    ↓             ↓
         ┌──────────────────┐  ┌──────────┐
         │ Save to:         │  │ Exit     │
         │ config.clean.json│  │ (no save)│
         │ (never overwrite)│  └──────────┘
         └──────────────────┘
```

### Supported Formats

**`.env` files:**

```env
# Original
DATABASE_URL=postgres://user:pass@localhost/db
STRIPE_KEY=sk_test_PLACEHOLDER

# Sanitized
DATABASE_URL=postgres://user:[REDACTED-SECRET]@localhost/db
STRIPE_KEY=[REDACTED-STRIPE-KEY]
```

**`.json` files:**

```json
{
  "api_key": "AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY",
  "database": {
    "host": "localhost",
    "password": "super_secret_123"
  }
}

// Sanitized
{
  "api_key": "[REDACTED-GOOGLE-API-KEY]",
  "database": {
    "host": "localhost",
    "password": "[REDACTED-SECRET]"
  }
}
```

**`.yaml` files:**

```yaml
# Original
aws:
  access_key: AKIA_PLACEHOLDER
  secret_key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# Sanitized
aws:
  access_key: [REDACTED-AWS-KEY]
  secret_key: [REDACTED-SECRET]
```

### CLI Usage

```bash
# Scan and preview
python -m config_sanitizer scan config.json

# Scan with custom output
python -m config_sanitizer scan config.json --output config.clean.json

# Scan without confirmation (auto-save)
python -m config_sanitizer scan config.json --yes

# Scan multiple files
python -m config_sanitizer scan *.env

# Custom redaction placeholder
python -m config_sanitizer scan config.json --placeholder "***REMOVED***"
```

### Output Example

```
╔══════════════════════════════════════════════════════════════╗
║              🔒 CONFIG FILE SANITIZER 🔒                      ║
╚══════════════════════════════════════════════════════════════╝

Scanning: config.json

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PREVIEW OF CHANGES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Line 3:  "stripe_key": "sk_test_PLACEHOLDER"
      →  "stripe_key": "[REDACTED-STRIPE-KEY]"

Line 7:  "aws_access": "AKIA_PLACEHOLDER"
      →  "aws_access": "[REDACTED-AWS-KEY]"

Line 12: "admin_email": "admin@company.com"
      →  "admin_email": "[REDACTED-EMAIL]"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUMMARY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total secrets found: 3
  • STRIPE_KEY: 1
  • AWS_ACCESS_KEY: 1
  • EMAIL: 1

Output file: config.clean.json

Save sanitized version? [y/N]: _
```

---

## Module 3: Log Scrubber

### Purpose

Clean sensitive data from log files before sharing with support or teammates.

### Implementation

**Location:** `backend/off_grid/log_scrubber/`

**Files:**

```
log_scrubber/
├── __init__.py
├── scrubber.py            # Main scrubber logic
├── stream_processor.py    # Streaming for large files
├── cli.py                 # CLI interface
└── README.md
```

### Workflow

```
┌─────────────────────────────────────────────────────────────┐
│  User runs: python -m log_scrubber clean app.log            │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Check file size:                                            │
│  • < 10MB → Load into memory                                │
│  • > 10MB → Stream line-by-line                             │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  For each line:                                              │
│  • Run through Detection Engine                             │
│  • Replace secrets with placeholders                        │
│  • Preserve timestamps and log structure                    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Write to output file:                                       │
│  • app.log → app.clean.log                                  │
│  • Never overwrite original                                 │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Generate summary:                                           │
│  • Total lines processed                                     │
│  • Secrets redacted (by category)                           │
│  • Output file location                                      │
└─────────────────────────────────────────────────────────────┘
```

### Supported Log Formats

**Plain text logs:**

```
2026-02-04 10:23:45 INFO User logged in: john@example.com
2026-02-04 10:24:12 ERROR API call failed with key: sk_test_abc123
2026-02-04 10:25:01 DEBUG Request from IP: 192.168.1.100

// Scrubbed
2026-02-04 10:23:45 INFO User logged in: [REDACTED-EMAIL]
2026-02-04 10:24:12 ERROR API call failed with key: [REDACTED-STRIPE-KEY]
2026-02-04 10:25:01 DEBUG Request from IP: [REDACTED-IP]
```

**JSON logs:**

```json
{"timestamp":"2026-02-04T10:23:45Z","level":"INFO","user":"john@example.com","session":"abc123"}

// Scrubbed
{"timestamp":"2026-02-04T10:23:45Z","level":"INFO","user":"[REDACTED-EMAIL]","session":"abc123"}
```

**Structured logs (key=value):**

```
time=2026-02-04T10:23:45Z level=info user=john@example.com api_key=sk_test_abc123

// Scrubbed
time=2026-02-04T10:23:45Z level=info user=[REDACTED-EMAIL] api_key=[REDACTED-STRIPE-KEY]
```

### CLI Usage

```bash
# Clean a single log file
python -m log_scrubber clean app.log

# Clean with custom output
python -m log_scrubber clean app.log --output safe.log

# Clean multiple files
python -m log_scrubber clean *.log

# Batch process directory
python -m log_scrubber clean logs/ --recursive

# Dry run (preview only)
python -m log_scrubber clean app.log --dry-run

# Show statistics only
python -m log_scrubber stats app.log
```

### Output Example

```
╔══════════════════════════════════════════════════════════════╗
║                  🧹 LOG SCRUBBER 🧹                           ║
╚══════════════════════════════════════════════════════════════╝

Processing: app.log (2.3 MB, 15,432 lines)

[████████████████████████████████████████] 100% Complete

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCRUBBING SUMMARY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Lines processed: 15,432
Secrets redacted: 47

By category:
  • EMAIL: 23
  • IPV4: 12
  • STRIPE_KEY: 6
  • AWS_ACCESS_KEY: 4
  • GENERIC_SECRET: 2

Output: app.clean.log (2.3 MB)

✅ Log file cleaned successfully!
```

### Streaming for Large Files

For files > 10MB, the scrubber uses streaming to avoid memory issues:

```python
def stream_scrub(input_path, output_path):
    with open(input_path, 'r') as infile, \
         open(output_path, 'w') as outfile:

        for line in infile:
            cleaned_line = scrub_line(line)
            outfile.write(cleaned_line)
```

---

## Shared Components

### Common Detection Engine

**File:** `backend/off_grid/shared/detection_wrapper.py`

```python
from sensi_scan.detection_engine import DetectionEngine
from sensi_scan.rule_registry import RULE_REGISTRY

class OffGridDetector:
    """
    Wrapper around Sensi-Scan detection engine for Off-Grid modules.
    Provides a consistent interface for all three modules.
    """

    def __init__(self):
        self.engine = DetectionEngine(RULE_REGISTRY)

    def scan_text(self, text: str, categories=None):
        """Scan text and return detections."""
        return self.engine.detect_in_text(text, categories)

    def scan_file(self, file_path: str, categories=None):
        """Scan a file and return detections."""
        with open(file_path, 'r') as f:
            content = f.read()
        return self.scan_text(content, categories)

    def redact_text(self, text: str, detections):
        """Redact secrets from text based on detections."""
        # Use existing redaction engine
        from sensi_scan.redaction_engine import RedactionEngine
        redactor = RedactionEngine()
        return redactor.redact_text(text, detections)
```

### Common CLI Utilities

**File:** `backend/off_grid/shared/cli_utils.py`

```python
def print_header(title):
    """Print a consistent header."""
    print("╔" + "═" * 62 + "╗")
    print(f"║{title.center(62)}║")
    print("╚" + "═" * 62 + "╝")

def print_separator():
    """Print a separator line."""
    print("━" * 64)

def confirm(message, default=False):
    """Prompt user for confirmation."""
    suffix = "[y/N]" if not default else "[Y/n]"
    response = input(f"{message} {suffix}: ").strip().lower()

    if not response:
        return default
    return response in ['y', 'yes']
```

---

## Security Guarantees

### What These Modules DO:

✅ Scan files locally using regex patterns  
✅ Detect 30+ categories of secrets  
✅ Provide clear, actionable warnings  
✅ Require explicit user confirmation  
✅ Never overwrite original files by default  
✅ Use deterministic, reproducible logic

### What These Modules DO NOT:

❌ Upload any data to cloud services  
❌ Store scanned content anywhere  
❌ Modify files without user approval  
❌ Send telemetry or analytics  
❌ Make network requests  
❌ Access files outside the specified paths  
❌ Modify Git history

---

## Failure Modes & Mitigations

### False Positives

**Problem:** Legitimate data flagged as secrets  
**Mitigation:**

- Use validators (Luhn for credit cards)
- Provide override flags (`--no-verify`, `--force`)
- Show full context in warnings
- Allow category-specific exclusions

### False Negatives

**Problem:** Secrets not detected  
**Mitigation:**

- Comprehensive regex patterns
- Regular rule updates
- User education (not 100% foolproof)
- Encourage manual review

### Performance Issues

**Problem:** Large files slow to scan  
**Mitigation:**

- Streaming for files > 10MB
- Skip binary files
- Parallel processing for batch operations
- Progress indicators

### Installation Conflicts

**Problem:** Git hook conflicts with existing hooks  
**Mitigation:**

- Backup existing hooks before install
- Provide uninstall command
- Support hook chaining (call existing hook)

---

## Installation & Setup

### Prerequisites

```bash
# Python 3.8+
python --version

# Install dependencies
cd backend/sensi_scan
pip install -r requirements.txt
```

### Module Installation

**Pre-Commit Guard:**

```bash
python backend/off_grid/pre_commit_guard/hook_installer.py install
```

**Config Sanitizer:**

```bash
# No installation needed - use directly
python -m config_sanitizer --help
```

**Log Scrubber:**

```bash
# No installation needed - use directly
python -m log_scrubber --help
```

---

## Testing Strategy

### Unit Tests

- Test each detection rule individually
- Test parsers for each file format
- Test streaming logic for large files
- Test error handling

### Integration Tests

- Test full workflow for each module
- Test with real-world examples
- Test edge cases (empty files, binary files, etc.)

### Security Tests

- Verify no network calls
- Verify no file writes without approval
- Verify no data persistence

---

## Future Enhancements

### Potential Additions

1. **Browser Extension** - Scan clipboard before pasting
2. **IDE Plugin** - Real-time secret detection while coding
3. **CI/CD Integration** - Scan PRs automatically
4. **Custom Rules** - User-defined patterns
5. **Encrypted Storage** - Securely store sanitized configs

### NOT Planned (Privacy Violations)

❌ Cloud-based scanning  
❌ Automatic uploads  
❌ Telemetry  
❌ Third-party integrations requiring network access

---

## Confirmation Checklist

### Module 1: Pre-Commit Leak Guard

- [x] Scans only staged files
- [x] Uses Sensi-Scan detection engine
- [x] Blocks commits if secrets found
- [x] Provides clear error messages
- [x] Supports override flag (`--no-verify`)
- [x] No network calls
- [x] No file modification
- [x] Deterministic behavior

### Module 2: Config File Sanitizer

- [x] Supports .env, .json, .yaml, .toml
- [x] Parses files safely (no eval)
- [x] Uses Sensi-Scan detection engine
- [x] Shows preview before saving
- [x] Requires user confirmation
- [x] Never overwrites original
- [x] No network calls
- [x] Preserves file structure

### Module 3: Log Scrubber

- [x] Supports .log, .txt, .json
- [x] Streams large files (> 10MB)
- [x] Uses Sensi-Scan detection engine
- [x] Detects API keys, IPs, emails, sessions
- [x] Preserves timestamps and structure
- [x] Supports batch processing
- [x] No network calls
- [x] Deterministic redaction

### Shared Components

- [x] Centralized detection rules
- [x] Category-based weights
- [x] Context-aware matching
- [x] Consistent redaction strategy
- [x] No duplicate regex logic
- [x] No hard-coded secrets
- [x] No cloud fallbacks

---

## Conclusion

These three Off-Grid modules provide a comprehensive, privacy-first solution for preventing accidental secret leaks. By leveraging the existing Sensi-Scan detection engine, they ensure consistency, maintainability, and security.

**Key Differentiators:**

- 100% local execution
- No external dependencies
- Explicit user control
- Safe defaults
- Clear, actionable output

**Next Steps:**

1. Implement Module 1 (Pre-Commit Guard)
2. Implement Module 2 (Config Sanitizer)
3. Implement Module 3 (Log Scrubber)
4. Write comprehensive tests
5. Create user documentation

---

**Document Status:** ✅ Ready for Implementation
