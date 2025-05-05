import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// const controls = new OrbitControls( camera, renderer.domElement );
// const loader = new GLTFLoader();

export class LSystemPlant {
    constructor(scene, audioAnalyzer = null) {
        this.scene = scene;
        this.audioAnalyzer = audioAnalyzer;
        
        // L-system configuration
        this.axiom = "X";
        this.rules = {
            "F": "FF",
            "X": "F-[[X]+X]+F[+FX]-X",
        };
        this.angle = 22.5;
        
        // Growth tracking
        this.currentSentence = this.axiom;
        this.nextSentence = "";
        this.iterations = 0;
        this.maxIterations = 5;
        
        // Growth timing
        this.growthTimer = 0;
        this.growthRate = 100; // milliseconds between generations
        this.lastTimestamp = 0;
        
        // Visual properties
        this.branchLength = 30;
        this.branchColor = 0x00ff00;
        this.branchThickness = 1;
        
        // Stored branches and growth state
        this.branches = [];
        this.currentBranch = [];
        this.branchStack = [];
        this.position = new THREE.Vector3(0, -30, 0); // Start at bottom
        this.direction = new THREE.Vector3(0, 1, 0);  // Grow upward
        
        // Tracking what's been drawn already
        this.processedChars = 0;
        this.totalProcessedChars = 0;
    }
    
    // Generate the next iteration of the L-system
    generateNextIteration() {
        if (this.iterations >= this.maxIterations) return false;
        
        this.nextSentence = "";
        for (let char of this.currentSentence) {
            this.nextSentence += this.rules[char] || char;
        }
        
        this.currentSentence = this.nextSentence;
        this.iterations++;
        this.processedChars = 0;
        console.log(`Generated iteration ${this.iterations}: ${this.currentSentence}`);
        
        return true;
    }
    
    // Process one character at a time from the current sentence
    processNextCharacters(amount = 1) {
        if (this.processedChars >= this.currentSentence.length) {
            return false;
        }
        
        let charsProcessed = 0;
        
        while (charsProcessed < amount && this.processedChars < this.currentSentence.length) {
            const char = this.currentSentence[this.processedChars];
            
            switch (char) {
                case 'F':
                    // Move forward and draw a line
                    const scaleFactor = Math.pow(0.8, this.currentDepth); 
                    const newPosition = this.position.clone().add(
                        this.direction.clone().multiplyScalar(this.branchLength * scaleFactor)
                    );
                    
                    // Add to the current branch
                    this.currentBranch.push(this.position.clone());
                    this.currentBranch.push(newPosition.clone());
                    
                    // Update position
                    this.position = newPosition;
                    break;
                    
                case 'f':
                    // Move forward without drawing
                    const newPos = this.position.clone().add(
                        this.direction.clone().multiplyScalar(this.branchLength)
                    );
                    this.position = newPos;
                    break;
                    
                case '+':
                    // Turn left (counter-clockwise around Z-axis)
                    this.direction.applyAxisAngle(
                        new THREE.Vector3(0, 0, 1), 
                        THREE.MathUtils.degToRad(this.angle)
                    );
                    break;
                    
                case '-':
                    // Turn right (clockwise around Z-axis)
                    this.direction.applyAxisAngle(
                        new THREE.Vector3(0, 0, 1), 
                        -THREE.MathUtils.degToRad(this.angle)
                    );
                    break;
                    
                case '|':
                    // Reverse direction (180 degree turn)
                    this.direction.negate();
                    break;
                    
                case '[':
                    // Save state
                    this.branchStack.push({
                        position: this.position.clone(),
                        direction: this.direction.clone(),
                        branch: [...this.currentBranch]
                    });
                    break;
                    
                case ']':
                    // Draw the current branch
                    this.drawBranch(this.currentBranch);
                    
                    // Restore state
                    if (this.branchStack.length > 0) {
                        const state = this.branchStack.pop();
                        this.position = state.position;
                        this.direction = state.direction;
                        this.currentBranch = state.branch;
                    }
                    break;
            }
            
            this.processedChars++;
            this.totalProcessedChars++;
            charsProcessed++;
        }
        
        // If we've processed some characters and have points in current branch, draw it
        if (charsProcessed > 0 && this.currentBranch.length >= 2) {
            this.drawBranch(this.currentBranch);
        }
        
        return true;
    }
    
    // Draw a branch using the provided vertices
    drawBranch(points) {
        if (points.length < 2) return;
        
        // Create a geometry from the points
        const geometry = new THREE.BufferGeometry();
        geometry.setFromPoints(points);
        
        // Create material with the color
        const material = new THREE.LineBasicMaterial({ 
            color: this.branchColor, 
            linewidth: this.branchThickness 
        });
        
        // Create the line segment and add to scene
        const line = new THREE.LineSegments(geometry, material);
        this.scene.add(line);
        
        // Store the branch for potential removal later
        this.branches.push(line);
    }
    
    // Update the plant, called each animation frame
    // Update the plant, called each animation frame
    update(timestamp) {
        // Calculate delta time since last update
        const deltaTime = this.lastTimestamp ? timestamp - this.lastTimestamp : 0;
        this.lastTimestamp = timestamp;
        
        // Increment growth timer
        this.growthTimer += deltaTime;
        
        // Check if it's time to grow
        if (this.growthTimer >= this.growthRate) {
            this.growthTimer = 0;
            
            // If we've processed the whole current sentence, generate next iteration
            if (this.processedChars >= this.currentSentence.length) {
                if (!this.generateNextIteration()) {
                    // Reached max iterations, nothing more to do
                    return false; // Indicates plant is fully grown
                }
            }
            
            // Process some characters from the current sentence
            this.processNextCharacters(10); // Process 10 characters at a time
        }
        
        return true; // Plant is still growing
    }
    
    // // Update existing branches based on audio properties
    // updateExistingBranches() {
    //     if (!this.audioAnalyzer) return;
        
    //     const features = this.audioAnalyzer.getFeatures();
    //     if (!features) return;
        
    //     // Example: Wiggle branches based on bass frequencies
    //     if (features.spectralFlatness) {
    //         for (let branch of this.branches) {
    //             // Apply subtle rotation to simulate movement
    //             branch.rotation.z = Math.sin(this.lastTimestamp / 1000) * features.spectralFlatness * 0.05;
    //         }
    //     }
    // }
    
    // Reset the plant to start a new one
    reset() {
        // Remove all branches from scene
        for (let branch of this.branches) {
            this.scene.remove(branch);
        }
        
        // Reset all tracking properties
        this.branches = [];
        this.currentBranch = [];
        this.branchStack = [];
        this.currentSentence = this.axiom;
        this.nextSentence = "";
        this.iterations = 0;
        this.processedChars = 0;
        this.totalProcessedChars = 0;
        this.growthTimer = 0;
    }
    
    // Is the plant fully grown?
    isFullyGrown() {
        return this.iterations >= this.maxIterations && 
               this.processedChars >= this.currentSentence.length;
    }
}
