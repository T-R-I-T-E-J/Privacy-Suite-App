import os
import shutil
import docx
from pdfminer.high_level import extract_text
from .detectors import PrivacyDetector

class DocumentAnalyzer:
    def __init__(self):
        self.detector = PrivacyDetector()

    def analyze_file(self, input_path, output_path):
        """
        Analyzes a file, calculates score, and generates a redacted copy (if supported).
        """
        ext = os.path.splitext(input_path)[1].lower()
        findings = []
        redacted_created = False
        
        # 1. Extraction & Analysis
        if ext == '.pdf':
            # PDF: Extract text, but Limitation: No Redaction
            text = extract_text(input_path)
            findings = self.detector.scan_text(text)
            # Copy file as-is since we can't redact
            shutil.copy2(input_path, output_path)
            redacted_created = True
            
        elif ext == '.docx':
            # DOCX: Read, Analyze, Redact
            doc = docx.Document(input_path)
            
            # Helper to scan and redact a list of paragraphs (used for Body, Tables, etc.)
            def process_paragraphs(paragraph_list):
                local_findings = []
                for para in paragraph_list:
                    # New Unified Pipeline: Detect AND Redact in one pass
                    redacted_text, findings = self.detector.analyze_and_redact(para.text)
                    
                    if findings:
                        # Update DOCX paragraph only if changes occurred
                        if para.text != redacted_text:
                            para.text = redacted_text
                        local_findings.extend(findings)
                return local_findings

            # 1. Body Paragraphs
            findings.extend(process_paragraphs(doc.paragraphs))
            
            # 2. Tables
            for table in doc.tables:
                for row in table.rows:
                    for cell in row.cells:
                        findings.extend(process_paragraphs(cell.paragraphs))
            
            # 3. Headers/Footers
            for section in doc.sections:
                for header in [section.header, section.first_page_header, section.even_page_header]:
                    if header: 
                        findings.extend(process_paragraphs(header.paragraphs))
                        for table in header.tables:
                            for row in table.rows:
                                for cell in row.cells:
                                    findings.extend(process_paragraphs(cell.paragraphs))
                for footer in [section.footer, section.first_page_footer, section.even_page_footer]:
                    if footer: 
                        findings.extend(process_paragraphs(footer.paragraphs))
                        for table in footer.tables:
                            for row in table.rows:
                                for cell in row.cells:
                                    findings.extend(process_paragraphs(cell.paragraphs))

            doc.save(output_path)
            redacted_created = True
            
        elif ext in ['.txt', '.csv', '.log', '.md']:
            # Plain Text
            with open(input_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
        elif ext in ['.txt', '.csv', '.log', '.md']:
            # Plain Text
            with open(input_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            # Unified Pipeline
            redacted_content, findings = self.detector.analyze_and_redact(content)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(redacted_content)
                redacted_created = True
                
        elif ext in ['.jpg', '.png', '.jpeg']:
            # Image
            findings = self.detector.scan_image(input_path)
            # Copy image (Redaction of pixels needs Pillow drawing, simplified here to copy)
            shutil.copy2(input_path, output_path)
            redacted_created = True

        # 2. Scoring
        privacy_score, item_counts = self.detector.calculate_score(findings)
        
        # Format "detected_items" list for JSON
        detected_list = []
        for type_name, count in item_counts.items():
            detected_list.append({
                "type": type_name,
                "count": count,
                "context": "image" if type_name == "QR_CODE" else "text"
            })

        return {
            "privacy_score": privacy_score,
            "detected_items": detected_list,
            "redacted_file": output_path if redacted_created else None
        }
