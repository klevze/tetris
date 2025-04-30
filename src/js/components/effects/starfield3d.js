/**
 * 3D Starfield Animation Module
 * Creates a parallax starfield effect that simulates 3D space movement
 * By projecting 2D coordinates into 3D space with perspective
 */
import { rect } from '../../utils/functions.js';

// Canvas context and dimensions - will be initialized in init3DStarfield()
let ctx;
let WIDTH = window.innerWidth || 800;
let height_3d = window.innerHeight || 600;

// Configuration constants
const MAX_DEPTH = 32;      // Maximum star depth (z-distance)
const STAR_SPEED = 0.4;    // Base speed of stars moving toward/away from viewer
const STAR_COUNT = 300;    // Number of stars in the field
const DEPTH_FACTOR = 256.0; // Perspective division factor (higher = more pronounced effect)
const MIN_Z = 0.1;         // Minimum Z value to prevent division by zero
const MAX_Z = 40;          // Maximum Z value for stars moving away

// Directional movement constants
const MAX_VELOCITY = 0.25;                 // Maximum velocity in X and Y directions
const VELOCITY_CHANGE = 0.03;              // Rate of velocity change for direction transitions

// Animation state control
const ANIMATION_MODE = {
    INWARD: 0,     // Moving into the galaxy
    TRANSITION: 1, // Slowing down/stopping
    OUTWARD: 2     // Moving out of the galaxy
};

// Animation timing (in frames)
const INWARD_DURATION = 300;     // How long to move inward (about 5 seconds at 60fps)
const TRANSITION_DURATION = 60;  // How long to pause/transition (about 1 second)

// Current animation state
let currentMode = ANIMATION_MODE.INWARD;
let animationTimer = 0;
let transitionProgress = 0;  // 0 to 1 for smooth transitions

// Field of view configuration (in radians)
const HFOV = 100 * Math.PI / 180; // Horizontal field of view
const VFOV = 80 * Math.PI / 180;  // Vertical field of view

// View center coordinates and calculated distances
let centerX, centerY, viewDistance;
let hViewDistance, vViewDistance;

// Pre-calculated color array for better performance
const STAR_COLORS = ['#fff', '#aaa', '#999', '#777', '#555'];

// Star array (pre-allocated for performance)
const stars = new Array(STAR_COUNT);

/**
 * Star object representing a single star in 3D space
 */
class Star3D {
    constructor() {
        this.x = 0;         // X position in 3D space
        this.y = 0;         // Y position in 3D space
        this.z = 0;         // Z position (depth)
        this.vx = 0;        // X velocity component
        this.vy = 0;        // Y velocity component
        this.vz = 0;        // Z velocity component (negative for approaching, positive for receding)
        this.baseVz = 0;    // Base Z velocity (for transition effects)
        this.type = 0;      // Star type (determines color)
    }
}

/**
 * Draw a single star on the canvas
 * @param {number} x - X coordinate on canvas
 * @param {number} y - Y coordinate on canvas
 * @param {string} color - Star color in hex format
 */
function draw3DStar(x, y, color) {
    // Set the fill and stroke style once (more efficient)
    ctx.fillStyle = ctx.strokeStyle = color;
    
    // Draw star as a small rectangle
    rect(x, y, 1, 1);
    
    // Apply the stroke 
    ctx.stroke();
}

/**
 * Generates a random number within a specified range
 * @param {number} minVal - Minimum value (inclusive)
 * @param {number} maxVal - Maximum value (exclusive)
 * @returns {number} Random integer between minVal and maxVal
 */
function randomRange(minVal, maxVal) {
    return Math.floor(Math.random() * (maxVal - minVal - 1)) + minVal;
}

/**
 * Generates a random float within a specified range
 * @param {number} minVal - Minimum value (inclusive)
 * @param {number} maxVal - Maximum value (exclusive)
 * @returns {number} Random float between minVal and maxVal
 */
function randomFloat(minVal, maxVal) {
    return Math.random() * (maxVal - minVal) + minVal;
}

/**
 * Initialize a star for inward movement
 * @param {Star3D} star - Star object to initialize
 */
function initInwardStar(star) {
    star.x = randomRange(-25, 25);
    star.y = randomRange(-25, 25);
    star.z = randomRange(MAX_DEPTH/2, MAX_DEPTH);
    star.vx = randomFloat(-MAX_VELOCITY, MAX_VELOCITY);
    star.vy = randomFloat(-MAX_VELOCITY, MAX_VELOCITY);
    star.vz = -STAR_SPEED * randomFloat(0.7, 1.2);
    star.baseVz = star.vz;
    star.type = Math.floor(Math.random() * STAR_COLORS.length);
}

/**
 * Initialize a star for outward movement
 * @param {Star3D} star - Star object to initialize
 */
function initOutwardStar(star) {
    star.x = randomRange(-25, 25);
    star.y = randomRange(-25, 25);
    star.z = randomRange(MIN_Z + 1, MAX_DEPTH/3);
    star.vx = randomFloat(-MAX_VELOCITY, MAX_VELOCITY);
    star.vy = randomFloat(-MAX_VELOCITY, MAX_VELOCITY);
    star.vz = STAR_SPEED * randomFloat(0.6, 1.0);
    star.baseVz = star.vz;
    star.type = Math.floor(Math.random() * STAR_COLORS.length);
}

/**
 * Reset a star based on current animation mode
 * @param {number} i - Index of star to update
 */
