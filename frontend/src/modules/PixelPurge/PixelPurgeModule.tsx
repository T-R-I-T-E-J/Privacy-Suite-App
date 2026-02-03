import React, { useState } from 'react';
import { electronAPI } from '../../utils/electron';

export const PixelPurgeModule: React.FC = () => {
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; outputPath?: string; error?: string } | null>(null);
  const [selectedPath, setSelectedPath] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0] as any;
      setSelectedPath(file.path || file.name);
      setResult(null);
    }
  };

  /* 
    Updated to use Client-Side Purge (JS). 
    Bypasses Rust requirement for easier setup.
  */
  const runPurge = async () => {
    if (!selectedPath) return;
    setProcessing(true);
    setResult(null);

    // Dynamic import to avoid SSR issues if any
    const piexif = (await import('piexifjs')).default;
    const fs = window.require ? window.require('fs') : null;

    try {
      if (!fs) throw new Error("File system access restricted. Run in Electron App.");

      // 1. Read file as Base64 (DataURL)
      const buffer = fs.readFileSync(selectedPath);
      const b64 = buffer.toString('base64');
      const dataUrl = `data:image/jpeg;base64,${b64}`; // Assuming standard image

      // 2. Scrub Metadata
      // '0th', 'Exif', 'GPS', 'Interop', '1st' are the standard IFDs
      const curExif = piexif.load(dataUrl);
      console.log("Found Exif:", curExif);
      
      // Create empty exif obj to replace
      const cleanExifStr = piexif.dump({}); 
      
      // Insert empty exif into image
      const cleanDataUrl = piexif.insert(cleanExifStr, dataUrl);
      
      // 3. Save file
      const cleanBuffer = Buffer.from(cleanDataUrl.split(',')[1], 'base64');
      const outputPath = selectedPath.replace(/(\.[^.]+)$/, '_clean$1');
      
      fs.writeFileSync(outputPath, cleanBuffer);
      setResult({ success: true, outputPath });

    } catch (e: any) {
      console.error(e);
      // Fallback: If it's not a JPEG, piexif fails. 
      if (e.toString().includes('Improper')) {
         setResult({ success: false, error: "Format not supported by JS scrubber (Use JPEG). For robust PNG/WebP support, build the Rust module." });
      } else {
         setResult({ success: false, error: e.toString() });
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div className="header" style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>🧹 Pixel-Purge</h1>
        <p style={{ color: '#666' }}>Image Metadata Scrubber (Exif/IPTC)</p>
      </div>

      <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <input 
          type="file" 
          accept="image/*"
          onChange={handleFileSelect} 
          disabled={processing}
          style={{ marginBottom: '15px', display: 'block', width: '100%' }}
        />
        
        <button 
          onClick={runPurge}
          disabled={!selectedPath || processing}
          style={{
            padding: '10px 20px',
            background: processing ? '#ccc' : '#9c27b0', // Purple for Purge
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: processing ? 'default' : 'pointer',
            fontWeight: 600,
            width: '100%'
          }}
        >
          {processing ? 'Scrubbing Metadata...' : 'Purge Metadata'}
        </button>

        {result && (
          <div style={{ 
            marginTop: '20px', 
            padding: '15px', 
            background: result.success ? '#e8f5e9' : '#ffebee',
            borderRadius: '8px',
            color: result.success ? '#2e7d32' : '#c62828'
          }}>
            {result.success ? (
              <>
                <strong>✅ Success!</strong>
                <p style={{ margin: '5px 0 0' }}>Clean image saved to:</p>
                <code style={{ display: 'block', marginTop: '5px', background: 'rgba(255,255,255,0.5)', padding: '5px' }}>
                  {result.outputPath}
                </code>
              </>
            ) : (
              <>
                <strong>❌ Failed:</strong> {result.error}
                <p style={{fontSize: '0.9em', marginTop: '10px'}}>
                    (If this failed with "CreateProcess", the Rust binary might be missing. Please install Build Tools.)
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
