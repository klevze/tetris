/**
 * Main Game State Module
 * Handles the active gameplay including rendering, scoring, and game mechanics
 */

import { 
  canvas, ctx, WIDTH, HEIGHT, 
  DrawBitmapText, DrawBitmapTextSmall, 
  clearScreen, showBackground, showCenteredBackground, showBackgroundCover
} from '../utils/functions.js';
import { 
  FPS, GRID_WIDTH, GRID_HEIGHT, BLOCK_WIDTH, GRID_POS_X, GRID_POS_Y,
  INITIAL_SCORE, INITIAL_LINES, INITIAL_LEVEL, INITIAL_LEVEL_GOAL, 
  ANIMATION, GAME_STATES
} from '../config/config.js';
import { fillGrid, checkRows, clearRows, setupGrid, getGridState, setDrawBlockFunction } from '../components/gameplay/grid.js';
import { setupBlockHandler, showNextBlock, showHoldBlock, newBlock, moveBlock, drawBlock, showBlocksStatistics } from '../components/gameplay/block.js';
import { createFirework, updateFireworks } from '../components/effects/fireworks.js';

// Game variables
let score = INITIAL_SCORE;
let lines = INITIAL_LINES;
let level = 0;  // Changed from INITIAL_LEVEL to 0
let level_goal = INITIAL_LEVEL_GOAL;
let game_pause = false;
let TotalSeconds = 0;
let spc = 0;
let block_finish = true;
let crs = 0;
let showAddScore = false;
let sac = 0;
let addScore = 0;

// Assets
let background;
let controls_img;
let back_intro_img;
let logo_img;
let level2_img, level3_img, level4_img, level5_img;
let level6_img, level7_img, level8_img, level9_img, level10_img;
let grid_img;
let lego;
let clear_line_audio;

/**
 * Initialize the main game state module
 * 
 * @param {Object} images - Object containing all game images
 * @param {Object} audio - Object containing all game audio
 * @param {Function} updateGameStateCallback - Function to update global game state
 */
export function initMainState(images, audio, updateGameStateCallback) {
  // Store image references
  background = images.background;
  controls_img = images.controls;
  back_intro_img = images.back_intro;
  logo_img = images.logo;
  level2_img = images.level2;
  level3_img = images.level3;
  level4_img = images.level4;
  level5_img = images.level5;
  level6_img = images.level6;
  level7_img = images.level7;
  level8_img = images.level8;
  level9_img = images.level9;
  level10_img = images.level10;
  grid_img = images.grid;
  lego = images.blocks;
  
  // Store audio references
  clear_line_audio = audio.clear_line;
  
  // Reset game variables
  score = INITIAL_SCORE;
  lines = INITIAL_LINES;
  level = 0;  // Explicitly setting to 0, not using INITIAL_LEVEL
  level_goal = INITIAL_LEVEL_GOAL;
  block_finish = true;
  TotalSeconds = 0;
}

/**
 * Start the game timer
 */
export function startGameTimer() {
  // Only increment time if the game is not paused
  if (!game_pause) {
    TotalSeconds += 1;
  }
  setTimeout(startGameTimer, 1000);
}

/**
 * Start a new game, initializing all necessary components
 */
