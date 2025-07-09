import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {maple } from './rules';


export class LSystemPlant {
    // Static shared geometry
    static sharedLeafGeometry = null;

    constructor(scene, position = new THREE.Vector3(0, -30, 0), orientation = 0, tree = maple, dynamicConfig={}) {
        console.log('TREE: ');
        console.log(tree);
        this.scene = scene;
        this.orientation = orientation !== null ? orientation : Math.random() * Math.PI / 4;        // L-system configuration
        this.dynamicConfig = dynamicConfig;
        this.axiom = tree.axiom;
        this.rules = tree.rules;
        this.angle = tree.angle;
        this.generateLeaves = tree.generate.leaves;
        this.generateFlowers = tree.generate.flowers;
        this.tree = tree;  // Store the tree configuration

        // Growth tracking
        this.currentSentence = this.axiom;
        this.nextSentence = "";
        this.iterations = 0;
        this.maxIterations = tree.maxIterations;
        this.currentDepth = 0;
        this.processedChars = 0;
        this.totalProcessedChars = 0;

        // Growth timing
        this.growthTimer = 0;
        this.growthRate = 500; // milliseconds between growth steps
        this.lastTimestamp = 0;

        // Visual properties
        this.baseBranchLength = tree.branch.baseLength;
        this.baseBranchRadius = tree.branch.baseRadius;
        this.branchColor =  new THREE.Color(tree.branch.color.red, tree.branch.color.green, tree.branch.color.blue);
        
        this.leafColor = dynamicConfig.leafColor; 

        // Apply scale factor if leaves are generated and scale is provided
        if (this.generateLeaves && dynamicConfig.scale) {
            const scaleFactor = dynamicConfig.scale;
            console.log('scaleFactor: ' + scaleFactor);
            this.baseBranchLength *= scaleFactor;
            this.baseBranchRadius *= scaleFactor;
            console.log('baseBranchLength: ' + this.baseBranchLength);
            console.log('baseBranchRadius: ' + this.baseBranchRadius);
        }

        // Scaling factors
        this.branchLengthFactor = tree.branch.lengthFactor; 
        this.branchRadiusFactor = tree.branch.radiusFactor;

        this.tree = tree;

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
        // Use materials as before
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

        // Create this plant's unique leaf geometry
        const leafParams = {
            type: tree.leaf.type,
            width: dynamicConfig.leaf.width,
            length: dynamicConfig.leaf.length,
            archStrength: dynamicConfig.leaf.archStrength
        };

        // Apply scale factor to leaf dimensions if leaves are generated and scale is provided
        if (this.generateLeaves && this.dynamicConfig.scale) {
            leafParams.width *= Math.pow(this.dynamicConfig.scale, 0.3);
            leafParams.length *= Math.pow(this.dynamicConfig.scale, 0.3);
        }

        this.leafGeometry = this.createLeafGeometry(leafParams.type, leafParams.width, leafParams.length, leafParams.archStrength);
        this.leafGeometry.computeVertexNormals();

        // Set up instanced meshes for leaves using this plant's geometry
        this.leafInstancedMesh = new THREE.InstancedMesh(
            this.leafGeometry,
            this.leafMaterial,
            1000 // Maximum instances
        );
        this.leafInstancedMesh.count = 0; // Start with 0 instances
        this.leafInstancedMesh.castShadow = true;
        this.leafInstancedMesh.receiveShadow = true;
        this.scene.add(this.leafInstancedMesh);
        // Create petal geometry (shared for all petals in this plant)
        if (this.generateFlowers) {
            const petalGeometry = this.createPetalGeometry(dynamicConfig);
            // Use average center radius from config for sphere size
            const centerRadius = (tree.flower.centerRadius.min + tree.flower.centerRadius.max) / 2;
            const centerGeometry = new THREE.SphereGeometry(centerRadius, 8, 8);
            // Create instanced meshes for this plant's flowers
            const petalColor = new THREE.Color(dynamicConfig.flowerPetalColor);
            const petalMaterial = new THREE.MeshStandardMaterial({
                color: petalColor,
                side: THREE.DoubleSide,
                roughness: 0.5,
                metalness: 0.1
            });
            this.petalInstancedMesh = new THREE.InstancedMesh(
                petalGeometry,
                petalMaterial,
                dynamicConfig.petal.count * 20 // Max petals = max petals per flower * max flowers
            );
            this.petalInstancedMesh.count = 0;
            this.petalInstancedMesh.castShadow = true;
            this.petalInstancedMesh.receiveShadow = true;
            this.scene.add(this.petalInstancedMesh);

            this.flowerCenterInstancedMesh = new THREE.InstancedMesh(
                centerGeometry,
                new THREE.MeshStandardMaterial({
                    color: new THREE.Color(dynamicConfig.flowerCenterColor),
                    roughness: 0.7,
                    metalness: 0.2
                }),
                20 // Maximum flower centers per plant
            );
            this.flowerCenterInstancedMesh.count = 0;
            this.flowerCenterInstancedMesh.castShadow = true;
            this.flowerCenterInstancedMesh.receiveShadow = true;
            this.scene.add(this.flowerCenterInstancedMesh);

            // Initialize counts
            this.petalCount = 0;
            this.flowerCount = 0;
        }


    }


