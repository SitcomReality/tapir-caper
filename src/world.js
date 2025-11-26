import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class WorldLevel {
    constructor(scene, world, material) {
        this.scene = scene;
        this.world = world;
        this.material = material;
        
        this.createFloor();
        this.createWalls();
        this.createDropZone();
    }

    createFloor() {
        const size = 30;
        const geometry = new THREE.PlaneGeometry(size, size);
        const mat = new THREE.MeshStandardMaterial({ color: 0xA8DADC }); // Pastel Blue
        const mesh = new THREE.Mesh(geometry, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        const shape = new CANNON.Plane();
        const body = new CANNON.Body({ mass: 0, material: this.material });
        body.addShape(shape);
        body.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        this.world.addBody(body);
    }

    createWalls() {
        // Simple bounding box
        this.addWall(0, 2.5, -15, 30, 5, 1); // Back
        this.addWall(-15, 2.5, 0, 1, 5, 30); // Left
        this.addWall(15, 2.5, 0, 1, 5, 30); // Right
        // Front is open-ish for drop zone but guarded visually
    }

    addWall(x, y, z, w, h, d) {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshStandardMaterial({ color: 0x457B9D });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        const shape = new CANNON.Box(new CANNON.Vec3(w/2, h/2, d/2));
        const body = new CANNON.Body({ mass: 0, material: this.material });
        body.addShape(shape);
        body.position.set(x, y, z);
        this.world.addBody(body);
    }

    createDropZone() {
        // Visual indicator for where to drop loot
        const geo = new THREE.PlaneGeometry(8, 4);
        const mat = new THREE.MeshBasicMaterial({ color: 0x81B29A, transparent: true, opacity: 0.5 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(0, 0.05, 12);
        this.scene.add(mesh);

        // Text label could be added here
    }
}