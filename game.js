import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createFluffyCat } from './cat.js';

// Game configuration
const MOVEMENT_SPEED = 5;
const SPRINT_MULTIPLIER = 2;
const JUMP_FORCE = 10;
const GRAVITY = 30;

// Game state
const keysPressed = {};
let playerVelocity = new THREE.Vector3();
let playerOnGround = false;
let playerCrouching = false;
let colliders = [];

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky blue background

// Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 5);

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Controls for development
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enabled = false; // Disable orbit controls by default

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// Player (cat) setup
const cat = createFluffyCat();
cat.position.y = 0.5;
scene.add(cat);

// Player collision box for physics
const catBoundingBox = new THREE.Box3(
    new THREE.Vector3(-0.4, 0, -0.6),
    new THREE.Vector3(0.4, 1, 0.6)
);

// Living room setup
createLivingRoom();

// Keyboard event listeners
document.addEventListener('keydown', (event) => {
    keysPressed[event.key.toLowerCase()] = true;
    
    // Toggle orbit controls for debugging (press 'o')
    if (event.key.toLowerCase() === 'o') {
        controls.enabled = !controls.enabled;
    }
});

document.addEventListener('keyup', (event) => {
    keysPressed[event.key.toLowerCase()] = false;
});

// Window resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Main game loop
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();
    
    if (!controls.enabled) {
        updatePlayer(delta, elapsedTime);
        updateCamera();
    } else {
        controls.update();
    }
    
    renderer.render(scene, camera);
}

// Player movement function
function updatePlayer(delta, time) {
    // Apply gravity
    if (playerOnGround && playerVelocity.y < 0) {
        playerVelocity.y = 0;
    } else {
        playerVelocity.y -= GRAVITY * delta;
    }
    
    // Calculate forward direction (relative to the cat's rotation)
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cat.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cat.quaternion);
    
    // Movement - store the intended movement direction
    const moveDirection = new THREE.Vector3(0, 0, 0);
    const moveSpeed = keysPressed['shift'] ? MOVEMENT_SPEED * SPRINT_MULTIPLIER : MOVEMENT_SPEED;
    
    // Forward/backward
    if (keysPressed['w']) {
        moveDirection.add(forward);
    }
    if (keysPressed['s']) {
        moveDirection.sub(forward);
    }
    
    // Left/right
    if (keysPressed['a']) {
        moveDirection.sub(right);
    }
    if (keysPressed['d']) {
        moveDirection.add(right);
    }
    
    // Normalize movement vector and apply speed
    if (moveDirection.length() > 0) {
        moveDirection.normalize().multiplyScalar(moveSpeed * delta);
        
        // Point cat in movement direction
        const targetRotation = Math.atan2(moveDirection.x, moveDirection.z);
        cat.rotation.y = THREE.MathUtils.lerp(cat.rotation.y, targetRotation, 0.2);
    }
    
    // Store current position for collision detection
    const oldPosition = cat.position.clone();
    
    // Jump
    if (keysPressed[' '] && playerOnGround) {
        playerVelocity.y = JUMP_FORCE;
        playerOnGround = false;
    }
    
    // Crouch
    playerCrouching = keysPressed['control'];
    cat.crouch(playerCrouching);
    
    // Update cat animation
    cat.velocity = moveDirection.clone().divideScalar(delta);
    cat.animateLegs(time);
    cat.animateTail(time);
    
    // Apply movement and check for collisions
    const potentialNewPosition = oldPosition.clone().add(moveDirection);
    potentialNewPosition.y += playerVelocity.y * delta;
    
    // Move X and Z, then check collisions
    cat.position.x = potentialNewPosition.x;
    cat.position.z = potentialNewPosition.z;
    
    // Check for collisions with objects
    const catWorldBox = catBoundingBox.clone().translate(cat.position);
    
    let collisionDetected = false;
    for (const collider of colliders) {
        if (catWorldBox.intersectsBox(collider)) {
            collisionDetected = true;
            // Move back to old position on X/Z
            cat.position.copy(oldPosition);
            break;
        }
    }
    
    // Apply Y velocity and check floor
    cat.position.y += playerVelocity.y * delta;
    
    // Ground check
    playerOnGround = false;
    if (cat.position.y < 0.5) {
        cat.position.y = 0.5;
        playerOnGround = true;
    }
    
    // Check if cat has reached the door (escape)
    const doorPosition = new THREE.Vector3(14.5, 1.75, 0);
    if (cat.position.distanceTo(doorPosition) < 1.5) {
        // Show victory message
        const instructionsDiv = document.getElementById('instructions');
        instructionsDiv.innerHTML = "<h2>Victory!</h2><p>You've escaped the house! Congratulations!</p>";
        instructionsDiv.style.background = "rgba(0, 200, 0, 0.7)";
    }
    
    // Boundary checks
    if (cat.position.x < -14) cat.position.x = -14;
    if (cat.position.x > 14) cat.position.x = 14;
    if (cat.position.z < -14) cat.position.z = -14;
    if (cat.position.z > 14) cat.position.z = 14;
}

