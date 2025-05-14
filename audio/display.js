// audio/display.js

export function showDisplay() {
    const metricsElement = document.getElementById('audio-metrics');
    if (metricsElement) {
        metricsElement.style.display = 'block';
    }

    const historyContainer = document.getElementById('history-container');
    if (historyContainer) {
        historyContainer.style.display = 'block';
    }
}

/**
 * Class to handle displaying audio metrics without Three.js visualizations
 */
export class AudioDisplay {
    constructor() {
        this.metricsContainer = null;
        this.transitionIndicator = null;
        this.historyCanvas = null;
        this.historyContext = null;
        this.historyData = {
            rms: [],
            energy: [],
            spectralFlux: [],
            spectralCentroid: [],
            zcr: []
        };
        this.historyLength = 300; // 5 seconds at 60fps
        this.maxValues = {
            rms: 1,
            energy: 1,
            spectralFlux: 20,
            spectralCentroid: 10000,
            zcr: 500
        };

        // Colors for different metrics
        this.colors = {
            rms: '#4CAF50',
            energy: '#2196F3',
            spectralFlux: '#F44336',
            spectralCentroid: '#FF9800',
            zcr: '#9C27B0'
        };
    }

    /**
     * Initialize the display
     */
    init() {
        this.createDisplay();
        // this.createHistoryCanvas();
        window.addEventListener('resize', this.handleResize.bind(this));
        return true;
    }

    /**
     * Create the metrics display container
     */
    createDisplay() {
        // Create container if it doesn't exist
        if (!document.getElementById('audio-metrics')) {
            const container = document.createElement('div');
            container.id = 'audio-metrics';
            container.style.position = 'absolute';
            container.style.top = '10px';
            container.style.right = '10px';
            container.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            container.style.color = '#fff';
            container.style.padding = '15px';
            container.style.borderRadius = '5px';
            container.style.fontFamily = 'monospace';
            container.style.fontSize = '14px';
            container.style.zIndex = '1000';
            container.style.maxWidth = '400px';
            document.body.appendChild(container);

            // Create heading
            const heading = document.createElement('h2');
            heading.textContent = 'Audio Analyzer';
            heading.style.margin = '0 0 10px 0';
            heading.style.fontSize = '18px';
            container.appendChild(heading);

            // Create metrics container
            const metricsDiv = document.createElement('div');
            metricsDiv.id = 'metrics-values';
            container.appendChild(metricsDiv);

            // Create transition indicator
            const transitionDiv = document.createElement('div');
            transitionDiv.id = 'transition-indicator';
            transitionDiv.style.marginTop = '10px';
            transitionDiv.style.padding = '5px';
            transitionDiv.style.borderRadius = '3px';
            transitionDiv.style.backgroundColor = '#333';
            transitionDiv.style.textAlign = 'center';
            transitionDiv.textContent = 'No Transition Detected';
            container.appendChild(transitionDiv);

            // Create threshold controls
            const thresholdDiv = document.createElement('div');
            thresholdDiv.style.marginTop = '15px';
            container.appendChild(thresholdDiv);

            const thresholdLabel = document.createElement('label');
            thresholdLabel.textContent = 'Transition Sensitivity: ';
            thresholdLabel.htmlFor = 'threshold-slider';
            thresholdDiv.appendChild(thresholdLabel);

            const thresholdSlider = document.createElement('input');
            thresholdSlider.type = 'range';
            thresholdSlider.id = 'threshold-slider';
            thresholdSlider.min = '1';
            thresholdSlider.max = '30';
            thresholdSlider.value = '15';
            thresholdSlider.style.width = '100%';
            thresholdDiv.appendChild(thresholdSlider);

            const thresholdValue = document.createElement('span');
            thresholdValue.id = 'threshold-value';
            thresholdValue.textContent = '15';
            thresholdValue.style.marginLeft = '5px';
            thresholdDiv.appendChild(thresholdValue);

            this.metricsContainer = metricsDiv;
            this.transitionIndicator = transitionDiv;
        }
    }

