// main.js
import { initVisualization } from './visuals/render.js';

let visualRenderer = null;

if (!localStorage.getItem('hasVisited')) {
  // First time ever
  localStorage.setItem('hasVisited', 'true');
  console.log('Welcome, first-time visitor!');
} else {
  // Not the first time
  console.log('Welcome back!');
}

async function init() {
  console.log('Initializing application...');
  // Initialize the existing visualization if needed
  visualRenderer = initVisualization();
}




// Clean up resources
function cleanup() {
  stopAnimationLoop();
  console.log('Application resources cleaned up');
}
// Event listeners
window.addEventListener('load', init);
window.addEventListener('unload', cleanup);

