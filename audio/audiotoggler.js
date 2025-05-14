// audio/toggler.js

/**
 * Simple toggle button for the audio analyzer display
 */
export class AudioToggler {
  constructor() {
    this.visible = false;
    this.button = null;
    this.targetElements = [];
  }
  
  /**
   * Initialize with elements to toggle
   * @param {Array<string>} elementIds - IDs of elements to toggle
   */
  init(elementIds = ['audio-metrics', 'history-container']) {
    this.createToggleButton();
    this.targetElements = elementIds;
    
    // Initially hide elements
    this.hideElements();
    
    return this;
  }
  
  /**
   * Create a simple toggle button
   */
  createToggleButton() {
    const button = document.createElement('button');
    button.id = 'analyzer-toggle';
    button.textContent = 'Show Audio Analyzer';
    button.style.position = 'absolute';
    button.style.top = '10px';
    button.style.right = '10px';
    button.style.zIndex = '1000';
    button.style.padding = '8px 12px';
    button.style.backgroundColor = '#4CAF50';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    
    button.addEventListener('click', () => {
      this.toggleVisibility();
    });
    
    document.body.appendChild(button);
    this.button = button;
  }
  
  /**
   * Toggle visibility of the audio analyzer elements
   */
  toggleVisibility() {
    this.visible = !this.visible;
    
    if (this.visible) {
      this.showElements();
      this.button.textContent = 'Hide Audio Analyzer';
    } else {
      this.hideElements();
      this.button.textContent = 'Show Audio Analyzer';
    }
  }
  
  /**
   * Show the target elements
   */
  showElements() {
    this.targetElements.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.style.display = 'block';
      }
    });
  }
  
  /**
   * Hide the target elements
   */
  hideElements() {
    this.targetElements.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.style.display = 'none';
      }
    });
  }
  
  /**
   * Clean up resources
   */
  dispose() {
    if (this.button) {
      this.button.remove();
    }
  }
}