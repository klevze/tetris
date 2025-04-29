import { shapes, TETROMINOES } from '../../utils/dataStructures.js';
import { isAnimationInProgress, gridToScreenCoordinates, getGridState } from './grid.js';
import { BLOCK, GAME } from '../../config/config.js'; // Import block and game configuration
import { EVENTS, eventDispatcher } from '../../utils/functions.js';

// Export the Block class and create wrapper functions for backward compatibility
export { Block, currentBlock };

// Variables that will be initialized by the game module
let grid_width, grid_height, block_width;
let origin = { x: 0, y: 0 }; // Grid origin point (top-left corner)
let gridData = {}; // Renamed from "mreza" to "gridData" for consistency
let ctx, lego;
let next_block, hold_block = -1;
let game_state, score = 0;
let frame = 0, change_block = false, change_block_frame = 0;
let level = 0; // Default level
let nextBlockOpacity = 1; // Initial opacity for next block display

// Track how many of each tetromino type has been received
export let blockCounts = {
    0: 0, // I-piece
    1: 0, // J-piece
    2: 0, // L-piece
    3: 0, // O-piece
    4: 0, // S-piece
    5: 0, // Z-piece
    6: 0  // T-piece
};

// Add timestamp tracking for block movement
let lastMoveTime = 0; // Last time the block moved down automatically

// Animation state for the block scrolling down from the "Next" position
let isBlockAnimating = false;
let blockAnimation = {
  startX: 0,
  startY: 0,
  targetX: 0,
  targetY: 0,
  progress: 0,
  duration: 30, // Animation duration in frames
  easing: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2 // Ease in-out quad
};

// Create a global instance of Block for backward compatibility
let currentBlock = null;

// Wrapper functions for block actions that use currentBlock internally
export function rotateBlock() {
  // Prevent rotation during block animation
  if (isBlockAnimating) return false;
  if (currentBlock) return currentBlock.rotateBlock();
  return false;
}

export function moveBlockDirection(direction) {
  // Prevent movement during block animation
  if (isBlockAnimating) return false;
  if (currentBlock) return currentBlock.moveBlockDirection(direction);
  return false;
}

// Backwards compatibility wrapper functions
export function showBlock() {
  if (currentBlock) currentBlock.showBlock();
}

export function drawFallingBlock(color_block) {
  // Don't show ghost block during animation
  if (isBlockAnimating) return;
  if (currentBlock) currentBlock.drawFallingBlock(color_block);
}

export function storeBlock() {
  if (currentBlock) currentBlock.storeBlock();
}

/**
 * Block class - represents the currently active falling tetromino
 */
class Block {
    // Cache for rotated shapes to avoid recalculating
    static #shapeCache = new Map();
    
