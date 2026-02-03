import { pipeline, env } from '@xenova/transformers';

// Setup Transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

let extractor: any = null;

self.onmessage = async (e: MessageEvent) => {
    const { type, payload } = e.data;

    if (type === 'analyze') {
        try {
            const { resumeText, jobDescription } = payload;

            // 1. Load Model (Singleton)
            if (!extractor) {
                self.postMessage({ type: 'status', payload: 'Initializing AI Model...' });
                try {
                    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
                        progress_callback: (progress: any) => {
                            if (progress.status === 'progress') {
                                const percent = typeof progress.progress === 'number'
                                    ? Math.round(progress.progress)
                                    : 0;
                                self.postMessage({ type: 'status', payload: `Downloading Model: ${percent}%` });
                            } else if (progress.status === 'ready') {
                                self.postMessage({ type: 'status', payload: 'Model Ready. Processing...' });
                            }
                        }
                    });
                } catch (modelErr) {
                    throw new Error(`Model Download Failed: ${(modelErr as Error).message}. Check Internet?`);
                }
            }

            if (!resumeText || !resumeText.trim()) {
                throw new Error('Resume text is empty. Extraction failed.');
            }

            // 2. Generate Embeddings
            self.postMessage({ type: 'status', payload: 'Analyzing Vectors...' });
            const resumeVector = await extractor(resumeText, { pooling: 'mean', normalize: true });
            const jobVector = await extractor(jobDescription, { pooling: 'mean', normalize: true });

            // 3. Calculate Cosine Similarity
            const score = cosineSimilarity(resumeVector.data, jobVector.data);

            // 4. Keyword Gap Analysis
            const missingKeywords = findMissingKeywords(resumeText, jobDescription);

            self.postMessage({
                type: 'result',
                payload: {
                    score: Math.round(score * 100),
                    missingKeywords
                }
            });

        } catch (error) {
            console.error(error);
            self.postMessage({ type: 'error', payload: (error as Error).message });
        }
    }
};

function cosineSimilarity(vecA: Float32Array, vecB: Float32Array): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function findMissingKeywords(resumeText: string, jobDesc: string): string[] {
    const cleanResume = resumeText.toLowerCase();
    const cleanJob = jobDesc.toLowerCase();

    // Naive keyword extractor: words > 4 chars
    const jobWords = cleanJob.match(/\b\w{4,}\b/g) || [];
    const uniqueJobWords = [...new Set(jobWords)];

    const missing = uniqueJobWords.filter(word => !cleanResume.includes(word));

    return missing.slice(0, 10);
}
