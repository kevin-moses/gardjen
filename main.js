// main.js
import { AudioAnalyzer } from './audio/analyzer.js';
import { AudioDisplay } from './audio/display.js';
import { initVisualization } from './visuals/render.js';

// Audio components
let audioAnalyzer = null;
let audioDisplay = null;
let visualRenderer = null;

// Animation loop variables
let animationFrameId = null;
let lastTime = 0;

// Initialize the application
async function init() {
  console.log('Initializing application...');
  
  // Initialize the audio analyzer
  audioAnalyzer = new AudioAnalyzer();
  const audioInitSuccess = await audioAnalyzer.init();
  
  if (!audioInitSuccess) {
    console.error('Failed to initialize audio analyzer. Please check microphone permissions.');
    document.getElementById('status').textContent = 'Audio initialization failed. Please grant microphone permission and refresh.';
    return;
  }
  
  // Set up transition detection callback
  audioAnalyzer.setTransitionCallback((metrics) => {
    console.log('Song transition detected!', metrics);
    // You can trigger special effects or state changes here
  });
  
  // Initialize the audio display
  audioDisplay = new AudioDisplay();
  audioDisplay.init();
  audioDisplay.setAnalyzer(audioAnalyzer);
  
  // Initialize the existing visualization if needed
  visualRenderer = initVisualization();
  
  // Start the audio analyzer
  audioAnalyzer.start();
  
  // Start the animation loop
  startAnimationLoop();
  
  console.log('Application initialized successfully');
  document.getElementById('status').textContent = 'Audio analyzer running';
}

// Animation loop function
function animationLoop(currentTime) {
  animationFrameId = requestAnimationFrame(animationLoop);
  
  // Calculate delta time
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;
  
  // Skip if first frame (deltaTime will be very large)
  if (deltaTime > 1000) return;
  
  // Get the latest audio metrics
  const audioMetrics = audioAnalyzer ? audioAnalyzer.getMetrics() : null;
  const transitionDetected = audioAnalyzer ? audioAnalyzer.isTransitionDetected() : false;
  
  // Update the audio display
  if (audioDisplay && audioMetrics) {
    audioDisplay.update(audioMetrics, transitionDetected);
  }
  
  // The original renderer will continue to run but without audio input
}

// Start the animation loop
function startAnimationLoop() {
  if (!animationFrameId) {
    lastTime = performance.now();
    animationFrameId = requestAnimationFrame(animationLoop);
    console.log('Animation loop started');
  }
}

// Stop the animation loop
function stopAnimationLoop() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
    console.log('Animation loop stopped');
  }
}

// Clean up resources
function cleanup() {
  stopAnimationLoop();
  
  if (audioAnalyzer) {
    audioAnalyzer.dispose();
    audioAnalyzer = null;
  }
  
  if (audioDisplay) {
    audioDisplay.dispose();
    audioDisplay = null;
  }
  
  console.log('Application resources cleaned up');
}

// Event listeners
window.addEventListener('load', init);
window.addEventListener('unload', cleanup);

// Export for debugging
window.appDebug = {
  getAnalyzer: () => audioAnalyzer,
  start: startAnimationLoop,
  stop: stopAnimationLoop,
  setFluxThreshold: (value) => {
    if (audioAnalyzer) {
      audioAnalyzer.setFluxThreshold(value);
    }
  }
};