    constructor(x = 0, y = 0, type = 0, rotate = 0) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.rotate = rotate;
        this.shape = this.#getShape(type, rotate);
    }

    // Get shape with caching to improve performance
    #getShape(type, rotate) {
        const key = `${type}_${rotate}`;
        if (!Block.#shapeCache.has(key)) {
            Block.#shapeCache.set(key, shapes[rotate][type]);
        }
        return Block.#shapeCache.get(key);
    }

    rotateBlock() {
        const originalRotate = this.rotate;
        this.rotate = (this.rotate + 1) % 4;
        const newShape = this.#getShape(this.type, this.rotate);
        
        // Check if rotation is valid at current position
        if (!Block.isValidPosition(this.x, this.y, newShape)) {
            // Try wall kicks in order of most likely to succeed
            const kicks = [
                {dx: 1, dy: 0},  // right
                {dx: -1, dy: 0}, // left
                {dx: 0, dy: -1}, // up
                {dx: 2, dy: 0},  // 2 right (for I piece)
                {dx: -2, dy: 0}, // 2 left (for I piece)
            ];
            
            let rotationSuccessful = false;
            for (const kick of kicks) {
                if (Block.isValidPosition(this.x + kick.dx, this.y + kick.dy, newShape)) {
                    this.x += kick.dx;
                    this.y += kick.dy;
                    rotationSuccessful = true;
                    break;
                }
            }
            
            if (!rotationSuccessful) {
                this.rotate = originalRotate;
                this.shape = this.#getShape(this.type, this.rotate);
                return false;
            }
        }
        
        this.shape = newShape;
        return true;
    }

    showBlock() {
        // Calculate position of block in grid coordinates
        // Remove the incorrect vertical offset
        const screenPos = gridToScreenCoordinates(this.x, this.y);
        
        let xx = screenPos.x;
        let yy = screenPos.y;
        
        // Add a slight glow effect to make the active piece more visible
        ctx.save();
        
        for (let i = 0; i < this.shape.length; i++) {
            if (i % 4 == 0 && i > 0) {
                yy += block_width; // Use exact block width
                xx = screenPos.x;
            }
            if (this.shape[i] == 1) {
                // Draw with slight glow
                ctx.shadowColor = 'rgba(255, 255, 255, 0.7)';
                ctx.shadowBlur = 5;
                drawBlock(xx, yy, this.type);
            }
            xx += block_width; // Use exact block width
        }
        
        ctx.restore();
    }

    drawFallingBlock(color_block) {
        // Find landing position with optimized drop calculation
        let landingY = this.y;
        while (Block.isValidPosition(this.x, landingY + 1, this.shape)) {
            landingY++;
        }
        
        // Remove the incorrect vertical offset
        const screenPos = gridToScreenCoordinates(this.x, landingY);
        
        let xx = screenPos.x;
        let yy = screenPos.y;
        
        // Draw ghost blocks at landing position
        for (let i = 0; i < this.shape.length; i++) {
            if (i % 4 == 0 && i > 0) {
                yy += block_width; // Use exact block width
                xx = screenPos.x;
            }
            
            if (this.shape[i] == 1) {
                // Use consistent semi-transparent styling for ghost blocks
                ctx.globalAlpha = 0.3;
                
                // Draw a filled rectangle without stroke to avoid the black outline
                ctx.fillStyle = '#333355  ';
                ctx.fillRect(
                    Math.floor(xx + Math.floor(block_width * 0.03)),
                    Math.floor(yy + Math.floor(block_width * 0.03)),
                    block_width * 0.94,
                    block_width * 0.94
                );
                
                // Reset opacity
                ctx.globalAlpha = 1;
            }
            xx += block_width; // Use exact block width
        }
    }
    
    storeBlock() {
        const bx = this.x;
        const by = this.y;
        let x = bx;
        let y = by;
        
        // No need for vertical offset here since it's only applied during rendering
        // The grid data should store the logical position, not the display position
        
        for (let i = 0; i < this.shape.length; i++) {
            if (i % 4 == 0 && i > 0) {
                y++;
                x = bx;
            }
            if (this.shape[i] > 0) {
                // Lazy initialization of gridData structure
                if (!gridData[x]) {
                    gridData[x] = {};
                }
                
                // Store block type + 1 (to avoid 0 which means empty)
                gridData[x][y] = this.type + 1;
            }
            x++;
        }
    }
    
    moveBlockDirection(direction) {
        if (direction === 'left' && Block.isValidPosition(this.x - 1, this.y, this.shape)) {
            this.x--;
            return true;
        } else if (direction === 'right' && Block.isValidPosition(this.x + 1, this.y, this.shape)) {
            this.x++;
            return true;
        } else if (direction === 'down' && Block.isValidPosition(this.x, this.y + 1, this.shape)) {
            this.y++;
            return true;
        } else if (direction === 'drop') {
            // Hard drop - move block down until it can't move anymore
            while (Block.isValidPosition(this.x, this.y + 1, this.shape)) {
                this.y++;
            }
            this.storeBlock();
            return newBlock();
        }
        return false;
    }
    
    // Optimize collision detection with early returns
    static isValidPosition(x, y, shape) {
        let blockX, blockY;
        
        for (let i = 0; i < shape.length; i++) {
            // Only check cells that are actually filled
            if (shape[i] > 0) {
                // Calculate position without nested loop
                blockY = y + Math.floor(i / 4);
                blockX = x + (i % 4);
                
                // Check boundaries first (most common rejection)
                if (blockX < 0 || blockX >= grid_width || blockY >= grid_height) {
                    return false;
                }
                
                // Only check collision if we're not above the grid
                if (blockY >= 0 && gridData[blockX] && gridData[blockX][blockY] > 0) {
                    return false;
                }
            }
        }
        return true;
    }
}

