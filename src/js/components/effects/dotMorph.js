/**
 * Dot Morphing Effect Module
 * Creates shapes made of dots that morph between different predefined patterns
 * Adds visual interest to game backgrounds and transitions
 */
import { rect, circle, WIDTH, HEIGHT, ctx } from '../../../utils/functions.js';

// Configuration constants
const DOT_COUNT = 200;                   // Number of dots in the pattern
const DOT_SIZE = 2;                      // Base size of each dot
const DOT_SIZE_VARIANCE = 1;             // Random variance in dot size
const MORPH_DURATION = 120;              // Frames it takes to complete one morph (2 seconds at 60fps)
const COLOR_TRANSITION_SPEED = 0.02;     // Speed of color transition
const HOVER_DURATION = 60;               // Frames to hover at the target shape

// Colors for the dots (array of arrays with r,g,b values)
const DOT_COLORS = [
    [255, 255, 255],   // white
    [255, 215, 0],     // gold
    [255, 0, 0],       // red
    [0, 255, 0],       // green
    [0, 0, 255],       // blue
    [255, 0, 255]      // magenta
];

// Available shapes that dots can form
const SHAPES = {
    CIRCLE: 'circle',
    SQUARE: 'square',
    TRIANGLE: 'triangle',
    TETROMINO_I: 'tetromino_i',
    TETROMINO_T: 'tetromino_t',
    TETROMINO_L: 'tetromino_l',
    TETROMINO_Z: 'tetromino_z',
    STAR: 'star',
    SPIRAL: 'spiral',
    GRID: 'grid',
    WAVE: 'wave',
    RANDOM: 'random'
};

// Array to hold all dot objects
let dots = [];

// Animation state variables
let currentShape = SHAPES.RANDOM;
let targetShape = SHAPES.CIRCLE;
let morphProgress = 0;
let colorProgress = 0;
let currentColorIndex = 0;
let targetColorIndex = 1;
let hoverTimer = 0;
let morphing = false;

// Canvas dimension values
let centerX = 0;
let centerY = 0;
let minDimension = 0;
let maxRadius = 0;

/**
 * Dot object representing a single dot in the effect
 */
class Dot {
    constructor() {
        this.currentX = 0;      // Current X position
        this.currentY = 0;      // Current Y position
        this.targetX = 0;       // Target X position for morphing
        this.targetY = 0;       // Target Y position for morphing
        this.startX = 0;        // Starting X position for morphing
        this.startY = 0;        // Starting Y position for morphing
        this.size = DOT_SIZE;   // Size of the dot
        this.color = [255, 255, 255]; // Current RGB color
        this.alpha = 0.8;       // Transparency
        this.speed = 1;         // Unique movement speed multiplier
    }
}

/**
 * Generate coordinates for a specific shape
 * @param {string} shape - The shape to generate
 * @param {number} index - Index of the dot (0 to DOT_COUNT-1)
 * @param {number} radius - Radius to use for the shape
 * @returns {object} - {x, y} coordinates
 */
