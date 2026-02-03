import React, { useState, useEffect } from 'react';
import * as webllm from "@mlc-ai/web-llm";

export const WebLLMModule: React.FC = () => {
  const [engine, setEngine] = useState<webllm.MLCEngineInterface | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [chatHistory, setChatHistory] = useState<{role: string, content: string}[]>([]);
  const [input, setInput] = useState("");
  
  // Using Phi-3 Mini: Best-in-class small model for code & reasoning
  const selectedModel = "Phi-3-mini-4k-instruct-q4f16_1-MLC";

  useEffect(() => {
    // Auto-load engine on mount
    initEngine();
  }, []);

  const initEngine = async () => {
    setLoading(true);
    setProgress("Initializing WebGPU Engine...");
    
    try {
      const initProgressCallback = (report: webllm.InitProgressReport) => {
        setProgress(report.text);
      };

      const newEngine = await webllm.CreateMLCEngine(
        selectedModel,
        { initProgressCallback: initProgressCallback }
      );
      
      setEngine(newEngine);
      setLoading(false);
      
      // Initial greeting
      setChatHistory([{
        role: "assistant", 
        content: "I am ready! Paste your code below for a privacy review. Everything stays on this device."
      }]);

    } catch (err: any) {
      setLoading(false);
      setProgress(`Error: ${err.message}. (Ensure your GPU drivers are up to date and WebGPU is supported).`);
    }
  };

  const handleSend = async () => {
    if (!engine || !input.trim()) return;

    const userMsg = { role: "user", content: input };
    setChatHistory(prev => [...prev, userMsg]);
    setInput("");
    
    // Add placeholder for AI response
    setChatHistory(prev => [...prev, { role: "assistant", content: "Analyzing..." }]);

    try {
      const response = await engine.chat.completions.create({
        messages: [...chatHistory, userMsg] as any,
        temperature: 0.5,
        max_tokens: 500,
      });

      const aiMsg = response.choices[0].message;
      
      // Update the last message with real content
      setChatHistory(prev => [
        ...prev.slice(0, -1),
        { role: "assistant", content: aiMsg.content || "" }
      ]);
      
    } catch (err) {
      setChatHistory(prev => [
        ...prev.slice(0, -1),
        { role: "assistant", content: "Error generating response." }
      ]);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', height: '80vh', display: 'flex', flexDirection: 'column' }}>
      <div className="header" style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>🤖 AI Privacy Reviewer</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Powered by Local WebLLM (Phi-3 Mini) - No Data Uploads</p>
      </div>

      <div className="card" style={{ 
        flex: 1, 
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        padding: 0 // Override card padding for edge-to-edge feel
      }}>
        
        {/* Chat Window */}
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto', background: 'transparent' }}>
          {loading && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <div className="loader" style={{ marginBottom: '10px' }}>⚡</div>
              {progress}
            </div>
          )}
          
          {chatHistory.map((msg, idx) => (
            <div key={idx} style={{ 
              marginBottom: '15px', 
              textAlign: msg.role === 'user' ? 'right' : 'left' 
            }}>
              <div style={{ 
                display: 'inline-block',
                padding: '12px 18px',
                borderRadius: '12px',
                background: msg.role === 'user' ? 'var(--accent-blue)' : 'rgba(255, 255, 255, 0.05)',
                color: 'var(--text-primary)',
                border: msg.role === 'user' ? 'none' : '1px solid var(--glass-border)',
                maxWidth: '80%',
                whiteSpace: 'pre-wrap',
                textAlign: 'left',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div style={{ padding: '20px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste code snippet checking for vulnerabilities..."
              disabled={loading || !engine}
              className="input-field"
              style={{
                flex: 1,
                resize: 'none',
                height: '80px',
                fontFamily: 'monospace'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              onClick={handleSend}
              disabled={loading || !engine || !input.trim()}
              className="btn btn-primary"
              style={{ opacity: (loading || !engine || !input.trim()) ? 0.6 : 1 }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