/**
 * Show next tetromino in the preview area
 */
export function showNextBlock(x, y) {
    // Note: The border drawing has been moved to the drawCustomGrid function in grid.js
    // This function now only handles drawing the actual tetromino blocks
    
    const next_shape = shapes[0][next_block];
    
    // During animation, show the next block with fading opacity
    if (isBlockAnimating) {
        let xx = Math.floor(x);
        let yy = Math.floor(y);
        
        ctx.save();
        ctx.globalAlpha = nextBlockOpacity;
        
        for (let i = 0; i < next_shape.length; i++) {
            if (i % 4 == 0 && i > 0) {
                yy += block_width;
                xx = Math.floor(x);
            }
            if (next_shape[i] == 1) {
                drawBlock(xx, yy, next_block);
            }
            xx += block_width;
        }
        
        ctx.restore();
        return;
    }
    
    // Use the same positioning approach as during animation for consistency
    let xx = Math.floor(x);
    let yy = Math.floor(y);
    
    for (let i = 0; i < next_shape.length; i++) {
        if (i % 4 == 0 && i > 0) {
            yy += block_width;
            xx = Math.floor(x);
        }
        if (next_shape[i] == 1) {
            drawBlock(xx, yy, next_block);
        }
        xx += block_width;
    }
}

/**
 * Show held tetromino in the hold area
 */
export function showHoldBlock(x, y) {
    if (hold_block < 0) {
        return;
    }
    
    let xx = Math.floor(x);
    let yy = Math.floor(y);
    
    const block_shape = shapes[0][hold_block];
    
    for (let i = 0; i < block_shape.length; i++) {
        if (i % 4 == 0 && i > 0) {
            yy += block_width; // Use exact block width
            xx = Math.floor(x);
        }
        if (block_shape[i] == 1) {
            drawBlock(xx, yy, hold_block);
        }
        xx += block_width; // Use exact block width
    }
}

/**
 * Hold the current block or swap with already held block
 */
export function HoldBlock() {
    if (hold_block < 0) {
        hold_block = currentBlock.type;
        
        currentBlock.type = next_block;
        next_block = Math.floor(Math.random() * Object.keys(TETROMINOES).length);
        currentBlock.shape = shapes[0][currentBlock.type];
    } else {
        const temp_hold_block = currentBlock.type;
        currentBlock.type = hold_block;
        currentBlock.shape = shapes[0][currentBlock.type];
        hold_block = temp_hold_block;
    }
}

/**
 * Draw a single tetromino block at the given position
 */
export function drawBlock(x, y, type) {
    // Use the sprite size from the configuration
    const spriteSize = BLOCK.SPRITE_SIZE;
    const sx = type * spriteSize;
    
    // Use a small buffer to avoid color bleeding between blocks,
    // but ensure blocks still align perfectly with the grid
    const bufferX = 2; // Slightly increased for larger blocks
    const bufferY = 2;
    const bufferWidth = 4; // Slightly increased for larger blocks
    const bufferHeight = 4;
    
    // Calculate exact positioning to align with grid
    const drawX = Math.floor(x); // Ensure whole pixel alignment
    const drawY = Math.floor(y); // Ensure whole pixel alignment
    
    // Draw the block with dimensions from config
    ctx.drawImage(
        lego, 
        sx + bufferX, 
        bufferY, 
        spriteSize - bufferWidth, 
        spriteSize - bufferHeight, 
        drawX, 
        drawY, 
        block_width, // Use block_width for the rendered size
        block_width  // Use block_width for the rendered size
    );
}

