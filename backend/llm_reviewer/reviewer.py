"""
LLM Code Reviewer using llama-cpp-python
Air-gapped semantic code analysis
"""

from llama_cpp import Llama
from pathlib import Path
import json
from typing import Dict, List, Optional, Generator
import hashlib

class LLMCodeReviewer:
    """Air-gapped code reviewer using local Phi-3 model"""
    
    # Security-focused system prompt
    SYSTEM_PROMPT = """You are an offline security auditor and code reviewer. Analyze code for:

1. **Security Vulnerabilities:**
   - SQL injection, XSS, CSRF
   - Authentication/authorization flaws
   - Insecure data handling
   - Hardcoded secrets or credentials

2. **Logical Flaws:**
   - Race conditions
   - Null pointer dereferences
   - Buffer overflows
   - Memory leaks

3. **Best Practices:**
   - Code quality issues
   - Performance problems
   - Improper error handling

Output your analysis in markdown with:
- **Severity:** Critical, High, Medium, Low
- **Issue:** Brief description
- **Line:** Approximate line number
- **Recommendation:** How to fix

Be concise and actionable."""

    def __init__(
        self,
        model_path: str,
        n_ctx: int = 4096,
        n_gpu_layers: int = -1,  # -1 = all layers on GPU
        temperature: float = 0.3,
        seed: int = 0,
        verify_checksum: bool = True
    ):
        """
        Initialize the LLM reviewer
        
        Args:
            model_path: Path to GGUF model file
            n_ctx: Context window size
            n_gpu_layers: Number of layers to offload to GPU (-1 = all)
            temperature: Sampling temperature (0.1-0.5 for security)
            seed: Random seed for reproducibility
            verify_checksum: Verify model integrity
        """
        # Shared model directory
        shared_model_dir = Path(__file__).parent.parent / "airgap_model" / "models"
        
        # Check if path is just a filename, if so look in shared dir
        if not Path(model_path).is_absolute() and not Path(model_path).exists():
            potential_path = shared_model_dir / model_path
            if potential_path.exists():
                model_path = str(potential_path)

        self.model_path = Path(model_path)
        self.temperature = temperature
        self.seed = seed
        
        # Verify model exists
        if not self.model_path.exists():
            raise FileNotFoundError(f"Model not found: {model_path}")
        
        # Verify checksum if requested
        if verify_checksum:
            print("Verifying model integrity...")
            self._verify_model_integrity()
        
        # Initialize Llama
        print(f"Loading model: {self.model_path.name}")
        self.llm = Llama(
            model_path=str(self.model_path),
            n_ctx=n_ctx,
            n_gpu_layers=n_gpu_layers,
            seed=seed,
            verbose=False
        )
        print("Model loaded successfully!")
    
    def _verify_model_integrity(self) -> None:
        """Verify model file integrity using SHA-256"""
        # This is a placeholder - in production, compare against known hash
        sha256 = hashlib.sha256()
        with open(self.model_path, 'rb') as f:
            # Read in chunks to handle large files
            for chunk in iter(lambda: f.read(8192), b''):
                sha256.update(chunk)
        
        checksum = sha256.hexdigest()
        print(f"   SHA-256: {checksum[:16]}...")
        # In production: assert checksum == KNOWN_GOOD_HASH
    
    def analyze_code(
        self,
        code: str,
        filename: str = "code.txt",
        language: str = "javascript",
        max_tokens: int = 1024,
        stream: bool = False
    ) -> str:
        """
        Analyze code for security issues
        
        Args:
            code: Source code to analyze
            filename: Name of the file
            language: Programming language
            max_tokens: Maximum response tokens
            stream: Stream response tokens
            
        Returns:
            Analysis results as markdown string
        """
        # Construct analysis prompt
        user_prompt = f"""Analyze the following {language} code from file "{filename}":

```{language}
{code}
```

Provide a security and code quality review."""

        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ]
        
        # Generate response
        response = self.llm.create_chat_completion(
            messages=messages,
            max_tokens=max_tokens,
            temperature=self.temperature,
            stream=stream
        )
        
        if stream:
            return response  # Return generator
        else:
            return response['choices'][0]['message']['content']
    
    def analyze_code_stream(
        self,
        code: str,
        filename: str = "code.txt",
        language: str = "javascript",
        max_tokens: int = 1024
    ) -> Generator[str, None, None]:
        """
        Stream code analysis results token by token
        
        Yields:
            Individual tokens as they're generated
        """
        response_stream = self.analyze_code(
            code=code,
            filename=filename,
            language=language,
            max_tokens=max_tokens,
            stream=True
        )
        
        for chunk in response_stream:
            delta = chunk['choices'][0]['delta']
            if 'content' in delta:
                yield delta['content']
    
    def batch_analyze(
        self,
        files: List[Dict[str, str]],
        output_file: Optional[str] = None
    ) -> List[Dict[str, any]]:
        """
        Analyze multiple files in batch
        
        Args:
            files: List of dicts with 'code', 'filename', 'language'
            output_file: Optional JSON output file
            
        Returns:
            List of analysis results
        """
        results = []
        
        for i, file_info in enumerate(files, 1):
            print(f"\n[{i}/{len(files)}] Analyzing {file_info['filename']}...")
            
            analysis = self.analyze_code(
                code=file_info['code'],
                filename=file_info['filename'],
                language=file_info.get('language', 'javascript')
            )
            
            results.append({
                'filename': file_info['filename'],
                'language': file_info.get('language', 'javascript'),
                'analysis': analysis
            })
        
        # Save to file if requested
        if output_file:
            with open(output_file, 'w') as f:
                json.dump(results, f, indent=2)
            print(f"\n✅ Results saved to: {output_file}")
        
        return results


def main():
    """CLI entry point for testing"""
    import argparse
    
    parser = argparse.ArgumentParser(description="LLM Code Reviewer")
    parser.add_argument('code_file', help='Path to code file to analyze')
    parser.add_argument('--model', required=True, help='Path to GGUF model')
    parser.add_argument('--language', default='javascript', help='Programming language')
    parser.add_argument('--stream', action='store_true', help='Stream output')
    parser.add_argument('--output', help='Output file for results')
    
    args = parser.parse_args()
    
    # Load code
    with open(args.code_file, 'r') as f:
        code = f.read()
    
    # Force UTF-8 stdout for Windows
    import sys
    if sys.platform == 'win32':
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')

    # Initialize reviewer
    reviewer = LLMCodeReviewer(model_path=args.model)
    
    # Analyze
    print(f"\nAnalyzing {args.code_file}...\n")
    
    if args.stream:
        for token in reviewer.analyze_code_stream(
            code=code,
            filename=Path(args.code_file).name,
            language=args.language
        ):
            print(token, end='', flush=True)
        print()  # Newline at end
    else:
        result = reviewer.analyze_code(
            code=code,
            filename=Path(args.code_file).name,
            language=args.language
        )
        print(result)
    
    # Save if requested
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(result)
        print(f"\nSaved to: {args.output}")


if __name__ == "__main__":
    main()
