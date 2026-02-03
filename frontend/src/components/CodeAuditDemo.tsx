import { useState } from 'react';
import CodeReviewer from './CodeReviewer';
import './CodeAuditDemo.css';

const SAMPLE_CODE = `// Sample code with potential security issues
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
}`;

function CodeAuditDemo() {
    const [code, setCode] = useState(SAMPLE_CODE);
    const [showReviewer, setShowReviewer] = useState(false);
    const [filename, setFilename] = useState('app.js');
    const [language, setLanguage] = useState('javascript');

    return (
        <div className="code-audit-demo">
            <div className="demo-header">
                <h1>🔒 Air-Gapped Code Auditor</h1>
                <p>100% Offline Security Analysis with WebLLM</p>
            </div>

            <div className="demo-content">
                {!showReviewer ? (
                    <div className="code-editor-section">
                        <div className="editor-controls">
                            <input
                                type="text"
                                value={filename}
                                onChange={(e) => setFilename(e.target.value)}
                                placeholder="filename.js"
                                className="filename-input"
                            />
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="language-select"
                            >
                                <option value="javascript">JavaScript</option>
                                <option value="typescript">TypeScript</option>
                                <option value="python">Python</option>
                                <option value="java">Java</option>
                                <option value="cpp">C++</option>
                                <option value="rust">Rust</option>
                            </select>
                        </div>

                        <textarea
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="code-editor"
                            placeholder="Paste your code here for security analysis..."
                            spellCheck={false}
                        />

                        <div className="editor-actions">
                            <button
                                onClick={() => setCode(SAMPLE_CODE)}
                                className="btn-secondary"
                            >
                                Load Sample Code
                            </button>
                            <button
                                onClick={() => setShowReviewer(true)}
                                className="btn-primary"
                                disabled={!code.trim()}
                            >
                                🔍 Start Security Audit
                            </button>
                        </div>

                        <div className="feature-grid">
                            <div className="feature-card">
                                <div className="feature-icon">🔒</div>
                                <h3>100% Offline</h3>
                                <p>No data leaves your machine. Network access is disabled.</p>
                            </div>
                            <div className="feature-card">
                                <div className="feature-icon">🧠</div>
                                <h3>Deep Analysis</h3>
                                <p>LLM-powered semantic understanding beyond regex patterns.</p>
                            </div>
                            <div className="feature-card">
                                <div className="feature-icon">⚡</div>
                                <h3>GPU Accelerated</h3>
                                <p>WebGPU hardware acceleration for fast inference.</p>
                            </div>
                            <div className="feature-card">
                                <div className="feature-icon">🛡️</div>
                                <h3>Memory Isolated</h3>
                                <p>Runs in dedicated Web Worker for security.</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <CodeReviewer
                        code={code}
                        filename={filename}
                        language={language}
                        onClose={() => setShowReviewer(false)}
                    />
                )}
            </div>
        </div>
    );
}

export default CodeAuditDemo;