export function startMainGame() {
  // Start a new game
  score = INITIAL_SCORE;
  lines = INITIAL_LINES;
  level = 0;  // Explicitly set to 0 instead of using INITIAL_LEVEL
  level_goal = INITIAL_LEVEL_GOAL;
  
  // Calculate canvas dimensions for proper centering
  const canvasWidth = ctx.canvas.width / (window.devicePixelRatio || 1);
  const canvasHeight = ctx.canvas.height / (window.devicePixelRatio || 1);
  
  // First, pre-calculate the grid position based on centered grid image
  const gridImgX = Math.floor((canvasWidth - grid_img.naturalWidth) / 2);
  const gridImgY = Math.floor((canvasHeight - grid_img.naturalHeight) / 2);
  
  // Initialize with base grid parameters but we'll override the position values
  // Using 80px offset (changed from 85px)
  const gridParams = { 
    grid_width: GRID_WIDTH, 
    grid_height: GRID_HEIGHT,
    grid_pos_x: gridImgX + 169 + 80, // Position x based on centered grid image + 80px offset
    grid_pos_y: gridImgY + 48 - 16,  // Position y based on centered grid image - 10px
    block_width: BLOCK_WIDTH 
  };
  
  // Initialize the game grid with these parameters
  setupGrid(ctx, gridParams, clear_line_audio, grid_img, lego);
  
  // Get the initialized grid state and pass it to the block handler
  const gridState = getGridState(); 
  
  // Re-fetch the calculated grid parameters (they might have been adjusted)
  const updatedGridParams = {
    grid_width: GRID_WIDTH,
    grid_height: GRID_HEIGHT,
    grid_pos_x: gridState.grid_pos_x || gridParams.grid_pos_x,
    grid_pos_y: gridState.grid_pos_y || gridParams.grid_pos_y,
    block_width: BLOCK_WIDTH
  };
  
  // Initialize the block handler with the updated grid parameters
  setupBlockHandler(ctx, gridState, lego, updatedGridParams);
  
  // Connect the drawBlock function from block.js to grid.js
  setDrawBlockFunction(drawBlock);
  
  // Reset game variables
  block_finish = true;
  TotalSeconds = 0;
  
  // Only create celebratory fireworks if starting level is greater than 0
  if (level > 0) {
    createGameStartFireworks(canvasWidth, canvasHeight);
  }
  
  return GAME_STATES.PLAY_GAME;
}

/**
 * Create celebratory fireworks when the game starts
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 */
function createGameStartFireworks(width, height) {
  // Create an initial burst of fireworks
  createFirework(width * 0.25, height * 0.3, 0); // Left side, gold
  createFirework(width * 0.75, height * 0.3, 1); // Right side, blue
  
  // Create additional fireworks with slight delays for a dynamic effect
  setTimeout(() => {
    createFirework(width * 0.5, height * 0.25, 2); // Center top, purple
    createFirework(width * 0.2, height * 0.5, 3); // Left middle, rainbow
  }, 300);
  
  setTimeout(() => {
    createFirework(width * 0.8, height * 0.5, 0); // Right middle, gold
    createFirework(width * 0.5, height * 0.4, 1); // Center, blue
  }, 600);
  
  // Final round of fireworks
  setTimeout(() => {
    createFirework(width * 0.3, height * 0.2, 3); // Upper left, rainbow
    createFirework(width * 0.7, height * 0.2, 3); // Upper right, rainbow
    createFirework(width * 0.5, height * 0.15, 2); // Top center, purple
  }, 900);
}

/**
 * Handles the display of the pause screen
 */
export function handlePauseScreen() {
  // Get grid dimensions to create blur effect specifically over the grid
  const gridState = getGridState();
  const gridOriginX = gridState.origin.x;
  const gridOriginY = gridState.origin.y;
  const totalGridWidth = gridState.grid_width * gridState.block_width;
  const totalGridHeight = gridState.grid_height * gridState.block_width;
  
  // Create a semi-transparent overlay for the blur effect
  ctx.save();
  
  // Add blur and darkening effect specifically over the grid area
  ctx.fillStyle = 'rgba(0, 0, 20, 0.2)';
  // Add padding around the grid for a better visual effect
  const padding = 0;
  ctx.fillRect(
    gridOriginX - padding,
    gridOriginY - padding,
    totalGridWidth + padding * 2,
    totalGridHeight + padding * 2
  );
  
  // Draw a glowing border around the grid
  ctx.strokeStyle = '#4466CC';
  ctx.lineWidth = 1;
  ctx.shadowColor = '#6699FF';
  ctx.shadowBlur = 1;
  ctx.strokeRect(
    gridOriginX - padding,
    gridOriginY - padding,
    totalGridWidth + padding * 2,
    totalGridHeight + padding * 2
  );
  ctx.shadowBlur = 0;
  
  // Calculate the center of the grid
  const gridCenterX = gridOriginX + totalGridWidth / 2;
  const gridCenterY = gridOriginY + totalGridHeight / 2;
  
  // Add shadow behind text
  ctx.shadowColor = 'rgba(100, 149, 237, 0.2)';
  ctx.shadowBlur = 20;
  
  // Draw main GAME PAUSED text properly centered
  // Use 0 as X position since the third parameter in DrawBitmapText is 1 for center alignment
  DrawBitmapText("GAME PAUSED", 0, gridCenterY - 30, 1, 0, 60);
  
  // Remove shadow for smaller text
  ctx.shadowBlur = 0;
  
  // Draw instruction text, also centered
  DrawBitmapTextSmall("PRESS P TO RESUME YOUR GAME", 0, gridCenterY + 50, 0, 0, 25);
  
  // Restore canvas context
  ctx.restore();
}

