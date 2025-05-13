import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { LSystemPlant } from "./tree";

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
        this.scene.background = new THREE.Color(0x222222);
        
        // Add OrbitControls for camera manipulation
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true; // Add smooth damping effect
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = true; // Pan parallel to the screen
        this.controls.minDistance = 10; // Minimum zoom distance
        this.controls.maxDistance = 500; // Maximum zoom distance
        this.controls.maxPolarAngle = Math.PI / 1.5; // Limit vertical rotation
        
        // Replace ambient light with more dynamic lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5); // Dimmer ambient
        this.scene.add(ambientLight);
        
        // Add directional light for shadows and definition
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(10, 20, 15);
        this.scene.add(dirLight);
        
        // Optional: Enable shadows for more realism
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        dirLight.castShadow = true;
        
        // Initialize plants array - we can have multiple plants
        this.plants = [];
        
        // Timer for planting new trees
        this.treeTimer = 0;
        this.treeInterval = 20000; // 20 seconds
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
        // Generate a random X position between -30 and 30
        const xPos = (Math.random() * 60) - 30;
        const position = new THREE.Vector3(xPos, -30, 0);
        
        // Create plant with random characteristics
        const plant = new LSystemPlant(this.scene, position);
        
        // Randomize some properties for variety
        plant.angle = 20 + Math.random() * 10; // Random angle between 20-30 degrees
        plant.branchLength = 0.8 + Math.random() * 0.4; // Random length between 0.8-1.2
        
        // Random green color
        const hue = 0.25 + Math.random() * 0.1; // Random hue in green range
        const saturation = 0.7 + Math.random() * 0.3; // Random saturation
        const lightness = 0.4 + Math.random() * 0.2; // Random lightness
        
        plant.branchColor = new THREE.Color().setHSL(hue, saturation, lightness);
        
        this.plants.push(plant);
        
        // If we have too many plants, remove the oldest ones
        if (this.plants.length > 5) {
            const oldPlant = this.plants.shift();
            oldPlant.reset(); // Clean up before removing
        }
        
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
            // if (this.treeTimer >= this.treeInterval) {
            //     this.treeTimer = 0;
            //     this.createNewPlant();
            // }
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