    // Apply the base orientation to the coordinate system
    applyBaseOrientation() {
        // Create rotation matrix for orientation around Y axis
        const rotationMatrix = new THREE.Matrix4().makeRotationY(this.orientation);
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
        switch (type) {
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
                    const x = halfWidth * (1 - Math.abs(i - segments / 2) / (segments / 2));
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
                    const x = -halfWidth * (1 - Math.abs(i - segments / 2) / (segments / 2));
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
        // console.log(`Generated iteration ${this.iterations}: Length=${this.currentSentence.length}`);

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

                case ']': // Pop state, decrease depth, and possibly add a leaf or flower
                    if (this.branchStack.length > 0) {
                        // Place leaves at every branch end (optionally, only if depth > 1)
                        if (this.generateLeaves /* && this.currentDepth > 1 */) {
                            // Use consistent leaf size since geometry already has proper dimensions from config
                            const leafSize = 1.0;
                            const leavesPerNode = 3;
                            for (let i = 0; i < leavesPerNode; i++) {
                                this.createLeaf(this.position.clone(), this.direction.clone(), leafSize, {
                                    distribution: 'systematic',
                                    index: i,
                                    total: leavesPerNode
                                });
                            }
                        }
                        
                        // Place flowers at every branch end (same logic as leaves)
                        if (this.generateFlowers) {
                            // Use consistent flower size since geometry already has proper dimensions from config
                            const flowerSize = 1.0;
                            this.createFlower(this.position.clone(), this.direction.clone(), flowerSize);
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

        // Enable shadow casting
        cylinder.castShadow = true;
        cylinder.receiveShadow = true;
        
        // Add to scene and store reference
        this.scene.add(cylinder);
        this.branches.push(cylinder);

        return cylinder;
    }

    createPetalGeometry(dynamicConfig) {
        // Create a 3D petal that curves outward and upward naturally
        const segments = 12; // Number of segments for smooth curvature
        
        // Get configuration parameters from both static and dynamic configs
        const petalWidth = dynamicConfig.petal.width;
        const curvature = dynamicConfig.petal.curvature;
        
        // Get petal length from static config
        const petalLengthMin = this.tree.flower.petalLength.min;
        const petalLengthMax = this.tree.flower.petalLength.max;
        const petalLength = petalLengthMin + Math.random() * (petalLengthMax - petalLengthMin);
        
        // Get taper from static config
        const taper = this.tree.flower.petalTaper?.min + 
            (Math.random() * ((this.tree.flower.petalTaper?.max || 0.8) - (this.tree.flower.petalTaper?.min || 0.6)));
    
        // Create vertices and faces for a 3D curved petal
        const vertices = [];
        const faces = [];
        const uvs = [];

        let crossSections = 5;

        // Create petal by generating vertices along its length
        for (let i = 0; i <= segments; i++) {
            const t = i / segments; // Parameter from 0 to 1 along petal length
            
            // Calculate position along petal length
            const x = t * petalLength;
            
            // Calculate width at this position (tapering from base to tip)
            const widthAtPosition = petalWidth * (1 - t * (1 - taper));
            
            // Calculate upward curvature - stronger curve at the tip
            const upwardCurve = Math.sin(t * Math.PI * 0.5) * curvature * petalLength * 0.3;
            
            // Create vertices across the width at this position
            for (let j = 0; j <= crossSections; j++) {
                const s = (j / crossSections) - 0.5; // Parameter from -0.5 to 0.5 across width
                
                // Calculate the actual width coordinates with smooth edges
                const widthFactor = Math.cos(s * Math.PI); // Smooth falloff to edges
                const y = s * widthAtPosition * widthFactor;
                
                // Add slight curvature across width for natural look
                const z = upwardCurve + (widthFactor * 0.1 * widthAtPosition * Math.sin(t * Math.PI));
                
                vertices.push(x, y, z);
                uvs.push(t, (j / crossSections));
            }
        }

        // Create faces connecting the vertices
        for (let i = 0; i < segments; i++) {
            for (let j = 0; j < crossSections; j++) {
                const a = i * (crossSections + 1) + j;
                const b = i * (crossSections + 1) + j + 1;
                const c = (i + 1) * (crossSections + 1) + j + 1;
                const d = (i + 1) * (crossSections + 1) + j;

                // Create two triangles for each quad
                faces.push(a, b, d);
                faces.push(b, c, d);
            }
        }

        // Create the geometry
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(faces);
        
        // Compute normals for proper lighting
        geometry.computeVertexNormals();
        
        // Center the geometry at the base (where it attaches to flower center)
        geometry.translate(-petalLength * 0.1, 0, 0); // Slight offset so base overlaps with center

        return geometry;
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

        // Create petals around the center using dynamic petal count
        const petalCount = this.dynamicConfig.petal.count;
        
        for (let i = 0; i < petalCount; i++) {
            const angle = (i / petalCount) * Math.PI * 2;
            this.createPetal(position, direction, size, angle);
        }

        return centerIndex;
    }

    createPetal(position, direction, size, angle) {
        if (this.petalCount >= 100) return; // Maximum reached

        // Calculate the instance index
        const instanceIndex = this.petalCount;

        // Create transformation matrix for the petal
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

        // Add upward tilt for natural flower appearance (petals curve upward)
        const upwardTilt = THREE.MathUtils.degToRad(15 + Math.random() * 25); // 15-40 degrees upward
        const tiltMatrix = new THREE.Matrix4().makeRotationZ(-upwardTilt); // Negative for upward tilt
        matrix.multiply(tiltMatrix);

        // Add slight random variation for natural look
        const randomTilt = THREE.MathUtils.degToRad(Math.random() * 10 - 5); // ±5 degrees
        const randomTiltMatrix = new THREE.Matrix4().makeRotationX(randomTilt);
        matrix.multiply(randomTiltMatrix);

        // Apply small offset from center (to position petals around center)
        // This moves the petal outward from the center point
        const offset = size * 0.05; // Smaller offset so petals start closer to center
        const offsetMatrix = new THREE.Matrix4().makeTranslation(0, 0, offset);
        matrix.multiply(offsetMatrix);

        // Finally apply scale
        const scaleMatrix = new THREE.Matrix4().makeScale(size, size, size);
        matrix.multiply(scaleMatrix);

        // Set the instance matrix
        this.petalInstancedMesh.setMatrixAt(instanceIndex, matrix);

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