/**
 * Toggle game pause state
 */
export function togglePause() {
  game_pause = !game_pause;
  
  // Update the grid state with the new pause state
  const gridState = getGridState();
  if (gridState) {
    gridState.isPaused = game_pause;
  }
  
  return game_pause;
}

/**
 * Get the current game statistics
 * 
 * @returns {Object} Object containing current game statistics
 */
export function getGameStats() {
  return {
    score,
    lines,
    level,
    time: TotalSeconds
  };
}

/**
 * Sets score from an external source (e.g., when clearing rows)
 * 
 * @param {Object} scoreData - Object containing score data
 */
export function setScoreData(scoreData) {
  if (scoreData.score !== undefined) score = scoreData.score;
  if (scoreData.lines !== undefined) lines = scoreData.lines;
  if (scoreData.level !== undefined) level = scoreData.level;
  if (scoreData.showAddScore !== undefined) showAddScore = scoreData.showAddScore;
  if (scoreData.addScore !== undefined) addScore = scoreData.addScore;
}

/**
 * Handle the main game state - core gameplay loop
 * 
 * @param {Function} setGameState - Function to update game state
 * @returns {boolean} True if the state was handled, false otherwise
 */
export function handleMainGameState(setGameState) {
  if (game_pause) {
    handlePauseScreen();
    return true;
  }
  
  // Clear screen once at the start of the frame
  clearScreen('#000');
  
  // Get currentLevel once instead of multiple comparisons
  const backgroundImg = getBackgroundForLevel(level);
  showBackgroundCover(backgroundImg);
  
  // Show grid centered at its original size
  //showCenteredBackground(grid_img);
 
  if (block_finish === true) {
    // Use the global newBlock function which handles currentBlock internally
    newBlock();
    block_finish = false;
  }
  
  // Render the game grid (this draws only the grid, not the blocks)
  fillGrid();
  
  // Process block movement - draws the falling block on top of the grid
  const moveResult = moveBlock(level);
  if (!moveResult) {
    // Game over condition
    setGameState(GAME_STATES.GAME_OVER);
    return true;
  }
  
  // Check for completed rows and update score
  const rowResult = checkRows();
  if (rowResult) {
    score = rowResult.score;
    lines = rowResult.lines;
    level = rowResult.level;
    showAddScore = rowResult.showAddScore;
    addScore = rowResult.addScore;
    
    // If we have rows to clear, do it immediately rather than waiting
    // This ensures blocks fall down properly
    clearRows();
  }
  
  // Cache UI positions for performance
  const uiPositions = getUIPositions();
  
  // Show next/hold blocks and score
  showNextBlock(uiPositions.nextBlockX+15, uiPositions.nextBlockY);
  showHoldBlock(uiPositions.holdBlockX, uiPositions.holdBlockY);
  showScore();
  
  // Show blocks statistics panel on the left side
  showBlocksStatistics(uiPositions.blocksStatsX, uiPositions.blocksStatsY);
  
  // Update and render fireworks if any are active
  updateFireworks();
  
  return true;
}

/**
 * Get the appropriate background image based on level
 * @param {number} level - Current game level
 * @returns {HTMLImageElement} Background image for the level
 */
