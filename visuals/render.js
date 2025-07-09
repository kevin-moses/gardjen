import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { LSystemPlant } from "./tree";
import { LSystemFlower } from "./flower";
import { createGrassFloor, calculateHeight } from "./environment";
import { sunsetTexture } from "../textures/colors";
import { trees, flowers } from "./rules";
import { AVConverter } from './avconverter';

export class Renderer {
    constructor() {
        // Dev mode state
        this.devMode = false;
        this.devStats = null;

        // Three.js setup
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: "high-performance",
            alpha: false,
            stencil: false
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
        this.camera.position.set(0, 15, 50);
        this.camera.lookAt(0, 0, 0);
        this.shadowsNeedUpdate = true;

        this.scene = new THREE.Scene();

        this.avconverter = new AVConverter(this.devMode);

        // Lock the camera in place: do not allow user to move or rotate
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableZoom = false;
        this.controls.enableRotate = true;
        this.controls.enablePan = false;
        this.controls.enableDamping = true;

        // Replace ambient light with more dynamic lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5); // Dimmer ambient
        this.scene.add(ambientLight);
        // Add directional light for shadows and definition
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5); // Increased intensity to 1.5
        dirLight.position.set(10, 45, 60); // Position light behind and above camera, offset to the right
        this.scene.add(dirLight);
        this.renderer.setClearColor(0x000000);
        createGrassFloor(this.scene); // Add grass floor        
        this.scene.background = sunsetTexture;

        // Enable shadows for more realism
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        dirLight.castShadow = true;
        
        // Configure shadow map for better quality
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 500;
        dirLight.shadow.camera.left = -100;
        dirLight.shadow.camera.right = 100;
        dirLight.shadow.camera.top = 100;
        dirLight.shadow.camera.bottom = -100;