/**
 * Create a new tetromino block
 * @returns {boolean} false if can't place new block (game over)
 */
export function newBlock() {
    const nextType = next_block;
    next_block = Math.floor(Math.random() * Object.keys(TETROMINOES).length);
    score += level * 4;
    
    // Increment the count for the received block type
    blockCounts[nextType]++;
    
    // Calculate spawn position based on the shape
    const shape = shapes[0][nextType];
    let startX = 3; // Default position for most tetrominos
    
    // For I-piece (index 0), we need to shift it left
    if (nextType === 0) {
        startX = 3;
    }
    
    // If the currentBlock doesn't exist, create it
    if (!currentBlock) {
        currentBlock = new Block(
            startX,
            0,
            nextType,
            0
        );
    } else {
        // Update existing block with the new type
        currentBlock.type = nextType;
        currentBlock.rotate = 0;
        currentBlock.shape = shapes[0][nextType];
    }
    
    // Check if the final position is valid (game over check)
    if (!Block.isValidPosition(startX, 0, currentBlock.shape)) {
        game_state = "game_over";
        return false;
    }
    
    // Set up animation from above the grid to start position
    blockAnimation.startX = startX;      // Same X as final position
    blockAnimation.startY = -2;          // Start 2 rows above the grid
    blockAnimation.targetX = startX;
    blockAnimation.targetY = 0;          // Move to position 0 (top row) instead of row 1
    blockAnimation.progress = 0;
    
    // Apply an 8px left offset by converting pixels to grid coordinates
    const offsetInGridUnits = 8 / block_width;
    
    // Position the block with the adjusted X coordinate
    currentBlock.x = startX - offsetInGridUnits;
    currentBlock.y = blockAnimation.startY;
    
    // Start the animation
    isBlockAnimating = true;
    
    return true;
}

/**
 * Get the position where the Next block is displayed
 * @returns {Object} The x,y coordinates of the Next block
 */
function getNextBlockPosition() {
    // Get the positions from where the Next block is actually drawn in showNextBlock
    let nextPosX, nextPosY;
    
    // Find where the main UI elements are calculated (this will be in the same place where showNextBlock is called)
    const mainState = getGridState();
    
    // Get the exact position where the next block is drawn - no offset needed anymore
    // since we changed showNextBlock to not use an offset
    nextPosX = mainState.nextBlockX; 
    nextPosY = mainState.nextBlockY;
    
    // If the coordinates aren't available from the grid state, use a fallback calculation
    if (!nextPosX || !nextPosY) {
        const gridOriginX = mainState.origin.x || 0;
        const gridOriginY = mainState.origin.y || 0;
        
        // These calculations are approximations based on the typical layout
        nextPosX = gridOriginX + grid_width * block_width + block_width;
        nextPosY = gridOriginY + block_width * 2;
    }
    
    return { x: nextPosX, y: nextPosY };
}

/**
 * Convert screen coordinates to grid coordinates
 * @param {number} screenX - X position in screen coordinates
 * @param {number} screenY - Y position in screen coordinates
 * @returns {Object} The x,y coordinates in grid coordinates
 */
function screenToGridCoordinates(screenX, screenY) {
    // This is the inverse of gridToScreenCoordinates
    const x = Math.floor((screenX - origin.x) / block_width);
    const y = Math.floor((screenY - origin.y) / block_width);
    
    return { x, y };
}

/** 
 * Legacy function kept for compatibility
 */
export function check2MoveBlock(bx, by, type) {
    return Block.isValidPosition(bx, by, currentBlock.shape);
}

