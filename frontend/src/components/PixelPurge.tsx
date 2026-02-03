import React, { useState, useCallback, useRef } from 'react';
import { usePixelPurge } from '../hooks/usePixelPurge';
import './PixelPurge.css';

interface FileWithPath extends File {
  path?: string;
}

export function PixelPurge() {
  const { processImage, isProcessing, result, error, reset } = usePixelPurge();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [stripTags, setStripTags] = useState({
    GPS: true,
    DateTime: true,
    Make: true,
    Model: true,
    Software: true,
  });
  const [fakeGps, setFakeGps] = useState<{ lat: number; lon: number } | null>(null);
  const [fakeGpsLat, setFakeGpsLat] = useState('');
  const [fakeGpsLon, setFakeGpsLon] = useState('');
  const [quality, setQuality] = useState(100);
  const [forceFfmpeg, setForceFfmpeg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((file: File) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'];
    if (!validTypes.some(type => file.type === type || file.name.toLowerCase().endsWith(type.split('/')[1]))) {
      setError('Invalid file type. Please select a JPEG, PNG, or HEIC image.');
      return;
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      setError('File size exceeds 100MB limit. Please select a smaller file.');
      return;
    }

    setSelectedFile(file);
    reset();
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.onerror = () => {
      setError('Failed to read file for preview.');
    };
    reader.readAsDataURL(file);
  }, [reset]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        handleFileSelect(file);
      }
    }
  }, [handleFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  }, [handleFileSelect]);

  const handleProcess = useCallback(async () => {
    if (!selectedFile) {
      setError('Please select a file first.');
      return;
    }

    // Validate GPS coordinates if provided
    if (fakeGpsLat || fakeGpsLon) {
      const lat = parseFloat(fakeGpsLat);
      const lon = parseFloat(fakeGpsLon);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        setError('Invalid latitude. Must be between -90 and 90.');
        return;
      }
      if (isNaN(lon) || lon < -180 || lon > 180) {
        setError('Invalid longitude. Must be between -180 and 180.');
        return;
      }
    }

    const tagsToStrip = Object.entries(stripTags)
      .filter(([_, selected]) => selected)
      .map(([tag, _]) => tag);

    if (tagsToStrip.length === 0) {
      setError('Please select at least one metadata tag to strip.');
      return;
    }

    const gps = fakeGpsLat && fakeGpsLon
      ? { lat: parseFloat(fakeGpsLat), lon: parseFloat(fakeGpsLon) }
      : null;

    // For Electron, we need to save the file first
    // In a real implementation, we'd use Electron's dialog or save to temp
    // For now, we'll use a workaround with the file path
    const fileWithPath = selectedFile as FileWithPath;
    
    await processImage(selectedFile, {
      stripTags: tagsToStrip,
      fakeGps: gps,
      forceFfmpeg,
      quality,
    });
  }, [selectedFile, stripTags, fakeGpsLat, fakeGpsLon, forceFfmpeg, quality, processImage]);

  const handleDownload = useCallback(async () => {
    if (result?.success && result.outputPath && selectedFile && window.pixelPurge) {
      try {
        // Read file via Electron IPC
        const fileData = await window.pixelPurge.readFile(result.outputPath);
        
        if (fileData.success && fileData.buffer) {
          // Create blob and download
          const blob = new Blob([new Uint8Array(fileData.buffer)]);
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `sanitized-${selectedFile.name}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } else {
          // Fallback: open file in system file manager
          await window.pixelPurge.openFile(result.outputPath);
        }
      } catch (err) {
        console.error('Download failed:', err);
        // Try opening file in system file manager as fallback
        if (window.pixelPurge) {
          await window.pixelPurge.openFile(result.outputPath!);
        }
      }
    }
  }, [result, selectedFile]);

  return (
    <div className="pixel-purge">
      <h1>Pixel Purge - Image Metadata Stripper</h1>

      {/* File Upload Area */}
      <div
        className={`upload-area ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {previewUrl ? (
          <div className="preview-container">
            <img src={previewUrl} alt="Preview" className="preview-image" />
            <p className="file-name">{selectedFile?.name}</p>
            <button
              className="change-file-btn"
              onClick={() => {
                setSelectedFile(null);
                setPreviewUrl(null);
                reset();
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
            >
              Change File
            </button>
          </div>
        ) : (
          <div className="upload-placeholder">
            <p>Drag & drop an image here, or</p>
            <button
              className="file-input-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              Browse Files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/heic,image/heif"
              onChange={handleFileInput}
              style={{ display: 'none' }}
            />
          </div>
        )}
      </div>

      {/* Configuration Panel */}
      {selectedFile && (
        <div className="config-panel">
          <h2>Configuration</h2>

          {/* Strip Tags */}
          <div className="config-section">
            <h3>Metadata Tags to Strip</h3>
            {Object.entries(stripTags).map(([tag, selected]) => (
              <label key={tag} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(e) =>
                    setStripTags({ ...stripTags, [tag]: e.target.checked })
                  }
                />
                {tag}
              </label>
            ))}
          </div>

          {/* Fake GPS */}
          <div className="config-section">
            <h3>Fake GPS Location (Optional)</h3>
            <div className="gps-inputs">
              <label>
                Latitude:
                <input
                  type="number"
                  step="any"
                  value={fakeGpsLat}
                  onChange={(e) => setFakeGpsLat(e.target.value)}
                  placeholder="37.7749"
                />
              </label>
              <label>
                Longitude:
                <input
                  type="number"
                  step="any"
                  value={fakeGpsLon}
                  onChange={(e) => setFakeGpsLon(e.target.value)}
                  placeholder="-122.4194"
                />
              </label>
            </div>
          </div>

          {/* Quality */}
          <div className="config-section">
            <h3>JPEG Quality: {quality}</h3>
            <input
              type="range"
              min="1"
              max="100"
              value={quality}
              onChange={(e) => setQuality(parseInt(e.target.value))}
            />
          </div>

          {/* Force FFmpeg */}
          <div className="config-section">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={forceFfmpeg}
                onChange={(e) => setForceFfmpeg(e.target.checked)}
              />
              Force FFmpeg (use FFmpeg for all processing)
            </label>
          </div>

          {/* Process Button */}
          <button
            className="process-btn"
            onClick={handleProcess}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Process Image'}
          </button>
        </div>
      )}

      {/* Processing Status */}
      {isProcessing && (
        <div className="status processing">
          <p>Processing image...</p>
        </div>
      )}

      {error && (
        <div className="status error">
          <p><strong>Error:</strong> {error}</p>
          <button
            className="dismiss-error-btn"
            onClick={() => setError(null)}
            style={{
              marginTop: '10px',
              padding: '5px 10px',
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {result?.success && (
        <div className="status success">
          <p>Image processed successfully!</p>
          {result.outputPath && (
            <div style={{ margin: '10px 0', padding: '10px', background: '#f0f0f0', borderRadius: '4px', wordBreak: 'break-all' }}>
              <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>Output Path:</p>
              <p style={{ margin: 0, fontFamily: 'monospace', fontSize: '12px' }}>{result.outputPath}</p>
            </div>
          )}
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button className="download-btn" onClick={handleDownload}>
              Download Sanitized Image
            </button>
            {result.outputPath && (
              <button 
                className="download-btn" 
                onClick={async () => {
                  if (window.pixelPurge && result.outputPath) {
                    await window.pixelPurge.openFile(result.outputPath);
                  }
                }}
                style={{ background: '#6c757d' }}
              >
                Open File Location
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
