import { shapes, TETROMINOES } from './data_structures.js';

// Variables that will be initialized by the game module
let grid_width, grid_height, grid_pos_x, grid_pos_y, block_width;
let gridData = {}; // Renamed from "mreza" to "gridData" for consistency
let ctx, lego;
let next_block, hold_block = -1;
let game_state, score = 0;
let frame = 0, change_block = false, change_block_frame = 0;
let level = 1; // Default level

/**
 * Block object - represents the currently active falling tetromino
 */
export const Block = {
    x: 0,
    y: 0,
    type: 0,
    rotate: 0,
    shape: {}
};

/**
 * Rotate the current block
 * Attempts to rotate and checks if new position is valid
 */
export function rotate() {
    // Store original rotation in case new position is invalid
    const originalRotate = Block.rotate;
    
    // Try to rotate
    Block.rotate = (Block.rotate + 1) % 4;
    
    // Get the new shape after rotation
    const newShape = shapes[Block.rotate][Block.type];
    
    // Check if rotation is valid
    if (!isValidPosition(Block.x, Block.y, newShape)) {
        // Wall kick attempts - try to shift block if rotation blocked by wall
        const kicks = [
            {dx: 1, dy: 0},  // try shift right
            {dx: -1, dy: 0}, // try shift left
            {dx: 0, dy: -1}  // try shift up
        ];
        
        // Try each kick position
        let rotationSuccessful = false;
        for (const kick of kicks) {
            if (isValidPosition(Block.x + kick.dx, Block.y + kick.dy, newShape)) {
                Block.x += kick.dx;
                Block.y += kick.dy;
                rotationSuccessful = true;
                break;
            }
        }
        
        // If all kicks fail, restore original rotation
        if (!rotationSuccessful) {
            Block.rotate = originalRotate;
        }
    }
    
    // Update the shape
    Block.shape = shapes[Block.rotate][Block.type];
}

/**
 * Render the current block at its position
 */
