import * as THREE from 'three';
import * as CANNON from 'cannon-es';

class LootBase {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.meshes = [];
        this.bodies = [];
        this.constraints = [];
        this.stolen = false;
        this.value = 100;
        this.rootBody = null; // The body the tapir grabs
    }

    destroy() {
        this.meshes.forEach(m => this.scene.remove(m));
        this.bodies.forEach(b => this.world.removeBody(b));
        this.constraints.forEach(c => this.world.removeConstraint(c));
    }

    update() {
        for (let i = 0; i < this.meshes.length; i++) {
            this.meshes[i].position.copy(this.bodies[i].position);
            this.meshes[i].quaternion.copy(this.bodies[i].quaternion);
        }
    }
}

export class SteeringWheelLoot extends LootBase {
    constructor(scene, world, pos) {
        super(scene, world);
        this.value = 250;

        const geo = new THREE.TorusGeometry(0.5, 0.1, 8, 16);
        const mat = new THREE.MeshStandardMaterial({ color: 0xFFD700 }); // Gold
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        this.scene.add(mesh);
        this.meshes.push(mesh);

        const shape = new CANNON.Sphere(0.6); // Simplified collider
        const body = new CANNON.Body({ mass: 5 });
        body.addShape(shape);
        body.position.copy(pos);
        body.linearDamping = 0.5;
        this.world.addBody(body);
        this.bodies.push(body);
        this.rootBody = body;
    }
}

export class BathtubLoot extends LootBase {
    constructor(scene, world, pos) {
        super(scene, world);
        this.value = 500;

        // Visuals - Simple open box
        const mat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
        const group = new THREE.Group(); 

        const bottom = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 1), mat);
        bottom.position.y = -0.4;
        group.add(bottom);

        // Fake sides
        const s1 = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 0.1), mat);
        s1.position.z = 0.45;
        group.add(s1);
        const s2 = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 0.1), mat);
        s2.position.z = -0.45;
        group.add(s2);

        this.scene.add(group);
        this.meshes.push(group);

        const shape = new CANNON.Box(new CANNON.Vec3(1, 0.5, 0.5));
        const body = new CANNON.Body({ mass: 20 });
        body.addShape(shape);
        body.position.copy(pos);
        body.linearDamping = 0.6;
        this.world.addBody(body);
        this.bodies.push(body);
        this.rootBody = body;
    }
}

export class RagdollLoot extends LootBase {
    constructor(scene, world, pos) {
        super(scene, world);
        this.value = 1000;

        const mat = new THREE.MeshStandardMaterial({ color: 0xF15BB5 }); // Pink person
        const size = 0.3;

        // Torso
        const torsoShape = new CANNON.Box(new CANNON.Vec3(size, size*1.5, size/2));
        const torsoBody = new CANNON.Body({ mass: 5 });
        torsoBody.addShape(torsoShape);
        torsoBody.position.copy(pos);
        this.world.addBody(torsoBody);
        this.bodies.push(torsoBody);
        this.rootBody = torsoBody;

        const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(size*2, size*3, size), mat);
        this.scene.add(torsoMesh);
        this.meshes.push(torsoMesh);

        // Head
        const headShape = new CANNON.Sphere(size);
        const headBody = new CANNON.Body({ mass: 2 });
        headBody.addShape(headShape);
        headBody.position.set(pos.x, pos.y + 0.8, pos.z);
        this.world.addBody(headBody);
        this.bodies.push(headBody);

        const headMesh = new THREE.Mesh(new THREE.SphereGeometry(size), mat);
        this.scene.add(headMesh);
        this.meshes.push(headMesh);

        // Neck Joint
        const neck = new CANNON.ConeTwistConstraint(torsoBody, headBody, {
            pivotA: new CANNON.Vec3(0, size*1.6, 0),
            pivotB: new CANNON.Vec3(0, -size, 0),
            axisA: new CANNON.Vec3(0, 1, 0),
            axisB: new CANNON.Vec3(0, 1, 0),
            angle: Math.PI / 4,
            twistAngle: Math.PI / 4
        });
        this.world.addConstraint(neck);
        this.constraints.push(neck);

        // Limbs Helper
        const addLimb = (x, y, z) => {
             const limbShape = new CANNON.Box(new CANNON.Vec3(0.1, 0.4, 0.1));
             const limbBody = new CANNON.Body({ mass: 1 });
             limbBody.addShape(limbShape);
             limbBody.position.set(pos.x + x, pos.y + y, pos.z + z);
             this.world.addBody(limbBody);
             this.bodies.push(limbBody);

             const limbMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 0.2), mat);
             this.scene.add(limbMesh);
             this.meshes.push(limbMesh);
             
             return limbBody;
        };

        // Arms
        const armL = addLimb(-0.5, 0, 0);
        const c1 = new CANNON.PointToPointConstraint(torsoBody, new CANNON.Vec3(-size, size, 0), armL, new CANNON.Vec3(0, 0.4, 0));
        this.world.addConstraint(c1);
        this.constraints.push(c1);

        const armR = addLimb(0.5, 0, 0);
        const c2 = new CANNON.PointToPointConstraint(torsoBody, new CANNON.Vec3(size, size, 0), armR, new CANNON.Vec3(0, 0.4, 0));
        this.world.addConstraint(c2);
        this.constraints.push(c2);

        // Legs
        const legL = addLimb(-0.3, -0.8, 0);
        const c3 = new CANNON.PointToPointConstraint(torsoBody, new CANNON.Vec3(-0.2, -size*1.5, 0), legL, new CANNON.Vec3(0, 0.4, 0));
        this.world.addConstraint(c3);
        this.constraints.push(c3);
        
        const legR = addLimb(0.3, -0.8, 0);
        const c4 = new CANNON.PointToPointConstraint(torsoBody, new CANNON.Vec3(0.2, -size*1.5, 0), legR, new CANNON.Vec3(0, 0.4, 0));
        this.world.addConstraint(c4);
        this.constraints.push(c4);
    }
}