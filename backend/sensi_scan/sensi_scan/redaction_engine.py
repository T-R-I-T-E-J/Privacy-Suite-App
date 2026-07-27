"""
Sensi-Scan Redaction Engine
Rule-driven redaction system that references the centralized rule registry.
Global replacement ensures ALL occurrences are redacted.
"""

import re
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass

from .rule_registry import RULE_REGISTRY, DetectionRule


@dataclass
class RedactionResult:
    """
    Result of a redaction operation.
    
    Attributes:
        redacted_text: Text with sensitive data redacted
        redaction_count: Total number of redactions made
        redactions_by_category: Dict mapping category to count
        original_length: Length of original text
        redacted_length: Length of redacted text
    """
    redacted_text: str
    redaction_count: int
    redactions_by_category: Dict[str, int]
    original_length: int
    redacted_length: int
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "redacted_text": self.redacted_text,
            "total_redactions": self.redaction_count,
            "by_category": self.redactions_by_category,
            "original_length": self.original_length,
            "redacted_length": self.redacted_length,
            "compression_ratio": round(self.redacted_length / self.original_length, 3) if self.original_length > 0 else 1.0
        }


class RedactionEngine:
    """
    Core redaction engine that applies rules from the registry.
    Ensures ALL occurrences are globally replaced using the same patterns.
    """
    
    def __init__(self, registry=None):
        """
        Initialize redaction engine.
        
        Args:
            registry: RuleRegistry instance (defaults to global RULE_REGISTRY)
        """
        self.registry = registry or RULE_REGISTRY
    
    def redact_text(self, text: str, categories: Optional[List[str]] = None,
                    preserve_structure: bool = True) -> RedactionResult:
        """
        Redact sensitive data in text using registered rules.
        ALL occurrences are globally replaced.
        
        Args:
            text: Original text content
            categories: Optional list of specific categories to redact (None = all)
            preserve_structure: If True, maintain text structure and formatting
        
        Returns:
            RedactionResult instance with redacted text and statistics
        """
        if not text:
            return RedactionResult(
                redacted_text="",
                redaction_count=0,
                redactions_by_category={},
                original_length=0,
                redacted_length=0
            )
        
        original_length = len(text)
        working_text = text
        total_redactions = 0
        redactions_by_category = {}
        
        # Get applicable rules for text context
        rules = self._get_applicable_rules("text", categories)
        
        # Apply each rule globally
        for rule in rules:
            redacted, count = self._apply_rule_globally(working_text, rule)
            
            if count > 0:
                working_text = redacted
                total_redactions += count
                redactions_by_category[rule.category] = count
        
        return RedactionResult(
            redacted_text=working_text,
            redaction_count=total_redactions,
            redactions_by_category=redactions_by_category,
            original_length=original_length,
            redacted_length=len(working_text)
        )
    
    def redact_text_with_validation(self, text: str, categories: Optional[List[str]] = None) -> RedactionResult:
        """
        Redact text with validation (e.g., Luhn algorithm for credit cards).
        Only validated matches are redacted.
        
        Args:
            text: Original text content
            categories: Optional list of specific categories to redact
        
        Returns:
            RedactionResult instance
        """
        if not text:
            return RedactionResult(
                redacted_text="",
                redaction_count=0,
                redactions_by_category={},
                original_length=0,
                redacted_length=0
            )
        
        original_length = len(text)
        working_text = text
        total_redactions = 0
        redactions_by_category = {}
        
        # Get applicable rules
        rules = self._get_applicable_rules("text", categories)
        
        # Apply each rule with validation
        for rule in rules:
            if rule.validator:
                # Use validation-aware redaction
                redacted, count = self._apply_rule_with_validation(working_text, rule)
            else:
                # Standard global replacement
                redacted, count = self._apply_rule_globally(working_text, rule)
            
            if count > 0:
                working_text = redacted
                total_redactions += count
                redactions_by_category[rule.category] = count
        
        return RedactionResult(
            redacted_text=working_text,
            redaction_count=total_redactions,
            redactions_by_category=redactions_by_category,
            original_length=original_length,
            redacted_length=len(working_text)
        )
    
    def redact_to_safe_preview(self, text: str, max_length: int = 500,
                               categories: Optional[List[str]] = None) -> str:
        """
        Create a safe preview of text with redactions applied.
        Useful for showing snippets in UI.
        
        Args:
            text: Original text
            max_length: Maximum length of preview
            categories: Optional categories to redact
        
        Returns:
            Truncated and redacted text
        """
        result = self.redact_text_with_validation(text, categories)
        
        if len(result.redacted_text) <= max_length:
            return result.redacted_text
        
        return result.redacted_text[:max_length] + "..."
    
    # ═══════════════════════════════════════════════════════════════
    # CORE REDACTION LOGIC
    # ═══════════════════════════════════════════════════════════════
    
    def _apply_rule_globally(self, text: str, rule: DetectionRule) -> Tuple[str, int]:
        """
        Apply a single rule globally to replace ALL occurrences.
        
        Args:
            text: Text to process
            rule: DetectionRule to apply
        
        Returns:
            Tuple of (redacted_text, replacement_count)
        """
        count = 0
        
        def replacer(match: re.Match) -> str:
            nonlocal count
            count += 1
            
            # Handle capture groups
            if rule.capture_group > 0 and match.lastindex and match.lastindex >= rule.capture_group:
                # Replace only the captured group within the full match
                full_match = match.group(0)
                captured = match.group(rule.capture_group)
                return full_match.replace(captured, rule.redaction_label)
            
            # Replace entire match
            return rule.redaction_label
        
        # Global substitution using re.sub
        redacted_text = rule.pattern.sub(replacer, text)
        
        return redacted_text, count
    
    def _apply_rule_with_validation(self, text: str, rule: DetectionRule) -> Tuple[str, int]:
        """
        Apply a rule with validation - only redact validated matches.
        
        Args:
            text: Text to process
            rule: DetectionRule with validator
        
        Returns:
            Tuple of (redacted_text, replacement_count)
        """
        if not rule.validator:
            return self._apply_rule_globally(text, rule)
        
        count = 0
        
        def replacer(match: re.Match) -> str:
            nonlocal count
            
            # Extract the value to validate
            if rule.capture_group > 0 and match.lastindex and match.lastindex >= rule.capture_group:
                value_to_validate = match.group(rule.capture_group)
            else:
                value_to_validate = match.group(0)
            
            # Validate
            if not rule.validator(value_to_validate):
                # Don't redact - return original
                return match.group(0)
            
            count += 1
            
            # Redact validated match
            if rule.capture_group > 0 and match.lastindex and match.lastindex >= rule.capture_group:
                full_match = match.group(0)
                captured = match.group(rule.capture_group)
                return full_match.replace(captured, rule.redaction_label)
            
            return rule.redaction_label
        
        redacted_text = rule.pattern.sub(replacer, text)
        
        return redacted_text, count
    
    def _get_applicable_rules(self, context: str, categories: Optional[List[str]] = None) -> List[DetectionRule]:
        """
        Get rules applicable for the given context and categories.
        
        Args:
            context: "text" or "image"
            categories: Optional list of specific categories
        
        Returns:
            List of DetectionRule instances
        """
        rules = self.registry.get_all(context=context)
        
        if categories:
            rules = [r for r in rules if r.category in categories]
        
        return rules