/** 
 * Legacy function kept for compatibility
 */
export function check2MoveBlockRotate(new_shape, bx, by, type) {
    return Block.isValidPosition(bx, by, new_shape);
}

/**
 * Move block down and handle landing
 * @param {number} currentLevel - Current game level
 * @returns {boolean} false if game is over
 */
export function moveBlock(currentLevel) {
    // Don't move blocks if a row clearing animation is in progress
    if (isAnimationInProgress()) {
        // Still render the block where it is, but don't update position
        if (currentBlock) {
            currentBlock.showBlock();
            currentBlock.drawFallingBlock("#333");
        }
        return true;
    }
    
    // Handle the block drop animation from "Next" to starting position
    if (isBlockAnimating) {
        // Update animation progress
        blockAnimation.progress += 1 / blockAnimation.duration;
        
        // Update next block opacity for fade-in effect
        // Start fade-in at halfway through the animation
        if (blockAnimation.progress < 0.5) {
            nextBlockOpacity = 0; // Next block invisible during first half of animation
        } else {
            // Gradually fade in from 0 to 1 during second half of animation
            nextBlockOpacity = (blockAnimation.progress - 0.5) * 2;
        }
        
        if (blockAnimation.progress >= 1) {
            // Animation complete
            blockAnimation.progress = 1;
            isBlockAnimating = false;
            nextBlockOpacity = 1; // Ensure full opacity at the end
            
            // Set block to final position
            currentBlock.x = blockAnimation.targetX;
            currentBlock.y = blockAnimation.targetY;
            
            // Initialize lastMoveTime when animation completes
            lastMoveTime = Date.now();
        } else {
            // Apply easing to get smooth motion
            const t = blockAnimation.easing(blockAnimation.progress);
            
            // For X position, since we're moving straight down, just use the exact startX value
            // This prevents the 1-pixel jump due to rounding errors
            currentBlock.x = blockAnimation.startX;
            // Only interpolate the Y position for vertical movement
            currentBlock.y = Math.round(
                blockAnimation.startY + (blockAnimation.targetY - blockAnimation.startY) * t
            );
        }
        
        // Draw the block at its animated position
        currentBlock.showBlock();
        
        // Only show ghost blocks after animation is halfway complete
        if (blockAnimation.progress > 0.5) {
            currentBlock.drawFallingBlock("#333");
        }
        
        return true;
    }
    
    // Get the drop speed for the current level
    // Cap the level at 19+ for the speed table
    const levelIndex = Math.min(currentLevel, 19);
    const dropSpeed = GAME.LEVEL_SPEEDS[levelIndex];
    
    // Normal gameplay movement - use millisecond-based timing
    const currentTime = Date.now();
    const timeElapsed = currentTime - lastMoveTime;
    
    if (timeElapsed >= dropSpeed) {
        // Reset the timer
        lastMoveTime = currentTime;
        
        if (change_block) {
            // Try to move down one more time
            if (Block.isValidPosition(currentBlock.x, currentBlock.y + 1, currentBlock.shape)) {
                currentBlock.y++;
            } else {
                // Block landed - store it and create a new one
                currentBlock.storeBlock();
                // Reset opacity before new block animation starts
                nextBlockOpacity = 0;
                const result = newBlock();
                change_block = false;
                return result; // false = game over
            }
        }
        
        // Check if block can move down
        if (Block.isValidPosition(currentBlock.x, currentBlock.y + 1, currentBlock.shape)) {
            currentBlock.y++;
        } else {
            // Block can't move down - mark for landing on next frame
            change_block = true;
            change_block_frame = 0;
        }
    }
    
    // Render the block
    currentBlock.showBlock();
    currentBlock.drawFallingBlock("#333");
    return true; // Game continues
}

/**
 * Initialize block handler with necessary parameters
 */
