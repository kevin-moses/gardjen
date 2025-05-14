import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { weed, barnsley } from './rules';

export class LSystemPlant {
    constructor(scene, position = new THREE.Vector3(0, -30, 0)) {
        this.scene = scene;

        // L-system configuration
        this.axiom = weed.axiom;
        this.rules = weed.rules;
        this.angle = weed.angle;

        // Growth tracking
        this.currentSentence = this.axiom;
        this.nextSentence = "";
        this.iterations = 0;
        this.maxIterations = 5;
        this.currentDepth = 0;
        this.processedChars = 0;
        this.totalProcessedChars = 0;

        // Growth timing
        this.growthTimer = 0;
        this.growthRate = 300; // milliseconds between growth steps
        this.lastTimestamp = 0;

        // Visual properties
        this.baseBranchLength = 0.5;
        this.baseBranchRadius = 0.2;
        this.branchColor = 0x00ff00;
        this.leafColor = 0x228B22; // Forest green

        // Scaling factors
        this.branchLengthFactor = 0.8; // Each branch level is 80% of parent's length
        this.branchRadiusFactor = 0.7; // Each branch level is 70% of parent's radius

        // Feature flags
        this.generateLeaves = true;

        // Stored branches and growth state
        this.branches = [];
        this.leaves = [];
        this.branchStack = [];
        this.position = position.clone(); // Start position
        
        // 3D rotation reference frame (local coordinate system)
        this.direction = new THREE.Vector3(0, 1, 0); // Forward/heading direction (Y-axis)
        this.left = new THREE.Vector3(-1, 0, 0);     // Left direction (negative X-axis)
        this.up = new THREE.Vector3(0, 0, 1);        // Up direction (Z-axis)

        // Bezier curve control for future flower petals
        this.curvePoints = [];
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
        console.log(`Generated iteration ${this.iterations}: Length=${this.currentSentence.length}`);

        return true;
    }

    // Process next characters in the L-system string
    processNextCharacters(amount = 1) {
        if (this.processedChars >= this.currentSentence.length) {
            return false;
        }

        let charsProcessed = 0;
        let lastBranchStart = null;
        let lastBranchEnd = null;

        while (charsProcessed < amount && this.processedChars < this.currentSentence.length) {
            const char = this.currentSentence[this.processedChars];

            switch (char) {
                case 'F':
                    // Calculate scaled dimensions
                    const branchLength = this.baseBranchLength * Math.pow(this.branchLengthFactor, this.currentDepth);
                    const branchRadius = this.baseBranchRadius * Math.pow(this.branchRadiusFactor, this.currentDepth);
                    
                    // Save start position
                    lastBranchStart = this.position.clone();
                    
                    // Calculate and update position
                    this.position.add(this.direction.clone().multiplyScalar(branchLength));
                    lastBranchEnd = this.position.clone();
                    
                    // Draw the branch
                    if (lastBranchStart && lastBranchEnd) {
                        this.drawCylindricalBranch(lastBranchStart, lastBranchEnd, branchRadius);
                    }
                    break;

                case 'f':
                    // Move without drawing
                    const moveLength = this.baseBranchLength * Math.pow(this.branchLengthFactor, this.currentDepth);
                    this.position.add(this.direction.clone().multiplyScalar(moveLength));
                    break;

                case '+': // Pitch up around the local left axis
                    this.direction.applyAxisAngle(this.left, THREE.MathUtils.degToRad(this.angle));
                    this.up.applyAxisAngle(this.left, THREE.MathUtils.degToRad(this.angle));
                    break;

                case '-': // Pitch down around the local left axis
                    this.direction.applyAxisAngle(this.left, -THREE.MathUtils.degToRad(this.angle));
                    this.up.applyAxisAngle(this.left, -THREE.MathUtils.degToRad(this.angle));
                    break;

                case '&': // Roll left around the local heading axis
                    this.left.applyAxisAngle(this.direction, THREE.MathUtils.degToRad(this.angle));
                    this.up.applyAxisAngle(this.direction, THREE.MathUtils.degToRad(this.angle));
                    break;

                case '^': // Roll right around the local heading axis
                    this.left.applyAxisAngle(this.direction, -THREE.MathUtils.degToRad(this.angle));
                    this.up.applyAxisAngle(this.direction, -THREE.MathUtils.degToRad(this.angle));
                    break;

                case '\\': // Yaw left around the local up axis
                    this.direction.applyAxisAngle(this.up, THREE.MathUtils.degToRad(this.angle));
                    this.left.applyAxisAngle(this.up, THREE.MathUtils.degToRad(this.angle));
                    break;

                case '/': // Yaw right around the local up axis
                    this.direction.applyAxisAngle(this.up, -THREE.MathUtils.degToRad(this.angle));
                    this.left.applyAxisAngle(this.up, -THREE.MathUtils.degToRad(this.angle));
                    break;

                case '|': // Turn around (180 degrees around up axis)
                    this.direction.negate();
                    this.left.negate();
                    break;

                case '[': // Push state and increase depth
                    this.branchStack.push({
                        position: this.position.clone(),
                        direction: this.direction.clone(),
                        left: this.left.clone(),
                        up: this.up.clone(),
                        depth: this.currentDepth
                    });
                    this.currentDepth++;
                    break;

                case ']': // Pop state, decrease depth, and possibly add a leaf
                    if (this.branchStack.length > 0) {
                        // Check if this is a terminal branch (no children)
                        const isTerminal = this.processedChars + 1 >= this.currentSentence.length ||
                            this.currentSentence[this.processedChars + 1] !== '[';

                        // If terminal branch and leaf generation is enabled, add a leaf
                        if (isTerminal && this.generateLeaves && this.currentDepth > 1) {
                            const leafSize = 2 * Math.pow(0.9, this.currentDepth);
                            this.createLeaf(this.position.clone(), this.direction.clone(), leafSize);
                        }

                        // Restore state
                        const state = this.branchStack.pop();
                        this.position = state.position;
                        this.direction = state.direction;
                        this.left = state.left;
                        this.up = state.up;
                        this.currentDepth = state.depth;
                    }
                    break;
            }

            this.processedChars++;
            this.totalProcessedChars++;
            charsProcessed++;
        }

        return true;
    }

