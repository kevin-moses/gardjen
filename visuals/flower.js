import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { simpleDaisy, sunflower } from './rules';
import { LSystemPlant } from './tree';

/**
 * Converts a float value (0-1) to a vibrant color
 * @param {number} value - Float between 0 and 1
 * @returns {number} - THREE.js color value
 */
export function floatToColor(value) {
    // Clamp value between 0 and 1
    value = Math.max(0, Math.min(1, value));
    
    // Convert to HSL
    // Hue: 0-360 (full color spectrum)
    // Saturation: 70-100% (vibrant colors)
    // Lightness: 50-70% (avoid dark colors)
    const hue = value * 360;
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
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    
    // Convert to THREE.js color format (0xRRGGBB)
    return (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
}

export class LSystemFlower extends LSystemPlant {
    constructor(scene, position, orientation, staticConfig, dynamicConfig) {
        super(scene, position, orientation, staticConfig, dynamicConfig);
    }

}