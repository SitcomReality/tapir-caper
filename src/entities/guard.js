import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Guard {
    constructor(scene, world, startPos) {
        this.scene = scene;
        this.world = world;

        // Simple red cylinder for guard
        const geo = new THREE.CylinderGeometry(0.5, 0.5, 1.8, 12);
        const mat = new THREE.MeshStandardMaterial({ color: 0xE63946 });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.copy(startPos);
        this.mesh.castShadow = true;
        scene.add(this.mesh);

        // Physics body (Kinematic - we control position directly to avoid physics glitches with AI)
        const shape = new CANNON.Cylinder(0.5, 0.5, 1.8, 12);
        // Using box for stability in simple logic
        const shapeBox = new CANNON.Box(new CANNON.Vec3(0.5, 0.9, 0.5));

        this.body = new CANNON.Body({
            mass: 10,
            type: CANNON.Body.KINEMATIC,
            position: new CANNON.Vec3(startPos.x, startPos.y, startPos.z)
        });
        this.body.addShape(shapeBox);
        world.addBody(this.body);

        // Vision Cone Visual
        const coneGeo = new THREE.ConeGeometry(2, 5, 16, 1, true);
        const coneMat = new THREE.MeshBasicMaterial({ color: 0xFFFF00, transparent: true, opacity: 0.2 });
        this.vision = new THREE.Mesh(coneGeo, coneMat);
        this.vision.rotation.x = -Math.PI / 2;
        this.vision.position.y = 1;
        this.vision.position.z = 2.5; // Offset forward
        this.mesh.add(this.vision);

        this.speed = 3.5;
        this.patrolPoints = [
            startPos.clone(),
            new THREE.Vector3(-startPos.x, startPos.y, startPos.z),
            new THREE.Vector3(-startPos.x, startPos.y, -startPos.z),
            new THREE.Vector3(startPos.x, startPos.y, -startPos.z)
        ];
        this.currentPointIdx = 0;
        this.state = 'patrol'; // patrol, chase
    }

    destroy() {
        this.scene.remove(this.mesh);
        this.world.removeBody(this.body);
    }

    update(targetPos, dt) {
        const myPos = this.body.position;
        let target = this.patrolPoints[this.currentPointIdx];

        // Check distance to player
        const distToPlayer = new THREE.Vector3(myPos.x, myPos.y, myPos.z).distanceTo(targetPos);

        if (distToPlayer < 8) {
            this.state = 'chase';
            target = targetPos;
            this.vision.material.color.setHex(0xFF0000);
        } else {
            this.state = 'patrol';
            this.vision.material.color.setHex(0xFFFF00);
        }

        // Move towards target
        const dir = new THREE.Vector3(target.x - myPos.x, 0, target.z - myPos.z).normalize();

        // If patrol and close to point, switch point
        if (this.state === 'patrol') {
            const dist = new THREE.Vector3(myPos.x, myPos.y, myPos.z).distanceTo(target);
            if (dist < 1.0) {
                this.currentPointIdx = (this.currentPointIdx + 1) % this.patrolPoints.length;
            }
        }

        // Update Physics Body
        this.body.velocity.set(dir.x * this.speed, 0, dir.z * this.speed);

        // Update Mesh
        this.mesh.position.copy(this.body.position);

        // Look at
        const lookTarget = new THREE.Vector3(target.x, this.mesh.position.y, target.z);
        this.mesh.lookAt(lookTarget);
    }

    checkCatch(playerPos) {
        const myPos = this.mesh.position;
        const dist = myPos.distanceTo(playerPos);
        return dist < 1.5;
    }
}