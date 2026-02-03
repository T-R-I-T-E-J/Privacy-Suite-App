import { useState } from 'react'
import ModuleCard from './components/ModuleCard'
import CodeAuditDemo from './components/CodeAuditDemo'
import './App.css'

// Declare Electron API types
declare global {
    interface Window {
        electronAPI: {
            sensiScan: (filePath: string) => Promise<any>;
            pixelPurge: (inputPath: string, outputPath: string) => Promise<any>;
            llmAudit: (payload: { code: string; language: string }) => Promise<{ analysis: string }>;
            platform: string;
        };
    }
}

type Module = 'sensi-scan' | 'pixel-purge' | 'airgap-chat' | null;

function App() {
    const [selectedModule, setSelectedModule] = useState<Module>(null)

    interface ModuleItem {
        id: Exclude<Module, null>;
        title: string;
        description: string;
        icon: string;
    }

    const modules: ModuleItem[] = [
        {
            id: 'sensi-scan',
            title: 'SensiScan',
            description: 'Scan documents for sensitive information (PII, credentials)',
            icon: '🔍'
        },
        {
            id: 'pixel-purge',
            title: 'PixelPurge',
            description: 'Remove EXIF metadata from images',
            icon: '🖼️'
        },
        {
            id: 'airgap-chat',
            title: 'Code Audit',
            description: 'AI-powered security analysis (100% offline)',
            icon: '🕵️'
        }
    ]

    return (
        <div className="app">
            <header>
                <h1>🔒 Privacy Suite</h1>
                <p>Offline Privacy Tools</p>
            </header>

            {!selectedModule ? (
                <main className="module-grid">
                    {modules.map((module) => (
                        <ModuleCard
                            key={module.id}
                            {...module}
                            onClick={() => setSelectedModule(module.id)}
                        />
                    ))}
                </main>
            ) : selectedModule === 'airgap-chat' ? (
                <div className="module-full-width">
                    <button className="back-btn" onClick={() => setSelectedModule(null)}>← Back to Dashboard</button>
                    <CodeAuditDemo />
                </div>
            ) : (
                <main className="module-view">
                    <button className="back-btn" onClick={() => setSelectedModule(null)}>← Back</button>
                    <h2>{modules.find(m => m.id === selectedModule)?.title}</h2>
                    <p>Module implementation pending...</p>
                </main>
            )}
        </div>
    )
}

export default App