    /**
     * Create the history visualization canvas
     */
    createHistoryCanvas() {
        if (!document.getElementById('history-canvas')) {
            const container = document.createElement('div');
            container.id = 'history-container';
            container.style.position = 'absolute';
            container.style.bottom = '10px';
            container.style.left = '10px';
            container.style.right = '10px';
            container.style.height = '150px';
            container.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            container.style.borderRadius = '5px';
            container.style.padding = '10px';
            container.style.zIndex = '1000';
            document.body.appendChild(container);

            // Create canvas
            const canvas = document.createElement('canvas');
            canvas.id = 'history-canvas';
            canvas.width = container.clientWidth - 20;
            canvas.height = container.clientHeight - 20;
            canvas.style.display = 'block';
            container.appendChild(canvas);

            // Create legend
            const legend = document.createElement('div');
            legend.style.display = 'flex';
            legend.style.justifyContent = 'center';
            legend.style.gap = '15px';
            legend.style.marginTop = '5px';
            container.appendChild(legend);

            // Add legend items
            const metrics = ['RMS', 'Energy', 'Spectral Flux', 'Spectral Centroid', 'ZCR'];
            const colorKeys = ['rms', 'energy', 'spectralFlux', 'spectralCentroid', 'zcr'];

            metrics.forEach((metric, index) => {
                const item = document.createElement('div');
                item.style.display = 'flex';
                item.style.alignItems = 'center';

                const colorBox = document.createElement('span');
                colorBox.style.display = 'inline-block';
                colorBox.style.width = '10px';
                colorBox.style.height = '10px';
                colorBox.style.backgroundColor = this.colors[colorKeys[index]];
                colorBox.style.marginRight = '5px';

                const label = document.createElement('span');
                label.textContent = metric;
                label.style.fontSize = '12px';
                label.style.color = '#fff';

                item.appendChild(colorBox);
                item.appendChild(label);
                legend.appendChild(item);
            });

            this.historyCanvas = canvas;
            this.historyContext = canvas.getContext('2d');
        }
    }

    /**
     * Handle window resize for the history canvas
     */
    handleResize() {
        if (this.historyCanvas) {
            const container = document.getElementById('history-container');
            if (container) {
                this.historyCanvas.width = container.clientWidth - 20;
                this.historyCanvas.height = container.clientHeight - 20;
            }
        }
    }

    /**
     * Update the display with the latest audio metrics
     * @param {Object} metrics - The audio metrics from the analyzer
     * @param {boolean} transitionDetected - Whether a transition was detected
     */
    update(metrics, transitionDetected) {
        // Skip if no metrics or container
        if (!metrics || !this.metricsContainer) return;

        // Update metrics display
        this.metricsContainer.innerHTML = `
      <div>RMS (volume): <span style="color: ${this.colors.rms}">${metrics.rms.toFixed(4)}</span></div>
      <div>Energy: <span style="color: ${this.colors.energy}">${metrics.energy.toFixed(4)}</span></div>
      <div>Spectral Flux: <span style="color: ${this.colors.spectralFlux}">${metrics.spectralFlux.toFixed(4)}</span></div>
      <div>Spectral Centroid: <span style="color: ${this.colors.spectralCentroid}">${metrics.spectralCentroid.toFixed(2)}</span></div>
      <div>ZCR (noisiness): <span style="color: ${this.colors.zcr}">${metrics.zcr.toFixed(2)}</span></div>
      <div>Spectral Rolloff: ${metrics.spectralRolloff ? metrics.spectralRolloff.toFixed(2) : 'N/A'}</div>
      <div>Spectral Flatness: ${metrics.spectralFlatness ? metrics.spectralFlatness.toFixed(4) : 'N/A'}</div>
    `;

        // Update transition indicator
        if (this.transitionIndicator) {
            if (transitionDetected) {
                this.transitionIndicator.textContent = 'TRANSITION DETECTED!';
                this.transitionIndicator.style.backgroundColor = '#F44336';
                this.transitionIndicator.style.color = '#fff';
                this.transitionIndicator.style.fontWeight = 'bold';

                // Reset after 1 second
                setTimeout(() => {
                    this.transitionIndicator.textContent = 'No Transition Detected';
                    this.transitionIndicator.style.backgroundColor = '#333';
                    this.transitionIndicator.style.fontWeight = 'normal';
                }, 1000);
            }
        }

        // Update history data
        this.updateHistoryData(metrics);

    }

