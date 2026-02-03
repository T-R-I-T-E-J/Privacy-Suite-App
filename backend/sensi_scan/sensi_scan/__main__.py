#!/usr/bin/env python3
"""
SensiScan CLI Entry Point
Scans documents for sensitive information
"""

import sys
import json
import argparse
from pathlib import Path
from colorama import init, Fore, Style

# Initialize colorama for Windows
init()

from .scanner import DocumentScanner

def scan_document(file_path: str) -> dict:
    """
    Scan a document for sensitive information
    
    Args:
        file_path: Path to the document to scan
        
    Returns:
        Dictionary with scan results
    """
    scanner = DocumentScanner()
    return scanner.scan_file(file_path)

def main():
    """Main CLI entry point"""
    parser = argparse.ArgumentParser(
        description="SensiScan - Document Sensitive Information Scanner"
    )
    parser.add_argument(
        "command",
        choices=["scan", "version"],
        help="Command to execute"
    )
    parser.add_argument(
        "file",
        nargs="?",
        help="File to scan"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output results as JSON"
    )
    
    args = parser.parse_args()
    
    if args.command == "version":
        from . import __version__
        print(f"SensiScan v{__version__}")
        return 0
    
    if args.command == "scan":
        if not args.file:
            print(f"{Fore.RED}Error: File path required for scan command{Style.RESET_ALL}", file=sys.stderr)
            return 1
        
        file_path = Path(args.file)
        if not file_path.exists():
            print(f"{Fore.RED}Error: File not found: {file_path}{Style.RESET_ALL}", file=sys.stderr)
            return 1
        
        # Perform scan
        results = scan_document(str(file_path))
        
        # Output results
        if args.json:
            print(json.dumps(results, indent=2))
        else:
            print(f"{Fore.GREEN}✓ Scan complete{Style.RESET_ALL}")
            print(f"File: {results['file']}")
            print(f"Status: {results['status']}")
            print(f"Findings: {len(results['findings'])}")
        
        return 0
    
    return 1

if __name__ == "__main__":
    sys.exit(main())
