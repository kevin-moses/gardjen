import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { simpleDaisy, sunflower } from './rules';
import { LSystemPlant } from './tree';


export class LSystemFlower extends LSystemPlant {
    constructor(scene, position, orientation, staticConfig, dynamicConfig) {
        super(scene, position, orientation, staticConfig, dynamicConfig);
    }

}