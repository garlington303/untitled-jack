import * as THREE from 'three';
import { PerlinNoise } from './perlin.js';

// Game configuration
const WORLD_SIZE = 256;
const CHUNK_SIZE = 16;
const VOXEL_SIZE = 1;
const RENDER_DISTANCE = 6; // chunks
const PLAYER_HEIGHT = 1.8;
const PLAYER_RADIUS = 0.4;
const MOVE_SPEED = 5;
const CAMERA_DISTANCE = 5;
const CAMERA_HEIGHT = 2;

class VoxelWorld {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x87CEEB);
        document.body.appendChild(this.renderer.domElement);

        // Player state
        this.player = {
            position: new THREE.Vector3(WORLD_SIZE / 2, 50, WORLD_SIZE / 2),
            velocity: new THREE.Vector3(0, 0, 0),
            rotation: 0,
            capsule: null
        };

        // Input state
        this.keys = {};
        this.mouse = { x: 0, y: 0, sensitivity: 0.002 };

        // World data
        this.perlin = new PerlinNoise(Date.now());
        this.chunks = new Map();
        this.heightMap = this.generateHeightMap();

        // Timing
        this.lastTime = performance.now();

        this.init();
    }

    generateHeightMap() {
        const heightMap = [];
        const scale = 0.05; // Scale for noise frequency
        
        for (let z = 0; z < WORLD_SIZE; z++) {
            heightMap[z] = [];
            for (let x = 0; x < WORLD_SIZE; x++) {
                // Use wrapping coordinates for seamless edges
                const wx = x / WORLD_SIZE;
                const wz = z / WORLD_SIZE;
                
                // Sample noise in a way that wraps seamlessly using 4D sampling
                const nx = Math.cos(wx * 2 * Math.PI) / (2 * Math.PI);
                const ny = Math.sin(wx * 2 * Math.PI) / (2 * Math.PI);
                const nz = Math.cos(wz * 2 * Math.PI) / (2 * Math.PI);
                const nw = Math.sin(wz * 2 * Math.PI) / (2 * Math.PI);
                
                const noiseValue = this.perlin.octaveNoise(
                    (nx + 1) * 100,
                    (ny + 1) * 100,
                    4,
                    0.5
                );
                
                // Map noise value to height (0-20)
                const height = Math.floor((noiseValue + 1) * 10) + 5;
                heightMap[z][x] = height;
            }
        }
        
        return heightMap;
    }

    init() {
        // Setup lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        this.scene.add(directionalLight);

        // Create player capsule
        this.createPlayer();

        // Generate initial chunks around player
        this.updateChunks();

        // Setup controls
        this.setupControls();

        // Position camera
        this.updateCamera();

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());

        // Start animation loop
        this.animate();
    }

    createPlayer() {
        // Create capsule geometry (cylinder with sphere caps)
        const geometry = new THREE.CapsuleGeometry(PLAYER_RADIUS, PLAYER_HEIGHT - PLAYER_RADIUS * 2, 4, 8);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0xff0000,
            roughness: 0.7,
            metalness: 0.3
        });
        
        this.player.capsule = new THREE.Mesh(geometry, material);
        this.player.capsule.position.copy(this.player.position);
        this.scene.add(this.player.capsule);
    }

    setupControls() {
        // Keyboard controls
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        // Mouse controls
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.movementX;
            this.mouse.y = e.movementY;
        });

        // Pointer lock for mouse look
        this.renderer.domElement.addEventListener('click', () => {
            this.renderer.domElement.requestPointerLock();
        });
    }

    updateChunks() {
        const playerChunkX = Math.floor(this.player.position.x / CHUNK_SIZE);
        const playerChunkZ = Math.floor(this.player.position.z / CHUNK_SIZE);

        // Generate chunks around player
        for (let cz = playerChunkZ - RENDER_DISTANCE; cz <= playerChunkZ + RENDER_DISTANCE; cz++) {
            for (let cx = playerChunkX - RENDER_DISTANCE; cx <= playerChunkX + RENDER_DISTANCE; cx++) {
                const chunkKey = `${cx},${cz}`;
                
                if (!this.chunks.has(chunkKey)) {
                    this.generateChunk(cx, cz);
                }
            }
        }
    }

    generateChunk(chunkX, chunkZ) {
        const chunkKey = `${chunkX},${chunkZ}`;
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const normals = [];
        const colors = [];

        for (let z = 0; z < CHUNK_SIZE; z++) {
            for (let x = 0; x < CHUNK_SIZE; x++) {
                const worldX = chunkX * CHUNK_SIZE + x;
                const worldZ = chunkZ * CHUNK_SIZE + z;

                // Clamp to world bounds with wrapping
                const wrappedX = ((worldX % WORLD_SIZE) + WORLD_SIZE) % WORLD_SIZE;
                const wrappedZ = ((worldZ % WORLD_SIZE) + WORLD_SIZE) % WORLD_SIZE;

                const height = this.heightMap[wrappedZ][wrappedX];

                // Create voxel stack up to height
                for (let y = 0; y < height; y++) {
                    this.addVoxel(positions, normals, colors, worldX, y, worldZ, height);
                }
            }
        }

        if (positions.length > 0) {
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

            const material = new THREE.MeshStandardMaterial({ 
                vertexColors: true,
                roughness: 0.8,
                metalness: 0.2
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            this.scene.add(mesh);
            this.chunks.set(chunkKey, mesh);
        }
    }

    addVoxel(positions, normals, colors, x, y, z, height) {
        const size = VOXEL_SIZE;
        
        // Choose color based on height
        let color = new THREE.Color();
        if (y === height - 1) {
            color.setHex(0x3a7d3a); // Grass green
        } else if (y > height - 4) {
            color.setHex(0x8b7355); // Dirt brown
        } else {
            color.setHex(0x808080); // Stone gray
        }

        // Simplified voxel - just add top face for performance
        // Top face
        positions.push(
            x, y + size, z,
            x + size, y + size, z,
            x + size, y + size, z + size,
            
            x, y + size, z,
            x + size, y + size, z + size,
            x, y + size, z + size
        );

        for (let i = 0; i < 6; i++) {
            normals.push(0, 1, 0);
            colors.push(color.r, color.g, color.b);
        }

        // Add side faces for voxels at the top
        if (y === height - 1) {
            // Front face
            this.addFace(positions, normals, colors,
                [x, y, z + size, x + size, y, z + size, x + size, y + size, z + size, x, y + size, z + size],
                [0, 0, 1], color);
            
            // Back face
            this.addFace(positions, normals, colors,
                [x + size, y, z, x, y, z, x, y + size, z, x + size, y + size, z],
                [0, 0, -1], color);
            
            // Left face
            this.addFace(positions, normals, colors,
                [x, y, z, x, y, z + size, x, y + size, z + size, x, y + size, z],
                [-1, 0, 0], color);
            
            // Right face
            this.addFace(positions, normals, colors,
                [x + size, y, z + size, x + size, y, z, x + size, y + size, z, x + size, y + size, z + size],
                [1, 0, 0], color);
        }
    }

    addFace(positions, normals, colors, vertices, normal, color) {
        positions.push(
            vertices[0], vertices[1], vertices[2],
            vertices[3], vertices[4], vertices[5],
            vertices[6], vertices[7], vertices[8],
            
            vertices[0], vertices[1], vertices[2],
            vertices[6], vertices[7], vertices[8],
            vertices[9], vertices[10], vertices[11]
        );

        for (let i = 0; i < 6; i++) {
            normals.push(normal[0], normal[1], normal[2]);
            colors.push(color.r * 0.8, color.g * 0.8, color.b * 0.8);
        }
    }

    updatePlayer(deltaTime) {
        // Handle rotation from mouse
        if (document.pointerLockElement === this.renderer.domElement) {
            this.player.rotation -= this.mouse.x * this.mouse.sensitivity;
            this.mouse.x = 0;
            this.mouse.y = 0;
        }

        // Handle movement from keyboard
        const moveVector = new THREE.Vector3();
        
        if (this.keys['w']) moveVector.z -= 1;
        if (this.keys['s']) moveVector.z += 1;
        if (this.keys['a']) moveVector.x -= 1;
        if (this.keys['d']) moveVector.x += 1;

        if (moveVector.length() > 0) {
            moveVector.normalize();
            
            // Rotate movement vector based on player rotation
            const rotatedMove = new THREE.Vector3();
            rotatedMove.x = moveVector.x * Math.cos(this.player.rotation) - moveVector.z * Math.sin(this.player.rotation);
            rotatedMove.z = moveVector.x * Math.sin(this.player.rotation) + moveVector.z * Math.cos(this.player.rotation);
            
            this.player.position.x += rotatedMove.x * MOVE_SPEED * deltaTime;
            this.player.position.z += rotatedMove.z * MOVE_SPEED * deltaTime;
        }

        // Clamp player to world bounds with wrapping
        this.player.position.x = ((this.player.position.x % WORLD_SIZE) + WORLD_SIZE) % WORLD_SIZE;
        this.player.position.z = ((this.player.position.z % WORLD_SIZE) + WORLD_SIZE) % WORLD_SIZE;

        // Get terrain height at player position with wrapped indices
        const heightX = Math.floor(this.player.position.x) % WORLD_SIZE;
        const heightZ = Math.floor(this.player.position.z) % WORLD_SIZE;
        const terrainHeight = this.heightMap[heightZ][heightX];
        
        // Keep player on ground
        this.player.position.y = terrainHeight + PLAYER_HEIGHT / 2;

        // Update capsule position
        if (this.player.capsule) {
            this.player.capsule.position.copy(this.player.position);
            this.player.capsule.rotation.y = this.player.rotation;
        }
    }

    updateCamera() {
        // Third-person over-the-shoulder camera
        const offset = new THREE.Vector3(
            Math.sin(this.player.rotation) * CAMERA_DISTANCE * 0.5,
            CAMERA_HEIGHT,
            Math.cos(this.player.rotation) * CAMERA_DISTANCE
        );

        this.camera.position.copy(this.player.position).add(offset);
        this.camera.lookAt(this.player.position.x, this.player.position.y + 0.5, this.player.position.z);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Calculate frame-rate independent deltaTime
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
        this.lastTime = currentTime;

        this.updatePlayer(deltaTime);
        this.updateCamera();
        this.updateChunks();

        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the game
new VoxelWorld();
