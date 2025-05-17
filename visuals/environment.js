import * as THREE from 'three';
// Simple grass floor for Three.js scene
export function createGrassFloor(scene) {
  // Create a heightfield geometry instead of a plane
  // More segments = more detailed hills (adjust for performance)
  const width = 1000, depth = 1000;
  const widthSegments = 100, depthSegments = 100;
  const geometry = new THREE.PlaneGeometry(width, depth, widthSegments, depthSegments);
  
  // Load grass texture
  const textureLoader = new THREE.TextureLoader();
  const grassTexture = textureLoader.load('../textures/grass.jpg');
  
  // Make the texture repeat for more detail
  grassTexture.wrapS = THREE.RepeatWrapping;
  grassTexture.wrapT = THREE.RepeatWrapping;
  grassTexture.repeat.set(100, 100);
  
  // Create material with the grass texture
  const grassMaterial = new THREE.MeshStandardMaterial({
    map: grassTexture,
    side: THREE.DoubleSide,
    // Add slight roughness for more realism
    roughness: 0.8
  });
  
  // Create and position the floor mesh
  const floor = new THREE.Mesh(geometry, grassMaterial);
  floor.rotation.x = -Math.PI / 2; // Rotate to be horizontal
  floor.position.y = 0; // Adjusted to match plant positioning
  
  // Ensure normals are updated for proper lighting
  geometry.computeVertexNormals();
  
  // Add to scene
  scene.add(floor);
  return floor;
}