function getBackgroundForLevel(level) {
  // Use a cache to avoid recalculating on every frame
  if (!getBackgroundForLevel.cache) {
    getBackgroundForLevel.cache = new Map();
  }
  
  if (!getBackgroundForLevel.cache.has(level)) {
    let img;
    switch(level) {
      case 10: img = level10_img; break;
      case 9: img = level9_img; break;
      case 8: img = level8_img; break;
      case 7: img = level7_img; break;
      case 6: img = level6_img; break;
      case 5: img = level5_img; break;
      case 4: img = level4_img; break;
      case 3: img = level3_img; break;
      case 2: img = level2_img; break;
      default: img = background;
    }
    getBackgroundForLevel.cache.set(level, img);
  }
  
  return getBackgroundForLevel.cache.get(level);
}

/**
 * Calculate and cache positions for UI elements
 * @returns {Object} Object containing positions for various UI elements
 */
let cachedUIPositions = null;
let lastGridImgData = null;

function getUIPositions() {
  // Only recalculate if the grid image has changed
  const currentGridData = {
    width: grid_img.width,
    height: grid_img.height,
    canvasWidth: ctx.canvas.width,
    canvasHeight: ctx.canvas.height
  };
  
  const needsRecalculation = !lastGridImgData || 
    lastGridImgData.width !== currentGridData.width || 
    lastGridImgData.height !== currentGridData.height ||
    lastGridImgData.canvasWidth !== currentGridData.canvasWidth ||
    lastGridImgData.canvasHeight !== currentGridData.canvasHeight;
    
  if (needsRecalculation || !cachedUIPositions) {
    cachedUIPositions = calculateUIPositions();
    lastGridImgData = currentGridData;
  }
  
  return cachedUIPositions;
}

/**
 * Display the game score, lines, level and time with optimized text rendering
 */
function showScore() {
  // Format timer value only once per frame
  const timer = formatGameTime();
  
  const uiPositions = getUIPositions();
  // Create a solid background panel for the stats with full opacity for better text visibility
  //ctx.fillStyle = 'rgba(220, 120, 200, 0.1)';
  //ctx.roundRect(uiPositions.panelX, uiPositions.panelY, uiPositions.panelWidth, uiPositions.panelHeight, 10);
  //ctx.fill(); 
  
  // Calculate left position (35% of panel width) for better left alignment
  const leftAlignedX = uiPositions.panelX + (uiPositions.panelWidth * 0.035);
  
  // Draw left-aligned labels with bitmap font in gold color
  DrawBitmapTextSmall("SCORE", leftAlignedX-50, uiPositions.scoreY-32, 1, 0, 1); // 1 = centered
  DrawBitmapTextSmall("LINES", leftAlignedX-50, uiPositions.linesY-32, 1, 0, 1); // 1 = centered
  DrawBitmapTextSmall("LEVEL", leftAlignedX-50, uiPositions.levelY-32, 1, 0, 1); // 1 = centered
  DrawBitmapTextSmall("TIME", leftAlignedX-50, uiPositions.timerY-32, 1, 0, 1); // 1 = centered
  
  // Draw values with larger bitmap font below labels with consistent padding
  DrawBitmapTextSmall(score.toString(), leftAlignedX-50, uiPositions.scoreY - 10, 8, 0, 1); // Consistent 30px padding, yellow
  DrawBitmapTextSmall(lines.toString(), leftAlignedX-50, uiPositions.linesY - 10, 6, 0, 1); // Consistent 30px padding, blue
  DrawBitmapTextSmall(level.toString(), leftAlignedX-50, uiPositions.levelY - 10, getLevelColor(level), 0, 1); // Consistent 30px padding, level-based color
  DrawBitmapTextSmall(timer, leftAlignedX-50, uiPositions.timerY - 10, 7, 0, 1); // Consistent 30px padding, magenta
  
  // Show score addition animation when clearing lines
  if (showAddScore) {
    // Show with larger font and gold color with pulsing effect
    const pulseScale = 1 + Math.sin(sac * 0.2) * 0.2;
    ctx.save();
    ctx.translate(uiPositions.addScoreX, uiPositions.addScoreY);
    ctx.scale(pulseScale, pulseScale);
    DrawBitmapText("+" + addScore, 0, 0, 1, 0);
    ctx.restore();
    
    sac++;
    if (sac > ANIMATION.SCORE_DISPLAY_FRAMES) {
      sac = 0;
      showAddScore = false;
    }
  }
}

