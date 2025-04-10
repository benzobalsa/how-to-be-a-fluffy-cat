import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createFluffyCat } from './cat.js';

// Game configuration
const MOVEMENT_SPEED = 5;
const SPRINT_MULTIPLIER = 2;
const JUMP_FORCE = 10;
const GRAVITY = 30;
const MOUSE_SENSITIVITY = 0.002;
const ACCELERATION = 8.0; // How quickly the cat accelerates
const DECELERATION = 10.0; // How quickly the cat slows down
const MAX_VELOCITY = 8.0; // Maximum velocity when sprinting

// Game state
const keysPressed = {};
let playerVelocity = new THREE.Vector3();
let playerMovementVelocity = new THREE.Vector3(); // Separate velocity for smooth movement
let playerOnGround = false;
let playerCrouching = false;
let colliders = [];
let isRightMouseDown = false;
let mouseMoveX = 0;
let mouseMoveY = 0;
let cameraRotation = 0;
let cameraTilt = 0;

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

// Mouse event listeners for camera control
document.addEventListener('mousedown', (event) => {
    // Check if right mouse button is pressed (event.button 2 is right click)
    if (event.button === 2) {
        isRightMouseDown = true;
    }
});

document.addEventListener('mouseup', (event) => {
    if (event.button === 2) {
        isRightMouseDown = false;
    }
});

document.addEventListener('mousemove', (event) => {
    if (isRightMouseDown && !controls.enabled) {
        // Store mouse movement
        mouseMoveX = event.movementX || 0;
        mouseMoveY = event.movementY || 0;
        
        // Update camera rotation based on mouse movement
        cameraRotation -= mouseMoveX * MOUSE_SENSITIVITY;
        cameraTilt -= mouseMoveY * MOUSE_SENSITIVITY;
        
        // Limit the vertical camera tilt
        cameraTilt = Math.max(Math.min(cameraTilt, Math.PI / 4), -Math.PI / 4);
    }
});

// Prevent context menu on right-click
document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
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
    
    // Calculate forward direction (relative to the camera rotation for movement)
    const forward = new THREE.Vector3(
        Math.sin(cameraRotation), 
        0, 
        Math.cos(cameraRotation)
    );
    const right = new THREE.Vector3(
        Math.sin(cameraRotation + Math.PI/2), 
        0, 
        Math.cos(cameraRotation + Math.PI/2)
    );
    
    // Movement - store the intended movement direction
    const moveDirection = new THREE.Vector3(0, 0, 0);
    const isSprinting = keysPressed['shift'];
    const maxSpeed = isSprinting ? MOVEMENT_SPEED * SPRINT_MULTIPLIER : MOVEMENT_SPEED;
    
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
    
    // Normalize input direction
    if (moveDirection.length() > 0) {
        moveDirection.normalize();
        
        // Apply acceleration in the input direction
        const accelerationFactor = ACCELERATION * delta;
        playerMovementVelocity.x += moveDirection.x * accelerationFactor;
        playerMovementVelocity.z += moveDirection.z * accelerationFactor;
        
        // Point cat in movement direction
        const targetRotation = Math.atan2(moveDirection.x, moveDirection.z);
        cat.rotation.y = THREE.MathUtils.lerp(cat.rotation.y, targetRotation, 0.1);
    } else {
        // Apply deceleration when no input
        const decelerationFactor = DECELERATION * delta;
        const velocityLength = new THREE.Vector2(playerMovementVelocity.x, playerMovementVelocity.z).length();
        
        if (velocityLength > 0) {
            const reductionFactor = Math.min(decelerationFactor / velocityLength, 1.0);
            playerMovementVelocity.x -= playerMovementVelocity.x * reductionFactor;
            playerMovementVelocity.z -= playerMovementVelocity.z * reductionFactor;
            
            // If velocity is very small, just set it to zero
            if (new THREE.Vector2(playerMovementVelocity.x, playerMovementVelocity.z).length() < 0.05) {
                playerMovementVelocity.x = 0;
                playerMovementVelocity.z = 0;
            }
        }
    }
    
    // Limit max velocity
    const currentSpeed = new THREE.Vector2(playerMovementVelocity.x, playerMovementVelocity.z).length();
    if (currentSpeed > maxSpeed) {
        playerMovementVelocity.x = (playerMovementVelocity.x / currentSpeed) * maxSpeed;
        playerMovementVelocity.z = (playerMovementVelocity.z / currentSpeed) * maxSpeed;
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
    
    // Update cat animation based on movement velocity
    // Scale animation speed by movement speed
    const movementSpeed = new THREE.Vector2(playerMovementVelocity.x, playerMovementVelocity.z).length();
    const animationSpeed = THREE.MathUtils.clamp(movementSpeed / maxSpeed, 0, 1);
    
    cat.velocity = new THREE.Vector3(
        playerMovementVelocity.x,
        0,
        playerMovementVelocity.z
    );
    
    cat.animateLegs(time, animationSpeed);
    cat.animateTail(time);
    
    // Apply movement velocity and check for collisions
    const movement = new THREE.Vector3(
        playerMovementVelocity.x * delta,
        0,
        playerMovementVelocity.z * delta
    );
    
    // Move X and Z, then check collisions
    cat.position.x += movement.x;
    cat.position.z += movement.z;
    
    // Check for collisions with objects
    const catWorldBox = catBoundingBox.clone().translate(cat.position);
    
    let collisionDetected = false;
    for (const collider of colliders) {
        if (catWorldBox.intersectsBox(collider)) {
            collisionDetected = true;
            // Move back to old position on X/Z
            cat.position.copy(oldPosition);
            
            // Zero out velocity on collision for better responsiveness
            playerMovementVelocity.set(0, 0, 0);
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

// Camera follows player with the additional right-click rotation
function updateCamera() {
    // Calculate the camera position based on both the cat's position and the camera rotation
    const cameraDistance = 5;
    const cameraHeight = 2;
    
    // Calculate the camera's position based on the rotation
    const cameraOffset = new THREE.Vector3(
        Math.sin(cameraRotation) * cameraDistance,
        cameraHeight + Math.sin(cameraTilt) * cameraDistance,
        Math.cos(cameraRotation) * cameraDistance
    );
    
    // Position the camera behind the cat
    const targetCameraPosition = cat.position.clone().add(cameraOffset);
    
    // Smoothly move camera
    camera.position.lerp(targetCameraPosition, 0.1);
    
    // Look at the cat (slightly above to see more of the environment)
    const lookTarget = cat.position.clone();
    lookTarget.y += 0.5; // Look slightly above the cat
    camera.lookAt(lookTarget);
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