    // Draw a cylindrical branch between two points
    drawCylindricalBranch(startPoint, endPoint, radius) {
        // Calculate direction and length
        const direction = new THREE.Vector3().subVectors(endPoint, startPoint);
        const length = direction.length();

        if (length < 0.01) return; // Skip extremely short branches

        // Create cylinder geometry
        const geometry = new THREE.CylinderGeometry(
            radius * 0.8,  // Top radius (slightly tapered)
            radius,        // Bottom radius
            length,        // Height
            8,             // RadialSegments
            1,             // HeightSegments
            false          // Open-ended
        );

        // Move cylinder geometry so its base is at the origin
        geometry.translate(0, length / 2, 0);

        // Create material
        const material = new THREE.MeshStandardMaterial({
            color: this.branchColor,
            roughness: 0.8,
            metalness: 0.1
        });

        // Create the mesh
        const cylinder = new THREE.Mesh(geometry, material);

        // Position at start point
        cylinder.position.copy(startPoint);

        // Orient to align with branch direction
        const normalizedDirection = direction.clone().normalize();
        cylinder.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),  // Default cylinder orientation
            normalizedDirection           // Target direction
        );

        // Add to scene and store reference
        this.scene.add(cylinder);
        this.branches.push(cylinder);

        return cylinder;
    }

    // Create a leaf at the given position
    createLeaf(position, direction, size) {
        // Create a simple leaf shape
        const leafGeometry = new THREE.BufferGeometry();

        // Define leaf as a triangular shape
        const vertices = new Float32Array([
            0, 0, 0,           // Base of leaf
            -size, size, 0,    // Left point
            size, size, 0      // Right point
        ]);

        leafGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        leafGeometry.computeVertexNormals();

        // Create a green material, brighter than branches
        const leafMaterial = new THREE.MeshStandardMaterial({
            color: this.leafColor,
            side: THREE.DoubleSide,
            roughness: 0.5,
            metalness: 0.0
        });

        // Create mesh
        const leaf = new THREE.Mesh(leafGeometry, leafMaterial);

        // Position at the end of branch
        leaf.position.copy(position);

        // Orient leaf to face roughly upward but along branch direction
        // Add randomness to the leaf direction
        const upVector = new THREE.Vector3(0, 1, 0);

        // Create a perturbed normal for the leaf
        const randomAxis = new THREE.Vector3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
        ).normalize();
        const randomAngle = THREE.MathUtils.degToRad(10 + Math.random() * 20); // 10-30 degrees
        const leafNormal = new THREE.Vector3(0, 0, 1).applyAxisAngle(randomAxis, randomAngle);

        // Blend between branch direction and world up
        const blendedUp = new THREE.Vector3()
            .addVectors(direction, upVector)
            .normalize();

        leaf.quaternion.setFromUnitVectors(leafNormal, blendedUp);

        // Add to scene and store
        this.scene.add(leaf);
        this.leaves.push(leaf); // Store in dedicated leaves array

        return leaf;
    }

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

    // Reset the plant to start a new one
    reset() {
        // Remove all branches and leaves from scene
        for (let branch of this.branches) {
            this.scene.remove(branch);
        }

        for (let leaf of this.leaves) {
            this.scene.remove(leaf);
        }

        // Reset all tracking properties
        this.branches = [];
        this.leaves = [];
        this.branchStack = [];
        this.currentSentence = this.axiom;
        this.nextSentence = "";
        this.iterations = 0;
        this.processedChars = 0;
        this.totalProcessedChars = 0;
        this.growthTimer = 0;
        this.currentDepth = 0;
        
        // Reset position and orientation
        this.position = new THREE.Vector3(0, -30, 0);
        this.direction = new THREE.Vector3(0, 1, 0);
        this.left = new THREE.Vector3(-1, 0, 0);
        this.up = new THREE.Vector3(0, 0, 1);
        
        this.curvePoints = [];
    }

    // Is the plant fully grown?
    isFullyGrown() {
        return this.iterations >= this.maxIterations &&
            this.processedChars >= this.currentSentence.length;
    }
}