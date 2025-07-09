import { AudioAnalyzer } from '../audio/analyzer.js';
import { conifer, simpleDaisy, fan, fern } from './rules';
// convert audioanalyzer metrics to branch/leaf params
export class AVConverter {
    constructor(devMode = false) {
        this.audioanalyzer = null;
        this.devMode = devMode;
    }
    async init() {
        if (!this.devMode) {
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
    }

    hasAudio() {
        if (this.devMode) {
            return true;
        }
        const metrics = this.audioanalyzer.getMetrics();
        if (metrics.rms == 0.0) {
            console.log("no audio detected")
            return false;
        }
        return true;
    }
    
    // figure out which tree to render
    selectTree() {

    }
    
    //**
    //  * Given a config, generate the parameters for the tree
    //  * @param {Object} config - The config to generate parameters for
    //  * @returns {Object} - The parameters for the tree, varies if we generate flowers or not
    //  */
    generateParameters(config) {
        if (this.devMode) {
            return {
                leafColor: 0x00ff00,
                scale: 1,
                flowerPetalColor: 0x00ff00,
                flowerCenterColor: 0x00ff00
            };
        }
        const metrics = this.audioanalyzer.getMetrics();
        const spectralCentroid = metrics.spectralCentroid / 206.0;
        const spectralFlatness = metrics.spectralFlatness;
        const spectralSpread = metrics.spectralSpread / 206.0;
        const perceptualSharpness = metrics.perceptualSharpness;
        const energy = metrics.energy;
        let params = {}
        params.leaf = {}
        params.leaf.length = this.interpolateMinMax(spectralSpread,config.leaf.length.min,config.leaf.length.max)
        params.leaf.width = this.interpolateMinMax(spectralSpread,config.leaf.width.min,config.leaf.width.max)
        params.leaf.archStrength = this.interpolateMinMax(spectralSpread,config.leaf.archStrength.min,config.leaf.archStrength.max)
        console.log('params.leaf')
        console.log(params.leaf)

        if (config.generate.leaves === true) {
            console.log('spectralSpread:')
            console.log(spectralSpread)
            console.log('perceptualSharpness: ')
            console.log(perceptualSharpness)
            params.leafColor = this.convertNumberToLeafColor(spectralCentroid);
            params.scale = this.convertEnergyToScale(energy);

        }
        if (config.generate.flowers === true) {
            // params
            params.flowerPetalColor = this.floatToColor(spectralCentroid);
            params.flowerCenterColor = this.floatToColor(spectralFlatness);
            params.petal = {}
            params.petal.count = this.interpolateMinMax(perceptualSharpness, config.flower.petalCount.min, config.flower.petalCount.max)
            params.petal.width = this.interpolateMinMax(spectralSpread, config.flower.petalWidth.min, config.flower.petalWidth.max)
            params.petal.curvature = this.interpolateMinMax(spectralSpread, config.flower.petalCurvature.min, config.flower.petalCurvature.max)
        }

        return params;
    }
    // convert a 0.0-1.0 float to an interpolation between min and max values
    // used for leaf values
    interpolateMinMax(value, min, max) {
        return min + (value * (max-min))
    }

    /***
     * Convert energy (0-512) to a integer between 1 and 10
     * used for a scaling factor for tree size
     */
    convertEnergyToScale(energy) {
        console.log('energy: ' + energy);
        return Math.floor(energy / 51.2) + 1;
    }

    /**
     * Converts a float value (0-1) to a vibrant color
     * @param {number} value - Float between 0 and 1
     * @returns {number} - THREE.js color value
     */
    floatToColor(value) {
        // Convert to HSL but avoid green colors (hue 90-150 degrees)
        // Use a modified hue range that skips green
        let hue;
        if (value < 0.25) {
            // Red to orange (0-60 degrees)
            hue = value * 240; // 0-60
        } else if (value < 0.5) {
            // Orange to yellow (60-90 degrees)
            hue = 60 + (value - 0.25) * 120; // 60-90
        } else if (value < 0.75) {
            // Skip green, go from yellow to cyan (90-180 degrees)
            hue = 90 + (value - 0.5) * 360; // 90-180
        } else {
            // Cyan to blue to magenta to red (180-360 degrees)
            hue = 180 + (value - 0.75) * 720; // 180-360
        }
        
        const saturation = 70 + (value * 30); // 70-100%
        const lightness = 50 + (value * 20);  // 50-70%

        // Convert HSL to RGB
        const h = hue / 360;
        const s = saturation / 100;
        const l = lightness / 100;

        let r, g, b;

        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;

            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }

        // Convert to THREE.js color format (0xRRGGBB)
        return (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
    }



    /**
     * Converts a float value (0-1) to a seasonal leaf color
     * @param {number} value - Float between 0 and 1 
     * @returns {number} - THREE.js color value
     */
    convertNumberToLeafColor(value) {
        console.log('convertnumbertoleafcolor: ' + value);

        // Define seasonal leaf colors
        const colors = [
            { r: 34 / 255, g: 139 / 255, b: 34 / 255 },    // Forest green
            { r: 107 / 255, g: 142 / 255, b: 35 / 255 },    // Olive green
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