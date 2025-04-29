/**
 * Fireworks Effect Module for Tetris
 * Creates spectacular firework particles to celebrate when the player gets a Tetris
 */

// Canvas context and dimensions - will be initialized in setup
let ctx;
let canvasWidth, canvasHeight;

// Fireworks system configuration
const GRAVITY = 0.08;
const FRICTION = 0.98;
const EXPLOSION_PARTICLES_MIN = 80; // Minimum particles per explosion
const EXPLOSION_PARTICLES_MAX = 150; // Maximum particles per explosion
const MAX_FIREWORKS = 5;  // Maximum number of active firework explosions

// Arrays to store active particles
const fireworks = [];

// Particle color palettes (bright, celebratory colors)
const COLOR_PALETTES = [
    // Gold/Yellow palette
    ['#ffff00', '#ffffaa', '#ffdd00', '#ffaa00', '#ffffff'],
    // Blue palette
    ['#00ffff', '#00ccff', '#0088ff', '#0044ff', '#ffffff'],
    // Purple palette
    ['#ff00ff', '#ff88ff', '#cc00ff', '#8800ff', '#ffffff'],
    // Rainbow palette
    ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3']
];

/**
 * Firework particle class
 */
class FireworkParticle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 2 + 1;
        this.alpha = 1;
        this.decay = Math.random() * 0.03 + 0.01; // How quickly the particle fades
        
        // Create random velocity for explosion effect
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 1;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        
        // Trail parameters
        this.hasTrail = Math.random() > 0.7; // 30% of particles have trails
        this.trail = [];
        this.maxTrailLength = Math.floor(Math.random() * 5) + 3;
    }
    
    update() {
        // Add trail point before updating position
        if (this.hasTrail) {
            this.trail.push({ x: this.x, y: this.y, alpha: this.alpha });
            // Limit trail length
            if (this.trail.length > this.maxTrailLength) {
                this.trail.shift();
            }
        }
        
        // Apply gravity and friction
        this.vx *= FRICTION;
        this.vy = this.vy * FRICTION + GRAVITY;
        
        // Update position
        this.x += this.vx;
        this.y += this.vy;
        
        // Reduce alpha as the particle ages
        this.alpha -= this.decay;
        
        // Slightly reduce size
        if (this.size > 0.1) {
            this.size -= 0.03;
        }
        
        return this.alpha > 0;
    }
    
    draw() {
        // Draw trail first so it appears behind the particle
        if (this.hasTrail && this.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            
            for (let i = 1; i < this.trail.length; i++) {
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            
            ctx.strokeStyle = this.color.replace(')', `, ${this.alpha * 0.3})`).replace('rgb', 'rgba');
            ctx.lineWidth = this.size / 2;
            ctx.stroke();
        }
        
        // Draw the particle itself
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.globalAlpha = 1;
    }
}

/**
 * Firework explosion class
 */
class FireworkExplosion {
    constructor(x, y, paletteIndex = -1) {
        this.x = x;
        this.y = y;
        this.particles = [];
        
        // Select a color palette (either specified or random)
        const palette = paletteIndex >= 0 && paletteIndex < COLOR_PALETTES.length 
            ? COLOR_PALETTES[paletteIndex] 
            : COLOR_PALETTES[Math.floor(Math.random() * COLOR_PALETTES.length)];
        
        // Create explosion particles
        const particleCount = Math.floor(Math.random() * 
            (EXPLOSION_PARTICLES_MAX - EXPLOSION_PARTICLES_MIN + 1)) + EXPLOSION_PARTICLES_MIN;
        
        for (let i = 0; i < particleCount; i++) {
            const color = palette[Math.floor(Math.random() * palette.length)];
            this.particles.push(new FireworkParticle(this.x, this.y, color));
        }
    }
    
    update() {
        // Update all particles and remove dead ones
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const isActive = this.particles[i].update();
            if (!isActive) {
                this.particles.splice(i, 1);
            }
        }
        
        return this.particles.length > 0;
    }
    
    draw() {
        for (const particle of this.particles) {
            particle.draw();
        }
    }
}

/**
 * Create a new firework explosion at the specified position
 * 
 * @param {number} x - X coordinate for explosion center
 * @param {number} y - Y coordinate for explosion center
 * @param {number} paletteIndex - Optional index for color palette, -1 for random
 */
export function createFirework(x, y, paletteIndex = -1) {
    // Limit the number of active fireworks to prevent performance issues
    if (fireworks.length < MAX_FIREWORKS) {
        fireworks.push(new FireworkExplosion(x, y, paletteIndex));
    }
}

/**
 * Create multiple fireworks for a Tetris celebration
 * 
 * @param {Array} rows - Array of row indices that were cleared
 * @param {Object} origin - Grid origin {x, y}
 * @param {number} blockWidth - Width of a grid block
 * @param {number} gridWidth - Number of columns in grid
 */
