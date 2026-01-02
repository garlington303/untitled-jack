# untitled-jack
A three.js Minecraft "The Pit" inspired third person action RPG.

## Overview
A co-op third person voxel aesthetic action RPG with procedurally generated worlds. Built with Three.js for WebGL rendering.

## Features
- **Procedural World Generation**: 256x256 voxel world using Perlin noise algorithm
- **Seamless Edge Wrapping**: Smooth terrain wrapping at world boundaries
- **Third-Person Camera**: Over-the-shoulder camera perspective that follows the player
- **Player Movement**: WASD keyboard controls with mouse look
- **Voxel Aesthetic**: Blocky Minecraft-style terrain with grass, dirt, and stone layers
- **Dynamic Terrain**: Height-based terrain generation with natural-looking landscapes

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```
Open your browser to `http://localhost:5173`

### Build for Production
```bash
npm run build
```

## Controls
- **W/A/S/D**: Move forward/left/backward/right
- **Mouse**: Look around (click to enable pointer lock)

## Technical Details
- **Rendering Engine**: Three.js
- **Build Tool**: Vite
- **World Size**: 256x256 blocks
- **Chunk System**: Efficient 16x16 chunk-based rendering
- **Noise Generation**: Custom Perlin noise implementation with octave sampling 
