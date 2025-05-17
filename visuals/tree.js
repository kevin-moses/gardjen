import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { weed, barnsley, maple } from './rules';

export class LSystemPlant {
    constructor(scene, position = new THREE.Vector3(0, -30, 0), orientation = 0, sharedMaterials = null) {
        this.scene = scene;
        this.orientation = orientation !== null ? orientation : Math.random() * Math.PI * 2;        // L-system configuration
        this.axiom = maple.axiom;
        this.rules = maple.rules;
        this.angle = maple.angle;

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
        this.applyBaseOrientation();

        // Bezier curve control for future flower petals
        this.curvePoints = [];
        // Use shared materials if provided
        if (sharedMaterials) {
            this.branchMaterial = sharedMaterials.branch;
            this.leafMaterial = sharedMaterials.leaf;
        } else {
            // Create materials as before
            this.branchMaterial = new THREE.MeshStandardMaterial({
                color: this.branchColor,
                roughness: 0.8,
                metalness: 0.1
            });

            this.leafMaterial = new THREE.MeshStandardMaterial({
                color: this.leafColor,
                side: THREE.DoubleSide,
                roughness: 0.5,
                metalness: 0.0
            });
        }
        // Set up instanced meshes for leaves
        const leafGeometry = this.createCrossLeaf()
        leafGeometry.computeVertexNormals();
        // Define leaf geometry

        this.leafInstancedMesh = new THREE.InstancedMesh(
            leafGeometry,
            this.leafMaterial,
            1000 // Maximum instances
        );
        this.leafInstancedMesh.count = 0; // Start with 0 instances
        this.scene.add(this.leafInstancedMesh);

    }

    // Apply the base orientation to the coordinate system
    applyBaseOrientation() {
        // Create rotation matrix for orientation around Y axis
        const rotationMatrix = new THREE.Matrix4().makeRotationY(this.orientation);
        console.log(this.orientation)
        console.log(rotationMatrix)
        // Apply rotation to direction vectors
        this.direction.applyMatrix4(rotationMatrix);
        this.left.applyMatrix4(rotationMatrix);
        this.up.applyMatrix4(rotationMatrix);

        // Ensure vectors remain orthogonal and normalized
        this.direction.normalize();
        this.left.normalize();
        this.up.normalize();
    }

    createCrossLeaf() {
        // Create a buffer geometry directly
        const vertices = new Float32Array([
            // First plane
            -0.5, 0.0, -0.5,  // bottom left
            0.5, 0.0, -0.5,  // bottom right
            -0.5, 0.0, 0.5,  // top left
            0.5, 0.0, 0.5,  // top right

            // Second plane (rotated 60 degrees around Y)
            -0.25, 0.0, -0.433,  // bottom left 
            0.25, 0.0, -0.433,  // bottom right
            -0.25, 0.0, 0.433,  // top left
            0.25, 0.0, 0.433   // top right
        ]);

        // Define faces with indices
        const indices = new Uint16Array([
            0, 1, 2,  // first plane, triangle 1
            2, 1, 3,  // first plane, triangle 2
            4, 5, 6,  // second plane, triangle 1
            6, 5, 7   // second plane, triangle 2
        ]);

        // Create UVs for texture mapping
        const uvs = new Float32Array([
            // First plane
            0, 0,
            1, 0,
            0, 1,
            1, 1,

            // Second plane
            0, 0,
            1, 0,
            0, 1,
            1, 1
        ]);

        // Create the buffer geometry
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        geometry.setIndex(new THREE.BufferAttribute(indices, 1));

        // Compute normals for proper lighting
        geometry.computeVertexNormals();

        return geometry;
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
                    // This should already work with oriented direction vector
                    const branchLength = this.baseBranchLength * Math.pow(this.branchLengthFactor, this.currentDepth);
                    const branchRadius = this.baseBranchRadius * Math.pow(this.branchRadiusFactor, this.currentDepth);

                    lastBranchStart = this.position.clone();
                    // Use existing direction vector (already oriented)
                    this.position.add(this.direction.clone().multiplyScalar(branchLength));
                    lastBranchEnd = this.position.clone();

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

        // Create the mesh
        const cylinder = new THREE.Mesh(geometry, this.branchMaterial);

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

    createLeaf(position, direction, size) {
        if (this.leafInstancedMesh.count >= 1000) return; // Max reached

        // Create transformation components
        const posVec = position.clone();
        const scaleVec = new THREE.Vector3(size, size, size);

        // Base orientation: align with direction
        const upVector = new THREE.Vector3(0, 1, 0);
        const targetDir = direction.clone().normalize();
        const quaternion = new THREE.Quaternion();

        quaternion.setFromUnitVectors(upVector, targetDir);

        // Add randomness to orientation
        const randomAxis = new THREE.Vector3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
        ).normalize();
        const randomAngle = THREE.MathUtils.degToRad(10 + Math.random() * 20); // 10-30 degrees
        const randomQuat = new THREE.Quaternion().setFromAxisAngle(randomAxis, randomAngle);
        quaternion.multiply(randomQuat);

        // Create transformation matrix
        const matrix = new THREE.Matrix4();
        matrix.compose(posVec, quaternion, scaleVec);

        // Set matrix for this instance
        this.leafInstancedMesh.setMatrixAt(this.leafInstancedMesh.count, matrix);
        this.leafInstancedMesh.count++;
        this.leafInstancedMesh.instanceMatrix.needsUpdate = true;

        return this.leafInstancedMesh.count - 1;
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

        // Reset position and apply orientation again
        this.position = new THREE.Vector3(0, -30, 0);
        
        // Reset base vectors
        this.direction = new THREE.Vector3(0, 1, 0);
        this.left = new THREE.Vector3(-1, 0, 0);
        this.up = new THREE.Vector3(0, 0, 1);
        
        // Apply the orientation to the reset vectors
        this.applyBaseOrientation();
        

        this.curvePoints = [];
    }

    // Is the plant fully grown?
    isFullyGrown() {
        return this.iterations >= this.maxIterations &&
            this.processedChars >= this.currentSentence.length;
    }
}