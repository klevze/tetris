/**
 * Core utility functions for the Tetris game
 * Enhanced with better rendering performance and responsive design support
 */

import { getImage } from './assetManager.js';
import { CANVAS } from './config/config.js';

// Canvas elements and context 
export let WIDTH = CANVAS.WIDTH;
export let HEIGHT = CANVAS.HEIGHT;
export let canvas;
export let ctx;

// Animation counters for text effects
export let sine_counter = 0;
export let sine_counterS = 0;

// Device pixel ratio for high DPI displays
let devicePixelRatio = 1;

// Initialize canvas when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('mainCanvas');
    if (canvas) {
        ctx = canvas.getContext('2d', { alpha: false }); // Alpha false for better performance
        setCanvasSize();
        
        // Listen for orientation changes on mobile
        window.addEventListener('orientationchange', handleOrientationChange);
        handleOrientationChange(); // Check initial orientation
    } else {
        console.error('Canvas element not found');
    }
});

/**
 * Set canvas size based on device and adjust for pixel ratio
 */
export function setCanvasSize() {
    if (!canvas) return;
    
    // Get device window dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Get container dimensions if it exists
    const container = document.getElementById('main');
    const containerWidth = container ? container.clientWidth : viewportWidth;
    const containerHeight = container ? container.clientHeight : viewportHeight;
    
    // Set canvas logical size to match container (100% of container)
    canvas.style.width = `100%`;
    canvas.style.height = `100%`;
    
    // Handle high DPI displays for sharper rendering
    devicePixelRatio = window.devicePixelRatio || 1;
    
    // Set canvas actual dimensions for proper rendering
    canvas.width = Math.floor(containerWidth * devicePixelRatio);
    canvas.height = Math.floor(containerHeight * devicePixelRatio);
    
    // Update global constants 
    WIDTH = containerWidth;
    HEIGHT = containerHeight;
    
    // Scale the context to handle high DPI displays
    if (ctx) {
        ctx.scale(devicePixelRatio, devicePixelRatio);
    }
    
    console.log(`Canvas resized: ${WIDTH}x${HEIGHT}, pixel ratio: ${devicePixelRatio}`);
    
    // Trigger redraw if needed
    return { width: WIDTH, height: HEIGHT };
}

/**
 * Handle device orientation changes
 */
function handleOrientationChange() {
    const orientationWarning = document.querySelector('.orientation-warning');
    if (!orientationWarning) return;
    
    // Check if we're on a mobile device with landscape orientation and limited height
    if (window.innerHeight < 450 && window.innerWidth > window.innerHeight) {
        orientationWarning.style.display = 'flex';
    } else {
        orientationWarning.style.display = 'none';
    }
}

/**
 * Clear the entire screen with a specific color
 * @param {string} backColor - Background color to fill screen with
 */
export function clearScreen(backColor) {
    if (ctx) {
        ctx.fillStyle = backColor;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
}

/**
 * Draw a background image with specified dimensions
 * @param {HTMLImageElement} image - Image to draw
 * @param {number} x - X position
 * @param {number} y - Y position 
 * @param {number} width - Width to draw
 * @param {number} height - Height to draw
 */
export function showBackground(image, x, y, width, height) {
    if (!ctx) return;
    
    try {
        // Check if image is valid
        if (image && image.complete && image.naturalWidth !== 0) {
            // Use width and height of canvas if not specified
            const w = width || WIDTH;
            const h = height || HEIGHT;
            
            ctx.drawImage(image, x, y, w, h);
        } else {
            // Fallback if image isn't loaded
            ctx.fillStyle = '#333';
            ctx.fillRect(x, y, width || WIDTH, height || HEIGHT);
        }
    } catch (e) {
        console.error("Error drawing background image:", e);
        // Draw fallback
        ctx.fillStyle = '#333';
        ctx.fillRect(x, y, width || WIDTH, height || HEIGHT);
    }
}

/**
 * Draw an image at a specific position
 * @param {HTMLImageElement} image - Image to draw
 * @param {number} x - X position
 * @param {number} y - Y position
 */
export function showSlika(image, x, y) {
    if (!ctx) return;
    
    try {
        // Check if image is valid
        if (image && image.complete && image.naturalWidth !== 0) {
            ctx.drawImage(image, x, y);
        } else {
            // Fallback if image isn't loaded
            ctx.fillStyle = '#444';
            ctx.fillRect(x, y, 32, 32);
        }
    } catch (e) {
        console.error("Error drawing image:", e);
        // Draw fallback
        ctx.fillStyle = '#444';
        ctx.fillRect(x, y, 32, 32);
    }
}

/**
 * Draw a circle
 * @param {number} x - X center position
 * @param {number} y - Y center position
 * @param {number} r - Radius
 */
export function circle(x, y, r) {
    if (ctx) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2, true);
        ctx.fill();
    }
}

