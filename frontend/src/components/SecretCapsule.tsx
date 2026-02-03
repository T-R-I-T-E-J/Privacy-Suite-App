import React, { useState, useEffect, useRef } from 'react';
import SimplePeer from 'simple-peer';
import './SecretCapsule.css';

interface Message {
    sender: 'me' | 'peer';
    text?: string;
    isFile?: boolean;
    fileData?: string;
    fileName?: string;
}

const SecretCapsule: React.FC = () => {
    const [mode, setMode] = useState<'IDLE' | 'HOST' | 'GUEST'>('IDLE');
    const [mySignal, setMySignal] = useState<string>('');
    const [remoteSignal, setRemoteSignal] = useState<string>('');
    const [isConnected, setIsConnected] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMsg, setInputMsg] = useState('');
    const [fileToSend, setFileToSend] = useState<File | null>(null);

    const peerRef = useRef<SimplePeer.Instance | null>(null);

    // cleanup
    useEffect(() => {
        return () => {
            peerRef.current?.destroy();
        };
    }, []);

    const processFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result as string;
            // Simple Protocol: Send JSON with type 'file'
            const payload = JSON.stringify({
                type: 'file',
                name: file.name,
                mime: file.type,
                data: base64
            });
            peerRef.current?.send(payload);
            addMessage({ sender: 'me', text: `Sent file: ${file.name}`, isFile: true, fileName: file.name });
            setFileToSend(null);
        };
        reader.readAsDataURL(file);
    };

    const initializePeer = (initiator: boolean) => {
        const p = new SimplePeer({
            initiator: initiator,
            trickle: false,
            config: { iceServers: [] }
        });

        p.on('signal', (data) => {
            setMySignal(JSON.stringify(data));
        });

        p.on('connect', () => {
            setIsConnected(true);
            addMessage({ sender: 'peer', text: '⚡ SECURE CONNECTION ESTABLISHED ⚡' });
        });

        p.on('data', (data) => {
            try {
                // Try passing as JSON
                const decoded = new TextDecoder().decode(data);
                const json = JSON.parse(decoded);

                if (json.type === 'file') {
                    addMessage({
                        sender: 'peer',
                        text: `Received: ${json.name}`,
                        isFile: true,
                        fileData: json.data,
                        fileName: json.name
                    });
                } else if (json.type === 'text') {
                    addMessage({ sender: 'peer', text: json.content });
                } else {
                    // Fallback for raw JSON messages
                    addMessage({ sender: 'peer', text: decoded });
                }
            } catch (e) {
                // Fallback for plain text (not JSON)
                const text = new TextDecoder().decode(data);
                addMessage({ sender: 'peer', text });
            }
        });

        p.on('error', (err) => {
            console.error('Peer Error:', err);
            addMessage({ sender: 'peer', text: `ERROR: ${err.message}` });
        });

        p.on('close', () => {
            setIsConnected(false);
            setMode('IDLE');
            addMessage({ sender: 'peer', text: 'Connection Closed' });
        });

        peerRef.current = p;
    };

    const startHost = () => {
        setMode('HOST');
        initializePeer(true);
    };

    const startGuest = () => {
        setMode('GUEST');
        initializePeer(false);
    };

    const handleConnect = () => {
        if (!remoteSignal) return;
        try {
            const signalData = JSON.parse(remoteSignal);
            peerRef.current?.signal(signalData);
        } catch (e) {
            alert('Invalid Signal String');
        }
    };

    const sendMessage = () => {
        if (!isConnected) return;

        if (fileToSend) {
            processFile(fileToSend);
            return;
        }

        if (!inputMsg.trim()) return;

        // Wrap text in JSON protocol too
        const payload = JSON.stringify({ type: 'text', content: inputMsg });
        peerRef.current?.send(payload);
        addMessage({ sender: 'me', text: inputMsg });
        setInputMsg('');
    };

    const addMessage = (msg: Message) => {
        setMessages(prev => [...prev, msg]);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Copied to Clipboard!');
    };

    if (isConnected) {
        return (
            <div className="capsule-container connected">
                <div className="chat-header">
                    <h2>🔐 Secure Capsule Active</h2>
                    <button onClick={() => window.location.reload()} className="btn-danger">Disconnect</button>
                </div>

                <div className="chat-window">
                    {messages.map((m, i) => (
                        <div key={i} className={`message ${m.sender}`}>
                            {m.isFile && m.fileData ? (
                                <div className="file-attachment">
                                    <p>📁 {m.fileName}</p>
                                    {/* Render image preview if valid */}
                                    {m.fileData.startsWith('data:image') && (
                                        <img src={m.fileData} alt="Shared content" style={{ maxWidth: '200px', borderRadius: '4px', margin: '5px 0' }} />
                                    )}
                                    <br />
                                    <a href={m.fileData} download={m.fileName} className="download-link" style={{ color: '#00dc82', textDecoration: 'underline' }}>
                                        Download {m.fileName}
                                    </a>
                                </div>
                            ) : (
                                <span>{m.text}</span>
                            )}
                        </div>
                    ))}
                </div>

                <div className="chat-input-area">
                    <input
                        type="file"
                        id="file-upload"
                        style={{ display: 'none' }}
                        onChange={(e) => setFileToSend(e.target.files?.[0] || null)}
                    />
                    <button onClick={() => document.getElementById('file-upload')?.click()} className="btn-icon" style={{ background: fileToSend ? '#00dc82' : '#333', color: '#fff', border: '1px solid #444', marginRight: '5px', width: '40px' }}>
                        {fileToSend ? '📎' : '📎'}
                    </button>

                    <input
                        value={inputMsg}
                        onChange={e => setInputMsg(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendMessage()}
                        placeholder={fileToSend ? `Ready: ${fileToSend.name} (Press Send)` : "Type a secure message..."}
                        disabled={!!fileToSend}
                    />
                    <button onClick={sendMessage}>Send</button>
                    {fileToSend && (
                        <button onClick={() => setFileToSend(null)} style={{ background: '#ff4444', marginLeft: '5px' }}>❌</button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="capsule-container">
            <h1>Zero-Knowledge Secret Capsule</h1>
            <p className="subtitle">Serverless P2P Connection (Manual Signaling)</p>

            {mode === 'IDLE' && (
                <div className="mode-select">
                    <button className="btn-primary" onClick={startHost}>🚀 Create Capsule (Host)</button>
                    <button className="btn-secondary" onClick={startGuest}>🔗 Join Capsule (Guest)</button>
                </div>
            )}

            {mode !== 'IDLE' && (
                <div className="handshake-ui">
                    <div className="step-card">
                        <h3>1. Your Connection Code</h3>
                        {mySignal ? (
                            <div className="code-box">
                                <textarea readOnly value={mySignal} />
                                <button onClick={() => copyToClipboard(mySignal)}>Copy Code</button>
                            </div>
                        ) : (
                            <p className="loading">Generating secure keys...</p>
                        )}
                        <p className="hint">Share this code with your peer.</p>
                    </div>

                    <div className="step-card">
                        <h3>2. Peer Connection Code</h3>
                        <textarea
                            placeholder="Paste your peer's code here..."
                            value={remoteSignal}
                            onChange={e => setRemoteSignal(e.target.value)}
                        />
                        <button className="btn-action" onClick={handleConnect}>
                            {mode === 'HOST' ? 'Finalize Connection' : 'Generate Answer'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SecretCapsule;