// Camera follows player
function updateCamera() {
    // Position camera behind the cat
    const cameraOffset = new THREE.Vector3(0, 2, 5);
    cameraOffset.applyQuaternion(cat.quaternion);
    cameraOffset.add(cat.position);
    
    // Smoothly move camera
    camera.position.lerp(cameraOffset, 0.1);
    camera.lookAt(cat.position);
}

// Create living room environment
function createLivingRoom() {
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(30, 30);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xA0522D,
        roughness: 0.8,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Walls
    createWall(15, 5, 0, 0, 0, -15); // North wall
    createWall(15, 5, 0, 0, 0, 15); // South wall
    createWall(30, 5, Math.PI/2, -15, 0, 0); // East wall
    createWall(30, 5, Math.PI/2, 15, 0, 0); // West wall
    
    // Furniture
    
    // Sofa
    const sofaGeometry = new THREE.BoxGeometry(6, 1, 2);
    const sofaMaterial = new THREE.MeshStandardMaterial({ color: 0x6B8E23 });
    const sofa = new THREE.Mesh(sofaGeometry, sofaMaterial);
    sofa.position.set(-10, 0.5, -12);
    sofa.castShadow = true;
    sofa.receiveShadow = true;
    scene.add(sofa);
    
    // Add sofa to colliders
    const sofaBox = new THREE.Box3().setFromObject(sofa);
    colliders.push(sofaBox);
    
    // Sofa backrest
    const backrestGeometry = new THREE.BoxGeometry(6, 1, 1);
    const backrest = new THREE.Mesh(backrestGeometry, sofaMaterial);
    backrest.position.set(-10, 1, -12.5);
    backrest.castShadow = true;
    backrest.receiveShadow = true;
    scene.add(backrest);
    
    // Coffee table
    const tableGeometry = new THREE.BoxGeometry(4, 0.5, 2);
    const tableMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.position.set(-10, 0.25, -8);
    table.castShadow = true;
    table.receiveShadow = true;
    scene.add(table);
    
    // Add table to colliders
    const tableBox = new THREE.Box3().setFromObject(table);
    colliders.push(tableBox);
    
    // TV stand
    const tvStandGeometry = new THREE.BoxGeometry(5, 1, 1.5);
    const tvStandMaterial = new THREE.MeshStandardMaterial({ color: 0x5C4033 });
    const tvStand = new THREE.Mesh(tvStandGeometry, tvStandMaterial);
    tvStand.position.set(-10, 0.5, -4);
    tvStand.castShadow = true;
    tvStand.receiveShadow = true;
    scene.add(tvStand);
    
    // Add TV stand to colliders
    const tvStandBox = new THREE.Box3().setFromObject(tvStand);
    colliders.push(tvStandBox);
    
    // TV
    const tvGeometry = new THREE.BoxGeometry(4, 2, 0.2);
    const tvMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const tv = new THREE.Mesh(tvGeometry, tvMaterial);
    tv.position.set(-10, 2, -4);
    tv.castShadow = true;
    tv.receiveShadow = true;
    scene.add(tv);
    
    // Dining table
    const diningTableGeometry = new THREE.BoxGeometry(3, 1, 5);
    const diningTableMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const diningTable = new THREE.Mesh(diningTableGeometry, diningTableMaterial);
    diningTable.position.set(9, 0.5, -8);
    diningTable.castShadow = true;
    diningTable.receiveShadow = true;
    scene.add(diningTable);
    
    // Add dining table to colliders
    const diningTableBox = new THREE.Box3().setFromObject(diningTable);
    colliders.push(diningTableBox);
    
    // Chairs
    createChair(7.5, -6.5);
    createChair(10.5, -6.5);
    createChair(7.5, -9.5);
    createChair(10.5, -9.5);
    
    // Bookshelf
    const bookshelfGeometry = new THREE.BoxGeometry(1, 5, 4);
    const bookshelfMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const bookshelf = new THREE.Mesh(bookshelfGeometry, bookshelfMaterial);
    bookshelf.position.set(-14, 2.5, 5);
    bookshelf.castShadow = true;
    bookshelf.receiveShadow = true;
    scene.add(bookshelf);
    
    // Add bookshelf to colliders
    const bookshelfBox = new THREE.Box3().setFromObject(bookshelf);
    colliders.push(bookshelfBox);
    
    // Door (exit)
    const doorFrameGeometry = new THREE.BoxGeometry(0.5, 4, 3);
    const doorFrameMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const doorFrame = new THREE.Mesh(doorFrameGeometry, doorFrameMaterial);
    doorFrame.position.set(14.7, 2, 0);
    scene.add(doorFrame);
    
    const doorGeometry = new THREE.BoxGeometry(0.2, 3.5, 2.5);
    const doorMaterial = new THREE.MeshStandardMaterial({ color: 0xA0522D });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(14.5, 1.75, 0);
    door.castShadow = true;
    door.receiveShadow = true;
    scene.add(door);
    
    // Add door frame to colliders (but not the door itself, to allow escape)
    const doorFrameBox = new THREE.Box3().setFromObject(doorFrame);
    colliders.push(doorFrameBox);
    
    // Add some hanging poles for cat to climb on
    const pole1Geometry = new THREE.CylinderGeometry(0.1, 0.1, 6);
    const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
    const pole1 = new THREE.Mesh(pole1Geometry, poleMaterial);
    pole1.position.set(0, 4, 0);
    pole1.rotation.z = Math.PI / 2;
    pole1.castShadow = true;
    scene.add(pole1);
    
    // Window
    const windowGeometry = new THREE.PlaneGeometry(4, 3);
    const windowMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xADD8E6,
        transparent: true,
        opacity: 0.5
    });
    const window1 = new THREE.Mesh(windowGeometry, windowMaterial);
    window1.position.set(0, 2, -14.9);
    scene.add(window1);
    
    // Add some obstacles and platforms
    
    // Cat tree
    const catTreeBaseGeometry = new THREE.CylinderGeometry(0.7, 0.8, 0.5, 16);
    const catTreeMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const catTreeBase = new THREE.Mesh(catTreeBaseGeometry, catTreeMaterial);
    catTreeBase.position.set(5, 0.25, 10);
    catTreeBase.castShadow = true;
    catTreeBase.receiveShadow = true;
    scene.add(catTreeBase);
    
    const catTreePoleGeometry = new THREE.CylinderGeometry(0.2, 0.2, 4, 16);
    const catTreePole = new THREE.Mesh(catTreePoleGeometry, catTreeMaterial);
    catTreePole.position.set(5, 2.5, 10);
    catTreePole.castShadow = true;
    scene.add(catTreePole);
    
    const catTreePlatformGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.3, 16);
    const catTreePlatformMaterial = new THREE.MeshStandardMaterial({ color: 0x6B8E23 });
    const catTreePlatform = new THREE.Mesh(catTreePlatformGeometry, catTreePlatformMaterial);
    catTreePlatform.position.set(5, 4.5, 10);
    catTreePlatform.castShadow = true;
    catTreePlatform.receiveShadow = true;
    scene.add(catTreePlatform);
    
    // Add cat tree base to colliders
    const catTreeBaseBox = new THREE.Box3().setFromObject(catTreeBase);
    colliders.push(catTreeBaseBox);
    
    // Add cat tree pole to colliders
    const catTreePoleBox = new THREE.Box3().setFromObject(catTreePole);
    colliders.push(catTreePoleBox);
}

