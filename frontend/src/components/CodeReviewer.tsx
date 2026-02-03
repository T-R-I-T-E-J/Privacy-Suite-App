import React, { useState, useEffect } from 'react';
import { getLLMReviewer, ReviewState } from '../services/llmReviewer';
import './CodeReviewer.css';

interface CodeReviewerProps {
    code: string;
    filename?: string;
    language?: string;
    onClose?: () => void;
}

const CodeReviewer: React.FC<CodeReviewerProps> = ({
    code,
    filename = 'code.txt',
    language = 'javascript',
    onClose
}) => {
    const [state, setState] = useState<ReviewState>({ status: 'idle' });
    const [isInitializing, setIsInitializing] = useState(false);
    const reviewer = getLLMReviewer();

    useEffect(() => {
        // Subscribe to reviewer state updates
        const unsubscribe = reviewer.subscribe((newState) => {
            setState(newState);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    const handleInitialize = async () => {
        // Mode 1: Electron (Python Backend)
        if (window.electronAPI && window.electronAPI.llmAudit) {
            try {
                setIsInitializing(true);
                // In Python mode, "init" is instantaneous (model loads on first request)
                // or we could send a ping here. For now, just mark ready.
                setTimeout(() => {
                    setState({ status: 'ready' });
                    setIsInitializing(false);
                }, 1000);
            } catch (error) {
                console.error(error);
            }
            return;
        }

        // Mode 2: WebLLM (Browser)
        try {
            setIsInitializing(true);
            await reviewer.initialize();
        } catch (error: any) {
            console.error('Failed to initialize LLM:', error);
            alert(`Initialization failed: ${error.message}`);
        } finally {
            setIsInitializing(false);
        }
    };

    const handleAnalyze = async () => {
        if (!code.trim()) {
            alert('Please provide code to analyze');
            return;
        }

        // Mode 1: Electron (Python Backend)
        if (window.electronAPI && window.electronAPI.llmAudit) {
            try {
                setState(prev => ({
                    ...prev,
                    status: 'analyzing',
                    progress: { stage: 'analyzing', message: 'Analyzing via Local Python Engine...' },
                    currentAnalysis: 'Generating analysis (this may take 10-20s)...'
                }));

                const result = await window.electronAPI.llmAudit({ code, language });

                setState({
                    status: 'ready',
                    result: {
                        analysis: result.analysis,
                        filename,
                        language,
                        timestamp: Date.now()
                    }
                });
            } catch (error: any) {
                console.error('Analysis failed:', error);
                setState(prev => ({ ...prev, status: 'error', error: error.message }));
            }
            return;
        }

        // Mode 2: WebLLM (Browser)
        try {
            await reviewer.analyzeCode(code, filename, language);
        } catch (error: any) {
            console.error('Analysis failed:', error);
            alert(`Analysis failed: ${error.message}`);
        }
    };

    const renderProgress = () => {
        const { progress } = state;
        if (!progress) return null;

        return (
            <div className="progress-container">
                <div className="progress-stage">{progress.stage.toUpperCase()}</div>
                {progress.progress !== undefined && (
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${progress.progress * 100}%` }}
                        />
                    </div>
                )}
                <div className="progress-message">{progress.message}</div>
            </div>
        );
    };

    const renderAnalysis = () => {
        const { currentAnalysis, result } = state;

        if (state.status === 'analyzing' && currentAnalysis) {
            return (
                <div className="analysis-streaming">
                    <div className="analysis-header">
                        <span className="streaming-indicator">● Analyzing (Local Engine)...</span>
                    </div>
                    <div className="analysis-content">
                        <pre>{currentAnalysis}</pre>
                    </div>
                </div>
            );
        }

        if (result) {
            return (
                <div className="analysis-result">
                    <div className="result-header">
                        <h3>Security Analysis Complete</h3>
                        <div className="result-meta">
                            <span>File: {result.filename}</span>
                            <span>Language: {result.language}</span>
                            <span>Time: {new Date(result.timestamp).toLocaleTimeString()}</span>
                        </div>
                    </div>
                    <div className="result-content">
                        <pre>{result.analysis}</pre>
                    </div>
                </div>
            );
        }

        return null;
    };

    return (
        <div className="code-reviewer">
            <div className="reviewer-header">
                <h2>🔒 Air-Gapped Code Reviewer</h2>
                {onClose && (
                    <button className="close-btn" onClick={onClose}>×</button>
                )}
            </div>

            <div className="reviewer-content">
                {/* Status Display */}
                <div className="status-bar">
                    <div className={`status-indicator status-${state.status}`}>
                        {state.status === 'idle' && '○ Offline'}
                        {state.status === 'initializing' && '◐ Initializing...'}
                        {state.status === 'ready' && '● Ready'}
                        {state.status === 'analyzing' && '◉ Analyzing...'}
                        {state.status === 'error' && '✖ Error'}
                    </div>

                    {state.error && (
                        <div className="error-message">
                            Error: {state.error}
                        </div>
                    )}
                </div>

                {/* Progress Bar */}
                {state.progress && renderProgress()}

                {/* Control Buttons */}
                <div className="controls">
                    {state.status === 'idle' && (
                        <button
                            onClick={handleInitialize}
                            disabled={isInitializing}
                            className="btn-primary"
                        >
                            {isInitializing ? 'Initializing...' : 'Initialize LLM Engine'}
                        </button>
                    )}

                    {state.status === 'ready' && (
                        <button onClick={handleAnalyze} className="btn-analyze">
                            🔍 Analyze Code
                        </button>
                    )}

                    {state.status !== 'idle' && (
                        <button
                            onClick={() => reviewer.terminateWorker()}
                            className="btn-secondary"
                        >
                            Reset Engine
                        </button>
                    )}
                </div>

                {/* Analysis Display */}
                {renderAnalysis()}

                {/* Info Box */}
                <div className="info-box">
                    <h4>🛡️ Security Features</h4>
                    <ul>
                        <li>✓ 100% Offline - No network access</li>
                        <li>✓ Memory isolated worker thread</li>
                        <li>✓ SHA-256 binary verification</li>
                        <li>✓ Deterministic inference (fixed seed)</li>
                        <li>✓ Local model: phi3-mini-4k-instruct</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default CodeReviewer;
