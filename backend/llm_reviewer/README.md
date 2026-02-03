# 🐍 Python LLM Code Reviewer

Air-gapped code security analysis using **llama-cpp-python** and **Phi-3**.

## 🚀 Quick Start

### 1. Install Dependencies

```powershell
cd backend\llm_reviewer
pip install -r requirements.txt
```

For **GPU acceleration** (CUDA):
```powershell
pip install llama-cpp-python --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cu121
```

### 2. Download Model

The model is downloaded automatically from HuggingFace:
- **Repo:** `microsoft/Phi-3-mini-4k-instruct-gguf`
- **File:** `Phi-3-mini-4k-instruct-fp16.gguf` (7.6 GB) or `Phi-3-mini-4k-instruct-q4.gguf` (2.4 GB)

### 3. Run Analysis

```python
from reviewer import LLMCodeReviewer

# Initialize (downloads model on first run)
reviewer = LLMCodeReviewer(
    model_path="Phi-3-mini-4k-instruct-q4.gguf"
)

# Analyze code
result = reviewer.analyze_code(
    code=your_code,
    filename="app.js",
    language="javascript"
)

print(result)
```

### CLI Usage

```powershell
python reviewer.py code.js --model Phi-3-mini-4k-instruct-q4.gguf --stream
```

## 📊 Features

- ✅ **100% Offline** - No internet after model download
- ✅ **GPU Accelerated** - CUDA support via llama.cpp
- ✅ **Streaming** - Real-time token generation
- ✅ **Batch Processing** - Multiple files
- ✅ **SHA-256 Verification** - Binary integrity checks
- ✅ **Deterministic** - Fixed seed for reproducibility

## 🛡️ Security Analysis

The reviewer checks for:

1. **Security Vulnerabilities**
   - SQL injection, XSS, CSRF
   - Auth/authz flaws
   - Hardcoded secrets

2. **Logical Flaws**
   - Race conditions
   - Memory issues
   - Null pointers

3. **Best Practices**
   - Code quality
   - Performance
   - Error handling

## 🎯 Example

```python
code = """
function login(username, password) {
    const query = "SELECT * FROM users WHERE user='" + username + "'";
    // SQL injection vulnerability!
}
"""

reviewer = LLMCodeReviewer(model_path="phi3-mini-q4.gguf")
analysis = reviewer.analyze_code(code, "login.js", "javascript")
print(analysis)
```

**Output:**
```markdown
## Security Analysis

**Severity:** Critical
**Issue:** SQL Injection Vulnerability
**Line:** 2
**Recommendation:** Use parameterized queries
```

## ⚙️ Configuration

```python
reviewer = LLMCodeReviewer(
    model_path="phi3-mini-q4.gguf",
    n_ctx=4096,           # Context window
    n_gpu_layers=-1,      # -1 = all on GPU
    temperature=0.3,      # 0.1-0.5 for security
    seed=0,               # Reproducibility
    verify_checksum=True  # SHA-256 check
)
```

## 🔌 API Server (Optional)

Create a Flask API:

```python
from flask import Flask, request, jsonify
from reviewer import LLMCodeReviewer

app = Flask(__name__)
reviewer = LLMCodeReviewer(model_path="phi3-mini-q4.gguf")

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.json
    result = reviewer.analyze_code(
        code=data['code'],
        filename=data.get('filename', 'code.txt'),
        language=data.get('language', 'javascript')
    )
    return jsonify({'analysis': result})

if __name__ == '__main__':
    app.run(port=5000)
```

Then frontend can call: `POST http://localhost:5000/analyze`

## 📦 Integration with Privacy Suite

The backend can be called from:
1. **Frontend** - via HTTP API
2. **Electron** - spawn Python process
3. **CLI** - direct Python execution

## 🎊 Ready to Use!

Install dependencies and start analyzing! 🚀
