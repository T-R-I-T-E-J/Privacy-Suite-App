import { useState, useCallback } from 'react';

interface ProcessingOptions {
  inputPath: string;
  outputPath: string;
  stripTags?: string[];
  fakeGps?: { lat: number; lon: number } | null;
  forceExiftool?: boolean;
  quality?: number;
}

interface ProcessingResult {
  success: boolean;
  outputPath?: string;
  error?: string;
}

interface UsePixelPurgeReturn {
  processImage: (file: File, options: Partial<ProcessingOptions>) => Promise<ProcessingResult>;
  isProcessing: boolean;
  result: ProcessingResult | null;
  error: string | null;
  reset: () => void;
}

declare global {
  interface Window {
    pixelPurge: {
      saveFile: (fileData: { buffer: ArrayBuffer; fileName: string }) => Promise<{ success: boolean; filePath?: string; error?: string }>;
      processImage: (options: ProcessingOptions) => Promise<ProcessingResult>;
      openFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
      readFile: (filePath: string) => Promise<{ success: boolean; buffer?: number[]; error?: string }>;
    };
  }
}

export function usePixelPurge(): UsePixelPurgeReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processImage = useCallback(
    async (file: File, options: Partial<ProcessingOptions>): Promise<ProcessingResult> => {
      if (!window.pixelPurge) {
        const err = 'PixelPurge API not available. Make sure you are running in Electron.';
        setError(err);
        return { success: false, error: err };
      }

      setIsProcessing(true);
      setError(null);
      setResult(null);

      try {
        // Read file as ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        
        // Save file to temp directory via Electron
        const saveResult = await window.pixelPurge.saveFile({
          buffer: Array.from(new Uint8Array(arrayBuffer)),
          fileName: file.name,
        });

        if (!saveResult.success || !saveResult.filePath) {
          throw new Error(saveResult.error || 'Failed to save file');
        }

        const inputPath = saveResult.filePath;
        
        // Generate output path in temp directory
        const fileName = file.name;
        const fileExt = fileName.split('.').pop() || 'jpg';
        const baseName = fileName.replace(/\.[^/.]+$/, '');
        const outputFileName = `${baseName}-sanitized-${Date.now()}.${fileExt}`;
        const outputPath = inputPath.replace(fileName, outputFileName);

        const processingOptions: ProcessingOptions = {
          inputPath,
          outputPath,
          stripTags: ['GPS', 'DateTime', 'Make', 'Model', 'Software'],
          fakeGps: null,
          forceExiftool: false,
          quality: 100,
          ...options,
        };

        const result = await window.pixelPurge.processImage(processingOptions);
        
        setResult(result);
        setIsProcessing(false);

        if (!result.success) {
          setError(result.error || 'Processing failed');
        }

        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        setIsProcessing(false);
        const errorResult: ProcessingResult = {
          success: false,
          error: errorMessage,
        };
        setResult(errorResult);
        return errorResult;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setIsProcessing(false);
    setResult(null);
    setError(null);
  }, []);

  return {
    processImage,
    isProcessing,
    result,
    error,
    reset,
  };
}
