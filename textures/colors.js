import * as THREE from 'three';

const backgroundGradients =  [
    ["#eeaf61", "#fb9062", "#ee5d6c", "#ce4993", "#6a0d83"],
    ["#feda84", "#ff9b83", "#976393", "#685489", "#43457f"],
    ["#1fbbff", "#627fe5", "#465bcb", "#3750a6", "#1e1a75"],

];

// Create a vertical gradient canvas texture from an array of colors
function createGradientTexture(colors, width = 512, height = 1024) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    // Start gradient at y = height (bottom), end at y = 0 (top)
    const gradient = ctx.createLinearGradient(0, height, 0, 0);

    // Add color stops evenly spaced, converting to CSS hex
    colors.forEach((color, i) => {
        gradient.addColorStop(i / (colors.length - 1), color);
    });

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    return new THREE.CanvasTexture(canvas);
}

export const sunsetTexture = createGradientTexture(backgroundGradients[Math.floor(Math.random() * backgroundGradients.length)])