/**
 * Get color index based on level
 * @param {number} level - Current game level
 * @returns {number} Color index for bitmap text
 */
function getLevelColor(level) {
  if (level <= 2) return 0;  // White for low levels
  if (level <= 5) return 3;  // Green for mid levels
  if (level <= 8) return 2;  // Red for high levels
  return 1;                  // Gold for top levels
}

/**
 * Format the game timer with flashing separator
 * @returns {string} Formatted time string
 */
function formatGameTime() {
  const minutes = parseInt(TotalSeconds / 60) % 60;
  const seconds = TotalSeconds % 60;
  
  // Only update separator animation every 15 frames
  spc = (spc + 1) % 60;
  // Using a smaller separator and reducing spacing to save space
  const separator = spc < 30 ? ':' : ':';
  
  return (minutes < 10 ? "0" + minutes : minutes) + separator + (seconds < 10 ? "0" + seconds : seconds);
}

/**
 * Set the block finish state (used when a block has landed)
 * 
 * @param {boolean} finished - Whether the current block is finished
 */
export function setBlockFinish(finished) {
  block_finish = finished;
}

/**
 * Calculate positions for UI elements based on the grid image position
 * @returns {Object} Object containing positions for various UI elements
 */
function calculateUIPositions() {
  // Get canvas dimensions
  const canvasWidth = ctx.canvas.width / (window.devicePixelRatio || 1);
  const canvasHeight = ctx.canvas.height / (window.devicePixelRatio || 1);
  
  // Get the current grid position and block size from grid module
  const gridState = getGridState();
  const gridOriginX = gridState.origin.x || 0;
  const gridOriginY = gridState.origin.y || 0;
  
  // Calculate total grid width and height based on the grid state
  const totalGridWidth = gridState.grid_width * gridState.block_width;
  const totalGridHeight = gridState.grid_height * gridState.block_width;

  // Size and position of the stats panel - made wider and taller with higher border
  const panelWidth = Math.max(gridState.block_width * 7.5, 180); // Slightly narrowed width
  const panelHeight = Math.max(gridState.block_width * 9, 270); // Further increased height for more space
  const panelX = gridOriginX + totalGridWidth + gridState.block_width * 3;
  const panelY = gridOriginY + totalGridHeight * 0.5 - panelHeight / 2; // Centered vertically with grid

  // Element spacing needs to be larger for the new layout (label + value below)
  const elementSpacing = panelHeight / 4.8; // Adjusted for better vertical distribution with larger text

  // Calculate UI element positions relative to grid position and block size
  return {
    // Position for the "Next" block preview - centered in the next block area above the grid
    nextBlockX: gridOriginX + (gridState.block_width * 2.5),
    nextBlockY: gridOriginY - (gridState.block_width * 6) + 100,
    
    // Position for the "Hold" block preview - to the right of the grid
    holdBlockX: gridOriginX + totalGridWidth + gridState.block_width * 3,
    holdBlockY: gridOriginY + gridState.block_width * 2,
    
    // Panel dimensions for stats background
    panelX,
    panelY,
    panelWidth,
    panelHeight,
    
    // Label column positions - kept for compatibility
    labelX: panelX + 25,
    
    // Value column positions - kept for compatibility
    valueX: panelX + panelWidth - 25,
    
    // Vertical positions for each statistic pair (label & value) with more spacing
    // Add padding at the top to start elements further down
    scoreY: panelY + elementSpacing * 0.9,
    linesY: panelY + elementSpacing * 2,
    levelY: panelY + elementSpacing * 3.1,
    timerY: panelY + elementSpacing * 4.2,
    
    // Position for score addition animation
    addScoreX: gridOriginX + totalGridWidth / 2,
    addScoreY: gridOriginY + totalGridHeight / 2,
    
    // Position for blocks statistics panel (on the left side of the grid)
    blocksStatsX: gridOriginX - (gridState.block_width * 9.5),
    blocksStatsY: gridOriginY
  };
}