export function setupBlockHandler(context, gridState, blockImg, params) {
    ctx = context;
    gridData = gridState.gridData;
    lego = blockImg;
    grid_width = params.grid_width;
    grid_height = params.grid_height;
    block_width = params.block_width;
    
    // Use origin from gridState instead of separate x and y coordinates
    if (gridState.origin) {
        origin = gridState.origin;
    } else {
        origin = { x: params.grid_pos_x || 0, y: params.grid_pos_y || 0 };
    }
    
    // Ensure gridData is properly initialized
    if (!gridData) {
        console.error('Grid data is not initialized');
        gridData = {};
    }
    
    // Get the level from gridState
    if (gridState.level) {
        level = gridState.level;
    }
    
    // Initialize blocks with improved randomization
    next_block = getRandomTetrominoType();
    
    // Create the initial block at a consistent position (column 3)
    currentBlock = new Block(
        3,  // Start at column 3, which is a better default position
        0,
        getRandomTetrominoType(),
        0
    );
    
    hold_block = -1;
    frame = 0;
    change_block = false;
    
    // Initialize game state
    game_state = "playing";
    
    // Listen for window resize events to update the grid origin
    eventDispatcher.addEventListener(EVENTS.WINDOW_RESIZE, handleResize);
}

/**
 * Handle window resize - update origin from grid state
 * This keeps the falling block's position relative to the grid
 */
function handleResize() {
    // Get updated grid state with new origin position
    const gridState = getGridState();
    
    if (gridState.origin) {
        // Update only the origin position, not the block's grid coordinates
        // This maintains the block's relative position in the grid
        origin = gridState.origin;
    }
}

/**
 * Get a random tetromino type using improved randomization
 * Reduces chance of getting too many of the same piece
 */
let lastPieces = [];
function getRandomTetrominoType() {
    const pieceCount = Object.keys(TETROMINOES).length;
    let type;
    
    // Try to avoid repeating the same piece too often
    do {
        type = Math.floor(Math.random() * pieceCount);
    } while (lastPieces.includes(type) && Math.random() > 0.3);
    
    // Keep track of recent pieces (last 3)
    lastPieces.push(type);
    if (lastPieces.length > 3) {
        lastPieces.shift();
    }
    
    return type;
}

/**
 * Show block statistics panel displaying all tetromino types and their counts
 * @param {number} x - X coordinate for the panel
 * @param {number} y - Y coordinate for the panel
 */
