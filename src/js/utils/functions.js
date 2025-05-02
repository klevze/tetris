/**
 * Core utility functions for the Tetris game
 * Enhanced with better rendering performance and responsive design support
 */

import { getImage } from './assetManager.js';
import { CANVAS } from '../config/config.js';

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

// Event for notifying about canvas resize
export const EVENTS = {
    WINDOW_RESIZE: 'window_resize'
};

// Custom event dispatcher for resize events
export const eventDispatcher = {
    listeners: {},
    addEventListener(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    },
    removeEventListener(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    },
    dispatchEvent(event, data) {
        if (!this.listeners[event]) return;
        this.listeners[event].forEach(callback => callback(data));
    }
};

// Initialize canvas when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('mainCanvas');
    if (canvas) {
        ctx = canvas.getContext('2d', { alpha: false }); // Alpha false for better performance
        setCanvasSize();
        
        // Add roundRect method to CanvasRenderingContext2D if not available
        if (!ctx.roundRect) {
            CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
                if (width < 2 * radius) radius = width / 2;
                if (height < 2 * radius) radius = height / 2;
                this.beginPath();
                this.moveTo(x + radius, y);
                this.arcTo(x + width, y, x + width, y + height, radius);
                this.arcTo(x + width, y + height, x, y + height, radius);
                this.arcTo(x, y + height, x, y, radius);
                this.arcTo(x, y, x + width, y, radius);
                this.closePath();
                return this;
            };
        }
        
        // Listen for orientation changes on mobile
        window.addEventListener('orientationchange', handleOrientationChange);
        handleOrientationChange(); // Check initial orientation

         // Listen for window resize events
         window.addEventListener('resize', handleWindowResize);
    } else {
        console.error('Canvas element not found');
    }
});

/*
* Handle window resize events
*/
function handleWindowResize() {
   // Debounce the resize event to avoid excessive recalculations
   if (handleWindowResize.timeoutId) {
       clearTimeout(handleWindowResize.timeoutId);
   }

   handleWindowResize.timeoutId = setTimeout(() => {
       const dimensions = setCanvasSize();
       eventDispatcher.dispatchEvent(EVENTS.WINDOW_RESIZE, dimensions);
   }, 100); // 100ms debounce time
}

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
    
    // Check for mobile orientation warning
    const orientationWarning = document.querySelector('.orientation-warning');
    const isOrientationWarningVisible = orientationWarning && 
        window.getComputedStyle(orientationWarning).display !== 'none';
    
    // If the orientation warning is visible, we don't want to resize yet
    if (isOrientationWarningVisible) {
        console.log('Orientation warning visible, skipping canvas resize');
        return { width: WIDTH, height: HEIGHT };
    }
    
    // Detect if we're in portrait mode
    const isPortrait = viewportHeight > viewportWidth;
    
    // Set canvas logical size to match container (100% of container)
    canvas.style.width = `100%`;
    canvas.style.height = `100%`;
    
    // Check for mobile devices
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // For mobile portrait mode, ensure we use the full available screen height
    if (isMobile && isPortrait) {
        console.log('Mobile device in portrait mode, using full screen height');
        // No need for special adjustments since we're now using 100vh in CSS
    } else if (isMobile && viewportHeight < 500) {
        console.log('Mobile device in landscape with limited height detected');
        // Landscape mode with limited height - handled by orientation warning
    }
    
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
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset the transform
        ctx.scale(devicePixelRatio, devicePixelRatio);
    }
    
    console.log(`Canvas resized: ${WIDTH}x${HEIGHT}, pixel ratio: ${devicePixelRatio}, isPortrait: ${isPortrait}`);
    
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
 * Draw a background image centered on screen with exact dimensions
 * @param {HTMLImageElement} image - Image to draw
 * @param {number} width - Width to draw (or original image width if not specified)
 * @param {number} height - Height to draw (or original image height if not specified)
 */
export function showCenteredBackground(image, width, height) {
    if (!ctx) return;
    
    try {
        // Check if image is valid
        if (image && image.complete && image.naturalWidth !== 0) {
            // Use image's natural dimensions if width/height not specified
            const imgWidth = width || image.naturalWidth;
            const imgHeight = height || image.naturalHeight;
            
            // Calculate centered position
            const x = Math.floor((WIDTH - imgWidth) / 2);
            const y = Math.floor((HEIGHT - imgHeight) / 2);
            
            // Draw the image centered on screen
            ctx.drawImage(image, x, y, imgWidth, imgHeight);
        } else {
            // Fallback if image isn't loaded
            ctx.fillStyle = '#333';
            const w = width || WIDTH;
            const h = height || HEIGHT;
            const x = Math.floor((WIDTH - w) / 2);
            const y = Math.floor((HEIGHT - h) / 2);
            ctx.fillRect(x, y, w, h);
        }
    } catch (e) {
        console.error("Error drawing centered background image:", e);
        // Draw fallback
        ctx.fillStyle = '#333';
        const w = width || WIDTH;
        const h = height || HEIGHT;
        const x = Math.floor((WIDTH - w) / 2);
        const y = Math.floor((HEIGHT - h) / 2);
        ctx.fillRect(x, y, w, h);
    }
}

/**
 * Draw a background image stretched to cover the entire screen
 * @param {HTMLImageElement} image - Image to draw
 */
export function showBackgroundCover(image) {
    if (!ctx) return;
    
    try {
        // Check if image is valid
        if (image && image.complete && image.naturalWidth !== 0) {
            // Calculate scaling to cover entire screen while maintaining aspect ratio
            const imageRatio = image.naturalWidth / image.naturalHeight;
            const screenRatio = WIDTH / HEIGHT;
            
            let drawWidth, drawHeight, x, y;
            
            if (screenRatio > imageRatio) {
                // Screen is wider than image - fill width and overflow height
                drawWidth = WIDTH;
                drawHeight = WIDTH / imageRatio;
                x = 0;
                y = (HEIGHT - drawHeight) / 2;
            } else {
                // Screen is taller than image - fill height and overflow width
                drawWidth = HEIGHT * imageRatio;
                drawHeight = HEIGHT;
                x = (WIDTH - drawWidth) / 2;
                y = 0;
            }
            
            // For portrait mode on mobile, always fill the whole screen
            if (HEIGHT > WIDTH && navigator.userAgent.match(/Android|iPhone|iPad|iPod/i)) {
                // In portrait mode on mobile, prioritize filling the screen completely
                drawWidth = WIDTH;
                drawHeight = HEIGHT;
                x = 0;
                y = 0;
            }
            
            // Draw the image to cover the entire screen
            ctx.drawImage(image, x, y, drawWidth, drawHeight);
        } else {
            // Fallback if image isn't loaded
            ctx.fillStyle = '#333';
            ctx.fillRect(0, 0, WIDTH, HEIGHT);
        }
    } catch (e) {
        console.error("Error drawing background cover image:", e);
        // Draw fallback
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
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