import { 
  canvas, ctx, WIDTH, HEIGHT, 
  DrawBitmapText, DrawBitmapTextSmall, 
  clearScreen, showBackground, showCenteredBackground, showBackgroundCover
} from '../functions.js';
import { 
  FPS, GRID_WIDTH, GRID_HEIGHT, BLOCK_WIDTH, GRID_POS_X, GRID_POS_Y,
  INITIAL_SCORE, INITIAL_LINES, INITIAL_LEVEL, INITIAL_LEVEL_GOAL, 
  ANIMATION, GAME_STATES
} from '../config/config.js';
import { fillGrid, checkRows, clearRows, setupGrid, getGridState, setDrawBlockFunction } from '../grid.js';
import { setupBlockHandler, showNextBlock, showHoldBlock, newBlock, moveBlock, drawBlock } from '../block.js';

// Game variables
let score = INITIAL_SCORE;
let lines = INITIAL_LINES;
let level = INITIAL_LEVEL;
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
let fonts_big_img;
let fonts_small_img;
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
  fonts_big_img = images.fonts_big;
  fonts_small_img = images.fonts_small;
  
  // Store audio references
  clear_line_audio = audio.clear_line;
  
  // Reset game variables
  score = INITIAL_SCORE;
  lines = INITIAL_LINES;
  level = INITIAL_LEVEL;
  level_goal = INITIAL_LEVEL_GOAL;
  block_finish = true;
  TotalSeconds = 0;
}

/**
 * Start the game timer
 */
export function startGameTimer() {
  // Update game timer
  if (game_pause !== true) {
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
  level = INITIAL_LEVEL;
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
  
  return GAME_STATES.PLAY_GAME;
}

/**
 * Handles the display of the pause screen
 */
export function handlePauseScreen() {
  clearScreen('#000');
  showBackground(back_intro_img, 0, 0, WIDTH, HEIGHT);
  showBackground(controls_img, 0, 510, WIDTH, 89);
  
  // Animate logo
  let k = 0;
  k += 0.8;
  for (let l = 0; l < 100; l++) {
    const n = (k + l) * 2;
    let m = Math.sin(n/180*3.14) * 30;
    let height = m + 15;
    
    if (height < 5) {
      height = 5;
    }
    if (height > 20) {
      height = 20;
    }

    ctx.drawImage(logo_img, 0, l, 321, 1, m + 240, l+60, 321, height);
  }
  
  DrawBitmapText("GAME PAUSED", 0, HEIGHT/2-80, 1, 1, 50);
  DrawBitmapTextSmall("PRESS P TO RESUME YOUR GAME", 0, HEIGHT/2+40, 0, 1, 20);
}

/**
 * Toggle game pause state
 */
export function togglePause() {
  game_pause = !game_pause;
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
  showCenteredBackground(grid_img);
 
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
  showNextBlock(uiPositions.nextBlockX, uiPositions.nextBlockY);
  showHoldBlock(uiPositions.holdBlockX, uiPositions.holdBlockY);
  showScore();
  
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
  
  // Pre-calculate text shadow position once
  const shadowOffset = 1;
  
  // Use a consistent font configuration
  ctx.font = 'normal 15px sans-serif';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'right';

  // Draw shadows first, then text - reduces context switching
  ctx.fillStyle = '#000';
  ctx.fillText(score, uiPositions.scoreX + shadowOffset, uiPositions.scoreY + shadowOffset);
  ctx.fillText(lines, uiPositions.linesX + shadowOffset, uiPositions.linesY + shadowOffset);
  ctx.fillText(level, uiPositions.levelX + shadowOffset, uiPositions.levelY + shadowOffset);
  ctx.fillText(timer, uiPositions.timerX + shadowOffset, uiPositions.timerY + shadowOffset);
  
  ctx.fillStyle = '#ccc';
  ctx.fillText(score, uiPositions.scoreX, uiPositions.scoreY);
  ctx.fillText(lines, uiPositions.linesX, uiPositions.linesY);
  ctx.fillText(level, uiPositions.levelX, uiPositions.levelY);
  ctx.fillText(timer, uiPositions.timerX, uiPositions.timerY);
  
  // Show score addition animation when clearing lines
  if (showAddScore) {
    DrawBitmapTextSmall("+" + addScore, 360, 235, 0, 0);
    sac++;
    if (sac > ANIMATION.SCORE_DISPLAY_FRAMES) {
      sac = 0;
      showAddScore = false;
    }
  }
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
  const separator = spc < 30 ? ' : ' : '   ';
  
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
  const gridPosX = gridState.grid_pos_x || GRID_POS_X;
  const gridPosY = gridState.grid_pos_y || GRID_POS_Y;
  
  // Calculate total grid width and height
  const totalGridWidth = GRID_WIDTH * BLOCK_WIDTH;
  const totalGridHeight = GRID_HEIGHT * BLOCK_WIDTH;
  
  // Calculate UI element positions relative to grid position and block size
  return {
    // Position for the "Next" block preview - to the right of the grid
    nextBlockX: gridPosX + totalGridWidth + BLOCK_WIDTH * 1.5,
    nextBlockY: gridPosY + BLOCK_WIDTH * 2,
    
    // Position for the "Hold" block preview - to the left of the grid
    holdBlockX: gridPosX - BLOCK_WIDTH * 5,
    holdBlockY: gridPosY + BLOCK_WIDTH * 2,
    
    // Position for score display
    scoreX: gridPosX + totalGridWidth + BLOCK_WIDTH * 4,
    scoreY: gridPosY + totalGridHeight * 0.6,
    
    // Positions for lines, level and timer displays
    linesX: gridPosX + totalGridWidth + BLOCK_WIDTH * 4,
    linesY: gridPosY + totalGridHeight * 0.7, 
    levelX: gridPosX + totalGridWidth + BLOCK_WIDTH * 4,
    levelY: gridPosY + totalGridHeight * 0.8,
    timerX: gridPosX + totalGridWidth + BLOCK_WIDTH * 4,
    timerY: gridPosY + totalGridHeight * 0.9
  };
}