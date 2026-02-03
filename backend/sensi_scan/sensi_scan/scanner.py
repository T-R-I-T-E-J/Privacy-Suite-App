"""
SensiScan - Document Scanner
Core scanning logic for different file types
"""

import os
from pathlib import Path
from typing import List, Dict, Any
import mimetypes

try:
    from pdfminer.high_level import extract_text as extract_pdf
except ImportError:
    extract_pdf = None

try:
    import docx
except ImportError:
    docx = None

from .patterns import PatternMatcher

class DocumentScanner:
    """Scans documents for sensitive information"""
    
    def __init__(self):
        self.matcher = PatternMatcher()
    
    def scan_file(self, file_path: str) -> Dict[str, Any]:
        """
        Scan a single file
        
        Args:
            file_path: Absolute path to the file
            
        Returns:
            Dictionary containing scan results
        """
        path = Path(file_path)
        if not path.exists():
            return {"error": "File not found"}
            
        # Determine file type
        mime_type, _ = mimetypes.guess_type(file_path)
        ext = path.suffix.lower()
        
        content = ""
        
        try:
            if ext == '.pdf' and extract_pdf:
                content = self._read_pdf(file_path)
            elif (ext == '.docx' or ext == '.doc') and docx:
                content = self._read_docx(file_path)
            else:
                # Default to text read
                content = self._read_text(file_path)
                
        except Exception as e:
            return {
                "file": str(path),
                "status": "error",
                "error": str(e)
            }
            
        # Perform regex matching
        findings = self.matcher.find_matches(content)
        
        return {
            "file": str(path),
            "status": "clean" if not findings else "sensitive_data_found",
            "findings": findings,
            "scan_meta": {
                "size_bytes": path.stat().st_size,
                "mime_type": mime_type or "unknown"
            }
        }
    
    def _read_text(self, path: str) -> str:
        """Read text file with fallback encoding"""
        try:
            with open(path, 'r', encoding='utf-8') as f:
                return f.read()
        except UnicodeDecodeError:
            with open(path, 'r', encoding='latin-1') as f:
                return f.read()
                
    def _read_pdf(self, path: str) -> str:
        """Extract text from PDF"""
        return extract_pdf(path)
        
    def _read_docx(self, path: str) -> str:
        """Extract text from Word doc"""
        doc = docx.Document(path)
        return "\n".join([paragraph.text for paragraph in doc.paragraphs])