/**
 * Draw a rectangle
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} w - Width
 * @param {number} h - Height
 */
export function rect(x, y, w, h) {
    if (ctx) {
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.closePath();
        ctx.fill();
    }
}

/**
 * Draw a line
 * @param {number} x1 - Start X position
 * @param {number} y1 - Start Y position
 * @param {number} x2 - End X position
 * @param {number} y2 - End Y position
 * @param {string} color - Line color
 */
export function DrawLine(x1, y1, x2, y2, color) {
    if (ctx) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = color;
        ctx.closePath();
        ctx.stroke();
    }
}

/**
 * Draw text using standard canvas fonts instead of bitmap
 * Preserves the same functionality as the original DrawBitmapText
 * @param {string} text - Text to display
 * @param {number} x - X position (0 for center)
 * @param {number} y - Y position
 * @param {number} colorIndex - Color index (0-5)
 * @param {number} sinEffect - Apply sine wave effect (0 or 1)
 * @param {number} sineSpeed - Speed of sine wave animation
 */
export function DrawBitmapText(text, x, y, colorIndex = 0, sinEffect = 0, sineSpeed = 0) {
    if (!ctx) return;
    
    // Define font properties
    const fontSize = 28;
    ctx.font = `bold ${fontSize}px 'Press Start 2P', 'Courier New', monospace`;
    ctx.textBaseline = 'top';
    
    // Determine text color based on colorIndex
    const colors = [
        '#FFFFFF', // white (default)
        '#FFD700', // gold
        '#FF0000', // red
        '#00FF00', // green 
        '#0000FF', // blue
        '#FF00FF'  // magenta
    ];
    ctx.fillStyle = colors[colorIndex] || colors[0];
    
    // Add text shadow for depth
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // Calculate position (center if x is 0)
    let posX = x;
    if (x === 0) {
        ctx.textAlign = 'center';
        posX = WIDTH/2;
    } else {
        ctx.textAlign = 'left';
    }
    
    // Apply sine wave effect if enabled
    let posY = y;
    if (sinEffect) {
        posY = y + Math.floor(Math.sin(sine_counter/20) * 3);
        sine_counter += sineSpeed || 1;
    }
    
    // Draw the text with stroke for better visibility
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeText(text, posX, posY);
    ctx.fillText(text, posX, posY);
    
    // Reset shadow effects
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
}

/**
 * Draw small text using standard canvas fonts instead of bitmap
 * Preserves the same functionality as the original DrawBitmapTextSmall
 * @param {string} text - Text to display
 * @param {number} x - X position (0 for center)
 * @param {number} y - Y position
 * @param {number} colorIndex - Color index (0-5)
 * @param {number} sinEffect - Apply sine wave effect (0 or 1)
 * @param {number} sineSpeed - Speed of sine wave animation
 */
export function DrawBitmapTextSmall(text, x, y, colorIndex = 0, sinEffect = 0, sineSpeed = 0) {
    if (!ctx) return;
    
    // Define font properties
    const fontSize = 16;
    ctx.font = `bold ${fontSize}px 'Press Start 2P', 'Courier New', monospace`;
    ctx.textBaseline = 'top';
    
    // Determine text color based on colorIndex
    const colors = [
        '#FFFFFF', // white (default)
        '#FFD700', // gold
        '#FF0000', // red
        '#00FF00', // green 
        '#0000FF', // blue
        '#FF00FF'  // magenta
    ];
    ctx.fillStyle = colors[colorIndex] || colors[0];
    
    // Add subtle text shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    
    // Calculate position (center if x is 0)
    let posX = x;
    if (x === 0) {
        ctx.textAlign = 'center';
        posX = WIDTH/2;
    } else {
        ctx.textAlign = 'left';
    }
    
    // Apply sine wave effect if enabled
    let posY = y;
    if (sinEffect) {
        posY = y + Math.floor(Math.sin(sine_counterS) * 2);
        sine_counterS += sineSpeed || 0.5;
    }
    
    // Draw the text with thin stroke for better visibility
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeText(text, posX, posY);
    ctx.fillText(text, posX, posY);
    
    // Reset shadow effects
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
}