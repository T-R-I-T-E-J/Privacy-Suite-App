"""
Off-Grid Detection Wrapper
Wrapper around Sensi-Scan detection engine for Off-Grid modules.
Provides a consistent interface for all three leak prevention modules.

100% local execution - No network calls - No data persistence
"""

import sys
import os
from pathlib import Path
from typing import List, Optional, Dict, Any

# Add sensi_scan to path
script_dir = Path(__file__).parent.parent.parent
sensi_scan_path = script_dir / "sensi_scan"
sys.path.insert(0, str(sensi_scan_path))

from sensi_scan.detection_engine import DetectionEngine, Detection
from sensi_scan.rule_registry import RULE_REGISTRY
from sensi_scan.redaction_engine import RedactionEngine


class OffGridDetector:
    """
    Wrapper around Sensi-Scan detection engine for Off-Grid modules.
    Provides a consistent interface for all three modules.
    
    Privacy guarantees:
    - 100% local execution
    - No network calls
    - No data persistence
    - Deterministic behavior
    """
    
    def __init__(self):
        """Initialize the detector with Sensi-Scan engine."""
        self.engine = DetectionEngine(RULE_REGISTRY)
        self.redactor = RedactionEngine()
    
    def scan_text(self, text: str, categories: Optional[List[str]] = None) -> List[Detection]:
        """
        Scan text and return detections.
        
        Args:
            text: Text content to scan
            categories: Optional list of specific categories to check
        
        Returns:
            List of Detection instances
        """
        if not text:
            return []
        
        return self.engine.detect_in_text(text, categories)
    
    def scan_file(self, file_path: str, categories: Optional[List[str]] = None) -> List[Detection]:
        """
        Scan a file and return detections.
        
        Args:
            file_path: Path to file to scan
            categories: Optional list of specific categories to check
        
        Returns:
            List of Detection instances
        """
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            return self.scan_text(content, categories)
        except Exception as e:
            # Return empty list on error (file might be binary, etc.)
            return []
    
    def redact_text(self, text: str, detections: List[Detection], 
                    placeholder: Optional[str] = None) -> str:
        """
        Redact secrets from text based on detections.
        
        Args:
            text: Original text
            detections: List of Detection instances
            placeholder: Optional custom placeholder (default: use rule labels)
        
        Returns:
            Redacted text
        """
        if not detections:
            return text
        
        # Sort detections by position (reverse order to maintain positions)
        sorted_detections = sorted(detections, key=lambda d: d.start_pos, reverse=True)
        
        result = text
        for detection in sorted_detections:
            # Use custom placeholder or rule-specific label
            replacement = placeholder or detection.metadata.get('redaction_label', '[REDACTED]')
            
            # Get the rule for this detection
            rule = RULE_REGISTRY.get(detection.category)
            if rule and not placeholder:
                replacement = rule.redaction_label
            
            # Replace the detected secret
            result = (
                result[:detection.start_pos] + 
                replacement + 
                result[detection.end_pos:]
            )
        
        return result
    
    def get_summary(self, detections: List[Detection]) -> Dict[str, Any]:
        """
        Generate a summary of detections.
        
        Args:
            detections: List of Detection instances
        
        Returns:
            Dictionary with summary statistics
        """
        return self.engine.get_detection_summary(detections)
    
    def get_categories(self) -> List[str]:
        """Get list of all available detection categories."""
        return RULE_REGISTRY.get_categories()
    
    def get_category_info(self, category: str) -> Optional[Dict[str, Any]]:
        """
        Get information about a specific category.
        
        Args:
            category: Category name
        
        Returns:
            Dictionary with category info or None
        """
        rule = RULE_REGISTRY.get(category)
        if not rule:
            return None
        
        return {
            'category': rule.category,
            'weight': rule.weight,
            'description': rule.description,
            'redaction_label': rule.redaction_label,
            'context': rule.context
        }


class FileTypeDetector:
    """
    Utility to detect file types and determine if they should be scanned.
    """
    
    # File extensions that should be scanned
    SCANNABLE_EXTENSIONS = {
        # Code files
        '.js', '.ts', '.jsx', '.tsx',
        '.py', '.rb', '.go', '.java', '.c', '.cpp', '.cs',
        '.php', '.swift', '.kt', '.rs',
        
        # Config files
        '.env', '.json', '.yaml', '.yml', '.toml', '.ini', '.conf', '.config',
        
        # Shell scripts
        '.sh', '.bash', '.zsh', '.fish',
        
        # Log files
        '.log', '.txt',
        
        # Markdown/Docs
        '.md', '.markdown', '.rst',
        
        # Other
        '.xml', '.properties', '.cfg'
    }
    
    # File patterns to always skip
    SKIP_PATTERNS = {
        'node_modules',
        '.git',
        '__pycache__',
        'venv',
        'env',
        '.venv',
        'dist',
        'build',
        '.next',
        'coverage',
        '.pytest_cache'
    }
    
    @classmethod
    def is_scannable(cls, file_path: str) -> bool:
        """
        Check if a file should be scanned.
        
        Args:
            file_path: Path to file
        
        Returns:
            True if file should be scanned
        """
        path = Path(file_path)
        
        # Check if in skip patterns
        for part in path.parts:
            if part in cls.SKIP_PATTERNS:
                return False
        
        # Check extension
        return path.suffix.lower() in cls.SCANNABLE_EXTENSIONS
    
    @classmethod
    def is_binary(cls, file_path: str) -> bool:
        """
        Check if a file is binary.
        
        Args:
            file_path: Path to file
        
        Returns:
            True if file is binary
        """
        try:
            with open(file_path, 'rb') as f:
                chunk = f.read(1024)
                # Check for null bytes (common in binary files)
                return b'\x00' in chunk
        except:
            return True


# Convenience function for quick scanning
def quick_scan(text_or_path: str, is_file: bool = False) -> tuple[List[Detection], Dict[str, Any]]:
    """
    Quick scan utility function.
    
    Args:
        text_or_path: Text content or file path
        is_file: True if text_or_path is a file path
    
    Returns:
        Tuple of (detections, summary)
    """
    detector = OffGridDetector()
    
    if is_file:
        detections = detector.scan_file(text_or_path)
    else:
        detections = detector.scan_text(text_or_path)
    
    summary = detector.get_summary(detections)
    
    return detections, summary


if __name__ == "__main__":
    # Test the detector
    print("=" * 70)
    print("OFF-GRID DETECTOR TEST")
    print("=" * 70)
    
    test_text = """
    AWS_ACCESS_KEY=AKIA_PLACEHOLDER
    STRIPE_KEY=sk_test_PLACEHOLDER
    EMAIL=admin@company.com
    PHONE=555-123-4567
    """
    
    detector = OffGridDetector()
    detections = detector.scan_text(test_text)
    
    print(f"\n✓ Detected {len(detections)} secrets:\n")
    
    for i, detection in enumerate(detections, 1):
        print(f"{i}. {detection.category:20} | {detection.value}")
    
    print("\n" + "=" * 70)
    print("REDACTED VERSION:")
    print("=" * 70)
    
    redacted = detector.redact_text(test_text, detections)
    print(redacted)
    
    print("\n" + "=" * 70)
    print("SUMMARY:")
    print("=" * 70)
    
    summary = detector.get_summary(detections)
    print(f"Total detections: {summary['total_detections']}")
    print(f"Total weight: {summary['total_weight']}")
    print("\nBy category:")
    for category, info in summary['by_category'].items():
        print(f"  • {category:20} | Count: {info['count']:2} | Weight: {info['weight']:3}")
