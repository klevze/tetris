import { DrawLine } from './functions.js';

/**
 * GRID MODULE
 * Handles the game grid operations:
 * - Grid initialization and rendering
 * - Row clearing and scoring
 * - Game state management
 */

// Variables that will be initialized by the game module
let grid_width, grid_height, grid_pos_x, grid_pos_y, block_width;
let gridData = {}; // Grid storage - switched to object-based grid for memory efficiency
let ctx, clear_line_audio;
let lines = 0, level = 1, level_goal = 10, score = 0;
let showAddScore = false;
let addScoreValue = 0;
let scoreTextTimer = 0;
let scoreTextPosition = { x: 0, y: 0 };
let drawBlock; // Function reference for drawing blocks
let rowsToBeCleared = []; // Track which rows are marked for clearing

/**
 * Check all rows for completions and mark them for clearing
 * @returns {Object} Game state including score, lines, level and animation state
 */
export function checkRows() {
    let completedRows = 0;
    let addScore = 0;
    
    // Clear the rows-to-clear array
    rowsToBeCleared = [];
    
    // Check each row from bottom to top
    for (let y = grid_height - 1; y >= 0; y--) {
        let filledCells = 0;
        
        // Count filled cells in this row
        for (let x = 0; x < grid_width; x++) {
            // Skip checking cells if gridData[x] doesn't exist
            if (gridData[x] && gridData[x][y] > 0) {
                filledCells++;
            }
        }
        
        // Complete row found
        if (filledCells === grid_width) {
            completedRows++;
            lines++;
            
            // Track this row for clearing
            rowsToBeCleared.push(y);
            
            // Calculate score based on current level and combo
            // More points for multiple rows at once
            if (completedRows === 1) {
                addScore = 100 * level; // Single
            } else if (completedRows === 2) {
                addScore = 300 * level; // Double
            } else if (completedRows === 3) {
                addScore = 500 * level; // Triple
            } else if (completedRows === 4) {
                addScore = 800 * level; // Tetris!
            }
            
            // Mark row for clearing animation
            markRow(y);
            
            // Update score and check level up
            score += addScore;
            addScoreValue = addScore;
            
            // Check for level up
            if (lines >= level_goal) {
                level++;
                level_goal += level * 10;
                if (level > 10) {
                    level = 10; // Max level
                }
            }
            
            // Play sound effect
            if (clear_line_audio) {
                clear_line_audio.currentTime = 0;
                clear_line_audio.play().catch(e => console.log('Audio play prevented:', e));
            }
        }
    }
    
    // Show score animation only if rows were cleared
    showAddScore = completedRows > 0;
    scoreTextTimer = completedRows > 0 ? 20 : 0;
    
    return { score, lines, level, showAddScore, addScore: addScoreValue };
}

/**
 * Clear rows marked for removal and move blocks down
 * Uses an optimized algorithm to handle multiple rows at once
 */
export function clearRows() {
    // Process from bottom to top for more efficient row shifting
    if (rowsToBeCleared.length === 0) {
        return; // No rows to clear
    }

    // Sort rows in descending order (bottom to top)
    rowsToBeCleared.sort((a, b) => b - a);
    
    // Process each marked row
    for (let i = 0; i < rowsToBeCleared.length; i++) {
        const rowToClear = rowsToBeCleared[i];
        
        // Shift all rows above down by one
        for (let y = rowToClear; y > 0; y--) {
            for (let x = 0; x < grid_width; x++) {
                if (gridData[x]) {
                    gridData[x][y] = gridData[x][y-1] || 0;
                }
            }
        }
        
        // Clear the top row
        for (let x = 0; x < grid_width; x++) {
            if (gridData[x]) {
                gridData[x][0] = 0;
            }
        }
    }
    
    // Reset the clearing array
    rowsToBeCleared = [];
}

/**
 * Mark a row for clearing by setting all cells to special value 8
 * @param {number} y - Row to mark
 */
function markRow(y) {
    for (let x = 0; x < grid_width; x++) {
        if (!gridData[x]) {
            gridData[x] = {};
        }
        gridData[x][y] = 8; // Marking value
    }
}

/**
 * Fill the grid - render all blocks in the grid
 */
export function fillGrid() {
    // Lazy initialization of columns to save memory
    for (let x = 0; x < grid_width; x++) {
        if (!gridData[x]) continue;
        
        for (let y = 0; y < grid_height; y++) {
            // Skip empty cells
            if (!gridData[x][y]) continue;
            
            const blockType = gridData[x][y];
            if (blockType > 0) {
                const renderX = grid_pos_x + x * block_width; // Use block_width for dynamic sizing
                const renderY = grid_pos_y + y * block_width; // Use block_width for dynamic sizing
                
                // Draw only if we have a valid block type
                const blockTypeIndex = blockType - 1;
                if (blockTypeIndex >= 0 && blockTypeIndex <= 7) {
                    drawBlock(renderX, renderY, blockTypeIndex);
                }
            }
        }
    }
    
    // Render score floating text if active
    if (showAddScore && scoreTextTimer > 0) {
        renderScoreText();
        scoreTextTimer--;
        if (scoreTextTimer <= 0) {
            showAddScore = false;
        }
    }
}

