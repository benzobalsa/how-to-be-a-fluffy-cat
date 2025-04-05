import * as THREE from 'three';

export function createFluffyCat() {
    // Create a group to hold all cat parts
    const cat = new THREE.Group();
    cat.position.y = 0.3;
    
    // Cat body
    const bodyGeometry = new THREE.SphereGeometry(0.6, 16, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xFFA500, roughness: 0.7 }); // Orange fluffy cat
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.scale.set(1, 0.6, 1.5);
    body.position.y = 0.4;
    body.castShadow = true;
    cat.add(body);
    
    // Cat head
    const headGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xFFA500 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0, 0.5, 0.7);
    head.castShadow = true;
    cat.add(head);
    
    // Ears
    const earGeometry = new THREE.ConeGeometry(0.15, 0.3, 4);
    const earMaterial = new THREE.MeshStandardMaterial({ color: 0xFFA500 });
    
    const leftEar = new THREE.Mesh(earGeometry, earMaterial);
    leftEar.position.set(-0.2, 0.8, 0.7);
    leftEar.rotation.x = -Math.PI / 4;
    leftEar.castShadow = true;
    cat.add(leftEar);
    
    const rightEar = new THREE.Mesh(earGeometry, earMaterial);
    rightEar.position.set(0.2, 0.8, 0.7);
    rightEar.rotation.x = -Math.PI / 4;
    rightEar.castShadow = true;
    cat.add(rightEar);
    
    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.07, 16, 16);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x00FF00 }); // Green eyes
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.15, 0.55, 1.05);
    cat.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.15, 0.55, 1.05);
    cat.add(rightEye);
    
    // Nose
    const noseGeometry = new THREE.ConeGeometry(0.05, 0.05, 4);
    const noseMaterial = new THREE.MeshStandardMaterial({ color: 0xFFC0CB }); // Pink nose
    const nose = new THREE.Mesh(noseGeometry, noseMaterial);
    nose.position.set(0, 0.45, 1.1);
    nose.rotation.x = Math.PI / 2;
    cat.add(nose);
    
    // Whiskers
    const whiskerGeometry = new THREE.CylinderGeometry(0.005, 0.005, 0.5);
    const whiskerMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
    
    // Left whiskers
    const leftWhisker1 = new THREE.Mesh(whiskerGeometry, whiskerMaterial);
    leftWhisker1.position.set(-0.2, 0.45, 1.05);
    leftWhisker1.rotation.z = Math.PI / 2;
    leftWhisker1.rotation.y = Math.PI / 8;
    cat.add(leftWhisker1);
    
    const leftWhisker2 = new THREE.Mesh(whiskerGeometry, whiskerMaterial);
    leftWhisker2.position.set(-0.2, 0.4, 1.05);
    leftWhisker2.rotation.z = Math.PI / 2;
    cat.add(leftWhisker2);
    
    // Right whiskers
    const rightWhisker1 = new THREE.Mesh(whiskerGeometry, whiskerMaterial);
    rightWhisker1.position.set(0.2, 0.45, 1.05);
    rightWhisker1.rotation.z = Math.PI / 2;
    rightWhisker1.rotation.y = -Math.PI / 8;
    cat.add(rightWhisker1);
    
    const rightWhisker2 = new THREE.Mesh(whiskerGeometry, whiskerMaterial);
    rightWhisker2.position.set(0.2, 0.4, 1.05);
    rightWhisker2.rotation.z = Math.PI / 2;
    cat.add(rightWhisker2);
    
    // Legs
    const legGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.4);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0xFFA500 });
    
    // Front legs
    const frontLeftLeg = new THREE.Mesh(legGeometry, legMaterial);
    frontLeftLeg.position.set(-0.3, 0, 0.4);
    frontLeftLeg.castShadow = true;
    cat.add(frontLeftLeg);
    
    const frontRightLeg = new THREE.Mesh(legGeometry, legMaterial);
    frontRightLeg.position.set(0.3, 0, 0.4);
    frontRightLeg.castShadow = true;
    cat.add(frontRightLeg);
    
    // Back legs
    const backLeftLeg = new THREE.Mesh(legGeometry, legMaterial);
    backLeftLeg.position.set(-0.3, 0, -0.4);
    backLeftLeg.castShadow = true;
    cat.add(backLeftLeg);
    
    const backRightLeg = new THREE.Mesh(legGeometry, legMaterial);
    backRightLeg.position.set(0.3, 0, -0.4);
    backRightLeg.castShadow = true;
    cat.add(backRightLeg);
    
    // Tail
    const tailCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.4, -0.7),
        new THREE.Vector3(0, 0.7, -1.0),
        new THREE.Vector3(0.3, 0.9, -1.1),
        new THREE.Vector3(0.5, 0.7, -1.2)
    ]);
    
    const tailGeometry = new THREE.TubeGeometry(tailCurve, 16, 0.07, 8, false);
    const tailMaterial = new THREE.MeshStandardMaterial({ color: 0xFFA500 });
    const tail = new THREE.Mesh(tailGeometry, tailMaterial);
    tail.castShadow = true;
    cat.add(tail);
    
    // Add animation methods
    cat.animateLegs = function(time) {
        const legSpeed = 3;
        const legAmplitude = 0.1;
        
        // Animate legs while moving
        if (cat.velocity && (cat.velocity.x !== 0 || cat.velocity.z !== 0)) {
            frontLeftLeg.rotation.x = Math.sin(time * legSpeed) * legAmplitude;
            frontRightLeg.rotation.x = Math.sin(time * legSpeed + Math.PI) * legAmplitude;
            backLeftLeg.rotation.x = Math.sin(time * legSpeed + Math.PI) * legAmplitude;
            backRightLeg.rotation.x = Math.sin(time * legSpeed) * legAmplitude;
        } else {
            // Reset legs when stationary
            frontLeftLeg.rotation.x = 0;
            frontRightLeg.rotation.x = 0;
            backLeftLeg.rotation.x = 0;
            backRightLeg.rotation.x = 0;
        }
    };
    
    cat.animateTail = function(time) {
        tail.rotation.y = Math.sin(time * 2) * 0.3;
    };
    
    cat.crouch = function(isCrouching) {
        if (isCrouching) {
            cat.scale.y = 0.5;
            cat.position.y = 0.15;
        } else {
            cat.scale.y = 1;
            cat.position.y = 0.3;
        }
    };
    
    cat.velocity = new THREE.Vector3();
    
    return cat;
} 