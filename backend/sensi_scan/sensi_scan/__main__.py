import sys
import argparse
import json
from .analyzer import DocumentAnalyzer

def main():
    parser = argparse.ArgumentParser(description="Sensi-Scan Privacy Analysis Tool")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # analyze command
    analyze_parser = subparsers.add_parser("analyze")
    analyze_parser.add_argument("input_path", help="Path to input file")
    analyze_parser.add_argument("--out", dest="output_path", required=True, help="Path to output (redacted) file")

    args = parser.parse_args()

    if args.command == "analyze":
        try:
            analyzer = DocumentAnalyzer()
            result = analyzer.analyze_file(args.input_path, args.output_path)
            
            # Strict Rule: Output JSON ONLY via stdout
            print(json.dumps(result, indent=2))
            sys.exit(0)
            
        except Exception as e:
            # Errors via stderr
            print(f"Error: {str(e)}", file=sys.stderr)
            sys.exit(1)

if __name__ == "__main__":
    main()