/**
 * Render floating score text animation
 */
function renderScoreText() {
    // Score text animation is disabled by default
    return;
}

/**
 * Draw grid lines
 * @param {string} color - Color of grid lines
 */
export function showGrid(color) {
    // Draw vertical lines
    for (let x = 0; x <= grid_width; x++) {
        const x1 = grid_pos_x + x * block_width;
        DrawLine(x1, grid_pos_y, x1, grid_pos_y + grid_height * block_width, color);
    }
    
    // Draw horizontal lines
    for (let y = 0; y <= grid_height; y++) {
        const y1 = grid_pos_y + y * block_width;
        DrawLine(grid_pos_x, y1, grid_pos_x + grid_width * block_width, y1, color);
    }
}

/**
 * Initialize the game grid - creates an empty grid
 */
export function initGrid() {
    // Optimized grid initialization - use objects for sparse storage
    gridData = {};
    
    // Only initialize columns when needed (lazy initialization)
    // This saves memory especially for empty areas
}

/**
 * Set up the grid module with required parameters
 * @param {CanvasRenderingContext2D} context - Canvas context
 * @param {Object} params - Grid parameters
 * @param {HTMLAudioElement} audio - Audio for line clearing
 * @param {HTMLImageElement} gridImage - The grid image
 */
export function setupGrid(context, params, audio, gridImage) {
    ctx = context;
    grid_width = params.grid_width;
    grid_height = params.grid_height;
    block_width = params.block_width;
    
    // Get canvas dimensions from context
    const canvasWidth = ctx.canvas.width / (window.devicePixelRatio || 1);
    const canvasHeight = ctx.canvas.height / (window.devicePixelRatio || 1);
    
    // If grid image is provided and loaded, use its dimensions to calculate positioning
    if (gridImage && gridImage.complete && gridImage.naturalWidth !== 0) {
        const gridImgWidth = gridImage.naturalWidth;
        const gridImgHeight = gridImage.naturalHeight;
        
        // Calculate centered position for grid image
        const gridImgX = Math.floor((canvasWidth - gridImgWidth) / 2);
        const gridImgY = Math.floor((canvasHeight - gridImgHeight) / 2);
        
        // Define the position of the actual play area within the grid image
        // These are the offsets from the top-left corner of the grid image to the play area
        // Using the horizontal offset from config
        const playAreaOffsetX = 169 + 80; // X offset from grid image left edge to play area (adjusted to 80px)
        const playAreaOffsetY = 48 - 15;  // Y offset from grid image top edge to play area (with -15px adjustment to move blocks up 5px more)
        
        // Set grid position - this is where the blocks will be drawn
        grid_pos_x = gridImgX + playAreaOffsetX;
        grid_pos_y = gridImgY + playAreaOffsetY;
        
        console.log(`Grid positioned at: ${grid_pos_x},${grid_pos_y} (based on grid image at ${gridImgX},${gridImgY})`);
    } else {
        // Fallback if grid image isn't available
        const totalGridWidth = grid_width * block_width;
        const totalGridHeight = grid_height * block_width;
        
        grid_pos_x = Math.floor((canvasWidth - totalGridWidth) / 2) + 80; // Add 80px right offset
        grid_pos_y = Math.floor((canvasHeight - totalGridHeight) / 2) - 45; // Move up by 15px (was -40, adding 5px more)
        
        console.log(`Grid positioned at: ${grid_pos_x},${grid_pos_y} (fallback calculation with 80px right offset)`);
    }
    
    // Store audio and reset game state
    clear_line_audio = audio;
    
    // Reset game state
    lines = 0;
    level = 1;
    level_goal = 10;
    score = 0;
    showAddScore = false;
    scoreTextTimer = 0;
    rowsToBeCleared = [];
    
    // Initialize grid
    initGrid();
}

/**
 * Get the current grid state
 * @returns {Object} Grid state object
 */
export function getGridState() {
    return {
        gridData,
        lines,
        level,
        score,
        level_goal
    };
}

/**
 * Set the block drawing function from another module
 * @param {Function} drawBlockFn - Function to draw a block
 */
export function setDrawBlockFunction(drawBlockFn) {
    // Store the reference to the drawBlock function provided by block.js
    drawBlock = drawBlockFn;
    
    // Set up fallback if function is invalid
    if (!drawBlock || typeof drawBlock !== 'function') {
        console.error('Invalid drawBlock function provided');
        drawBlock = (x, y, type) => {
            if (ctx) {
                ctx.fillStyle = '#f00'; // Red fallback
                ctx.fillRect(x, y, block_width, block_width);
            }
        };
    }
}