export function showBlocksStatistics(x, y) {
    const panelWidth = block_width * 5; // Reduced panel width
    const panelHeight = block_width * 18; // Adjusted height for smaller blocks
    
    // Draw semi-transparent panel background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.roundRect(x, y, panelWidth, panelHeight, 10);
    ctx.fill();
    
    // Add subtle border to the panel
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.roundRect(x, y, panelWidth, panelHeight, 10);
    ctx.stroke();
    
    // Draw "BLOCKS" title
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#ffcc00'; // Gold color for title
    ctx.fillText("BLOCKS", x + panelWidth / 2, y + 25);
    ctx.restore();
    
    // Define spacing between tetromino displays
    const blockSpacing = Math.floor(panelHeight / 8.5);
    let currentY = y + blockSpacing;
    
    // Calculate total blocks to determine percentages
    let totalBlocks = 0;
    for (let type = 0; type < 7; type++) {
        totalBlocks += blockCounts[type] || 0;
    }
    
    // Create array of block types with their counts for sorting
    const blockTypesWithCounts = [];
    for (let type = 0; type < 7; type++) {
        blockTypesWithCounts.push({
            type: type,
            count: blockCounts[type] || 0,
            percentage: totalBlocks > 0 ? (blockCounts[type] || 0) / totalBlocks : 0
        });
    }
    
    // Sort blocks by count in descending order
    blockTypesWithCounts.sort((a, b) => b.count - a.count);
    
    // Maximum width for percentage bars
    const maxBarWidth = panelWidth * 0.8;
    
    // Make blocks smaller
    const smallBlockWidth = Math.floor(block_width * 0.5); // Reduced block size
    
    // Draw each tetromino type with its count
    for (let i = 0; i < blockTypesWithCounts.length; i++) {
        const blockInfo = blockTypesWithCounts[i];
        const type = blockInfo.type;
        const count = blockInfo.count;
        const percentage = blockInfo.percentage;
        
        // Draw the tetromino - aligned to the left side of the panel
        const blockX = x + 20; // Left-aligned at a fixed margin
        const blockY = currentY;
        
        // Get the shape for this tetromino type
        const tetrominoShape = shapes[0][type];
        
        // Draw the tetromino
        let xx = blockX;
        let yy = blockY;
        
        // Calculate width and height of this shape
        let width = 0, height = 0;
        for (let i = 0; i < tetrominoShape.length; i++) {
            const col = i % 4;
            const row = Math.floor(i / 4);
            if (tetrominoShape[i] === 1) {
                width = Math.max(width, col + 1);
                height = Math.max(height, row + 1);
            }
        }
        
        // Draw the tetromino blocks
        const spriteSize = BLOCK.SPRITE_SIZE;
        
        for (let i = 0; i < tetrominoShape.length; i++) {
            if (i % 4 == 0 && i > 0) {
                yy += smallBlockWidth;
                xx = blockX;
            }
            if (tetrominoShape[i] == 1) {
                const sx = type * spriteSize;
                
                ctx.drawImage(
                    lego, 
                    sx + 2, 
                    2, 
                    spriteSize - 4, 
                    spriteSize - 4, 
                    xx, 
                    yy, 
                    smallBlockWidth, 
                    smallBlockWidth
                );
            }
            xx += smallBlockWidth;
        }
        
        // Calculate total height of the tetromino for proper vertical spacing
        const tetrominoHeight = height * smallBlockWidth;
        
        // Draw the count for this tetromino type
        ctx.save();
        
        // Draw count with outlined text for better visibility - RIGHT ALIGNED
        const countX = x + panelWidth - 20; // Right-aligned with fixed margin
        const countY = blockY + tetrominoHeight/2 + 5; // Aligned with middle of tetromino
        
        // Draw text outline
        ctx.textAlign = 'right'; // Right-aligned text
        ctx.font = 'bold 20px Arial';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeText(`${count}`, countX, countY);
        
        // Draw text
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(`${count}`, countX, countY);
        
        // Draw percentage bar below the tetromino
        const barY = blockY + tetrominoHeight + smallBlockWidth/2;
        const barHeight = smallBlockWidth/3;
        
        // Draw bar background
        ctx.fillStyle = 'rgba(80, 80, 80, 0.5)';
        ctx.fillRect(x + panelWidth/2 - maxBarWidth/2, barY, maxBarWidth, barHeight);
        
        // Draw percentage fill
        const barWidth = percentage * maxBarWidth;
        
        // Choose color based on tetromino type
        const barColors = [
            '#B24DD2', // I - Purple
            '#E14F4F', // J - Red
            '#E78B0F', // L - Orange
            '#B24DD2', // O - Purple
            '#4BA63A', // S - Green
            '#4F8AE7', // Z - Blue
            '#45ABAB'  // T - Teal
        ];
        
        ctx.fillStyle = barColors[type];
        ctx.fillRect(x + panelWidth/2 - maxBarWidth/2, barY, barWidth, barHeight);
        
        // Draw percentage text above the bar
        ctx.fillStyle = '#FFF';
        ctx.font = '11px Arial'; // Smaller font
        ctx.textAlign = 'center';
        
        // Only show percentage if there are blocks
        if (totalBlocks > 0) {
            const percentageText = `${Math.round(percentage * 100)}%`;
            ctx.fillText(percentageText, x + panelWidth/2, barY - 4);
        }
        
        ctx.restore();
        
        // Move to next tetromino position
        currentY += blockSpacing;
    }
}