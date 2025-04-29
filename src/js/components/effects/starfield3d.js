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
const STAR_SPEED = 0.4;    // Speed of stars moving toward viewer
const STAR_COUNT = 300;    // Number of stars in the field
const DEPTH_FACTOR = 256.0; // Perspective division factor (higher = more pronounced effect)
const MIN_Z = 0.1;         // Minimum Z value to prevent division by zero

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
        this.x = 0;      // X position in 3D space
        this.y = 0;      // Y position in 3D space
        this.z = 0;      // Z position (depth)
        this.type = 0;   // Star type (determines color)
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
 * Reset a star to a new random position
 * @param {number} i - Index of star to update
 */
function update3DStar(i) {
    const star = stars[i];
    star.x = randomRange(-25, 25);
    star.y = randomRange(-25, 25);
    star.z = randomRange(1, MAX_DEPTH);
    star.type = Math.floor(Math.random() * STAR_COLORS.length);
}

/**
 * Create the entire starfield by initializing all stars
 */
export function create3DStarfield() {
    for (let i = 0; i < stars.length; i++) {
        stars[i] = new Star3D();
        update3DStar(i);  // Initialize with random position and properties
    }
}

/**
 * Draw the entire starfield by updating and rendering all stars
 * This is called every animation frame
 */
export function Draw3DStars() {
    try {
        for (let i = 0; i < stars.length; i++) {
            const star = stars[i]; // Cache star reference for better performance
            
            // Move star closer to viewer (decrease z)
            star.z -= STAR_SPEED;
            
            // If star is too close, reset it to far distance
            if (star.z <= MIN_Z) {
                update3DStar(i);
                continue; // Skip to next star
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