import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { LSystemPlant } from "./tree";
import { LSystemFlower } from "./flower";
import { createGrassFloor, calculateHeight } from "./environment";
import { sunsetTexture } from "../textures/colors";
import { floatToColor } from "./flower";
import { maple, weed, simpleDaisy } from "./rules";

export class Renderer {
    constructor() {
        // Three.js setup
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: "high-performance",
            alpha: false,
            stencil: false
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
        this.camera.position.set(10, 29, 133);
        this.camera.lookAt(0, 0, 0);
        this.shadowsNeedUpdate = true;

        this.scene = new THREE.Scene();
        this.scene.background = sunsetTexture;

        // Lock the camera in place: do not allow user to move or rotate
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableZoom = true;
        this.controls.enableRotate = true;
        this.controls.enablePan = false;
        this.controls.enableDamping = false;

        // Replace ambient light with more dynamic lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5); // Dimmer ambient
        this.scene.add(ambientLight);
        // Add directional light for shadows and definition
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5); // Increased intensity to 1.5
        dirLight.position.set(150, 100, 10); // Positioned to the right and above camera
        this.scene.add(dirLight);
        this.renderer.setClearColor(0x000000);
        createGrassFloor(this.scene); // Add grass floor        

        // Optional: Enable shadows for more realism
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        dirLight.castShadow = true;

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

    init() {
        this.createNewPlant();
        this.createNewFlower();
        this.animate();
        return true;
    }

    createNewPlant() {
        // Get camera's look direction
        const cameraDirection = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDirection);
        
        // Calculate the camera's field of view in radians
        const fov = THREE.MathUtils.degToRad(this.camera.fov);
        const aspect = this.camera.aspect;
        
        // Choose a reasonable distance range for plant placement
        const minDistance = 20;  // Minimum distance from camera
        const maxDistance = 80;  // Maximum distance from camera
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
        
        // Calculate angle between camera direction and positive Z axis
        
        // Create plant with calculated position and orientation
        console.log("maple", maple);
        const plant = new LSystemPlant(this.scene, plantPosition, null, maple);
        this.plants.push(plant);
        
        console.log(`New plant created at ${plantPosition.x}, ${plantPosition.y}, ${plantPosition.z}`);
    }

    createNewFlower() {
        // Get camera's look direction
        const cameraDirection = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDirection);
        
        // Calculate the camera's field of view in radians
        const fov = THREE.MathUtils.degToRad(this.camera.fov);
        const aspect = this.camera.aspect;
        
        // Choose a reasonable distance range for flower placement
        const minDistance = 20;  // Minimum distance from camera
        const maxDistance = 80;  // Maximum distance from camera
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
        const flower = new LSystemFlower(this.scene, flowerPosition, null, simpleDaisy);
        this.flowers.push(flower);
        console.log("new flower created at ", flowerPosition.x, flowerPosition.y, flowerPosition.z);
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
                this.createNewFlower();
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

        if (needsUpdate) {
            this.renderer.render(this.scene, this.camera);
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