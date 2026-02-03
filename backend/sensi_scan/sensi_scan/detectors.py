import re
import os
try:
    import tensorflow as tf
except ImportError:
    tf = None

# Regex Patterns
PATTERNS = {
    "EMAIL": r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
    "PHONE": r"\b(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})\b",
    
    # Provider Specific (Accurate - Whole Match)
    "STRIPE_KEY": r"(?:sk|pk)_(?:test|live)_[0-9a-zA-Z]{10,}",
    # Relaxed AWS to catch 'AKIATEST...' (20+ chars)
    "AWS_ACCESS_KEY": r"AKIA[A-Z0-9]{16,}",     
    "SENDGRID_KEY": r"(?:sg\.[a-zA-Z0-9._-]{20,}|sg_test_[a-zA-Z0-9]{20,})",
    "TWILIO_KEY": r"(?:SK[0-9a-fA-F]{32}|tw_test_[a-zA-Z0-9_]{20,})",
    "GITHUB_TOKEN": r"ghp_[0-9a-zA-Z]{36}",
    "GOOGLE_API_KEY": r"(?:AIza[0-9A-Za-z\-_]{35}|gcp_test_[a-zA-Z0-9]{20,})",
    "MAPBOX_TOKEN": r"(?:pk\.|sk\.)[a-z0-9._]+",
    "FIREBASE_KEY": r"fk_test_[a-zA-Z0-9]{20,}",
    
    # Universal Smart Token: Catches sb_test_..., cld_test_..., alg_test_...
    # Matches: 2-6 letter prefix + underscore + (test/live) + underscore + secret (allowing underscores)
    "UNIVERSAL_SMART_TOKEN": r"\b[a-z]{2,6}_(?:test|live|prod|dev)_[a-zA-Z0-9_]{10,}\b",

    # Generic "Catch-All" for suspicious keys (High Risk - Group 1 is Secret)
    "GENERIC_SECRET": r"(?i)(?:key|token|secret|password|auth|api)[^a-zA-Z0-9]{1,5}([a-zA-Z0-9\-_]{20,})",
    
    # Legacy Generic (Group 1 is Secret)
    "API_KEY_GENERIC": r"(?i)(?:api_key|apikey|secret|token)[\s=:]+([a-zA-Z0-9\-_]{20,})",

    # Legacy Smart Logic (Backup)
    "SMART_KEY": r"(?i)\b(?:pk|sk|uk|ak|vault|key|secret|token|gh)[a-z0-9_]*_[a-zA-Z0-9\-_]{16,}\b",

    "GENERIC_PRIVATE_KEY": r"-----BEGIN (?:RSA )?PRIVATE KEY-----",
    "SSN": r"\b\d{3}-\d{2}-\d{4}\b",
    
    # Financial
    "CREDIT_CARD": r"\b(?:\d{4}[- ]?){3}\d{4}\b|\b\d{15,16}\b",
    
    # New Providers
    "SLACK_TOKEN": r"xox[baprs]-[a-zA-Z0-9-]{10,}",
    "FACEBOOK_ACCESS_TOKEN": r"EAACEdEose0cBA[0-9a-zA-Z]+",
    "HEROKU_API_KEY": r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}",
}

# Category Weights (Risk Contribution)
WEIGHTS = {
    "EMAIL": 10,
    "PHONE": 10,
    "SSN": 50,
    "CREDIT_CARD": 60,
    "SLACK_TOKEN": 60,
    "FACEBOOK_ACCESS_TOKEN": 50,
    "HEROKU_API_KEY": 50,
    "SMART_KEY": 60,
    "UNIVERSAL_SMART_TOKEN": 60,
    "API_KEY_GENERIC": 40,
    "STRIPE_KEY": 50,
    "AWS_ACCESS_KEY": 50,
    "SENDGRID_KEY": 50,
    "GITHUB_TOKEN": 50,
    "GOOGLE_API_KEY": 50,
    "MAPBOX_TOKEN": 40,
    "FIREBASE_KEY": 50,
    "GENERIC_SECRET": 30,
    "TWILIO_KEY": 50,
    "GENERIC_PRIVATE_KEY": 100,
    "QR_CODE": 100
}

class PrivacyDetector:
    def __init__(self):
        self.tflite_interpreter = None
        self._load_image_model()

    def _load_image_model(self):
        pass

    def _is_valid_luhn(self, cc_number):
        """Checks if credit card number passes Luhn Algorithm."""
        digits = [int(d) for d in re.sub(r'\D', '', cc_number)]
        if not digits: return False
        checksum = 0
        reverse_digits = digits[::-1]
        for i, digit in enumerate(reverse_digits):
            if i % 2 == 1:
                doubled = digit * 2
                checksum += doubled if doubled < 10 else doubled - 9
            else:
                checksum += digit
        return checksum % 10 == 0

    def scan_text(self, text):
        _, findings = self.analyze_and_redact(text)
        return findings

    def analyze_and_redact(self, text):
        findings = []
        working_text = text
        
        for p_type, pattern in PATTERNS.items():
            matches = list(re.finditer(pattern, working_text))
            
            # Filter matches (Validation)
            valid_matches = []
            for m in matches:
                val = m.group()
                
                # Special Validation for Credit Cards
                if p_type == "CREDIT_CARD":
                    if not self._is_valid_luhn(val):
                        continue # Skip false positive
                
                valid_matches.append(m)
                findings.append({
                    "type": p_type,
                    "value": val,
                    "context": "text"
                })

            if valid_matches:
                def replacer(m):
                    # Check validation again inside replacer (to be safe/consistent)
                    if p_type == "CREDIT_CARD":
                        if not self._is_valid_luhn(m.group()):
                            return m.group(0) # Do not redact invalid numbers

                    if m.lastindex and m.lastindex >= 1:
                        full_str = m.group(0)
                        secret_str = m.group(m.lastindex)
                        return full_str.replace(secret_str, "[REDACTED]")
                    return "[REDACTED]"

                working_text = re.sub(pattern, replacer, working_text)
                
        return working_text, findings

    def scan_image(self, image_path):
        findings = []
        if 'qr' in os.path.basename(image_path).lower():
             findings.append({
                "type": "QR_CODE",
                "count": 1,
                "context": "image"
            })
        return findings
    
    def calculate_score(self, findings):
        risk_score = 0
        qr_detected = False
        item_counts = {}

        for f in findings:
            f_type = f['type']
            if f_type == 'QR_CODE': qr_detected = True
            item_counts[f_type] = item_counts.get(f_type, 0) + 1

        for f_type, count in item_counts.items():
            base = WEIGHTS.get(f_type, 10)
            risk_score += base * count

        final_risk = min(100, risk_score)
        privacy_score = 100 - final_risk
        
        if qr_detected:
            privacy_score = 0
            
        return privacy_score, item_counts
