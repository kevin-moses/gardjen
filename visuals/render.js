import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { LSystemPlant } from "./tree";
import { createGrassFloor } from "./environment";
import { sunsetTexture } from "../textures/colors";
export class Renderer {
    constructor() {
        // Three.js setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);
        
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
        this.camera.position.set(20, 20, 80);
        this.camera.lookAt(0, 0, 0);
        
        this.scene = new THREE.Scene();
        const gradientTexture = sunsetTexture;
        this.scene.background = gradientTexture;
        // Add OrbitControls for camera manipulation
        // Start camera 60 degrees counterclockwise (to the left) of current position
        // Original: this.camera.position.set(20, 20, 80);
        // 60 deg CCW around Y axis: x' = x*cos(θ) - z*sin(θ), z' = x*sin(θ) + z*cos(θ)
        // θ = 60deg = Math.PI/3
        const angle = Math.PI / 3;
        const origX = 20, origZ = 80;
        const newX = origX * Math.cos(angle) - origZ * Math.sin(angle);
        const newZ = origX * Math.sin(angle) + origZ * Math.cos(angle);
        this.camera.position.set(newX, 20, newZ);
        this.camera.lookAt(0, 0, 0);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true; // Add smooth damping effect
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false; // Pan parallel to the screen
        this.controls.minDistance = 10; // Minimum zoom distance
        this.controls.maxDistance = 300; // Maximum zoom distance

        // Limit azimuth angle to 90 degrees clockwise/counterclockwise from starting position
        // Set min/max relative to current azimuthal angle
        const startAzimuth = this.controls.getAzimuthalAngle();
        const halfPi = Math.PI / 2;
        this.controls.minAzimuthAngle = startAzimuth - halfPi;
        this.controls.maxAzimuthAngle = startAzimuth + halfPi;

        // Prevent camera from going under the x-y plane (keep in top hemisphere)
        // Set both min and max polar angle to <= 90deg (Math.PI/2)
        // To prevent tilting up above horizon, set maxPolarAngle just below 90deg
        this.controls.minPolarAngle = THREE.MathUtils.degToRad(30); // 30 degrees in radians
        this.controls.maxPolarAngle = THREE.MathUtils.degToRad(89); // Just below 90 degrees

        // Replace ambient light with more dynamic lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5); // Dimmer ambient
        this.scene.add(ambientLight);
        // Add directional light for shadows and definition
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(10, 20, 15);
        this.scene.add(dirLight);
        this.renderer.setClearColor(0x000000); 
        createGrassFloor(this.scene); // Add grass floor        
        
        // Optional: Enable shadows for more realism
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        dirLight.castShadow = true;
        
        // Initialize plants array - we can have multiple plants
        this.plants = [];
        this.lastPlantPosition = new THREE.Vector3(0, 0, 0);
        
        // Timer for planting new trees
        this.treeTimer = 0;
        this.treeInterval = 60000; // 60 seconds
        this.lastTimestamp = 0;

        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));

        // Animation loop
        this.animate = this.animate.bind(this);
    }

    init() {
        this.createNewPlant();
            
        // Start animation loop
        this.animate();
        return true;
    }

    createNewPlant() {
        const angle = Math.random() * 2 * Math.PI;
        const radius = Math.random() * 30;
        let xPos = this.lastPlantPosition.x + Math.cos(angle) * radius;
        let yPos = this.lastPlantPosition.z + Math.sin(angle) * radius;
        xPos = Math.max(-300, Math.min(300, xPos));
        yPos = Math.max(-300, Math.min(300, yPos));
        const position = new THREE.Vector3(xPos, 0, yPos);
        this.lastPlantPosition.copy(position);
        
        // Create plant with random characteristics
        const plant = new LSystemPlant(this.scene, position);

        this.plants.push(plant);
        
        console.log(`New plant created. Total plants: ${this.plants.length}`);
    }
   
    animate(timestamp) {
        requestAnimationFrame(this.animate);
        
        // Update tree planting timer
        if (timestamp) {
            const deltaTime = timestamp - (this.lastTimestamp || timestamp);
            this.lastTimestamp = timestamp;
            
            this.treeTimer += deltaTime;
            
            // Plant a new tree every 20 seconds
            if (this.treeTimer >= this.treeInterval) {
                this.treeTimer = 0;
                this.createNewPlant();
            }
        }
        
        // Update controls for smooth damping effect
        this.controls.update();
        
        // Update all plants and filter out any that are fully grown and inactive
        let stillGrowing = false;
        
        for (let plant of this.plants) {
            stillGrowing = !plant.isFullyGrown();
            if (stillGrowing) {
                plant.update(timestamp);
                continue; // No need to check further if one is still growing
            }
        }
        
        // Render the scene
        this.renderer.render(this.scene, this.camera);
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

export function initVisualization() {
    const renderer = new Renderer();
    renderer.init();
    return renderer;
}