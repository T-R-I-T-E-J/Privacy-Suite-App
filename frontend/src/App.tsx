import { useState } from 'react'
import ModuleCard from './components/ModuleCard'
import CodeAuditDemo from './components/CodeAuditDemo'
import CareerCloak from './components/CareerCloak'
import SecretCapsule from './components/SecretCapsule'
import MockGenerator from './components/MockGenerator' // New
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

// Update Module Types
type Module = 'sensi-scan' | 'pixel-purge' | 'code-audit' | 'career-cloak' | 'secret-capsule' | 'mock-generator' | null;

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
            id: 'code-audit',
            title: 'Code Audit',
            description: 'AI-powered security analysis (Local LLM)',
            icon: '🕵️‍♂️'
        },
        {
            id: 'career-cloak',
            title: 'Career Cloak',
            description: 'ATS Resume Optimizer (Local Vectors)',
            icon: '🧥'
        },
        {
            id: 'secret-capsule',
            title: 'Secret Capsule',
            description: 'Zero-Knowledge P2P File Share',
            icon: '🔐'
        },
        {
            id: 'mock-generator',
            title: 'Mock Generator',
            description: 'Anonymized Data Streamer (Millions of Rows)',
            icon: '🎭'
        },
        {
            id: 'sensi-scan',
            title: 'SensiScan',
            description: 'Scan documents for sensitive PII',
            icon: '🔍'
        },
        {
            id: 'pixel-purge',
            title: 'PixelPurge',
            description: 'Remove EXIF metadata from images',
            icon: '🖼️'
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
            ) : selectedModule === 'code-audit' ? (
                <div className="module-full-width">
                    <button className="back-btn" onClick={() => setSelectedModule(null)}>← Back to Dashboard</button>
                    <CodeAuditDemo />
                </div>
            ) : selectedModule === 'career-cloak' ? (
                <div className="module-full-width">
                    <button className="back-btn" onClick={() => setSelectedModule(null)}>← Back to Dashboard</button>
                    <CareerCloak />
                </div>
            ) : selectedModule === 'secret-capsule' ? (
                <div className="module-full-width">
                    <button className="back-btn" onClick={() => setSelectedModule(null)}>← Back to Dashboard</button>
                    <SecretCapsule />
                </div>
            ) : selectedModule === 'mock-generator' ? (
                <div className="module-full-width">
                    <button className="back-btn" onClick={() => setSelectedModule(null)}>← Back to Dashboard</button>
                    <MockGenerator />
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