function resetStar(i) {
    const star = stars[i];
    
    if (currentMode === ANIMATION_MODE.INWARD) {
        initInwardStar(star);
    } else if (currentMode === ANIMATION_MODE.OUTWARD) {
        initOutwardStar(star);
    } else {
        // During transition, initialize based on where we're heading
        if (animationTimer > TRANSITION_DURATION / 2) {
            initOutwardStar(star);
        } else {
            initInwardStar(star);
        }
    }
}

/**
 * Create the entire starfield by initializing all stars
 */
export function create3DStarfield() {
    // Start with inward movement
    currentMode = ANIMATION_MODE.INWARD;
    animationTimer = 0;
    
    for (let i = 0; i < stars.length; i++) {
        stars[i] = new Star3D();
        initInwardStar(stars[i]);
    }
}

/**
 * Draw the entire starfield by updating and rendering all stars
 * This is called every animation frame
 */
export function Draw3DStars() {
    try {
        // Update animation state
        animationTimer++;
        
        // Check for mode transitions
        if (currentMode === ANIMATION_MODE.INWARD && animationTimer >= INWARD_DURATION) {
            currentMode = ANIMATION_MODE.TRANSITION;
            animationTimer = 0;
        } else if (currentMode === ANIMATION_MODE.TRANSITION && animationTimer >= TRANSITION_DURATION) {
            currentMode = ANIMATION_MODE.OUTWARD;
            animationTimer = 0;
            
            // Initialize all stars for outward movement
            for (let i = 0; i < stars.length; i++) {
                initOutwardStar(stars[i]);
            }
        }
        
        // Calculate transition progress (0 to 1) for smooth slowdown/speedup
        if (currentMode === ANIMATION_MODE.TRANSITION) {
            transitionProgress = animationTimer / TRANSITION_DURATION;
        }
        
        for (let i = 0; i < stars.length; i++) {
            const star = stars[i]; // Cache star reference for better performance
            
            // Apply velocity based on current mode
            if (currentMode === ANIMATION_MODE.INWARD || currentMode === ANIMATION_MODE.OUTWARD) {
                // Normal movement
                star.x += star.vx;
                star.y += star.vy;
                star.z += star.vz;
            } else if (currentMode === ANIMATION_MODE.TRANSITION) {
                // During transition, gradually slow down to a stop (at middle) then speed up in reverse
                const midpoint = TRANSITION_DURATION / 2;
                if (animationTimer < midpoint) {
                    // First half: slow down
                    const slowFactor = 1 - (animationTimer / midpoint);
                    star.x += star.vx * slowFactor;
                    star.y += star.vy * slowFactor;
                    star.z += star.vz * slowFactor;
                } else {
                    // Second half: speed up in opposite direction
                    const speedupFactor = (animationTimer - midpoint) / midpoint;
                    
                    // For Z, we're reversing direction
                    const newVz = -star.baseVz * speedupFactor;
                    
                    star.x += star.vx * speedupFactor;
                    star.y += star.vy * speedupFactor;
                    star.z += newVz;
                }
            }
            
            // Handle boundaries based on current mode
            if (currentMode === ANIMATION_MODE.INWARD) {
                // Reset stars when they get too close or move too far sideways
                if (star.z <= MIN_Z || Math.abs(star.x) > 50 || Math.abs(star.y) > 50) {
                    resetStar(i);
                    continue;
                }
            } else if (currentMode === ANIMATION_MODE.OUTWARD) {
                // Reset stars when they get too far or move too far sideways
                if (star.z >= MAX_Z || Math.abs(star.x) > 50 || Math.abs(star.y) > 50) {
                    resetStar(i);
                    continue;
                }
            }
            
            // Calculate perspective projection factor
            const k = DEPTH_FACTOR / star.z;
            
            // Calculate screen position with perspective
            const px = star.x * k + centerX;
            const py = star.y * k + centerY;
            
            // Only draw stars that are within the viewport
            if (px >= 0 && px <= WIDTH && py >= 0 && py <= height_3d) {
                draw3DStar(px, py, STAR_COLORS[star.type]);
            }
        }
    } catch (error) {
        console.error('Error in Draw3DStars:', error);
    }
}

/**
 * Initialize the starfield with the canvas context and dimensions
 * Must be called before using the starfield
 * 
 * @param {CanvasRenderingContext2D} context - Canvas 2D rendering context
 * @param {number} canvasWidth - Width of the canvas
 * @param {number} canvasHeight - Height of the canvas
 */
export function init3DStarfield(context, canvasWidth, canvasHeight) {
    // Store references to context and dimensions
    ctx = context;
    WIDTH = canvasWidth || window.innerWidth || 800;
    height_3d = canvasHeight || window.innerHeight || 600;
    
    // Calculate center coordinates
    centerX = WIDTH / 2;
    centerY = height_3d / 2;
    
    // Calculate view distance (diagonal of the screen)
    viewDistance = Math.floor(Math.sqrt(centerX * centerX + centerY * centerY));
    
    // Calculate view distances based on field of view
    hViewDistance = (WIDTH / 2) / Math.tan(HFOV / 2);
    vViewDistance = (height_3d / 2) / Math.tan(VFOV / 2);
    
    // Initialize stars
    create3DStarfield();
}

/**
 * Reset the starfield animation to start from the beginning
 * This can be called when returning to the loading screen
 */
export function resetStarfieldAnimation() {
    currentMode = ANIMATION_MODE.INWARD;
    animationTimer = 0;
    
    for (let i = 0; i < stars.length; i++) {
        initInwardStar(stars[i]);
    }
}