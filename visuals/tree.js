import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { weed, barnsley, maple, simpleDaisy, fern, smallFern, bush, sunflower } from './rules';

export class LSystemPlant {
    // Static shared geometry
    static sharedLeafGeometry = null;

    constructor(scene, position = new THREE.Vector3(0, -30, 0), orientation = 0, sharedMaterials = null) {
        this.scene = scene;
        this.orientation = orientation !== null ? orientation : Math.random() * Math.PI / 2;        // L-system configuration
        console.log(this.orientation)
        this.axiom = maple.axiom;
        this.rules = maple.rules;
        this.angle = maple.angle;
        this.generateLeaves = maple.generate.leaves;
        this.generateFlowers = maple.generate.flowers; 

        // Growth tracking
        this.currentSentence = this.axiom;
        this.nextSentence = "";
        this.iterations = 0;
        this.maxIterations = 4;
        this.currentDepth = 0;
        this.processedChars = 0;
        this.totalProcessedChars = 0;

        // Growth timing
        this.growthTimer = 0;
        this.growthRate = 500; // milliseconds between growth steps
        this.lastTimestamp = 0;

        // Visual properties
        this.baseBranchLength = maple.branch.baseLength;
        this.baseBranchRadius = maple.branch.baseRadius;
        this.branchColor = new THREE.Color(maple.branch.color.red, maple.branch.color.green, maple.branch.color.blue);
        this.leafColor = 0x228B22; // Forest green

        // Scaling factors
        this.branchLengthFactor = maple.branch.lengthFactor; // Each branch level is 80% of parent's length
        this.branchRadiusFactor = maple.branch.radiusFactor; // Each branch level is 70% of parent's radius


        // Stored branches and growth state
        this.branches = [];
        this.leaves = [];
        this.branchStack = [];
        this.flowers = []; // Add flower storage
        this.petals = [];  // Add petal storage
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

        // Create this plant's unique leaf geometry
        const leafParams = {
            type: 'maple',
            width: maple.leaf.width.min,
            length: maple.leaf.length.min,
            archStrength: maple.leaf.archStrength.min
        };
        console.log(leafParams);
        this.leafGeometry = this.createLeafGeometry(leafParams.type, leafParams.width, leafParams.length, leafParams.archStrength);
        this.leafGeometry.computeVertexNormals();

        // Set up instanced meshes for leaves using this plant's geometry
        this.leafInstancedMesh = new THREE.InstancedMesh(
            this.leafGeometry,
            this.leafMaterial,
            1000 // Maximum instances
        );
        this.leafInstancedMesh.count = 0; // Start with 0 instances
        this.scene.add(this.leafInstancedMesh);
        // Create petal geometry (shared for all petals in this plant)
        const petalGeometry = this.createPetalGeometry();

        // Create flower center geometry (shared for all flower centers)
        const centerGeometry = new THREE.SphereGeometry(1.0, 8, 8); // Unit size

        // Create instanced meshes for this plant's flowers
        this.petalInstancedMesh = new THREE.InstancedMesh(
            petalGeometry,
            new THREE.MeshStandardMaterial({
                color: 0xFF4081, // Pink default
                side: THREE.DoubleSide,
                roughness: 0.5,
                metalness: 0.1
            }),
            100 // Maximum petals per plant
        );
        this.petalInstancedMesh.count = 0;
        this.scene.add(this.petalInstancedMesh);

        this.flowerCenterInstancedMesh = new THREE.InstancedMesh(
            centerGeometry,
            new THREE.MeshStandardMaterial({
                color: 0xFFF9C4, // Light yellow
                roughness: 0.7,
                metalness: 0.2
            }),
            20 // Maximum flower centers per plant
        );
        this.flowerCenterInstancedMesh.count = 0;
        this.scene.add(this.flowerCenterInstancedMesh);

        // Initialize counts
        this.petalCount = 0;
        this.flowerCount = 0;

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

    createLeafGeometry(type = 'serrated', width = 0.5, length = 0.5, archStrength = 3.0) {
        const shape = new THREE.Shape();
        const halfWidth = width * 0.5;
        const halfLength = length * 0.5;
        console.log(type, width, length, archStrength)
        switch(type) {
            case 'maple':
                shape.moveTo(0, -halfLength);
                shape.lineTo(0, halfLength);
                shape.bezierCurveTo(
                    -halfWidth * 0.8, halfLength * 0.8,
                    -halfWidth, halfLength * 0.4,
                    -halfWidth * 0.6, 0
                );
                shape.bezierCurveTo(
                    -halfWidth * 0.8, -halfLength * 0.4,
                    -halfWidth, -halfLength * 0.8,
                    0, -halfLength
                );
                shape.bezierCurveTo(
                    halfWidth, -halfLength * 0.8,
                    halfWidth * 0.8, -halfLength * 0.4,
                    halfWidth * 0.6, 0
                );
                shape.bezierCurveTo(
                    halfWidth, halfLength * 0.4,
                    halfWidth * 0.8, halfLength * 0.8,
                    0, halfLength
                );
                break;
            case 'oval':
                shape.moveTo(0, -halfLength);
                shape.bezierCurveTo(
                    halfWidth, -halfLength,
                    halfWidth, halfLength,
                    0, halfLength
                );
                shape.bezierCurveTo(
                    -halfWidth, halfLength,
                    -halfWidth, -halfLength,
                    0, -halfLength
                );
                break;
            case 'serrated':
                const segments = 8;
                const segmentLength = length / segments;
                const serrationSize = width * 0.1;
                shape.moveTo(0, -halfLength);
                for (let i = 0; i < segments; i++) {
                    const y = -halfLength + (i + 0.5) * segmentLength;
                    const x = halfWidth * (1 - Math.abs(i - segments/2) / (segments/2));
                    if (i < segments - 1) {
                        shape.bezierCurveTo(
                            x + serrationSize, y,
                            x + serrationSize, y + segmentLength * 0.5,
                            x, y + segmentLength
                        );
                    }
                }
                for (let i = segments - 1; i >= 0; i--) {
                    const y = -halfLength + (i + 0.5) * segmentLength;
                    const x = -halfWidth * (1 - Math.abs(i - segments/2) / (segments/2));
                    if (i > 0) {
                        shape.bezierCurveTo(
                            x - serrationSize, y,
                            x - serrationSize, y - segmentLength * 0.5,
                            x, y - segmentLength
                        );
                    }
                }
                break;
            default:
                shape.moveTo(0, -halfLength);
                shape.bezierCurveTo(
                    halfWidth * 0.8, -halfLength * 0.5,
                    halfWidth * 0.8, halfLength * 0.5,
                    0, halfLength
                );
                shape.bezierCurveTo(
                    -halfWidth * 0.8, halfLength * 0.5,
                    -halfWidth * 0.8, -halfLength * 0.5,
                    0, -halfLength
                );
        }

        const geometry = new THREE.ShapeGeometry(shape, 32);

        // Arch the leaf: curve along the length (y axis) and outward from the branch
        const positions = geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            let z = positions.getZ(i);

            // y runs from -halfLength (base) to +halfLength (tip)
            const t = (y + halfLength) / length; // 0 at base, 1 at tip
            // Outward arch (x-y plane): move tip further from branch
            const archOut = archStrength * Math.sin(Math.PI * t) * (1 - Math.abs(x) / halfWidth);
            // Downward arch (z): droop more at the tip
            const archDown = -archStrength * Math.pow(t, 2);

            // Combine effects
            positions.setXYZ(
                i,
                x + archOut, // move outward
                y,
                z + archDown // droop downward
            );
        }
        positions.needsUpdate = true;
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
                        // A branch is terminal if the next character is not a movement or branch command
                        const nextChar = this.currentSentence[this.processedChars + 1];
                        const isTerminal = (
                            this.processedChars + 1 >= this.currentSentence.length ||
                            !['[', 'F', 'f'].includes(nextChar)
                        );

                        if (isTerminal && this.generateLeaves && this.currentDepth > 1) {
                            const leafSize = Math.pow(0.9, this.currentDepth);
                            const leavesPerNode = 3;
                            for (let i = 0; i < leavesPerNode; i++) {
                                this.createLeaf(this.position.clone(), this.direction.clone(), leafSize, {
                                    distribution: 'systematic',
                                    index: i,
                                    total: leavesPerNode
                                });
                            }
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

    createPetalGeometry() {
        // Create a shape for the petal
        const petalShape = new THREE.Shape();
        const size = 1.0; // Unit size
        const petalWidth = size * 0.3;

        petalShape.moveTo(0, 0);
        petalShape.bezierCurveTo(
            size * 0.3, petalWidth,
            size * 0.7, petalWidth,
            size, 0
        );
        petalShape.bezierCurveTo(
            size * 0.7, -petalWidth,
            size * 0.3, -petalWidth,
            0, 0
        );

        // Create geometry from the shape
        const petalGeometry = new THREE.ShapeGeometry(petalShape, 8);

        // Center the geometry at origin for proper transformations
        petalGeometry.computeBoundingBox();
        const center = new THREE.Vector3();
        petalGeometry.boundingBox.getCenter(center);
        petalGeometry.translate(-center.x, -center.y, -center.z);

        return petalGeometry;
    }

    createLeaf(position, direction, size, options = {}) {
        if (this.leafInstancedMesh.count >= 1000) return;

        const posVec = position.clone();
        const scaleVec = new THREE.Vector3(size, size, size);

        // Align with branch direction
        const upVector = new THREE.Vector3(0, 1, 0);
        const targetDir = direction.clone().normalize();
        let quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(upVector, targetDir);

        // --- Radial distribution logic ---
        // Choose distribution strategy based on options or plant type
        // options.distribution = 'systematic';
        // options.index = 1;
        // options.total = 3;
        options.randomTilt = true;
        let angle = 0;
        if (options.distribution === 'systematic' && typeof options.index === 'number' && typeof options.total === 'number') {
            // Systematic: evenly distribute around the branch
            const goldenAngle = 137.5 * Math.PI / 180;
            const leafIndex = options.index;
            angle = (leafIndex * goldenAngle) % (2 * Math.PI);
        } else {
            // Default: random distribution
            angle = Math.random() * Math.PI * 2;
        }
        const aroundBranchQuat = new THREE.Quaternion();
        aroundBranchQuat.setFromAxisAngle(targetDir, angle);
        quaternion.premultiply(aroundBranchQuat);

        // Optional: add a small random tilt for natural look
        if (options.randomTilt !== false) {
            const randomAxis = new THREE.Vector3(
                Math.random() - 0.5,
                Math.random() - 0.5,
                Math.random() - 0.5
            ).normalize();
            const randomAngle = THREE.MathUtils.degToRad(10 + Math.random() * 20); // 10-30 degrees
            const randomQuat = new THREE.Quaternion().setFromAxisAngle(randomAxis, randomAngle);
            quaternion.multiply(randomQuat);
        }

        // Compose transformation
        const matrix = new THREE.Matrix4();
        matrix.compose(posVec, quaternion, scaleVec);

        this.leafInstancedMesh.setMatrixAt(this.leafInstancedMesh.count, matrix);
        this.leafInstancedMesh.count++;
        this.leafInstancedMesh.instanceMatrix.needsUpdate = true;

        return this.leafInstancedMesh.count - 1;
    }
    // New function to create flowers using Bezier curves
    createFlower(position, direction, size) {
        if (this.flowerCount >= 20) return; // Maximum reached

        // Use the proper index for the flower center
        const centerIndex = this.flowerCount;

        // Calculate appropriate scale for the center (sphere)
        const centerSize = size * 0.15;

        // Create a matrix for the flower center
        const centerMatrix = new THREE.Matrix4();

        // Position first, then scale (simpler approach)
        const pos = position.clone();
        const scale = new THREE.Vector3(centerSize, centerSize, centerSize);
        const quaternion = new THREE.Quaternion(); // No rotation needed for sphere

        // Compose the matrix directly
        centerMatrix.compose(pos, quaternion, scale);

        // Set the matrix for this instance
        this.flowerCenterInstancedMesh.setMatrixAt(centerIndex, centerMatrix);

        // Update the instanced mesh
        this.flowerCount++;
        this.flowerCenterInstancedMesh.count = this.flowerCount;
        this.flowerCenterInstancedMesh.instanceMatrix.needsUpdate = true;

        // Choose a color for petals
        const petalColor = new THREE.Color(Math.random() > 0.5 ? 0xFF4081 : 0x9C27B0);

        // Create petals around the center
        const petalCount = 5 + Math.floor(Math.random() * 3); // 5-7 petals
        for (let i = 0; i < petalCount; i++) {
            const angle = (i / petalCount) * Math.PI * 2;
            this.createPetal(position, direction, size, angle, petalColor);
        }

        return centerIndex;
    }

    createPetal(position, direction, size, angle, color) {
        if (this.petalCount >= 100) return; // Maximum reached

        // Calculate the instance index
        const instanceIndex = this.petalCount;

        // Replace the matrix creation section with this:
        const matrix = new THREE.Matrix4();

        // Start with identity matrix
        matrix.identity();

        // First translate to position
        matrix.setPosition(position.x, position.y, position.z);

        // Then apply direction rotation (this rotates around the position)
        const upVector = new THREE.Vector3(0, 1, 0);
        const dirQuaternion = new THREE.Quaternion();
        dirQuaternion.setFromUnitVectors(upVector, direction.normalize());

        // Apply direction quaternion
        const dirMatrix = new THREE.Matrix4().makeRotationFromQuaternion(dirQuaternion);
        matrix.multiply(dirMatrix);

        // Apply angle rotation (rotate around local Y axis for petal arrangement)
        const rotationY = new THREE.Matrix4().makeRotationY(angle);
        matrix.multiply(rotationY);

        // Apply random tilt (around local X axis)
        const randomTilt = THREE.MathUtils.degToRad(Math.random() * 20 - 10);
        const tiltMatrix = new THREE.Matrix4().makeRotationX(randomTilt);
        matrix.multiply(tiltMatrix);

        // Apply small offset from center (to position petals around center)
        // This moves the petal outward from the center point
        const offset = size * 0.1; // Small offset
        const offsetMatrix = new THREE.Matrix4().makeTranslation(0, 0, offset);
        matrix.multiply(offsetMatrix);

        // Finally apply scale
        const scaleMatrix = new THREE.Matrix4().makeScale(size, size, size);
        matrix.multiply(scaleMatrix);

        // Set the instance matrix
        this.petalInstancedMesh.setMatrixAt(instanceIndex, matrix);

        // Set the instance color
        if (color) {
            // If the material supports it, you could set instance colors
            // For simplicity, we're just setting the material color for all petals
            this.petalInstancedMesh.material.color.set(color);
        }

        // Update the instance
        this.petalCount++;
        this.petalInstancedMesh.count = this.petalCount;
        this.petalInstancedMesh.instanceMatrix.needsUpdate = true;

        return instanceIndex;
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
        this.flowers = []; // Reset flowers array
        this.petals = [];  // Reset petals array
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