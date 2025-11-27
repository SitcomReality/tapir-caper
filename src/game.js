import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import nipplejs from 'nipplejs';
import { Tapir } from './entities/tapir.js';
import { WorldLevel } from './world.js';
import { Guard } from './entities/guard.js';
import { BathtubLoot, SteeringWheelLoot, RagdollLoot } from './entities/loot.js';
import { AudioController } from './audio.js';

export class Game {
    constructor(container, ui) {
        this.container = container;
        this.ui = ui;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.isPlaying = false;
        this.score = 0;
        this.itemsStolen = 0;
        this.startTime = 0;

        // Scene Setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xFDFCDC); // Cream
        this.scene.fog = new THREE.Fog(0xFDFCDC, 10, 50);

        // Camera
        this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 100);
        this.camera.position.set(0, 15, 15);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.width, this.height);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        dirLight.shadow.camera.top = 20;
        dirLight.shadow.camera.bottom = -20;
        dirLight.shadow.camera.left = -20;
        dirLight.shadow.camera.right = 20;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        this.scene.add(dirLight);

        // Physics World
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0);
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 10;
        
        // Materials
        this.defaultMaterial = new CANNON.Material('default');
        const defaultContactMaterial = new CANNON.ContactMaterial(this.defaultMaterial, this.defaultMaterial, {
            friction: 0.1,
            restitution: 0.0, // Low bounce
        });
        this.world.addContactMaterial(defaultContactMaterial);

        // Managers
        this.audio = new AudioController();
        this.level = new WorldLevel(this.scene, this.world, this.defaultMaterial);
        
        // Entities
        this.tapir = new Tapir(this.scene, this.world, this.defaultMaterial);
        this.guards = [];
        this.loots = [];

        // Input
        this.input = { x: 0, y: 0, action: false };
        this.setupInputs();

        // Loop
        this.clock = new THREE.Clock();
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    setupInputs() {
        // Keyboard
        window.addEventListener('keydown', (e) => {
            if(e.code === 'Space') this.input.action = true;
        });
        window.addEventListener('keyup', (e) => {
            if(e.code === 'Space') this.input.action = false;
        });

        this.keys = { w: false, a: false, s: false, d: false };
        window.addEventListener('keydown', (e) => {
            if (['KeyW', 'ArrowUp'].includes(e.code)) this.keys.w = true;
            if (['KeyA', 'ArrowLeft'].includes(e.code)) this.keys.a = true;
            if (['KeyS', 'ArrowDown'].includes(e.code)) this.keys.s = true;
            if (['KeyD', 'ArrowRight'].includes(e.code)) this.keys.d = true;
        });
        window.addEventListener('keyup', (e) => {
            if (['KeyW', 'ArrowUp'].includes(e.code)) this.keys.w = false;
            if (['KeyA', 'ArrowLeft'].includes(e.code)) this.keys.a = false;
            if (['KeyS', 'ArrowDown'].includes(e.code)) this.keys.s = false;
            if (['KeyD', 'ArrowRight'].includes(e.code)) this.keys.d = false;
        });

        // Mobile Joystick
        const joystickZone = document.getElementById('joystick-zone');
        if (joystickZone) {
            this.joystickManager = nipplejs.create({
                zone: joystickZone,
                mode: 'static',
                position: { left: '50%', top: '50%' },
                color: '#F15BB5'
            });

            this.joystickManager.on('move', (evt, data) => {
                const forward = data.vector.y;
                const turn = data.vector.x;
                this.input.y = forward; // Simple mapping
                this.input.x = -turn;
            });

            this.joystickManager.on('end', () => {
                this.input.x = 0;
                this.input.y = 0;
            });

            // Mobile Action Button
            const actionBtn = document.getElementById('mobile-action-btn');
            actionBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.input.action = true;
            });
            actionBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.input.action = false;
            });
        }
    }

    start() {
        this.score = 0;
        this.itemsStolen = 0;
        this.startTime = Date.now();
        this.isPlaying = true;
        this.ui.updateScore(0);
        this.audio.playBGM();

        // Reset positions
        this.tapir.reset(new THREE.Vector3(0, 2, 0));
        
        // Clear old entities
        this.loots.forEach(l => l.destroy());
        this.guards.forEach(g => g.destroy());
        this.loots = [];
        this.guards = []

        // Spawn Level items
        this.spawnLoot();
        this.spawnGuards();
    }

    reset() {
        this.isPlaying = false;
        this.audio.stopBGM();
    }

    spawnLoot() {
        // Add varied loot
        this.loots.push(new SteeringWheelLoot(this.scene, this.world, new THREE.Vector3(-5, 5, -5)));
        this.loots.push(new BathtubLoot(this.scene, this.world, new THREE.Vector3(5, 2, -5)));
        this.loots.push(new RagdollLoot(this.scene, this.world, new THREE.Vector3(0, 5, -8)));
    }

    spawnGuards() {
        this.guards.push(new Guard(this.scene, this.world, new THREE.Vector3(8, 2, 8)));
    }

    gameOver() {
        if(!this.isPlaying) return;
        this.isPlaying = false;
        this.audio.playCaught();
        this.audio.stopBGM();
        
        const stats = {
            score: this.score,
            items: this.itemsStolen,
            time: Math.floor((Date.now() - this.startTime) / 1000)
        };
        this.ui.showGameOver(stats);
    }

    onResize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.width, this.height);
    }

    updateInput() {
        // Normalize keyboard input
        if (this.keys) {
            let kx = 0, ky = 0;
            if (this.keys.w) ky += 1;
            if (this.keys.s) ky -= 1;
            // A should move left (negative), D should move right (positive)
            if (this.keys.a) kx -= 1;
            if (this.keys.d) kx += 1;
            
            // Only override joystick if keys are pressed
            if (kx !== 0 || ky !== 0) {
                this.input.x = kx;
                this.input.y = ky;
            } else if (!this.joystickManager || (this.joystickManager && this.joystickManager.ids.length === 0)) {
                 // Reset if no input
                 this.input.x = 0;
                 this.input.y = 0;
            }
        }
    }

    animate() {
        requestAnimationFrame(this.animate);
        const dt = Math.min(this.clock.getDelta(), 0.1);

        if (this.isPlaying) {
            this.updateInput();
            this.world.step(1 / 60, dt, 3);

            // Update Tapir
            this.tapir.update(this.input, dt);

            // Check interactions
            if (this.input.action) {
                // Try grab
                if (!this.tapir.carrying) {
                    // Find closest loot
                    let closest = null;
                    let minDist = 3.0;
                    for (let l of this.loots) {
                        if (l.stolen) continue;
                        const dist = this.tapir.mesh.position.distanceTo(l.rootBody.position);
                        if (dist < minDist) {
                            minDist = dist;
                            closest = l;
                        }
                    }
                    if (closest) {
                        this.tapir.grab(closest);
                        this.audio.playGrab();
                        this.ui.showMessage("Yoink!");
                    }
                    this.input.action = false; // debounce
                } else {
                    // Drop logic could go here, but prompt says "runs away with loot", implying we hold it until score?
                    // Let's allow dropping for fun or if needed
                    // this.tapir.drop();
                    // this.input.action = false;
                }
            }

            // Update Loot visuals
            this.loots.forEach(l => l.update());

            // Update Guards
            this.guards.forEach(g => {
                g.update(this.tapir.mesh.position, dt);
                if (g.checkCatch(this.tapir.mesh.position)) {
                    this.gameOver();
                }
            });

            // Score check (Drop zone at 0,0,10 approx)
            if (this.tapir.carrying && this.tapir.mesh.position.z > 8 && Math.abs(this.tapir.mesh.position.x) < 4) {
                const val = this.tapir.carrying.value;
                this.score += val;
                this.itemsStolen++;
                this.ui.updateScore(this.score);
                this.ui.showMessage(`Sold for $${val}!`);
                
                // Mark loot as sold/remove
                this.tapir.drop(); // Detach
                // Teleport loot away or destroy
                // Ideally destroy, but for now just leave it or respawn logic
                this.tapir.carrying = null; 

                // Spawn new loot?
                if(this.loots.filter(l => !l.stolen).length < 2) {
                     this.spawnLoot();
                }
            }

            // Camera follow
            const targetPos = this.tapir.mesh.position.clone();
            targetPos.y += 10;
            targetPos.z += 12;
            this.camera.position.lerp(targetPos, 0.1);
            this.camera.lookAt(this.tapir.mesh.position);
        }

        this.renderer.render(this.scene, this.camera);
    }
}