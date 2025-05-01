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
const STAR_SPEED = 0.4;    // Base speed of stars moving toward viewer
const STAR_COUNT = 160;    // Number of stars in the field
const DEPTH_FACTOR = 256.0; // Perspective division factor (higher = more pronounced effect)
const MIN_Z = 0.1;         // Minimum Z value to prevent division by zero
const MAX_Z = 50;          // Maximum Z value for stars moving away

// New directional movement constants
const DIRECTION_CHANGE_PROBABILITY = 0.008; // Increased probability of changing direction
const MAX_VELOCITY = 0.3;                  // Increased maximum velocity in X and Y directions
const VELOCITY_CHANGE = 0.03;              // Increased rate of velocity change for more dynamic motion
const REVERSE_PROBABILITY = 0.4;           // Probability that a star will move away from viewer

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
        this.vx = 0;     // X velocity component
        this.vy = 0;     // Y velocity component
        this.vz = 0;     // Z velocity component (negative for approaching)
        this.targetVx = 0; // Target X velocity for smooth transitions
        this.targetVy = 0; // Target Y velocity for smooth transitions
        this.targetVz = 0; // Target Z velocity for smooth transitions
        this.changing = false; // Whether star is currently changing direction
        this.changeTimer = 0;  // Timer for direction change duration
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
 * Generates a random float within a specified range
 * @param {number} minVal - Minimum value (inclusive)
 * @param {number} maxVal - Maximum value (exclusive)
 * @returns {number} Random float between minVal and maxVal
 */
function randomFloat(minVal, maxVal) {
    return Math.random() * (maxVal - minVal) + minVal;
}

/**
 * Set random target velocities for a star
 * @param {Star3D} star - Star object to update
 */
function setRandomDirection(star) {
    star.targetVx = randomFloat(-MAX_VELOCITY, MAX_VELOCITY);
    star.targetVy = randomFloat(-MAX_VELOCITY, MAX_VELOCITY);
    
    // Allow stars to move both toward and away from viewer
    if (Math.random() < REVERSE_PROBABILITY) {
        // Move away from viewer (positive Z)
        star.targetVz = STAR_SPEED * randomFloat(0.5, 1.0);
    } else {
        // Move toward viewer (negative Z)
        star.targetVz = -STAR_SPEED * randomFloat(0.7, 1.3);
    }
    
    star.changing = true;
    star.changeTimer = randomRange(30, 120); // Direction change lasts 30-120 frames
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
    
    // Give stars initial velocities in all possible directions
    if (Math.random() < 0.5) {
        // Half stars start moving toward viewer
        star.vx = randomFloat(-0.1, 0.1);
        star.vy = randomFloat(-0.1, 0.1);
        star.vz = -STAR_SPEED * randomFloat(0.8, 1.2);
    } else {
        // Half stars start moving in random directions
        star.vx = randomFloat(-0.2, 0.2);
        star.vy = randomFloat(-0.2, 0.2);
        
        // 30% chance to start moving away
        if (Math.random() < 0.3) {
            star.vz = STAR_SPEED * randomFloat(0.5, 0.8);
        } else {
            star.vz = -STAR_SPEED * randomFloat(0.8, 1.2);
        }
    }
    
    star.targetVx = star.vx;
    star.targetVy = star.vy;
    star.targetVz = star.vz;
    star.changing = false;
    star.changeTimer = 0;
    star.type = Math.floor(Math.random() * STAR_COLORS.length);
    
    // Give some stars initial direction variations
    if (Math.random() < 0.4) {
        setRandomDirection(star);
    }
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
            
            // Randomly change direction occasionally
            if (!star.changing && Math.random() < DIRECTION_CHANGE_PROBABILITY) {
                setRandomDirection(star);
            }
            
            // Update velocities to approach target values
            if (star.changing) {
                // Smoothly transition to target velocities
                star.vx += (star.targetVx - star.vx) * VELOCITY_CHANGE;
                star.vy += (star.targetVy - star.vy) * VELOCITY_CHANGE;
                star.vz += (star.targetVz - star.vz) * VELOCITY_CHANGE;
                
                // Decrement change timer
                star.changeTimer--;
                if (star.changeTimer <= 0) {
                    star.changing = false;
                }
            }
            
            // Update position using current velocity
            star.x += star.vx;
            star.y += star.vy;
            star.z += star.vz;
            
            // Handle boundaries - reset star if it moves out of bounds, too close, or too far
            if (star.z <= MIN_Z || 
                star.z >= MAX_Z || 
                Math.abs(star.x) > 50 || 
                Math.abs(star.y) > 50) {
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