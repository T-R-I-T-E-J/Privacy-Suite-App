/**
 * LLM Code Reviewer Service
 * Main thread interface for the WebLLM worker
 */

export interface ProgressUpdate {
    stage: 'init' | 'verifying' | 'loading' | 'analyzing' | 'terminated';
    progress?: number;
    message: string;
}

export interface AnalysisResult {
    analysis: string;
    filename: string;
    language: string;
    timestamp: number;
}

export type ReviewStatus = 'idle' | 'initializing' | 'ready' | 'analyzing' | 'error';

export interface ReviewState {
    status: ReviewStatus;
    progress?: ProgressUpdate;
    currentAnalysis?: string;
    result?: AnalysisResult;
    error?: string;
}

export class LLMCodeReviewer {
    private worker: Worker | null = null;
    private status: ReviewStatus = 'idle';
    private listeners: Map<string, Set<(state: ReviewState) => void>> = new Map();
    private currentState: ReviewState = { status: 'idle' };

    /**
     * Initialize the WebLLM worker
     */
    async initialize(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                // Terminate existing worker for clean state
                this.terminateWorker();

                // Create new worker
                this.worker = new Worker(
                    new URL('../workers/llmWorker.ts', import.meta.url),
                    { type: 'module' }
                );

                // Setup message handler
                this.worker.onmessage = (event) => {
                    this.handleWorkerMessage(event.data);
                };

                this.worker.onerror = (error) => {
                    console.error('Worker error:', error);
                    this.updateState({
                        status: 'error',
                        error: error.message
                    });
                    reject(error);
                };

                // Send init message
                this.updateState({ status: 'initializing' });
                this.worker.postMessage({ type: 'init' });

                // Setup resolver for ready state
                const readyListener = (state: ReviewState) => {
                    if (state.status === 'ready') {
                        this.removeListener('ready', readyListener);
                        resolve();
                    } else if (state.status === 'error') {
                        this.removeListener('ready', readyListener);
                        reject(new Error(state.error));
                    }
                };
                this.addListener('ready', readyListener);

            } catch (error: any) {
                this.updateState({
                    status: 'error',
                    error: error.message
                });
                reject(error);
            }
        });
    }

    /**
     * Analyze code and stream results
     */
    async analyzeCode(
        code: string,
        filename: string = 'code.txt',
        language: string = 'javascript'
    ): Promise<AnalysisResult> {
        if (!this.worker) {
            throw new Error('Worker not initialized. Call initialize() first.');
        }

        if (this.status !== 'ready') {
            throw new Error(`Worker not ready. Current status: ${this.status}`);
        }

        return new Promise((resolve, reject) => {
            this.updateState({
                status: 'analyzing',
                currentAnalysis: ''
            });

            // Send analysis request
            this.worker!.postMessage({
                type: 'analyze',
                payload: { code, filename, language }
            });

            // Setup completion listener
            const doneListener = (state: ReviewState) => {
                if (state.result) {
                    this.removeListener('done', doneListener);
                    this.updateState({ status: 'ready' });
                    resolve(state.result);
                } else if (state.status === 'error') {
                    this.removeListener('done', doneListener);
                    reject(new Error(state.error));
                }
            };
            this.addListener('done', doneListener);
        });
    }

    /**
     * Terminate worker and clean up memory
     */
    terminateWorker(): void {
        if (this.worker) {
            this.worker.postMessage({ type: 'terminate' });
            this.worker.terminate();
            this.worker = null;
        }
        this.updateState({ status: 'idle' });
    }

    /**
     * Subscribe to state updates
     */
    subscribe(callback: (state: ReviewState) => void): () => void {
        // const listenerId = Math.random().toString(36);
        if (!this.listeners.has('*')) {
            this.listeners.set('*', new Set());
        }
        this.listeners.get('*')!.add(callback);

        // Immediately call with current state
        callback(this.currentState);

        // Return unsubscribe function
        return () => {
            this.listeners.get('*')?.delete(callback);
        };
    }

    /**
     * Get current state
     */
    getState(): ReviewState {
        return { ...this.currentState };
    }

    /**
     * Handle messages from worker
     */
    private handleWorkerMessage(data: any): void {
        const { type, payload } = data;

        switch (type) {
            case 'ready':
                this.updateState({
                    status: 'ready',
                    progress: undefined
                });
                break;

            case 'progress':
                this.updateState({
                    progress: payload
                });
                break;

            case 'streaming':
                this.updateState({
                    status: 'analyzing',
                    currentAnalysis: payload.full
                });
                break;

            case 'done':
                this.updateState({
                    status: 'ready',
                    result: payload,
                    currentAnalysis: undefined
                });
                break;

            case 'error':
                this.updateState({
                    status: 'error',
                    error: payload.message
                });
                break;

            default:
                console.warn('Unknown worker message type:', type);
        }
    }

    /**
     * Update state and notify listeners
     */
    private updateState(partial: Partial<ReviewState>): void {
        this.currentState = {
            ...this.currentState,
            ...partial
        };

        if (partial.status) {
            this.status = partial.status;
        }

        // Notify all subscribers
        this.listeners.get('*')?.forEach(callback => {
            callback(this.currentState);
        });
    }

    /**
     * Add event listener
     */
    private addListener(event: string, callback: (state: ReviewState) => void): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
    }

    /**
     * Remove event listener
     */
    private removeListener(event: string, callback: (state: ReviewState) => void): void {
        this.listeners.get(event)?.delete(callback);
    }
}

// Singleton instance
let reviewerInstance: LLMCodeReviewer | null = null;

/**
 * Get singleton instance of LLM Code Reviewer
 */
export function getLLMReviewer(): LLMCodeReviewer {
    if (!reviewerInstance) {
        reviewerInstance = new LLMCodeReviewer();
    }
    return reviewerInstance;
}

/**
 * Reset singleton (useful for testing or full cleanup)
 */
export function resetLLMReviewer(): void {
    if (reviewerInstance) {
        reviewerInstance.terminateWorker();
        reviewerInstance = null;
    }
}