export function createTetrisFireworks(rows, origin, blockWidth, gridWidth) {
    // Only create fireworks for Tetris (4 rows cleared)
    if (rows.length !== 4) return;
    
    // Create fireworks near the cleared rows
    const minY = Math.min(...rows) * blockWidth + origin.y;
    const maxY = Math.max(...rows) * blockWidth + origin.y;
    const centerX = origin.x + (gridWidth * blockWidth) / 2;
    
    // Create a celebratory pattern of fireworks
    
    // Central explosion
    createFirework(centerX, (minY + maxY) / 2, 0); // Gold in the center
    
    // Create additional fireworks with slight delay
    setTimeout(() => {
        // Left-side firework
        createFirework(origin.x - blockWidth * 2, minY - blockWidth, 1); // Blue
        
        // Right-side firework
        createFirework(origin.x + gridWidth * blockWidth + blockWidth * 2, minY - blockWidth, 2); // Purple
    }, 200);
    
    // Create an arc of fireworks above the board after a delay
    setTimeout(() => {
        const arcRadius = Math.min(canvasWidth, canvasHeight) * 0.4;
        const arcCenterY = maxY + blockWidth * 3;
        
        // Create arc of fireworks
        for (let i = 0; i < 3; i++) {
            const angle = Math.PI * (0.8 + 0.2 * i);
            const fwX = centerX + Math.cos(angle) * arcRadius;
            const fwY = arcCenterY + Math.sin(angle) * arcRadius;
            
            createFirework(fwX, fwY, 3); // Rainbow colors
        }
    }, 400);
}

/**
 * Create a special fireworks display for level-up celebration
 * Creates more dramatic, colorful, and persistent fireworks compared to normal line clears
 * 
 * @param {number} level - The new level player has reached
 * @param {Object} origin - Grid origin {x, y}
 * @param {number} blockWidth - Width of a grid block
 * @param {number} gridWidth - Number of columns in grid
 */
export function createLevelUpFireworks(level, origin, blockWidth, gridWidth) {
    if (!ctx) return;
    
    // Calculate center and dimensions
    const centerX = origin.x + (gridWidth * blockWidth) / 2;
    const centerY = origin.y + (gridWidth * blockWidth) / 2;
    const gridArea = {
        left: origin.x,
        right: origin.x + gridWidth * blockWidth,
        top: origin.y - blockWidth * 4, // Include area above grid
        bottom: origin.y + gridWidth * blockWidth
    };
    
    // Create an immediate burst of fireworks
    
    // Central celebratory explosion
    createFirework(centerX, centerY - blockWidth * 3, 3); // Rainbow in the center
    
    // Side explosions with different colors
    setTimeout(() => {
        createFirework(gridArea.left - blockWidth, centerY, 0); // Gold on left side
        createFirework(gridArea.right + blockWidth, centerY, 2); // Purple on right side
    }, 200);
    
    // Top arc of fireworks
    setTimeout(() => {
        const arcCount = Math.min(level + 2, 7); // More fireworks for higher levels (max 7)
        const arcRadius = Math.min(canvasWidth, canvasHeight) * 0.25;
        
        for (let i = 0; i < arcCount; i++) {
            const angle = Math.PI * (0.2 + (i / (arcCount - 1)) * 0.6);
            const fwX = centerX + Math.cos(angle) * arcRadius;
            const fwY = gridArea.top - blockWidth * 2 + Math.sin(angle) * arcRadius;
            
            // Use different colors based on position in the arc
            const colorIndex = i % COLOR_PALETTES.length;
            
            setTimeout(() => {
                createFirework(fwX, fwY, colorIndex);
            }, 300 + i * 100); // Sequential timing for arc fireworks
        }
    }, 400);
    
    // Add number fireworks for the level number (for levels 2-10)
    if (level >= 2 && level <= 10) {
        setTimeout(() => {
            // Create extra fireworks near the bottom in a pattern representing the level
            for (let i = 0; i < level; i++) {
                const spacing = gridWidth * blockWidth / (level + 1);
                const fwX = gridArea.left + spacing * (i + 1);
                const fwY = gridArea.bottom - blockWidth * 2;
                
                setTimeout(() => {
                    createFirework(fwX, fwY, 0); // Gold color for level indicators
                }, i * 150); // Sequential timing
            }
        }, 800);
    }
    
    // Grand finale - for higher levels, add more impressive finale
    if (level >= 5) {
        setTimeout(() => {
            // Create a circle of fireworks around the center for higher levels
            const finaleCount = Math.min(level, 8); // Up to 8 fireworks in the finale
            const radius = Math.min(canvasWidth, canvasHeight) * 0.2;
            
            for (let i = 0; i < finaleCount; i++) {
                const angle = (Math.PI * 2 / finaleCount) * i;
                const fwX = centerX + Math.cos(angle) * radius;
                const fwY = centerY + Math.sin(angle) * radius;
                
                setTimeout(() => {
                    createFirework(fwX, fwY, i % COLOR_PALETTES.length);
                }, i * 100); // Sequential timing
            }
        }, 1500);
    }
}

/**
 * Update and draw all active firework explosions
 * Call this function once per frame to render the fireworks
 * 
 * @returns {boolean} True if there are active fireworks, false otherwise
 */
export function updateFireworks() {
    let active = false;
    
    // Update and draw fireworks
    for (let i = fireworks.length - 1; i >= 0; i--) {
        const isActive = fireworks[i].update();
        if (isActive) {
            fireworks[i].draw();
            active = true;
        } else {
            fireworks.splice(i, 1);
        }
    }
    
    return active;
}

/**
 * Setup the fireworks system with canvas context
 * 
 * @param {CanvasRenderingContext2D} context - Canvas 2D rendering context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 */
export function setupFireworks(context, width, height) {
    ctx = context;
    canvasWidth = width;
    canvasHeight = height;
    
    // Clear any existing fireworks
    fireworks.length = 0;
}