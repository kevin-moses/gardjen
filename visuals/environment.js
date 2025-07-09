import * as THREE from 'three';
// Simple grass floor for Three.js scene

// Create a function to calculate height at any x,y position
export const calculateHeight = (x, y) => {
  return Math.sin(x/100) * 9 + Math.cos(y/100) * 9;
};

export function createGrassFloor(scene) {
  // Create a heightfield geometry instead of a plane
  // More segments = more detailed hills (adjust for performance)
  const multiplier = 750;
  const width = multiplier, depth = multiplier;
  const widthSegments = multiplier, depthSegments = multiplier;
  const geometry = new THREE.PlaneGeometry(width, depth, widthSegments, depthSegments);
  
  // Create rolling hills by modifying vertex positions
  const vertices = geometry.attributes.position;

  // Store the height calculation function on the geometry for later use
  geometry.getHeightAt = (x, y) => {
    return calculateHeight(x, y);
  };

  // Set vertex heights
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i);
    const y = vertices.getY(i);
    const z = calculateHeight(x, y);
    vertices.setZ(i, z);
  }
  
  // Load grass texture
  const textureLoader = new THREE.TextureLoader();
  const grassTexture = textureLoader.load('../textures/grass.jpg');
  
  // Make the texture repeat for detail
  grassTexture.wrapS = THREE.RepeatWrapping;
  grassTexture.wrapT = THREE.RepeatWrapping;
  grassTexture.repeat.set(20, 20);
  
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
  floor.receiveShadow = true; // Enable shadow receiving
  
  // Ensure normals are updated for proper lighting after vertex modifications
  geometry.computeVertexNormals();
  
  // Add to scene
  scene.add(floor);
  return floor;
}
