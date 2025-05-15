// main.js
import { AudioAnalyzer } from './audio/analyzer.js';
import { AudioDisplay } from './audio/display.js';
import { initVisualization } from './visuals/render.js';
import { AudioToggler } from './audio/audiotoggler.js';

// Audio components
let audioAnalyzer = null;
let audioDisplay = null;
let visualRenderer = null;
let audioToggler = null;
// Animation loop variables
let animationFrameId = null;
let lastTime = 0;

if (!localStorage.getItem('hasVisited')) {
  // First time ever
  localStorage.setItem('hasVisited', 'true');
  console.log('Welcome, first-time visitor!');
} else {
  // Not the first time
  console.log('Welcome back!');
}

// Initialize the application
async function init() {
  console.log('Initializing application...');
  
  // Try to initialize the Meyda audio analyzer first
  audioAnalyzer = new AudioAnalyzer();
  let audioInitSuccess = await audioAnalyzer.init();
  
  // If Meyda analyzer fails, try the fallback analyzer
  if (!audioInitSuccess) {
    console.warn('Meyda analyzer initialization failed. Trying fallback analyzer...');
    audioAnalyzer = new FallbackAudioAnalyzer();
    audioInitSuccess = await audioAnalyzer.init();
    
    if (!audioInitSuccess) {
      console.error('All audio analyzers failed. Please check microphone permissions.');
      document.getElementById('status').textContent = 'Audio initialization failed. Please grant microphone permission and refresh.';
      return;
    }
    
    console.log('Using fallback audio analyzer');
    document.getElementById('status').textContent = 'Using fallback audio analyzer';
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
  
  // Add toggler for display elements
  audioToggler = new AudioToggler();
  audioToggler.init();
  
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