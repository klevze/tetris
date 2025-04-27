import { DrawLine } from './functions.js';

/**
 * GRID MODULE
 * Handles the game grid operations:
 * - Grid initialization and rendering
 * - Row clearing and scoring
 * - Game state management
 */

// Animation constants for line clearing
const LINE_CLEAR_ANIMATION = {
  FADE_TO_WHITE: 'FADE_TO_WHITE',
  SPARKLE: 'SPARKLE',
  CLEAR_LEFT_TO_RIGHT: 'CLEAR_LEFT_TO_RIGHT',
  COMPLETE: 'COMPLETE'
};

// Animation timing (in frames)
const ANIMATION_FRAMES = {
  FADE_TO_WHITE: 30,
  SPARKLE: 40,
  CLEAR_LEFT_TO_RIGHT: 30
};

// Variables that will be initialized by the game module
let grid_width, grid_height, grid_pos_x, grid_pos_y, block_width;
let gridData = {}; // Grid storage - switched to object-based grid for memory efficiency
let ctx, clear_line_audio;
let lines = 0, level = 1, level_goal = 10, score = 0;
let showAddScore = false;
let addScoreValue = 0;
let scoreTextTimer = 0;
let scoreTextPosition = { x: 0, y: 0 };

// Animation state variables
let rowsToBeCleared = []; // Track which rows are marked for clearing
let clearAnimationState = LINE_CLEAR_ANIMATION.FADE_TO_WHITE;
let clearAnimationFrame = 0;
let particles = []; // Array to store particles for clearing effect
let lego; // Blocks image reference
let drawBlock; // Function reference for drawing blocks

/**
 * Particle class for line clearing effects
 */
