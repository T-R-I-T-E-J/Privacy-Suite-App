import React, { useState } from 'react';
import { electronAPI } from '../../utils/electron';

interface Finding {
  type: string;
  count: number;
  context: string;
}

interface AnalysisResult {
  privacy_score: number;
  detected_items: Finding[];
  redacted_file: string | null;
}

export const SensiScanModule: React.FC = () => {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string>('');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // In Electron with nodeIntegration, 'path' property is exposed on File object
      const file = files[0] as any; 
      const path = file.path || file.name; // Fallback for browser dev
      setSelectedPath(path);
      setResult(null);
      setError(null);
    }
  };

  const runAnalysis = async () => {
    if (!selectedPath) return;
    
    setAnalyzing(true);
    setError(null);
    
    try {
      const data = await electronAPI.analyzeFile(selectedPath);
      setResult(data);
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#4caf50'; // Green
    if (score >= 70) return '#ff9800'; // Orange
    return '#f44336'; // Red
  };

  return (
    <div className="sensi-scan-container" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div className="header" style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>🛡️ Sensi-Scan</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Local Privacy Analysis Engine</p>
      </div>

      {/* Control Panel */}
      <div className="control-panel card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input 
            type="file" 
            onChange={handleFileSelect}
            disabled={analyzing}
            style={{ flex: 1, color: 'var(--text-secondary)' }}
          />
          <button 
            onClick={runAnalysis}
            disabled={!selectedPath || analyzing}
            className="btn btn-primary"
            style={{ opacity: (!selectedPath || analyzing) ? 0.6 : 1 }}
          >
            {analyzing ? 'Scanning...' : 'Analyze File'}
          </button>
        </div>
        {selectedPath && <p style={{ fontSize: '12px', marginTop: '10px', color: 'var(--text-secondary)' }}>Target: {selectedPath}</p>}
      </div>

      {/* Error Display */}
      {error && (
        <div style={{ padding: '15px', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', border: '1px solid #ef4444', borderRadius: '8px', marginBottom: '20px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="results-panel card">
          {/* Score Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '15px' }}>
            <div>
              <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Analysis Report</h2>
              <p style={{ margin: '5px 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
                Redacted File: <span style={{ fontFamily: 'monospace', color: 'var(--accent-blue)' }}>{result.redacted_file ? 'Saved' : 'N/A'}</span>
                {result.redacted_file && (
                  <button 
                    onClick={() => electronAPI.openFile(result.redacted_file!)}
                    style={{
                      marginLeft: '10px',
                      padding: '4px 10px',
                      fontSize: '12px',
                      background: 'var(--accent-blue)',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      color: 'white',
                      fontWeight: 600
                    }}
                  >
                    Open File ↗
                  </button>
                )}
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                  fontSize: '36px', 
                  fontWeight: 'bold', 
                  color: getScoreColor(result.privacy_score),
                  textShadow: '0 0 20px rgba(0,0,0,0.5)'
              }}>
                {result.privacy_score}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: getScoreColor(result.privacy_score), marginBottom: '5px' }}>
                {result.privacy_score >= 90 ? 'SAFE' : result.privacy_score >= 50 ? 'WARNING' : 'CRITICAL RISK'}
              </div>
              <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Privacy Score</div>
            </div>
          </div>

          {/* Detections List */}
          <h3 style={{ fontSize: '16px', marginBottom: '15px', color: 'var(--text-primary)' }}>Detected Risks</h3>
          {result.detected_items.length === 0 ? (
            <p style={{ color: 'var(--accent-green)', fontStyle: 'italic' }}>No sensitive data detected. Good job!</p>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {result.detected_items.map((item, idx) => (
                <div key={idx} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    padding: '12px', 
                    background: 'rgba(255,255,255,0.03)', 
                    borderRadius: '8px',
                    borderLeft: `4px solid ${getScoreColor(result.privacy_score)}`
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.type}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Context: {item.context}</span>
                  </div>
                  <div style={{ alignSelf: 'center', background: 'rgba(0,0,0,0.3)', padding: '4px 10px', borderRadius: '10px', border: '1px solid var(--glass-border)', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                    {item.count} findings
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