export function showBlock() {
    // Calculate position of block in grid coordinates
    const x = Math.floor(grid_pos_x + Block.x * block_width);
    const y = Math.floor(grid_pos_y + Block.y * block_width);
    
    let xx = x;
    let yy = y;
    
    for (let i = 0; i < Block.shape.length; i++) {
        if (i % 4 == 0 && i > 0) {
            yy += block_width; // Use exact block width
            xx = x;
        }
        if (Block.shape[i] == 1) {
            drawBlock(xx, yy, Block.type);
        }
        xx += block_width; // Use exact block width
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
        hold_block = Block.type;
        
        Block.type = next_block;
        next_block = Math.floor(Math.random() * Object.keys(TETROMINOES).length);
        Block.shape = shapes[0][Block.type];
    } else {
        const temp_hold_block = Block.type;
        Block.type = hold_block;
        Block.shape = shapes[0][Block.type];
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
 * Draw a ghost block showing where the piece will land
 */
export function drawFallingBlock(x, y, type, color_block) {
    // Find landing position with optimized drop calculation
    let landingY = y;
    while (isValidPosition(x, landingY + 1, Block.shape)) {
        landingY++;
    }
    
    // Calculate position based on grid coordinates - ensure perfect alignment
    const x_pos = Math.floor(grid_pos_x + Block.x * block_width);
    const y_pos = Math.floor(grid_pos_y + landingY * block_width);
    
    let xx = x_pos;
    let yy = y_pos;
    
    // Draw ghost blocks
    for (let i = 0; i < Block.shape.length; i++) {
        if (i % 4 == 0 && i > 0) {
            yy += block_width; // Use exact block width
            xx = x_pos;
        }
        
        if (Block.shape[i] == 1) {
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

/**
 * Create a new tetromino block
 * @returns {boolean} false if can't place new block (game over)
 */
export function newBlock() {
    Block.type = next_block;
    next_block = Math.floor(Math.random() * Object.keys(TETROMINOES).length);
    score += level * 4;
    
    Block.rotate = 0;
    
    // Precisely center the block in the grid
    // Math.floor ensures consistent positioning
    Block.x = Math.floor(grid_width / 2) - 1;
    Block.y = 0;
    
    Block.shape = shapes[0][Block.type];
    
    // Check if new block can be placed - if not, game over
    if (!isValidPosition(Block.x, Block.y, Block.shape)) {
        game_state = "game_over";
        return false;
    }
    return true;
}

/**
 * Check if the given position is valid for the given block shape
 * @param {number} x - X position to check
 * @param {number} y - Y position to check
 * @param {array} shape - Block shape to check
 * @returns {boolean} true if position is valid
 */
function isValidPosition(x, y, shape) {
    let blockX = x;
    let blockY = y;
    
    for (let i = 0; i < shape.length; i++) {
        if (i % 4 == 0 && i > 0) {
            blockY++;
            blockX = x;
        }
        
        if (shape[i] > 0) {
            // Check boundaries
            if (blockX < 0 || blockX >= grid_width || blockY >= grid_height) {
                return false;
            }
            
            // Check collision with other blocks
            // Only check occupied grid cells
            if (blockY >= 0 && isGridCellOccupied(blockX, blockY)) {
                return false;
            }
        }
        blockX++;
    }
    return true;
}

/**
 * Safely check if a grid cell is occupied
 * @param {number} x - Grid X position
 * @param {number} y - Grid Y position
 * @returns {boolean} true if cell is occupied
 */
function isGridCellOccupied(x, y) {
    return gridData[x] && gridData[x][y] > 0;
}

/** 
 * Legacy function kept for compatibility
 */
export function check2MoveBlock(bx, by, type) {
    return isValidPosition(bx, by, Block.shape);
}

/** 
 * Legacy function kept for compatibility
 */
export function check2MoveBlockRotate(new_shape, bx, by, type) {
    return isValidPosition(bx, by, new_shape);
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
            if (isValidPosition(Block.x, Block.y + 1, Block.shape)) {
                Block.y++;
            } else {
                // Block landed - store it and create a new one
                storeBlock();
                const result = newBlock();
                change_block = false;
                return result; // false = game over
            }
        }
        
        // Check if block can move down
        if (isValidPosition(Block.x, Block.y + 1, Block.shape)) {
            Block.y++;
        } else {
            // Block can't move down - mark for landing on next frame
            change_block = true;
            change_block_frame = 0;
        }
    }
    
    // Render the block
    showBlock();
    drawFallingBlock(Block.x, Block.y, Block.type, "#333");
    return true; // Game continues
}

/**
 * Store the current block in the grid
 */
export function storeBlock() {
    const bx = Block.x;
    const by = Block.y;
    let x = bx;
    let y = by;
    
    for (let i = 0; i < Block.shape.length; i++) {
        if (i % 4 == 0 && i > 0) {
            y++;
            x = bx;
        }
        if (Block.shape[i] > 0) {
            // Lazy initialization of gridData structure
            if (!gridData[x]) {
                gridData[x] = {};
            }
            
            // Store block type + 1 (to avoid 0 which means empty)
            gridData[x][y] = Block.type + 1;
        }
        x++;
    }
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
    Block.type = getRandomTetrominoType();
    Block.shape = shapes[0][Block.type];
    Block.x = Math.floor(grid_width / 2) - 1;
    Block.y = 0;
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

/**
 * Move block in specified direction if possible
 */
export function moveBlockDirection(direction) {
    if (direction === 'left' && isValidPosition(Block.x - 1, Block.y, Block.shape)) {
        Block.x--;
        return true;
    } else if (direction === 'right' && isValidPosition(Block.x + 1, Block.y, Block.shape)) {
        Block.x++;
        return true;
    } else if (direction === 'down' && isValidPosition(Block.x, Block.y + 1, Block.shape)) {
        Block.y++;
        return true;
    } else if (direction === 'drop') {
        // Hard drop - move block down until it can't move anymore
        while (isValidPosition(Block.x, Block.y + 1, Block.shape)) {
            Block.y++;
        }
        storeBlock();
        return newBlock();
    }
    return false;
}