import { AudioAnalyzer } from '../audio/analyzer.js';
// convert audioanalyzer metrics to branch/leaf params
export class AVConverter {
    constructor() {
        this.audioanalyzer = null;
    }
    async init() {
        this.audioanalyzer = new AudioAnalyzer();
        let audioInitSuccess = await this.audioanalyzer.init();
        if (!audioInitSuccess) {
            console.error('All audio analyzers failed. Please check microphone permissions.');
            document.getElementById('status').textContent = 'Audio initialization failed. Please grant microphone permission and refresh.';
            return;
        }
        this.audioanalyzer.start();
        document.getElementById('status').textContent = 'Audio analyzer running';
    }

    hasAudio() {
        const metrics = this.audioanalyzer.getMetrics(); 
        if (metrics.rms == 0.0) {
            console.log("no audio detected")
            return false;
        }
        return true;
    }

    generateParameters(config) {
        const metrics = this.audioanalyzer.getMetrics();
        const spectralCentroid = metrics.spectralCentroid;
        console.log('spectralCentroid: ' + spectralCentroid);
        console.log(metrics)
        let params = {}
        if (config.generate.leaves === true) {
            params.leafColor = this.convertNumberToLeafColor(spectralCentroid / 512.0);
        }
        if (config.generate.flowers === true) {
            // params
        }
        return params;
    }


    /**
     * Converts a float value (0-1) to a seasonal leaf color
     * @param {number} value - Float between 0 and 1 
     * @returns {number} - THREE.js color value
     */
    convertNumberToLeafColor(value) {
        
        value = Math.max(0, Math.min(1, value));
        console.log('convertnumbertoleafcolor: ' + value);

        // Define seasonal leaf colors
        const colors = [
            { r: 34 / 255, g: 139 / 255, b: 34 / 255 },    // Forest green
            { r: 107 / 255, g: 142 / 255, b: 35 / 255 },    // Olive green
            { r: 255 / 255, g: 140 / 255, b: 0 / 255 },     // Orange
            { r: 255 / 255, g: 215 / 255, b: 0 / 255 },     // Golden yellow
            { r: 139 / 255, g: 69 / 255, b: 19 / 255 },     // Brown
            { r: 178 / 255, g: 34 / 255, b: 34 / 255 },      // Dark red
            { r: 255 / 255, g: 255 / 255, b: 255 / 255 }    // white
        ];

        // Calculate which two colors to interpolate between
        const numColors = colors.length;
        const scaledValue = value * (numColors - 1);
        const index1 = Math.floor(scaledValue);
        const index2 = Math.min(index1 + 1, numColors - 1);
        const remainder = scaledValue - index1;

        // Interpolate between the two colors
        const r = colors[index1].r + (colors[index2].r - colors[index1].r) * remainder;
        const g = colors[index1].g + (colors[index2].g - colors[index1].g) * remainder;
        const b = colors[index1].b + (colors[index2].b - colors[index1].b) * remainder;

        // Convert to THREE.js color format (0xRRGGBB)
        return (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
    }

    /**
     * Converts a float value (0-1) to a branch color based on thickness
     * @param {number} branchThickness - Float between 0 and 1 representing branch thickness
     * @param {number} colorVariation - Float between 0 and 1 for color interpolation
     * @returns {number} - THREE.js color value
     */
    convertNumberToBranchColor(branchThickness, colorVariation = 0) {
        // Clamp values between 0 and 1
        branchThickness = Math.max(0, Math.min(1, branchThickness));
        colorVariation = Math.max(0, Math.min(1, colorVariation));

        // Define branch colors
        const greenBranch = { r: 34 / 255, g: 139 / 255, b: 34 / 255 };    // Forest green
        const brownBranch = { r: 139 / 255, g: 69 / 255, b: 19 / 255 };    // Brown
        const darkBrownBranch = { r: 69 / 255, g: 34 / 255, b: 9 / 255 };  // Dark brown

        // Interpolate between green and brown based on colorVariation
        const interpolatedGreen = {
            r: greenBranch.r + (brownBranch.r - greenBranch.r) * colorVariation,
            g: greenBranch.g + (brownBranch.g - greenBranch.g) * colorVariation,
            b: greenBranch.b + (brownBranch.b - greenBranch.b) * colorVariation
        };

        // Interpolate between brown and dark brown based on colorVariation
        const interpolatedBrown = {
            r: brownBranch.r + (darkBrownBranch.r - brownBranch.r) * colorVariation,
            g: brownBranch.g + (darkBrownBranch.g - brownBranch.g) * colorVariation,
            b: brownBranch.b + (darkBrownBranch.b - brownBranch.b) * colorVariation
        };

        // Use interpolated colors based on branch thickness
        const color = branchThickness < 0.8 ? interpolatedGreen : interpolatedBrown;

        // Convert to THREE.js color format (0xRRGGBB)
        return (Math.round(color.r * 255) << 16) | (Math.round(color.g * 255) << 8) | Math.round(color.b * 255);
    }
}