function getShapeCoordinates(shape, index, radius) {
    const normalizedIndex = index / DOT_COUNT;
    const angle = normalizedIndex * Math.PI * 2;
    
    switch(shape) {
        case SHAPES.CIRCLE:
            return {
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius
            };
            
        case SHAPES.SQUARE:
            // Distribute dots evenly around a square
            const sideIndex = Math.floor(normalizedIndex * 4); // 0-3 for four sides
            const sidePos = (normalizedIndex * 4) % 1; // Position on the current side
            
            switch(sideIndex) {
                case 0: // Top side
                    return {
                        x: centerX - radius + sidePos * radius * 2,
                        y: centerY - radius
                    };
                case 1: // Right side
                    return {
                        x: centerX + radius,
                        y: centerY - radius + sidePos * radius * 2
                    };
                case 2: // Bottom side
                    return {
                        x: centerX + radius - sidePos * radius * 2,
                        y: centerY + radius
                    };
                case 3: // Left side
                    return {
                        x: centerX - radius,
                        y: centerY + radius - sidePos * radius * 2
                    };
            }
            break;
            
        case SHAPES.TRIANGLE:
            // Create an equilateral triangle
            const triangleAngle = (normalizedIndex * 3) % 3;
            const trianglePos = Math.floor(triangleAngle);
            
            switch(trianglePos) {
                case 0:
                    return {
                        x: centerX,
                        y: centerY - radius
                    };
                case 1:
                    return {
                        x: centerX + radius * Math.cos(Math.PI/6),
                        y: centerY + radius * Math.sin(Math.PI/6)
                    };
                case 2:
                    return {
                        x: centerX - radius * Math.cos(Math.PI/6),
                        y: centerY + radius * Math.sin(Math.PI/6)
                    };
            }
            break;
            
        case SHAPES.TETROMINO_I:
            // I-shaped tetromino (vertical line of 4 blocks)
            const iBlock = Math.floor(normalizedIndex * 4);
            return {
                x: centerX,
                y: centerY - radius + iBlock * (radius / 2)
            };
            
        case SHAPES.TETROMINO_T:
            // T-shaped tetromino
            const tPosition = Math.floor(normalizedIndex * 5);
            switch(tPosition) {
                case 0: // Top of T
                    return {
                        x: centerX,
                        y: centerY - radius / 2
                    };
                case 1: // Left of T
                    return {
                        x: centerX - radius / 2,
                        y: centerY
                    };
                case 2: // Center of T
                    return {
                        x: centerX,
                        y: centerY
                    };
                case 3: // Right of T
                    return {
                        x: centerX + radius / 2,
                        y: centerY
                    };
                case 4: // Bottom of T
                    return {
                        x: centerX,
                        y: centerY + radius / 2
                    };
            }
            break;
            
        case SHAPES.TETROMINO_L:
            // L-shaped tetromino
            const lPosition = Math.floor(normalizedIndex * 4);
            switch(lPosition) {
                case 0:
                    return {
                        x: centerX - radius / 3,
                        y: centerY - radius / 3
                    };
                case 1:
                    return {
                        x: centerX - radius / 3,
                        y: centerY
                    };
                case 2:
                    return {
                        x: centerX - radius / 3,
                        y: centerY + radius / 3
                    };
                case 3:
                    return {
                        x: centerX,
                        y: centerY + radius / 3
                    };
            }
            break;
            
        case SHAPES.TETROMINO_Z:
            // Z-shaped tetromino
            const zPosition = Math.floor(normalizedIndex * 4);
            switch(zPosition) {
                case 0:
                    return {
                        x: centerX - radius / 3,
                        y: centerY - radius / 3
                    };
                case 1:
                    return {
                        x: centerX,
                        y: centerY - radius / 3
                    };
                case 2:
                    return {
                        x: centerX,
                        y: centerY
                    };
                case 3:
                    return {
                        x: centerX + radius / 3,
                        y: centerY
                    };
            }
            break;
            
        case SHAPES.STAR:
            // Create a five-pointed star
            const starPoints = 5;
            const starAngle = angle + Math.PI/2; // Rotate to point up
            const innerRadius = radius * 0.4;
            const isOuter = index % 2 === 0;
            
            return {
                x: centerX + (isOuter ? radius : innerRadius) * Math.cos(starAngle),
                y: centerY + (isOuter ? radius : innerRadius) * Math.sin(starAngle)
            };
            
        case SHAPES.SPIRAL:
            // Create a spiral pattern
            const spiralRadius = (normalizedIndex * radius);
            const spiralAngle = normalizedIndex * Math.PI * 10;
            
            return {
                x: centerX + spiralRadius * Math.cos(spiralAngle),
                y: centerY + spiralRadius * Math.sin(spiralAngle)
            };
            
        case SHAPES.GRID:
            // Create a grid pattern
            const gridSize = Math.ceil(Math.sqrt(DOT_COUNT));
            const gridX = index % gridSize;
            const gridY = Math.floor(index / gridSize);
            const gridSpacing = (radius * 2) / gridSize;
            
            return {
                x: centerX - radius + gridX * gridSpacing,
                y: centerY - radius + gridY * gridSpacing
            };
            
        case SHAPES.WAVE:
            // Create a wave pattern
            const waveX = normalizedIndex * radius * 2 - radius;
            const waveFrequency = 3; // Number of waves
            const waveHeight = radius * 0.7;
            
            return {
                x: centerX + waveX,
                y: centerY + Math.sin(normalizedIndex * Math.PI * 2 * waveFrequency) * waveHeight
            };
            
        case SHAPES.RANDOM:
        default:
            // Random position within the radius
            const randAngle = Math.random() * Math.PI * 2;
            const randRadius = Math.random() * radius;
            
            return {
                x: centerX + Math.cos(randAngle) * randRadius,
                y: centerY + Math.sin(randAngle) * randRadius
            };
    }
    
    // Default fallback if something goes wrong
    return {
        x: centerX,
        y: centerY
    };
}

/**
 * Initialize all dots with random positions
 */
function initDots() {
    dots = [];
    
    for (let i = 0; i < DOT_COUNT; i++) {
        const dot = new Dot();
        
        // Assign random initial positions
        const pos = getShapeCoordinates(SHAPES.RANDOM, i, maxRadius);
        dot.currentX = dot.startX = dot.targetX = pos.x;
        dot.currentY = dot.startY = dot.targetY = pos.y;
        
        // Assign random size variation
        dot.size = DOT_SIZE + Math.random() * DOT_SIZE_VARIANCE;
        
        // Assign random speed modifier
        dot.speed = 0.5 + Math.random() * 0.5;
        
        // Assign initial color
        dot.color = [...DOT_COLORS[currentColorIndex]];
        
        dots.push(dot);
    }
}

/**
 * Begin morphing to a new shape
 * @param {string} shape - Shape to morph to (use SHAPES constants)
 * @param {number} colorIdx - Optional color index to transition to
 */
