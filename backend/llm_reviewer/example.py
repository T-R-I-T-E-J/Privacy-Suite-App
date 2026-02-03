"""
Example: Using the Python LLM Code Reviewer
"""

from reviewer import LLMCodeReviewer

# Sample vulnerable code
SAMPLE_CODE = """
function login(username, password) {
    // SQL Injection vulnerability
    const query = "SELECT * FROM users WHERE username='" + username + "' AND password='" + password + "'";
    
    // Hardcoded credentials
    const adminPass = "admin123";
    
    // No input validation
    if (password === adminPass) {
        return true;
    }
    
    // XSS vulnerability - no sanitization
    document.getElementById('welcome').innerHTML = "Welcome " + username;
    
    return false;
}

// Race condition potential
let balance = 1000;
async function withdraw(amount) {
    if (balance >= amount) {
        // No atomic operation
        await delay(100);
        balance -= amount;
        return true;
    }
    return false;
}
"""

def main():
    print("🔒 Python LLM Code Reviewer Example\n")
    
    # Initialize reviewer
    print("📦 Initializing LLM (this downloads model on first run)...")
    reviewer = LLMCodeReviewer(
        model_path="Phi-3-mini-4k-instruct-q4.gguf",
        n_ctx=4096,
        n_gpu_layers=-1,  # Use all GPU layers
        temperature=0.3,
        verify_checksum=False  # Skip for demo
    )
    
    print("\n🔍 Analyzing sample code...\n")
    
    # Option 1: Regular analysis
    print("=" * 60)
    print("REGULAR ANALYSIS")
    print("=" * 60)
    result = reviewer.analyze_code(
        code=SAMPLE_CODE,
        filename="vulnerable.js",
        language="javascript"
    )
    print(result)
    
    print("\n" + "=" * 60)
    print("STREAMING ANALYSIS")
    print("=" * 60)
    
    # Option 2: Streaming analysis
    for token in reviewer.analyze_code_stream(
        code=SAMPLE_CODE,
        filename="vulnerable.js",
        language="javascript"
    ):
        print(token, end='', flush=True)
    
    print("\n\n✅ Analysis complete!")

if __name__ == "__main__":
    main()
