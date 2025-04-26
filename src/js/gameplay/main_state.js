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
 * Display the game score, lines, level and time
 */
function showScore() {
  // Display the game score, lines, level and time
  let timer;
  
  const hours = parseInt(TotalSeconds / 3600) % 24;
  const minutes = parseInt(TotalSeconds / 60) % 60;
  const seconds = TotalSeconds % 60;
  
  spc++;
  let seper = ' : ';
  if (spc > 30) {
    seper = '   ';
  }
  if (spc > 60) {
    spc = 0;
  }
  
  timer = (minutes < 10 ? "0" + minutes : minutes) + seper + (seconds < 10 ? "0" + seconds : seconds);
  
  const uiPositions = calculateUIPositions();
  
  ctx.font = 'normal 15px sans-serif';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'right';

  ctx.fillStyle = '#000';
  ctx.fillText(score, uiPositions.scoreX + 1, uiPositions.scoreY + 1);
  ctx.fillText(lines, uiPositions.linesX + 1, uiPositions.linesY + 1);
  ctx.fillText(level, uiPositions.levelX + 1, uiPositions.levelY + 1);
  ctx.fillText(timer, uiPositions.timerX + 1, uiPositions.timerY + 1);
  
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
  setupGrid(ctx, gridParams, clear_line_audio, grid_img);
  
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
  
  // Normal gameplay
  clearScreen('#000');
  
  // Show appropriate background based on level - stretched to cover the screen
  if (level === 10) {
    showBackgroundCover(level10_img);
  } else if (level === 9) {
    showBackgroundCover(level9_img);
  } else if (level === 8) {
    showBackgroundCover(level8_img);
  } else if (level === 7) {
    showBackgroundCover(level7_img);
  } else if (level === 6) {
    showBackgroundCover(level6_img);
  } else if (level === 5) {
    showBackgroundCover(level5_img);
  } else if (level === 4) {
    showBackgroundCover(level4_img);
  } else if (level === 3) {
    showBackgroundCover(level3_img);
  } else if (level === 2) {
    showBackgroundCover(level2_img);
  } else {
    showBackgroundCover(background);
  }
  
  // Show grid centered at its original size
  showCenteredBackground(grid_img);
 
  if (block_finish === true) {
    newBlock();
    block_finish = false;
  }
  
  // Process block movement
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
  }
  
  // Render the game elements
  fillGrid();
  
  const uiPositions = calculateUIPositions();
  
  showNextBlock(uiPositions.nextBlockX, uiPositions.nextBlockY);
  showHoldBlock(uiPositions.holdBlockX, uiPositions.holdBlockY);
  showScore();
  
  // Process row clearing
  crs++;
  if (crs % 10 === 0) {
    clearRows();
  }
  
  return true;
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
  
  // Center position for grid image
  const gridImgX = Math.floor((canvasWidth - grid_img.naturalWidth) / 2);
  const gridImgY = Math.floor((canvasHeight - grid_img.naturalHeight) / 2);
  
  // Move score display 85px to the right
  const scoreOffsetToRight = -60;
  
  return {
    // Position for the "Next" block preview - on the right side of the grid with +20px offset
    nextBlockX: gridImgX + 495 + 20,
    nextBlockY: gridImgY + 100,
    
    // Position for the "Hold" block preview - on the left side of the grid
    holdBlockX: gridImgX + 40,
    holdBlockY: gridImgY + 100,
    
    // Position for score display - moved 85px to the right
    scoreX: gridImgX + 290 + scoreOffsetToRight,
    scoreY: gridImgY + 345,
    
    // Positions for lines, level and timer displays - also moved to the right
    linesX: gridImgX + 290 + scoreOffsetToRight,
    linesY: gridImgY + 405,
    levelX: gridImgX + 290 + scoreOffsetToRight,
    levelY: gridImgY + 465,
    timerX: gridImgX + 290 + scoreOffsetToRight,
    timerY: gridImgY + 525
  };
}