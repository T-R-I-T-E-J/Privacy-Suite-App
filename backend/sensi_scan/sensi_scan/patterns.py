"""
SensiScan - Pattern Definitions
Regex patterns for sensitive information detection
"""

import regex as re

# PII Patterns
PATTERNS = {
    # Social Security Number (US) - Matches XXX-XX-XXXX
    "SSN": re.compile(r'\b(?!000|666|9\d{2})([0-8]\d{2})-(?!00)(\d{2})-(?!0000)(\d{4})\b'),
    
    # Email Address
    "EMAIL": re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
    
    # Credit Card Numbers (Major brands)
    "CREDIT_CARD": re.compile(r'\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})\b'),
    
    # IPv4 Address
    "IPV4": re.compile(r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b'),
    
    # API Keys / Secrets (Heuristic)
    # Looks for high entropy strings assigned to variables like "key", "token", "secret"
    "API_KEY": re.compile(r'(?i)(?:api_key|access_token|secret_key|password|passwd|pwd)\s*[:=]\s*["\']([a-zA-Z0-9_\-]{16,})["\']')
}

class PatternMatcher:
    """Matches text against sensitive patterns"""
    
    @staticmethod
    def find_matches(text: str) -> list:
        findings = []
        
        for name, pattern in PATTERNS.items():
            for match in pattern.finditer(text):
                # For API keys, we capture the group (the key itself)
                # For others, we capture the whole match
                value = match.group(1) if name == "API_KEY" and match.groups() else match.group(0)
                
                findings.append({
                    "type": name,
                    "value": PatternMatcher._mask_value(value),
                    "start": match.start(),
                    "end": match.end()
                })
                
        return findings
    
    @staticmethod
    def _mask_value(value: str) -> str:
        """Mask sensitive value for safe reporting"""
        if len(value) <= 4:
            return "*" * len(value)
        return value[:2] + "*" * (len(value) - 4) + value[-2:]