# ═══════════════════════════════════════════════════════════════
# CONVENIENCE FUNCTIONS
# ═══════════════════════════════════════════════════════════════

def redact_sensitive_data(text: str, categories: Optional[List[str]] = None,
                         validate: bool = True) -> RedactionResult:
    """
    Convenience function to redact sensitive data from text.
    
    Args:
        text: Original text
        categories: Optional list of categories to redact
        validate: If True, use validation (e.g., Luhn for credit cards)
    
    Returns:
        RedactionResult instance
    """
    engine = RedactionEngine()
    
    if validate:
        return engine.redact_text_with_validation(text, categories)
    else:
        return engine.redact_text(text, categories)


def create_safe_preview(text: str, max_length: int = 500) -> str:
    """
    Create a safe preview with all sensitive data redacted.
    
    Args:
        text: Original text
        max_length: Maximum preview length
    
    Returns:
        Redacted preview string
    """
    engine = RedactionEngine()
    return engine.redact_to_safe_preview(text, max_length)


if __name__ == "__main__":
    # Demonstration
    print("═" * 70)
    print("SENSI-SCAN REDACTION ENGINE")
    print("═" * 70)
    
    # Test document with multiple occurrences
    test_document = """
    CONFIDENTIAL CUSTOMER DATA
    
    Customer 1:
    Email: alice@company.com
    Phone: 555-123-4567
    SSN: 123-45-6789
    Credit Card: 4532-1488-0343-6467
    
    Customer 2:
    Email: bob@startup.io
    Phone: 555-987-6543
    SSN: 987-65-4321
    Credit Card: 5425-2334-3010-9903
    
    API Keys:
    Stripe: sk_test_PLACEHOLDER
    AWS: AKIA_PLACEHOLDER
    GitHub: ghp_PLACEHOLDER
    
    Email alice@company.com again for confirmation.
    """
    
    engine = RedactionEngine()
    
    print("\n" + "─" * 70)
    print("ORIGINAL TEXT")
    print("─" * 70)
    print(test_document[:300] + "...")
    
    print("\n" + "─" * 70)
    print("REDACTED TEXT (with validation)")
    print("─" * 70)
    
    result = engine.redact_text_with_validation(test_document)
    print(result.redacted_text[:400] + "...")
    
    print("\n" + "─" * 70)
    print("REDACTION STATISTICS")
    print("─" * 70)
    print(f"Total Redactions: {result.redaction_count}")
    print(f"Original Length: {result.original_length} chars")
    print(f"Redacted Length: {result.redacted_length} chars")
    print(f"\nRedactions by Category:")
    for category, count in sorted(result.redactions_by_category.items()):
        print(f"  • {category:20} : {count} occurrence(s)")
    
    print("\n" + "═" * 70)
    print("VALIDATION TEST: Invalid Credit Card")
    print("═" * 70)
    
    # Test with invalid credit card (should NOT be redacted)
    invalid_cc_text = "Invalid CC: 1234-5678-9012-3456 (fails Luhn)"
    invalid_result = engine.redact_text_with_validation(invalid_cc_text)
    
    print(f"Original: {invalid_cc_text}")
    print(f"Redacted: {invalid_result.redacted_text}")
    print(f"Redactions: {invalid_result.redaction_count} (should be 0)")
