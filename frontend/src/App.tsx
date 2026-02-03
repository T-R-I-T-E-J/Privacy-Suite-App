import { useState } from 'react';
import { SensiScanModule } from './modules/SensiScan/SensiScanModule';
import { PixelPurgeModule } from './modules/PixelPurge/PixelPurgeModule';
import { WebLLMModule } from './modules/WebLLM/WebLLMModule';

function App() {
  const [activeModule, setActiveModule] = useState<'sensi' | 'pixel' | 'webllm'>('sensi');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Glossy Navigation Bar */}
      <nav style={{ 
        background: 'rgba(15, 23, 42, 0.8)', 
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--glass-border)',
        padding: '16px 32px', 
        display: 'flex', 
        gap: '24px', 
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: 'auto' }}>
            <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>P</div>
            <div style={{ fontSize: '20px', fontWeight: '700', letterSpacing: '-0.5px' }}>Privacy Suite</div>
        </div>
        
        {/* Nav Buttons */}
        <NavButton 
            active={activeModule === 'sensi'} 
            onClick={() => setActiveModule('sensi')} 
            icon="🛡️" 
            label="Sensi-Scan" 
        />
        <NavButton 
            active={activeModule === 'pixel'} 
            onClick={() => setActiveModule('pixel')} 
            icon="🧹" 
            label="Pixel-Purge" 
        />
        <NavButton 
            active={activeModule === 'webllm'} 
            onClick={() => setActiveModule('webllm')} 
            icon="🤖" 
            label="AI Code Review" 
        />
      </nav>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '40px', maxWidth: '1200px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <div className="animate-fade-in">
            {activeModule === 'sensi' && <SensiScanModule />}
            {activeModule === 'pixel' && <PixelPurgeModule />}
            {activeModule === 'webllm' && <WebLLMModule />}
        </div>
      </main>

    </div>
  );
}

// Helper Component for consistent Nav styling
const NavButton = ({ active, onClick, icon, label }: any) => (
  <button 
    onClick={onClick}
    style={{
      background: active ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
      color: active ? '#60a5fa' : '#94a3b8',
      border: active ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
      padding: '8px 16px',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: 500,
      fontSize: '14px',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }}
  >
    <span>{icon}</span>
    {label}
  </button>
);

export default App;
