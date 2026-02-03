import React, { useState, useRef, useEffect } from 'react';
import streamSaver from 'streamsaver';
import './MockGenerator.css'; // We'll create this next

// Polyfill for TransformStream if not available (Standard in Chrome/Edge though)
// import { TransformStream } from 'web-streams-polyfill/ponyfill'; 

interface Column {
    id: string;
    name: string;
    type: string;
}

const AVAILABLE_TYPES = [
    { value: 'name', label: 'Full Name' },
    { value: 'email', label: 'Email Address' },
    { value: 'phone', label: 'Phone Number' },
    { value: 'address', label: 'Street Address' },
    { value: 'city', label: 'City' },
    { value: 'country', label: 'Country' },
    { value: 'company', label: 'Company Name' },
    { value: 'date', label: 'Date (Past)' },
    { value: 'number', label: 'Random Number' },
    { value: 'boolean', label: 'Boolean (True/False)' },
    { value: 'uuid', label: 'UUID' },
    { value: 'credit_card', label: 'Credit Card Number' }
];

const MockGenerator: React.FC = () => {
    const [rowCount, setRowCount] = useState<number>(10000); // Default 10k
    const [columns, setColumns] = useState<Column[]>([
        { id: '1', name: 'FullName', type: 'name' },
        { id: '2', name: 'EmailAddr', type: 'email' },
        { id: '3', name: 'PhoneNum', type: 'phone' }
    ]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusLog, setStatusLog] = useState<string>('Ready to generate.');

    const workerRef = useRef<Worker | null>(null);
    const writerRef = useRef<WritableStreamDefaultWriter | null>(null);

    useEffect(() => {
        workerRef.current = new Worker(new URL('../workers/mockWorker.ts', import.meta.url), {
            type: 'module'
        });

        workerRef.current.onmessage = handleWorkerMessage;

        return () => {
            workerRef.current?.terminate();
        };
    }, []);

    const handleWorkerMessage = async (e: MessageEvent) => {
        const { type, payload } = e.data;

        if (type === 'chunk') {
            const { data, progress, total } = payload;

            // Convert chunk to CSV string
            const csvChunk = data.map((row: any) => Object.values(row).join(',')).join('\n') + '\n';
            const encoder = new TextEncoder();

            if (writerRef.current) {
                await writerRef.current.write(encoder.encode(csvChunk));
            }

            // Update Progress UI
            const percent = ((progress / total) * 100).toFixed(1);
            setStatusLog(`Generating... ${percent}% (${progress.toLocaleString()} / ${total.toLocaleString()})`);
            setProgress(Number(percent));

        } else if (type === 'complete') {
            if (writerRef.current) {
                await writerRef.current.close();
                writerRef.current = null;
            }
            setIsGenerating(false);
            setStatusLog(`✅ SUCCESS: Generated ${rowCount.toLocaleString()} rows!`);
            setProgress(100);
        } else if (type === 'error') {
            setStatusLog(`❌ ERROR: ${payload}`);
            setIsGenerating(false);
            if (writerRef.current) {
                await writerRef.current.abort(payload);
                writerRef.current = null;
            }
        }
    };

    const addColumn = () => {
        const id = Date.now().toString();
        setColumns([...columns, { id, name: `Col_${columns.length + 1}`, type: 'name' }]);
    };

    const removeColumn = (id: string) => {
        setColumns(columns.filter(c => c.id !== id));
    };

    const updateColumn = (id: string, field: keyof Column, value: string) => {
        setColumns(columns.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const startGeneration = async () => {
        if (isGenerating) return;
        setIsGenerating(true);
        setProgress(0);
        setStatusLog('Initializing Stream...');

        // 1. Setup StreamSaver
        const filename = `mock_data_${rowCount}_rows.csv`;
        const fileStream = streamSaver.createWriteStream(filename);
        writerRef.current = fileStream.getWriter();

        // 2. Write CSV Header
        const header = columns.map(c => c.name).join(',') + '\n';
        const encoder = new TextEncoder();
        await writerRef.current.write(encoder.encode(header));

        // 3. Start Worker
        workerRef.current?.postMessage({
            type: 'generate',
            payload: {
                schema: columns.map(c => ({ name: c.name, type: c.type })),
                rows: rowCount
            }
        });
    };

    return (
        <div className="mock-gen-container">
            <div className="gen-header">
                <h1>🎭 Anonymized Mock Generator</h1>
                <p>Generate massive datasets for stress testing.</p>
            </div>

            <div className="gen-grid">
                {/* Configuration Panel */}
                <div className="config-panel">
                    <h3>Dataset Configuration</h3>

                    <div className="control-group">
                        <label>Total Rows</label>
                        <div className="range-wrap">
                            <input
                                type="range"
                                min="1000"
                                max="1000000"
                                step="1000"
                                value={rowCount}
                                onChange={e => setRowCount(Number(e.target.value))}
                                disabled={isGenerating}
                            />
                            <span className="value-badge">{rowCount.toLocaleString()} Rows</span>
                        </div>
                    </div>

                    <div className="columns-list">
                        <div className="col-header">
                            <span>Column Name</span>
                            <span>Data Type</span>
                            <span>Action</span>
                        </div>
                        {columns.map(col => (
                            <div key={col.id} className="col-row">
                                <input
                                    value={col.name}
                                    onChange={e => updateColumn(col.id, 'name', e.target.value)}
                                    placeholder="Column Name"
                                />
                                <select
                                    value={col.type}
                                    onChange={e => updateColumn(col.id, 'type', e.target.value)}
                                >
                                    {AVAILABLE_TYPES.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                                <button className="btn-del" onClick={() => removeColumn(col.id)}>✖</button>
                            </div>
                        ))}
                        <button className="btn-add" onClick={addColumn}>+ Add Column</button>
                    </div>

                    <button
                        className={`btn-generate ${isGenerating ? 'generating' : ''}`}
                        onClick={startGeneration}
                        disabled={isGenerating}
                    >
                        {isGenerating ? 'GENERATING STREAM...' : '🚀 START GENERATION'}
                    </button>

                    <div className="status-bar">
                        <div className="progress-track">
                            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                        </div>
                        <p className="log-text">{statusLog}</p>
                    </div>
                </div>

                {/* Preview Panel */}
                <div className="preview-panel">
                    <h3>Data Preview (First 5 Rows)</h3>
                    <div className="terminal-preview">
                        <div className="csv-header">{columns.map(c => c.name).join(', ')}</div>
                        <div className="csv-rows">
                            {/* Static preview for UI feel */}
                            <div className="csv-row">John Doe, john@example.com, 555-0123...</div>
                            <div className="csv-row">Jane Smith, jane@test.co, 555-0987...</div>
                            <div className="csv-row opacity-75">Bob Wilson, bob@corp.net, 555-0000...</div>
                            <div className="csv-row opacity-50">Alice Brown, alice@mail.org, 555-1111...</div>
                            <div className="csv-row opacity-25">... (and {rowCount - 4} more)</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MockGenerator;