class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 3 + 1;
    this.speedX = Math.random() * 3 - 1.5;
    this.speedY = Math.random() * 3 - 1.5;
    this.color = `rgba(255, 255, ${Math.random() * 100 + 155}, ${Math.random() * 0.8 + 0.2})`;
    this.alpha = 1;
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.alpha -= 0.02;
    if (this.alpha < 0) this.alpha = 0;
  }

  draw() {
    if (this.alpha > 0) {
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

/**
 * Create particles for each block in a line
 * @param {number} row - Row index where particles should be created
 */
function createParticles(row) {
  for (let x = 0; x < grid_width; x++) {
    const posX = grid_pos_x + x * block_width + block_width / 2;
    const posY = grid_pos_y + row * block_width + block_width / 2;
    
    // Create multiple particles per block
    for (let i = 0; i < 5; i++) {
      particles.push(new Particle(posX, posY));
    }
  }
}

/**
 * Render the line clearing animation
 * @returns {boolean} True if animation is complete
 */
function renderClearAnimation() {
  if (rowsToBeCleared.length === 0) {
    return true; // No rows to clear, animation is "complete"
  }
  
  // Update animation frame counter
  clearAnimationFrame++;
  
  if (clearAnimationState === LINE_CLEAR_ANIMATION.FADE_TO_WHITE) {
    // PHASE 1: Fade to white
    const fadeProgress = clearAnimationFrame / ANIMATION_FRAMES.FADE_TO_WHITE;
    
    rowsToBeCleared.forEach(row => {
      for (let x = 0; x < grid_width; x++) {
        const drawX = grid_pos_x + x * block_width;
        const drawY = grid_pos_y + row * block_width;
        
        // Get the block type for the original block
        const blockType = gridData[x] && gridData[x][row] ? gridData[x][row] - 1 : 0;
        
        if (blockType >= 0 && blockType <= 7) {
          // Draw a solid white rectangle with increasing opacity
          ctx.fillStyle = `rgba(255, 255, 255, ${fadeProgress})`;
          ctx.fillRect(drawX, drawY, block_width, block_width);
        }
      }
    });
    
    // Transition to sparkle phase after white fade is complete
    if (clearAnimationFrame >= ANIMATION_FRAMES.FADE_TO_WHITE) {
      clearAnimationState = LINE_CLEAR_ANIMATION.SPARKLE;
      clearAnimationFrame = 0;
      
      // Generate particles for each cleared line
      rowsToBeCleared.forEach(row => createParticles(row));
    }
    
    return false;
  } 
  else if (clearAnimationState === LINE_CLEAR_ANIMATION.SPARKLE) {
    // PHASE 2: Show sparkles on white blocks
    
    // Draw solid white blocks for all blocks in the rows
    rowsToBeCleared.forEach(row => {
      for (let x = 0; x < grid_width; x++) {
        const drawX = grid_pos_x + x * block_width;
        const drawY = grid_pos_y + row * block_width;
        
        // Pure white background for all blocks in the row
        ctx.fillStyle = "rgb(255, 255, 255)";
        ctx.fillRect(drawX, drawY, block_width, block_width);
      }
    });
    
    // Update and draw all particles (sparkles)
    particles.forEach(particle => {
      particle.update();
      particle.draw();
    });
    
    // Remove faded particles
    particles = particles.filter(particle => particle.alpha > 0);
    
    // Add new particles occasionally during this phase to maintain sparkle effect
    if (clearAnimationFrame % 4 === 0) {
      rowsToBeCleared.forEach(row => {
        // Add fewer particles than initial burst
        for (let x = 0; x < grid_width; x += 3) {
          const posX = grid_pos_x + x * block_width + block_width / 2;
          const posY = grid_pos_y + row * block_width + block_width / 2;
          particles.push(new Particle(posX, posY));
        }
      });
    }
    
    // Transition to left-to-right clearing phase after sparkle time is complete
    if (clearAnimationFrame >= ANIMATION_FRAMES.SPARKLE) {
      clearAnimationState = LINE_CLEAR_ANIMATION.CLEAR_LEFT_TO_RIGHT;
      clearAnimationFrame = 0;
    }
    
    return false;
  }
  else if (clearAnimationState === LINE_CLEAR_ANIMATION.CLEAR_LEFT_TO_RIGHT) {
    // PHASE 3: Clear from left to right
    const clearTime = ANIMATION_FRAMES.CLEAR_LEFT_TO_RIGHT;
    const progress = clearAnimationFrame / clearTime;
    const blocksToClear = Math.floor(progress * grid_width);
    
    rowsToBeCleared.forEach(row => {
      for (let x = 0; x < grid_width; x++) {
        // Skip drawing blocks that have been cleared (left side)
        if (x < blocksToClear) continue;
        
        const drawX = grid_pos_x + x * block_width;
        const drawY = grid_pos_y + row * block_width;
        
        // Draw white blocks for the remaining part (right side)
        ctx.fillStyle = "rgb(255, 255, 255)";
        ctx.fillRect(drawX, drawY, block_width, block_width);
      }
      
      // Create additional particles at the clearing edge
      if (clearAnimationFrame % 2 === 0 && blocksToClear >= 0 && blocksToClear < grid_width) {
        const posX = grid_pos_x + blocksToClear * block_width;
        const posY = grid_pos_y + row * block_width + block_width / 2;
        
        // Add extra particles at the clearing edge
        for (let i = 0; i < 5; i++) {
          const particle = new Particle(posX, posY);
          // Make particles move leftward to create the sweeping effect
          particle.speedX = -Math.random() * 2 - 1; // Strong leftward movement
          particle.speedY = Math.random() * 2 - 1;   // Small vertical movement
          particle.color = `rgba(255, 255, ${Math.random() * 100 + 155}, ${Math.random() * 0.8 + 0.2})`;
          particles.push(particle);
        }
      }
    });
    
    // Update and draw all particles
    particles.forEach(particle => {
      particle.update();
      particle.draw();
    });
    
    // Remove faded particles
    particles = particles.filter(particle => particle.alpha > 0);
    
    // Animation complete, time to clear the rows
    if (clearAnimationFrame >= clearTime) {
      clearAnimationState = LINE_CLEAR_ANIMATION.FADE_TO_WHITE; // Reset for next time
      clearAnimationFrame = 0;
      return true; // Signal to perform actual row clearing
    }
    
    return false;
  }
  
  return false;
}

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
            
            // Create particles for the row
            createParticles(y);
            
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
 * Uses a more direct approach for block shifting
 */
export function clearRows() {
    // If no rows to clear, exit early
    if (rowsToBeCleared.length === 0) {
        return;
    }

    // Sort rows in ascending order (top to bottom)
    rowsToBeCleared.sort((a, b) => a - b);
    
    // For each row that needs to be cleared, starting from the top
    for (const rowToClear of rowsToBeCleared) {
        // Move all rows above this one down by 1
        for (let y = rowToClear; y > 0; y--) {
            for (let x = 0; x < grid_width; x++) {
                if (!gridData[x]) {
                    gridData[x] = {};
                }
                // Copy from row above
                gridData[x][y] = gridData[x][y - 1] || 0;
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
    
    // Play clear line sound effect
    if (clear_line_audio) {
        clear_line_audio.currentTime = 0;
        try {
            clear_line_audio.play().catch(e => console.log("Audio play prevented:", e));
        } catch (e) {
            console.log("Audio play error:", e);
        }
    }
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
 * Optimized to skip empty cells and use batch rendering
 */
export function fillGrid() {
    // Check if we should render the clearing animation
    if (rowsToBeCleared.length > 0) {
        // Handle the clear animation - if it's complete, move to the actual clearing
        const animationComplete = renderClearAnimation();
        
        if (animationComplete) {
            // Animation is complete, perform the actual row clearing
            clearRows();
            
            // Reset animation state for next time
            clearAnimationState = LINE_CLEAR_ANIMATION.FADE_TO_WHITE;
            clearAnimationFrame = 0;
        }
        
        // If animation is still in progress, don't render regular blocks
        return;
    }
    
    // Regular block rendering - batch similar blocks together to minimize state changes
    const renderQueue = new Map(); // Map of blockType -> positions array
    
    // Collect all blocks to render by type
    for (let x = 0; x < grid_width; x++) {
        if (!gridData[x]) continue;
        
        for (let y = 0; y < grid_height; y++) {
            const blockType = gridData[x][y];
            if (!blockType) continue;
            
            const blockTypeIndex = blockType - 1;
            if (blockTypeIndex >= 0 && blockTypeIndex <= 7) {
                if (!renderQueue.has(blockTypeIndex)) {
                    renderQueue.set(blockTypeIndex, []);
                }
                
                renderQueue.get(blockTypeIndex).push({
                    x: grid_pos_x + x * block_width,
                    y: grid_pos_y + y * block_width
                });
            }
        }
    }
    
    // Render blocks in batches by type
    renderQueue.forEach((positions, blockType) => {
        // Set up the sprite details once for this block type
        const sx = blockType * 30;
        const bufferX = 1;
        const bufferY = 1;
        const bufferWidth = 2;
        const bufferHeight = 2;
        
        // Draw all blocks of this type in a batch
        positions.forEach(pos => {
            const drawX = Math.floor(pos.x);
            const drawY = Math.floor(pos.y);
            
            ctx.drawImage(
                lego,
                sx + bufferX,
                bufferY,
                30 - bufferWidth,
                30 - bufferHeight,
                drawX,
                drawY,
                block_width,
                block_width
            );
        });
    });
    
    // Render score floating text if active
    if (showAddScore && scoreTextTimer > 0) {
        renderScoreText();
        scoreTextTimer--;
        if (scoreTextTimer <= 0) {
            showAddScore = false;
        }
    }
    
    // Render any active particles
    particles.forEach((particle, index) => {
        particle.update();
        particle.draw();
        if (particle.alpha <= 0) {
            particles.splice(index, 1);
        }
    });
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
 * @param {HTMLImageElement} blocksImage - The blocks image (lego)
 */
export function setupGrid(context, params, audio, gridImage, blocksImage) {
    ctx = context;
    grid_width = params.grid_width;
    grid_height = params.grid_height;
    block_width = params.block_width;
    
    // Store the blocks image 
    if (blocksImage) {
        lego = blocksImage;
    }
    
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