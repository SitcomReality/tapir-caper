import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Tapir {
    constructor(scene, world, material) {
        this.scene = scene;
        this.world = world;
        this.material = material;
        this.carrying = null;
        this.constraint = null;

        // Visuals
        this.group = new THREE.Group();
        this.createModel();
        scene.add(this.group);

        // Physics
        const shape = new CANNON.Sphere(0.8); // Simple collider
        this.body = new CANNON.Body({
            mass: 50,
            material: material,
            fixedRotation: true,
            position: new CANNON.Vec3(0, 2, 0)
        });
        this.body.addShape(shape, new CANNON.Vec3(0, -0.2, 0));
        this.body.linearDamping = 0.9;
        this.world.addBody(this.body);

        this.mesh = this.group;
    }

    createModel() {
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1D3557 }); // Dark Blue
        const whiteMat = new THREE.MeshStandardMaterial({ color: 0xF1FAEE });

        // Body
        const bodyGeo = new THREE.CapsuleGeometry(0.6, 1.2, 4, 8);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.rotation.z = Math.PI / 2;
        body.position.y = 0.6;
        body.castShadow = true;
        this.group.add(body);

        // Head
        const headGeo = new THREE.ConeGeometry(0.4, 1.0, 16);
        const head = new THREE.Mesh(headGeo, bodyMat);
        head.rotation.x = -Math.PI / 2; // Point forward
        head.rotation.z = -Math.PI / 8; // Tilt down slightly
        head.position.set(0, 1.0, 0.8);
        head.castShadow = true;
        this.group.add(head);

        // Snout Tip (White)
        const snoutGeo = new THREE.SphereGeometry(0.15);
        const snout = new THREE.Mesh(snoutGeo, whiteMat);
        snout.position.set(0, -0.5, 0); // Relative to head cone
        head.add(snout);
        this.snoutTip = snout; // Reference for attaching loot

        // Saddle
        const saddleGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.5, 8, 1, false, 0, Math.PI);
        const saddle = new THREE.Mesh(saddleGeo, whiteMat);
        saddle.rotation.z = Math.PI / 2;
        saddle.position.set(0, 0.65, 0);
        this.group.add(saddle);

        // Legs (Just visuals, animation handled in update)
        this.legs = [];
        const legGeo = new THREE.CapsuleGeometry(0.15, 0.6);
        const positions = [
            [-0.4, 0.3, 0.5], [0.4, 0.3, 0.5],
            [-0.4, 0.3, -0.5], [0.4, 0.3, -0.5]
        ];
        positions.forEach(pos => {
            const leg = new THREE.Mesh(legGeo, bodyMat);
            leg.position.set(...pos);
            this.group.add(leg);
            this.legs.push(leg);
        });
    }

    reset(pos) {
        this.body.position.copy(pos);
        this.body.velocity.set(0,0,0);
        this.body.angularVelocity.set(0,0,0);
        this.drop();
    }

    update(input, dt) {
        // Movement
        const speed = 150;
        // Move relative to camera not implemented for simplicity, just absolute world for now or based on orientation
        // Actually, let's just do direct velocity control

        const velocity = new CANNON.Vec3(input.x * speed * dt, this.body.velocity.y, -input.y * speed * dt);

        // Apply force instead to allow physics interactions
        // Simple approach: set velocity directly for responsive controls
        this.body.velocity.x = input.x * 10;
        this.body.velocity.z = -input.y * 10; // Invert Y for correct feel

        // Rotation
        if (Math.abs(input.x) > 0.1 || Math.abs(input.y) > 0.1) {
            const angle = Math.atan2(this.body.velocity.x, this.body.velocity.z);
            // Smooth rotation
            const targetQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), angle);
            this.group.quaternion.slerp(targetQ, 0.2);
        }

        // Sync visual to physics
        this.group.position.copy(this.body.position);
        // We handle rotation manually for the mesh, so we don't copy body quaternion (fixed rotation)

        // Animation: Wobbly run
        if (velocity.length() > 0.5) {
            const time = Date.now() * 0.015;
            this.legs.forEach((leg, i) => {
                const offset = i % 2 === 0 ? 0 : Math.PI;
                leg.rotation.x = Math.sin(time + offset) * 0.5;
            });
            // Bob body
            this.group.children[0].position.y = 0.6 + Math.sin(time * 2) * 0.05;
        } else {
             this.legs.forEach(leg => leg.rotation.x = 0);
        }
    }

    grab(loot) {
        if (this.carrying) return;
        this.carrying = loot;
        loot.stolen = true;

        // Create constraint
        // Get world position of snout tip
        const snoutPos = new THREE.Vector3();
        this.snoutTip.getWorldPosition(snoutPos);

        // Pivot on tapir (local to body)
        // We need to approximate where the snout is relative to the physics sphere
        const pivotA = new CANNON.Vec3(0, 0.5, 1.2); // Roughly snout position

        // Pivot on Loot (usually center or specific part)
        const pivotB = new CANNON.Vec3(0, 0, 0); 

        // Use a PointToPoint constraint for floppiness
        this.constraint = new CANNON.PointToPointConstraint(
            this.body, pivotA,
            loot.rootBody, pivotB
        );

        // Make it a bit loose? Collisions between linked bodies = false usually
        this.constraint.collideConnected = false;

        this.world.addConstraint(this.constraint);
    }

    drop() {
        if (this.constraint) {
            this.world.removeConstraint(this.constraint);
            this.constraint = null;
        }
        if (this.carrying) {
            // this.carrying.stolen = false; // Don't reset stolen if we sold it
            this.carrying = null;
        }
    }
}