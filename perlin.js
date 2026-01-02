// Perlin noise implementation for procedural world generation
export class PerlinNoise {
    constructor(seed = Math.random()) {
        this.seed = seed;
        this.gradients = {};
        this.memory = {};
    }

    // Generate random gradient vector
    randomGradient(ix, iy) {
        const key = `${ix},${iy}`;
        if (this.gradients[key]) {
            return this.gradients[key];
        }
        
        const random = Math.sin(ix * 12.9898 + iy * 78.233 + this.seed) * 43758.5453;
        const angle = (random - Math.floor(random)) * 2 * Math.PI;
        
        const gradient = {
            x: Math.cos(angle),
            y: Math.sin(angle)
        };
        
        this.gradients[key] = gradient;
        return gradient;
    }

    // Dot product of gradient and distance vectors
    dotGridGradient(ix, iy, x, y) {
        const gradient = this.randomGradient(ix, iy);
        const dx = x - ix;
        const dy = y - iy;
        return dx * gradient.x + dy * gradient.y;
    }

    // Smooth interpolation function
    interpolate(a0, a1, w) {
        return (a1 - a0) * (3.0 - w * 2.0) * w * w + a0;
    }

    // Get noise value at coordinates
    noise(x, y) {
        const key = `${x},${y}`;
        if (this.memory[key] !== undefined) {
            return this.memory[key];
        }

        const x0 = Math.floor(x);
        const x1 = x0 + 1;
        const y0 = Math.floor(y);
        const y1 = y0 + 1;

        const sx = x - x0;
        const sy = y - y0;

        const n0 = this.dotGridGradient(x0, y0, x, y);
        const n1 = this.dotGridGradient(x1, y0, x, y);
        const ix0 = this.interpolate(n0, n1, sx);

        const n2 = this.dotGridGradient(x0, y1, x, y);
        const n3 = this.dotGridGradient(x1, y1, x, y);
        const ix1 = this.interpolate(n2, n3, sx);

        const value = this.interpolate(ix0, ix1, sy);
        this.memory[key] = value;
        return value;
    }

    // Generate octave noise (multiple frequencies)
    octaveNoise(x, y, octaves = 4, persistence = 0.5) {
        let total = 0;
        let frequency = 1;
        let amplitude = 1;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            total += this.noise(x * frequency, y * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }

        return total / maxValue;
    }
}