export function morphToShape(shape, colorIdx = -1) {
    // Don't change if already morphing to this shape
    if (targetShape === shape && morphing) return;
    
    // Set the target shape
    targetShape = shape;
    
    // Set new target color if specified, otherwise choose random
    if (colorIdx >= 0 && colorIdx < DOT_COLORS.length) {
        targetColorIndex = colorIdx;
    } else {
        // Pick a random different color
        let newColorIndex;
        do {
            newColorIndex = Math.floor(Math.random() * DOT_COLORS.length);
        } while (newColorIndex === currentColorIndex);
        targetColorIndex = newColorIndex;
    }
    
    // Reset morph progress
    morphProgress = 0;
    colorProgress = 0;
    morphing = true;
    
    // Update the start positions to current positions
    for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];
        dot.startX = dot.currentX;
        dot.startY = dot.currentY;
        
        // Calculate new target positions
        const pos = getShapeCoordinates(targetShape, i, maxRadius);
        dot.targetX = pos.x;
        dot.targetY = pos.y;
    }
}

/**
 * Update the dots for animation
 */
function updateDots() {
    if (morphing) {
        // Update morph progress
        morphProgress += (1 / MORPH_DURATION) * 1.0;
        if (morphProgress >= 1) {
            morphProgress = 1;
            hoverTimer = HOVER_DURATION;
            morphing = false;
            
            // Update current state
            currentShape = targetShape;
            currentColorIndex = targetColorIndex;
        }
        
        // Update color transition
        colorProgress += COLOR_TRANSITION_SPEED;
        if (colorProgress > 1) {
            colorProgress = 1;
        }
    } else {
        // Hovering at the target shape
        hoverTimer--;
        
        if (hoverTimer <= 0) {
            // Choose a new random shape to morph to
            const shapes = Object.values(SHAPES);
            let newShape;
            do {
                newShape = shapes[Math.floor(Math.random() * shapes.length)];
            } while (newShape === currentShape);
            
            morphToShape(newShape);
        }
    }
    
    // Update each dot's position and color
    for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];
        
        // Calculate position based on morph progress using easing function
        const easeProgress = easeInOutCubic(morphProgress);
        dot.currentX = dot.startX + (dot.targetX - dot.startX) * easeProgress * dot.speed;
        dot.currentY = dot.startY + (dot.targetY - dot.startY) * easeProgress * dot.speed;
        
        // Interpolate color based on color progress
        for (let c = 0; c < 3; c++) {
            dot.color[c] = Math.round(
                DOT_COLORS[currentColorIndex][c] + 
                (DOT_COLORS[targetColorIndex][c] - DOT_COLORS[currentColorIndex][c]) * 
                colorProgress
            );
        }
    }
}

/**
 * Draw all the dots
 */
function drawDots() {
    for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];
        
        // Set color with alpha
        ctx.fillStyle = `rgba(${dot.color[0]}, ${dot.color[1]}, ${dot.color[2]}, ${dot.alpha})`;
        
        // Draw the dot
        circle(dot.currentX, dot.currentY, dot.size);
    }
}

/**
 * Cubic easing function for smooth transitions
 * @param {number} t - Progress value between 0 and 1
 * @returns {number} - Eased value between 0 and 1
 */
function easeInOutCubic(t) {
    return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Initialize the dot morph effect
 * @param {number} canvasWidth - Width of the canvas
 * @param {number} canvasHeight - Height of the canvas
 */
export function initDotMorph(canvasWidth, canvasHeight) {
    // Store dimensions
    centerX = canvasWidth / 2;
    centerY = canvasHeight / 2;
    minDimension = Math.min(canvasWidth, canvasHeight);
    maxRadius = minDimension * 0.4; // Use 40% of the smaller dimension
    
    // Initialize the dots
    initDots();
    
    // Start with a random shape
    const shapes = Object.values(SHAPES);
    const initialShape = shapes[Math.floor(Math.random() * shapes.length)];
    currentShape = initialShape;
    
    // Immediately morph to a different shape
    let nextShape;
    do {
        nextShape = shapes[Math.floor(Math.random() * shapes.length)];
    } while (nextShape === currentShape);
    
    morphToShape(nextShape);
}

/**
 * Main draw function to be called in the animation loop
 */
export function drawDotMorph() {
    // Skip if context is not available
    if (!ctx) return;
    
    try {
        // Update dot positions and colors
        updateDots();
        
        // Draw all dots
        drawDots();
    } catch (error) {
        console.error('Error in drawDotMorph:', error);
    }
}

/**
 * Resize handler when canvas dimensions change
 * @param {number} canvasWidth - New width of the canvas
 * @param {number} canvasHeight - New height of the canvas
 */
export function resizeDotMorph(canvasWidth, canvasHeight) {
    // Update dimensions
    centerX = canvasWidth / 2;
    centerY = canvasHeight / 2;
    minDimension = Math.min(canvasWidth, canvasHeight);
    maxRadius = minDimension * 0.4;
    
    // Recalculate target positions
    for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];
        const pos = getShapeCoordinates(targetShape, i, maxRadius);
        dot.targetX = pos.x;
        dot.targetY = pos.y;
    }
}