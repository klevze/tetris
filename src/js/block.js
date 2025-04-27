import { shapes, TETROMINOES } from './data_structures.js';

// Export the Block class and create wrapper functions for backward compatibility
export { Block, currentBlock };

// Variables that will be initialized by the game module
let grid_width, grid_height, grid_pos_x, grid_pos_y, block_width;
let gridData = {}; // Renamed from "mreza" to "gridData" for consistency
let ctx, lego;
let next_block, hold_block = -1;
let game_state, score = 0;
let frame = 0, change_block = false, change_block_frame = 0;
let level = 1; // Default level

// Create a global instance of Block for backward compatibility
let currentBlock = null;

// Wrapper functions for block actions that use currentBlock internally
export function rotateBlock() {
  if (currentBlock) return currentBlock.rotateBlock();
  return false;
}

export function moveBlockDirection(direction) {
  if (currentBlock) return currentBlock.moveBlockDirection(direction);
  return false;
}

// Backwards compatibility wrapper functions
export function showBlock() {
  if (currentBlock) currentBlock.showBlock();
}

export function drawFallingBlock(color_block) {
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
        const x = Math.floor(grid_pos_x + this.x * block_width);
        const y = Math.floor(grid_pos_y + this.y * block_width);
        
        let xx = x;
        let yy = y;
        
        for (let i = 0; i < this.shape.length; i++) {
            if (i % 4 == 0 && i > 0) {
                yy += block_width; // Use exact block width
                xx = x;
            }
            if (this.shape[i] == 1) {
                drawBlock(xx, yy, this.type);
            }
            xx += block_width; // Use exact block width
        }
    }

    drawFallingBlock(color_block) {
        // Find landing position with optimized drop calculation
        let landingY = this.y;
        while (Block.isValidPosition(this.x, landingY + 1, this.shape)) {
            landingY++;
        }
        
        // Calculate position based on grid coordinates - ensure perfect alignment
        const x_pos = Math.floor(grid_pos_x + this.x * block_width);
        const y_pos = Math.floor(grid_pos_y + landingY * block_width);
        
        let xx = x_pos;
        let yy = y_pos;
        
        // Draw ghost blocks
        for (let i = 0; i < this.shape.length; i++) {
            if (i % 4 == 0 && i > 0) {
                yy += block_width; // Use exact block width
                xx = x_pos;
            }
            
            if (this.shape[i] == 1) {
                const w = block_width - 2; // block_width - 2px buffer
                
                ctx.globalAlpha = 0.15;
                ctx.beginPath();
                ctx.rect(Math.floor(xx+1), Math.floor(yy+1), w, w);
                ctx.fillStyle = '#999';
                ctx.fill();
                ctx.lineWidth = 1;
                ctx.strokeStyle = '#555';
                ctx.stroke();
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
    // Move the next block 50px to the right by adding 50 to the x position
    let xx = Math.floor(x + 50);
    let yy = Math.floor(y);
    
    const next_shape = shapes[0][next_block];
    
    for (let i = 0; i < next_shape.length; i++) {
        if (i % 4 == 0 && i > 0) {
            yy += block_width; // Use exact block width
            xx = Math.floor(x + 50); // Also update this line with +50
        }
        if (next_shape[i] == 1) {
            drawBlock(xx, yy, next_block);
        }
        xx += block_width; // Use exact block width
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
    // For 30x30px blocks, using exact pixel dimensions
    // Each block is exactly 30px wide in the sprite sheet
    const sx = type * 30;
    
    // Use a small buffer to avoid color bleeding between blocks,
    // but ensure blocks still align perfectly with the grid
    const bufferX = 1;
    const bufferY = 1;
    const bufferWidth = 2;
    const bufferHeight = 2;
    
    // Calculate exact positioning to align with grid
    const drawX = Math.floor(x); // Ensure whole pixel alignment
    const drawY = Math.floor(y); // Ensure whole pixel alignment
    
    // Draw the block with exact 30x30px dimensions
    ctx.drawImage(
        lego, 
        sx + bufferX, 
        bufferY, 
        30 - bufferWidth, 
        30 - bufferHeight, 
        drawX, 
        drawY, 
        block_width, // Use block_width instead of hardcoded 30
        block_width  // Use block_width instead of hardcoded 30
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
    
    // If the currentBlock doesn't exist, create it
    if (!currentBlock) {
        currentBlock = new Block(
            Math.floor(grid_width / 2) - 1,
            0,
            nextType,
            0
        );
    } else {
        // Update existing block
        currentBlock.type = nextType;
        currentBlock.rotate = 0;
        currentBlock.x = Math.floor(grid_width / 2) - 1;
        currentBlock.y = 0;
        currentBlock.shape = shapes[0][nextType];
    }
    
    // Check if new block can be placed - if not, game over
    if (!Block.isValidPosition(currentBlock.x, currentBlock.y, currentBlock.shape)) {
        game_state = "game_over";
        return false;
    }
    return true;
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
    frame++;
    // Speed increases with level
    const num_frames = Math.max(1, 45 - (currentLevel * 4));
    
    if (frame > num_frames) {
        frame = 0;
        
        if (change_block) {
            // Try to move down one more time
            if (Block.isValidPosition(currentBlock.x, currentBlock.y + 1, currentBlock.shape)) {
                currentBlock.y++;
            } else {
                // Block landed - store it and create a new one
                currentBlock.storeBlock();
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
    grid_pos_x = params.grid_pos_x;
    grid_pos_y = params.grid_pos_y;
    block_width = params.block_width;
    
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
    currentBlock = new Block(
        Math.floor(grid_width / 2) - 1,
        0,
        getRandomTetrominoType(),
        0
    );
    hold_block = -1;
    frame = 0;
    change_block = false;
    
    // Initialize game state
    game_state = "playing";
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