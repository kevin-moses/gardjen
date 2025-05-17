// audio/analyzer.js
import * as Meyda from 'meyda';

/**
 * AudioAnalyzer class that uses Meyda to analyze audio input
 * and detect song transitions based on spectral flux and other metrics.
 */
export class AudioAnalyzer {
    constructor() {
        this.audioContext = null;
        this.analyzer = null;
        this.source = null;
        this.isRunning = false;
        this.metrics = {
            rms: 0,          // Root Mean Square (volume)
            energy: 0,       // Energy
            spectralFlux: 0, // Spectral Flux (rate of change, good for transitions)
            spectralCentroid: 0, // Spectral Centroid (brightness)
            zcr: 0,          // Zero Crossing Rate (noisiness)
            spectralRolloff: 0, // Spectral Rolloff (frequency below which is N% of the spectrum)
            spectralFlatness: 0 // Spectral Flatness (tonal vs noise)
        };

        // For transition detection
        this.fluxThreshold = 15;      // Adjust based on testing
        this.fluxHistory = [];
        this.historySize = 300;        // Store 30 frames of history (~6 seconds at 60fps)
        this.transitionDetected = false;
        this.lastTransitionTime = 0;
        this.minTransitionInterval = 2000; // Min 2 seconds between detected transitions

        // Callback function when transition is detected
        this.onTransitionDetected = null;
    }

    async init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.source = this.audioContext.createMediaStreamSource(stream);

            // Create Meyda analyzer with error handling
            this.analyzer = Meyda.createMeydaAnalyzer({
                audioContext: this.audioContext,
                source: this.source,
                bufferSize: 1024,
                featureExtractors: [
                    'rms',
                    'energy',
                    // 'spectralFlux',  // Temporarily comment out to diagnose
                    'spectralCentroid',
                    'zcr',
                    'spectralRolloff',
                    'spectralFlatness',
                    'amplitudeSpectrum'  // Add this to get raw spectrum data
                ],
                callback: (features) => {
                    try {
                        if (features) {
                            // Calculate spectral flux manually if needed
                            if (features.amplitudeSpectrum && this.previousSpectrum) {
                                let flux = 0;
                                for (let i = 0; i < features.amplitudeSpectrum.length; i++) {
                                    const diff = features.amplitudeSpectrum[i] - this.previousSpectrum[i];
                                    flux += diff * diff;
                                }
                                features.spectralFlux = Math.sqrt(flux);
                            }

                            // Store current spectrum for next frame
                            this.previousSpectrum = features.amplitudeSpectrum ? [...features.amplitudeSpectrum] : null;

                            this.analyzeAudio(features);
                        }
                    } catch (error) {
                        console.error('Error in Meyda callback:', error);
                    }
                }
            });

            console.log('Audio analyzer initialized successfully');
            return true;
        } catch (error) {
            console.error('Error initializing audio analyzer:', error);
            return false;
        }
    }

    analyzeAudio(features) {
        // Validate the features object
        if (!features || typeof features !== 'object') {
            console.warn('Invalid features object received from Meyda');
            return;
        }

        // Safely update metrics with fallbacks for missing values
        this.metrics = {
            rms: features.rms !== undefined ? features.rms : 0,
            energy: features.energy !== undefined ? features.energy : 0,
            spectralFlux: features.spectralFlux !== undefined ? features.spectralFlux : 0,
            spectralCentroid: features.spectralCentroid !== undefined ? features.spectralCentroid : 0,
            zcr: features.zcr !== undefined ? features.zcr : 0,
            spectralRolloff: features.spectralRolloff !== undefined ? features.spectralRolloff : 0,
            spectralFlatness: features.spectralFlatness !== undefined ? features.spectralFlatness : 0
        };

        // Add spectral flux to history if it exists
        if (features.spectralFlux !== undefined) {
            this.fluxHistory.push(features.spectralFlux);
            if (this.fluxHistory.length > this.historySize) {
                this.fluxHistory.shift();
            }

            // Detect transitions
            this.detectTransition();
        }
    }

    detectTransition() {
        if (this.fluxHistory.length < this.historySize) return;

        try {
            // Calculate average of previous flux values
            const previousAvg = this.fluxHistory
                .slice(0, this.historySize - 5)
                .reduce((sum, value) => sum + (value || 0), 0) / (this.historySize - 5);

            // Calculate average of recent flux values
            const recentAvg = this.fluxHistory
                .slice(this.historySize - 5)
                .reduce((sum, value) => sum + (value || 0), 0) / 5;

            // Check if we've crossed the threshold and enough time has passed
            const now = Date.now();
            const timeSinceLastTransition = now - this.lastTransitionTime;

            if (previousAvg > 0 && // Avoid division by zero
                recentAvg > previousAvg * this.fluxThreshold &&
                timeSinceLastTransition > this.minTransitionInterval) {

                this.transitionDetected = true;
                this.lastTransitionTime = now;

                // Call the callback if it exists
                if (typeof this.onTransitionDetected === 'function') {
                    this.onTransitionDetected(this.metrics);
                }

                console.log('Transition detected!', this.metrics);
            } else {
                this.transitionDetected = false;
            }
        } catch (error) {
            console.error('Error in transition detection:', error);
            this.transitionDetected = false;
        }
    }

    start() {
        if (this.analyzer && !this.isRunning) {
            this.analyzer.start();
            this.isRunning = true;
            console.log('Audio analyzer started');
        }
    }

    stop() {
        if (this.analyzer && this.isRunning) {
            console.log(this.metrics);
            this.analyzer.stop();
            this.isRunning = false;
            console.log('Audio analyzer stopped');
        }
    }

    setTransitionCallback(callback) {
        this.onTransitionDetected = callback;
    }

    // Adjust sensitivity of transition detection
    setFluxThreshold(value) {
        this.fluxThreshold = value;
    }

    // Get current audio metrics
    getMetrics() {
        return this.metrics;
    }

    // Check if a transition was recently detected
    isTransitionDetected() {
        return this.transitionDetected;
    }

    // Clean up resources
    dispose() {
        this.stop();
        if (this.audioContext) {
            this.audioContext.close();
        }
    }
}