        // Initialize plants and flowers arrays
        this.plants = [];
        this.flowers = [];
        this.lastTimestamp = 0;
        this.lastFlowerTimestamp = 0;

        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));

        // Animation loop
        this.animate = this.animate.bind(this);
    }

    async init() {
        await this.avconverter.init();
        // Wait for nonzero audio or max 2 seconds
        const maxWait = 2000; // ms
        const pollInterval = 100; // ms
        let waited = 0;
        let audioDetected = false;
        while (waited < maxWait) {
            if (this.avconverter.hasAudio()) {
                audioDetected = true;
                break;
            }
            await new Promise(res => setTimeout(res, pollInterval));
            waited += pollInterval;
        }
        // Proceed regardless after maxWait
        this.createNewPlant();
        // this.createNewFlower();
        this.animate();
        return true;
    }

    createNewPlant() {
        if (!this.avconverter.hasAudio()) {
            return;
        }
        // pick a plant from the trees array
        const plant = trees[Math.floor(Math.random() * trees.length)];
        // Get camera's look direction
        const cameraDirection = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDirection);

        const params = this.avconverter.generateParameters(plant);

        // Calculate the camera's field of view in radians
        const fov = THREE.MathUtils.degToRad(this.camera.fov);
        const aspect = this.camera.aspect;
        
        // Choose a reasonable distance range for plant placement
        const minDistance = 10;  // Minimum distance from camera
        const maxDistance = 40;  // Maximum distance from camera
        const distance = minDistance + Math.random() * (maxDistance - minDistance);
        
        // Calculate maximum offsets at this distance
        const maxXOffset = Math.tan(fov / 2) * distance * aspect;
        const maxYOffset = Math.tan(fov / 2) * distance * 0.5;
        
        // Generate random position within view frustum
        const xOffset = (Math.random() - 0.5) * maxXOffset;
        const yOffset = (Math.random() - 0.5) * maxYOffset;
        
        // Calculate position in world space
        const right = new THREE.Vector3();
        right.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0)).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        
        const position = new THREE.Vector3()
            .copy(this.camera.position)
            .add(cameraDirection.clone().multiplyScalar(distance))
            .add(right.multiplyScalar(xOffset))
            .add(up.multiplyScalar(yOffset));
        
        // Calculate height at the position
        const height = calculateHeight(position.x, position.z);
        const plantPosition = new THREE.Vector3(position.x, height, position.z);
        
        // Project camera direction onto XZ plane for orientation
        cameraDirection.y = 0;
        cameraDirection.normalize();
                
        // Create plant with calculated position and orientation
        const lSystemPlant = new LSystemPlant(this.scene, plantPosition, null, plant, params);
        this.plants.push(lSystemPlant);
        
        console.log(`New plant created at ${plantPosition.x}, ${plantPosition.y}, ${plantPosition.z}`);
    }

    createNewFlower() {
        // Get camera's look direction
        const cameraDirection = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDirection);
        // pick a flower from the flowers array
        const flower = flowers[Math.floor(Math.random() * flowers.length)];
        const params = this.avconverter.generateParameters(flower);
        console.log('flowerparams:')
        console.log(params)
        
        
        // Calculate the camera's field of view in radians
        const fov = THREE.MathUtils.degToRad(this.camera.fov);
        const aspect = this.camera.aspect;
        
        // Choose a reasonable distance range for flower placement
        const minDistance = 2;  // Minimum distance from camera
        const maxDistance = 20;  // Maximum distance from camera
        const distance = minDistance + Math.random() * (maxDistance - minDistance);
        
        // Calculate maximum offsets at this distance
        const maxXOffset = Math.tan(fov / 2) * distance * aspect;
        const maxYOffset = Math.tan(fov / 2) * distance * 0.5;
        
        // Generate random position within view frustum
        const xOffset = (Math.random() - 0.5) * maxXOffset;
        const yOffset = (Math.random() - 0.5) * maxYOffset;
        
        // Calculate position in world space
        const right = new THREE.Vector3();
        right.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0)).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        
        const position = new THREE.Vector3()
            .copy(this.camera.position)
            .add(cameraDirection.clone().multiplyScalar(distance))
            .add(right.multiplyScalar(xOffset))
            .add(up.multiplyScalar(yOffset));
        
        // Calculate height at the position
        const height = calculateHeight(position.x, position.z);
        const flowerPosition = new THREE.Vector3(position.x, height, position.z);
        
        // Project camera direction onto XZ plane for orientation
        cameraDirection.y = 0;
        cameraDirection.normalize();
        
        // Create flower with calculated position and orientation
        const lSystemFlower = new LSystemFlower(this.scene, flowerPosition, null, flower, params);
        this.flowers.push(lSystemFlower);
        console.log("new flower created at ", flowerPosition.x, flowerPosition.y, flowerPosition.z);
    }

    setDevMode(enabled) {
        this.devMode = enabled;
        
        if (enabled && !this.devStats) {
            // Add stats display for dev mode
            const statsContainer = document.createElement('div');
            statsContainer.style.position = 'fixed';
            statsContainer.style.top = '60px';  // Below dev mode button
            statsContainer.style.right = '10px';
            statsContainer.style.zIndex = '1000';
            statsContainer.style.padding = '10px';
            statsContainer.style.borderRadius = '4px';
            statsContainer.style.color = '#fff';
            statsContainer.style.fontFamily = 'monospace';
            this.devStats = statsContainer;
            document.body.appendChild(statsContainer);
        } else if (!enabled && this.devStats) {
            // Remove stats display when dev mode is disabled
            this.devStats.remove();
            this.devStats = null;
        }
    }

    updateDevStats() {
        if (this.devMode && this.devStats) {
            const stats = {
                'FPS': Math.round(1000 / (performance.now() - this.lastFrameTime)),
                'Draw Calls': this.renderer.info.render.calls,
                'Triangles': this.renderer.info.render.triangles,
                'Active Plants': this.plants ? this.plants.length : 0,
                'Active Flowers': this.flowers ? this.flowers.length : 0
            };
            
            this.devStats.innerHTML = Object.entries(stats)
                .map(([key, value]) => `${key}: ${value}`)
                .join('<br>');
            
            this.lastFrameTime = performance.now();
        }
    }

    animate(timestamp) {
        // Only request animation frame if something is growing or changing
        let needsUpdate = false;
        if (this.shadowsNeedUpdate) {
            this.renderer.shadowMap.needsUpdate = true;
            this.shadowsNeedUpdate = false;
        }

        if (timestamp) {
            this.lastTimestamp = timestamp;

            // Check if all plants are fully grown
            if (this.plants.every(plant => plant.isFullyGrown())) {
                this.createNewPlant();
                needsUpdate = true;
                this.shadowsNeedUpdate = true;
            }

            // Check if all flowers are fully grown (with different timing)
            if (this.flowers.every(flower => flower.isFullyGrown())) {
                // this.createNewFlower();
                needsUpdate = true;
                this.shadowsNeedUpdate = true;
            }
        }

        if (this.controls.update()) {
            needsUpdate = true;
        }

        // Update all plants and check if any are still growing
        for (let plant of this.plants) {
            if (!plant.isFullyGrown()) {
                plant.update(timestamp);
                needsUpdate = true;
                this.shadowsNeedUpdate = true;
            }
        }

        // Update all flowers independently
        for (let flower of this.flowers) {
            if (!flower.isFullyGrown()) {
                flower.update(timestamp);
                needsUpdate = true;
                this.shadowsNeedUpdate = true;
            }
        }

        if (needsUpdate || this.devMode) {  // Always render in dev mode
            this.renderer.render(this.scene, this.camera);
            this.updateDevStats();
        }

        requestAnimationFrame(this.animate);
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