    /**
     * Update the history data with new metrics
     * @param {Object} metrics - The audio metrics
     */
    updateHistoryData(metrics) {
        // Add new data points
        this.historyData.rms.push(metrics.rms);
        this.historyData.energy.push(metrics.energy);
        this.historyData.spectralFlux.push(metrics.spectralFlux);
        this.historyData.spectralCentroid.push(metrics.spectralCentroid);
        this.historyData.zcr.push(metrics.zcr);

        // Trim to max length
        if (this.historyData.rms.length > this.historyLength) {
            this.historyData.rms.shift();
            this.historyData.energy.shift();
            this.historyData.spectralFlux.shift();
            this.historyData.spectralCentroid.shift();
            this.historyData.zcr.shift();
        }

        // Update max values (for scaling)
        this.maxValues.rms = Math.max(
            this.maxValues.rms,
            Math.max(...this.historyData.rms) * 1.2
        );
        this.maxValues.energy = Math.max(
            this.maxValues.energy,
            Math.max(...this.historyData.energy) * 1.2
        );
        this.maxValues.spectralFlux = Math.max(
            this.maxValues.spectralFlux,
            Math.max(...this.historyData.spectralFlux) * 1.2
        );
        this.maxValues.spectralCentroid = Math.max(
            this.maxValues.spectralCentroid,
            Math.max(...this.historyData.spectralCentroid) * 1.2
        );
        this.maxValues.zcr = Math.max(
            this.maxValues.zcr,
            Math.max(...this.historyData.zcr) * 1.2
        );
    }

    /**
     * Draw the history graph on the canvas
     */
    /**
     * Draw a single metric line on the history graph
     * @param {string} metric - The metric name
     * @param {string} color - The line color
     */
    drawMetricLine(metric, color) {
        const ctx = this.historyContext;
        const canvas = this.historyCanvas;
        const width = canvas.width;
        const height = canvas.height;
        const data = this.historyData[metric];
        const maxValue = this.maxValues[metric];

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();

        for (let i = 0; i < data.length; i++) {
            const x = (i / this.historyLength) * width;
            const y = height - (data[i] / maxValue) * height;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }

        ctx.stroke();
    }

    /**
     * Set the Meyda analyzer reference for UI controls
     * @param {Object} analyzer - The Meyda analyzer instance
     */
    setAnalyzer(analyzer) {
        if (!analyzer) return;

        // Set up threshold slider event
        const slider = document.getElementById('threshold-slider');
        const valueDisplay = document.getElementById('threshold-value');

        if (slider && valueDisplay) {
            slider.value = analyzer.fluxThreshold;
            valueDisplay.textContent = analyzer.fluxThreshold;

            slider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                valueDisplay.textContent = value;
                analyzer.setFluxThreshold(value);
            });
        }
    }

    /**
     * Clean up resources and remove UI elements
     */
    dispose() {
        const metricsElement = document.getElementById('audio-metrics');
        if (metricsElement) {
            metricsElement.remove();
        }

        const historyContainer = document.getElementById('history-container');
        if (historyContainer) {
            historyContainer.remove();
        }

        window.removeEventListener('resize', this.handleResize);

        this.metricsContainer = null;
        this.transitionIndicator = null;
        this.historyCanvas = null;
        this.historyContext = null;
    }
}