// Helper function to create walls
function createWall(width, height, rotation, x, y, z) {
    const wallGeometry = new THREE.BoxGeometry(width, height, 0.2);
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xF5F5DC }); // Beige walls
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.position.set(x, height/2, z);
    wall.rotation.y = rotation;
    wall.receiveShadow = true;
    scene.add(wall);
    
    // Add walls to colliders
    const wallBox = new THREE.Box3().setFromObject(wall);
    colliders.push(wallBox);
}

// Helper function to create chairs
function createChair(x, z) {
    const chairSeatGeometry = new THREE.BoxGeometry(1, 0.5, 1);
    const chairMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const chairSeat = new THREE.Mesh(chairSeatGeometry, chairMaterial);
    chairSeat.position.set(x, 0.75, z);
    chairSeat.castShadow = true;
    chairSeat.receiveShadow = true;
    scene.add(chairSeat);
    
    const chairBackGeometry = new THREE.BoxGeometry(1, 1, 0.2);
    const chairBack = new THREE.Mesh(chairBackGeometry, chairMaterial);
    chairBack.position.set(x, 1.5, z + 0.4);
    chairBack.castShadow = true;
    chairBack.receiveShadow = true;
    scene.add(chairBack);
    
    // Add chair to colliders
    const chairBox = new THREE.Box3(
        new THREE.Vector3(x - 0.5, 0.5, z - 0.5),
        new THREE.Vector3(x + 0.5, 2, z + 0.5)
    );
    colliders.push(chairBox);
}

// Start the game
animate(); 