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
import { eventBus, GAME_EVENTS } from '../utils/events.js'; // Import eventBus for listening to score changes
import { addListener } from '../core/gameState.js'; // Import addListener for scoreChanged events

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

// Countdown variables for unpausing
let isCountingDown = false;
let countdownValue = 3;
let lastCountdownTime = 0;

// Expose isCountingDown to window so events.js can access it
Object.defineProperty(window, 'isCountingDown', {
  get: function() { return isCountingDown; }
});

// Assets
let background;
let controls_img;
let back_intro_img;
let logo_img;

// Game control icons variables
let gameIconsEventListenersAdded = false;
let isMusicEnabled = true; // Sync with window.music_on during initialization

// Level background images (0-32)
let level0_img, level1_img, level2_img, level3_img, level4_img, level5_img;
let level6_img, level7_img, level8_img, level9_img, level10_img;
let level11_img, level12_img, level13_img, level14_img, level15_img;
let level16_img, level17_img, level18_img, level19_img, level20_img;
let level21_img, level22_img, level23_img, level24_img, level25_img;
let level26_img, level27_img, level28_img, level29_img, level30_img;
let level31_img, level32_img;

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
  level0_img = images.level0;
  level1_img = images.level1;
  level2_img = images.level2;
  level3_img = images.level3;
  level4_img = images.level4;
  level5_img = images.level5;
  level6_img = images.level6;
  level7_img = images.level7;
  level8_img = images.level8;
  level9_img = images.level9;
  level10_img = images.level10;
  level11_img = images.level11;
  level12_img = images.level12;
  level13_img = images.level13;
  level14_img = images.level14;
  level15_img = images.level15;
  level16_img = images.level16;
  level17_img = images.level17;
  level18_img = images.level18;
  level19_img = images.level19;
  level20_img = images.level20;
  level21_img = images.level21;
  level22_img = images.level22;
  level23_img = images.level23;
  level24_img = images.level24;
  level25_img = images.level25;
  level26_img = images.level26;
  level27_img = images.level27;
  level28_img = images.level28;
  level29_img = images.level29;
  level30_img = images.level30;
  level31_img = images.level31;
  level32_img = images.level32;
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
  
  // Get starting level directly from global variable (most reliable source)
  if (typeof window.selected_game_level === 'number') {
    level = window.selected_game_level;
    console.log(`Starting game with level from global variable: ${level}`);
  } else {
    level = 0;  // Default to level 0 if no selection was made
    console.log(`No global level set, defaulting to level 0`);
  }
  
  level_goal = INITIAL_LEVEL_GOAL;
  
  // CRITICAL FIX: Ensure secure score is properly initialized
  // This must happen BEFORE any other score operations
  if (typeof window.setScore === 'function') {
    console.log("Properly initializing secure score to 0");
    window.setScore(0);
  }
  
  // Start playing music if enabled (by calling the global music function)
  if (typeof window.startGameMusic === 'function') {
    window.startGameMusic();
  }
  
  // Sync music state with global setting
  if (typeof window.music_on === 'boolean') {
    isMusicEnabled = window.music_on;
    console.log(`Music state synced from global: ${isMusicEnabled}`);
  }
  
  // Set up event listeners for game icons if not already added
  if (!gameIconsEventListenersAdded) {
    canvas.addEventListener('click', handleGameIconsClick);
    gameIconsEventListenersAdded = true;
    console.log("Game icons event listeners added");
  }
  
  // Expose the setScoreData function globally so block.js can access it directly
  window.setScoreData = setScoreData;
  
  // IMPORTANT: Expose the score variable globally so hard drop can directly update it
  window.score = score;
  
  // Register to listen for score changes from block movements (soft drop, hard drop)
  eventBus.on(GAME_EVENTS.SCORE_CHANGE, (data) => {
    // Update the score with the new value from block.js
    if (data && typeof data.score === 'number') {
      score = data.score;
      // Keep window.score in sync
      window.score = score;
      console.log(`Score updated from block movement: ${score}`);
    }
  });
  
  // Add listener for scoreChanged events from core/gameState.js
  const removeScoreListener = addListener((event, data) => {
    if (event === 'scoreChanged' && data && typeof data.score === 'number') {
      score = data.score;
      // Keep window.score in sync 
      window.score = score;
      console.log(`Score updated from gameState: ${score}`);
    }
  });
  
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
  // Create a "Sparkle" class for pause screen particles
  class PauseSparkle {
    constructor(x, y, width, height) {
      // Initialize within the provided boundaries
      this.x = x + Math.random() * width;
      this.y = y + Math.random() * height;
      this.size = Math.random() * 3 + 1;
      this.speedX = (Math.random() - 0.5) * 1.2;
      this.speedY = (Math.random() - 0.5) * 1.2;
      this.opacity = Math.random() * 0.7 + 0.3;
      this.color = this.getRandomColor();
      // Add boundaries to keep sparkles inside
      this.minX = x + this.size;
      this.maxX = x + width - this.size;
      this.minY = y + this.size;
      this.maxY = y + height - this.size;
    }
    
    getRandomColor() {
      // Colors for the sparkles - gold, blue, white with varying brightness
      const colors = [
        '#FFD700', '#FFC107', '#FFEB3B', // Gold shades
        '#2196F3', '#03A9F4', '#00BCD4', // Blue shades
        '#FFFFFF', '#F5F5F5', '#EEEEEE'  // White shades
      ];
      return colors[Math.floor(Math.random() * colors.length)];
    }
    
    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      
      // Bounce off the edges of the box
      if (this.x <= this.minX || this.x >= this.maxX) {
        this.speedX *= -1;
        // Ensure position is within bounds
        this.x = Math.max(this.minX, Math.min(this.maxX, this.x));
      }
      if (this.y <= this.minY || this.y >= this.maxY) {
        this.speedY *= -1;
        // Ensure position is within bounds
        this.y = Math.max(this.minY, Math.min(this.maxY, this.y));
      }
      
      // Pulsate size slightly
      this.size += Math.sin(Date.now() * 0.01) * 0.05;
    }
    
    draw(context) {
      context.save();
      context.globalAlpha = this.opacity;
      context.fillStyle = this.color;
      context.beginPath();
      context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      context.fill();
      
      // Add glow effect
      context.shadowColor = this.color;
      context.shadowBlur = this.size * 2;
      context.fill();
      context.restore();
    }
  }
  
  // Get grid dimensions to create blur effect specifically over the grid
  const gridState = getGridState();
  const gridOriginX = gridState.origin.x;
  const gridOriginY = gridState.origin.y;
  const totalGridWidth = gridState.grid_width * gridState.block_width;
  const totalGridHeight = gridState.grid_height * gridState.block_width;
  
  // Add padding around the grid for a better visual effect
  const padding = 60;
  const boxX = gridOriginX - padding;
  const boxY = gridOriginY - padding;
  const boxWidth = totalGridWidth + padding * 2;
  const boxHeight = totalGridHeight + padding * 2;
  
  // Create sparkles if they don't exist yet or resize the game
  if (!handlePauseScreen.sparkles || handlePauseScreen.lastBoxDimensions?.width !== boxWidth) {
    // Store box dimensions for reference
    handlePauseScreen.lastBoxDimensions = { x: boxX, y: boxY, width: boxWidth, height: boxHeight };
    
    // Create sparkles specifically within this box
    const sparkleCount = Math.min(80, Math.floor(boxWidth * boxHeight / 500)); // Scale count by box size
    handlePauseScreen.sparkles = Array(sparkleCount)
      .fill()
      .map(() => new PauseSparkle(boxX, boxY, boxWidth, boxHeight));
  }
  
  // Create a semi-transparent overlay for the blur effect
  ctx.save();
  
  // Add blur and darkening effect specifically over the grid area
  ctx.fillStyle = 'rgba(0, 0, 20, 0.7)';
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
  
  // Draw a glowing border around the grid
  ctx.strokeStyle = '#4466CC';
  ctx.lineWidth = 1;
  ctx.shadowColor = '#6699FF';
  ctx.shadowBlur = 1;
  ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
  ctx.shadowBlur = 0;
  
  // Update and draw sparkles contained within the blur box
  handlePauseScreen.sparkles.forEach(sparkle => {
    sparkle.update();
    sparkle.draw(ctx);
  });
  
  // Calculate the center of the grid
  const gridCenterX = gridOriginX + totalGridWidth / 2;
  const gridCenterY = gridOriginY + totalGridHeight / 2;
  
  // Add shadow behind text
  ctx.shadowColor = 'rgba(100, 149, 237, 0.8)';
  ctx.shadowBlur = 20;
  
  // Draw main GAME PAUSED text properly centered
  // Use 0 as X position since the third parameter in DrawBitmapText is 1 for center alignment
  DrawBitmapText("GAME PAUSED", 0, gridCenterY - 30, 3, 0, 60);
  
  // Remove shadow for smaller text
  ctx.shadowBlur = 0;
  
  // Draw instruction text, also centered
  DrawBitmapTextSmall("PRESS P TO RESUME YOUR GAME", 0, gridCenterY + 50, 2, 0, 25);
  
  // Restore canvas context
  ctx.restore();
}

/**
 * Toggle game pause state
 */
export function togglePause() {
  // If we're unpausing the game, start the countdown sequence
  if (game_pause) {
    // Set up the countdown values
    isCountingDown = true;
    countdownValue = 3;
    lastCountdownTime = Date.now();
  } else {
    // Pausing the game - no countdown needed
    isCountingDown = false;
  }
  
  // Toggle the pause state
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
  console.log('[SCORE] setScoreData called with data:', JSON.stringify(scoreData));
  console.log('[SCORE] Current score before update:', score);
  
  if (scoreData.score !== undefined) {
    // Directly update the score variable that's used in DrawBitmapTextSmall
    const oldScore = score;
    score = scoreData.score;
    console.log(`[SCORE] Score updated: ${oldScore} → ${score}`);
  }
  if (scoreData.lines !== undefined) {
    console.log(`[SCORE] Lines updated: ${lines} → ${scoreData.lines}`);
    lines = scoreData.lines;
  }
  if (scoreData.level !== undefined) {
    console.log(`[SCORE] Level updated: ${level} → ${scoreData.level}`);
    level = scoreData.level;
  }
  if (scoreData.showAddScore !== undefined) {
    console.log(`[SCORE] showAddScore updated: ${showAddScore} → ${scoreData.showAddScore}`);
    showAddScore = scoreData.showAddScore;
  }
  if (scoreData.addScore !== undefined) {
    console.log(`[SCORE] addScore updated: ${addScore} → ${scoreData.addScore}`);
    addScore = scoreData.addScore;
  }

  // Ensure animation variables are properly set for score display
  if (scoreData.showAddScore && scoreData.addScore) {
    console.log('[SCORE] Setting up score animation');
    showAddScore = true;
    addScore = scoreData.addScore;
    sac = 0; // Reset animation counter to ensure full animation plays
    console.log(`[SCORE] Animation parameters: showAddScore=${showAddScore}, addScore=${addScore}, sac=${sac}`);
  }
  
  // Expose updated score to window for debugging
  window.debugScore = score;
  console.log('[SCORE] End of setScoreData, final score:', score);
}

/**
 * Handle the main game state - core gameplay loop
 * 
 * @param {Function} setGameState - Function to update game state
 * @returns {boolean} True if the state was handled, false otherwise
 */
export function handleMainGameState(setGameState) {
  // Handle pause screen display when paused
  if (game_pause) {
    handlePauseScreen();
    return true;
  }
  
  // Handle countdown when unpausing
  if (isCountingDown) {
    handleCountdown();
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
  
  // Draw game control icons
  drawGameIcons();
  
  return true;
}

/**
 * Handle countdown display when unpausing
 */
function handleCountdown() {
  const currentTime = Date.now();
  const elapsedTime = currentTime - lastCountdownTime;

  // Clear screen and show the game in the background
  clearScreen('#000');
  
  // Get current level background and draw it
  const backgroundImg = getBackgroundForLevel(level);
  showBackgroundCover(backgroundImg);
  
  // Draw the actual game grid and blocks
  fillGrid();
  
  // Get the grid state and current block information
  const gridState = getGridState();
  
  // Process block movement to make sure the current falling block is displayed
  // But pass true as second parameter to prevent actual movement (just render)
  moveBlock(level, true);

  // Cache UI positions for performance
  const uiPositions = getUIPositions();
  
  // Show next/hold blocks and score
  showNextBlock(uiPositions.nextBlockX+15, uiPositions.nextBlockY);
  showHoldBlock(uiPositions.holdBlockX, uiPositions.holdBlockY);
  showScore();
  
  // Show blocks statistics panel on the left side
  showBlocksStatistics(uiPositions.blocksStatsX, uiPositions.blocksStatsY);
  
  // Draw game control icons
  drawGameIcons();

  // Add semi-transparent overlay - much more transparent than before
  ctx.fillStyle = 'rgba(0, 0, 20, 0.3)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Update countdown every second (1000ms)
  if (elapsedTime >= 1000) {
    countdownValue--;
    lastCountdownTime = currentTime;
  }

  // Add a glow effect
  ctx.shadowColor = '#ffcc00';
  ctx.shadowBlur = 20;

  // Get the grid center to position the countdown
  const gridCenterX = gridState.origin.x + (gridState.grid_width * gridState.block_width) / 2;
  const gridCenterY = gridState.origin.y + (gridState.grid_height * gridState.block_width) / 2;

  // Display the countdown number (0 is GO!)
  const displayText = countdownValue > 0 ? countdownValue.toString() : "GO!";
  
  // Scale the number size based on the time since last update for a pulsing effect
  const pulseScale = 1 + 0.2 * Math.sin((elapsedTime / 1000) * Math.PI);
  const fontSize = 100 * pulseScale;
  
  // Draw the countdown centered on the grid
  ctx.save();
  DrawBitmapText(displayText, 0, gridCenterY, 4, 0, fontSize);
  ctx.restore();

  // End countdown when we reach 0 and have shown "GO!" for a second
  if (countdownValue < 0) {
    isCountingDown = false;
  }
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
      case 32: img = level32_img; break;
      case 31: img = level31_img; break;
      case 30: img = level30_img; break;
      case 29: img = level29_img; break;
      case 28: img = level28_img; break;
      case 27: img = level27_img; break;
      case 26: img = level26_img; break;
      case 25: img = level25_img; break;
      case 24: img = level24_img; break;
      case 23: img = level23_img; break;
      case 22: img = level22_img; break;
      case 21: img = level21_img; break;
      case 20: img = level20_img; break;
      case 19: img = level19_img; break;
      case 18: img = level18_img; break;
      case 17: img = level17_img; break;
      case 16: img = level16_img; break;
      case 15: img = level15_img; break;
      case 14: img = level14_img; break;
      case 13: img = level13_img; break;
      case 12: img = level12_img; break;
      case 11: img = level11_img; break;
      case 10: img = level10_img; break;
      case 9: img = level9_img; break;
      case 8: img = level8_img; break;
      case 7: img = level7_img; break;
      case 6: img = level6_img; break;
      case 5: img = level5_img; break;
      case 4: img = level4_img; break;
      case 3: img = level3_img; break;
      case 2: img = level2_img; break;
      case 1: img = level1_img; break;
      case 0: img = level0_img; break;
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
 * Calculate the number of lines needed to reach the next level
 * Uses the same logic as the level progression in the grid.js file
 * @returns {number} Number of lines needed for next level
 */
function calculateLinesToNextLevel() {
  // Get the game state from grid module
  const gridState = getGridState();
  const currentLines = gridState.lines;
  const currentLevel = gridState.level;
  const startingLevel = typeof window.selected_game_level === 'number' ? window.selected_game_level : 0;
  
  if (startingLevel >= 10) {
    // For starting levels 10+: Stay on starting level until cleared (StartLevel + 1) * 10 lines, then level up every 10 lines
    const threshold = (startingLevel + 1) * 10;
    
    if (currentLines < threshold) {
      // Haven't reached the threshold yet
      return threshold - currentLines;
    } else {
      // Past the threshold, so level up every 10 lines
      const linesAfterThreshold = currentLines - threshold;
      const nextLevelPoint = threshold + (Math.floor(linesAfterThreshold / 10) + 1) * 10;
      return nextLevelPoint - currentLines;
    }
  } else {
    // For starting levels 0-9: Level up at specific thresholds according to the table
    // Level 0: 10, 20, 30...
    // Level 1: 20, 30, 40...
    // Level 2: 30, 40, 50...
    // And so on...
    const levelThreshold = (startingLevel + 1) * 10;
    
    if (currentLines < levelThreshold) {
      // Haven't reached first level-up threshold yet
      return levelThreshold - currentLines;
    } else {
      // After first level up, follow standard "every 10 lines" rule
      const linesAfterThreshold = currentLines - levelThreshold;
      const nextLevelPoint = levelThreshold + (Math.floor(linesAfterThreshold / 10) + 1) * 10;
      return nextLevelPoint - currentLines;
    }
  }
}

/**
 * Display the game score, lines, level and time with optimized text rendering
 */
function showScore() {
  // Format timer value only once per frame
  const timer = formatGameTime();
  
  const uiPositions = getUIPositions();
  
  // Calculate left position (35% of panel width) for better left alignment
  const leftAlignedX = uiPositions.panelX + (uiPositions.panelWidth * 0.035);
  
  // Calculate lines needed to reach the next level
  const linesToNextLevel = calculateLinesToNextLevel();
  
  // Draw left-aligned labels with bitmap font in gold color
  DrawBitmapTextSmall("SCORE", leftAlignedX-50, uiPositions.scoreY-32, 1, 0, 1); // 1 = centered
  DrawBitmapTextSmall("LINES", leftAlignedX-50, uiPositions.linesY-32, 1, 0, 1); // 1 = centered
  DrawBitmapTextSmall("LEVEL", leftAlignedX-50, uiPositions.levelY-32, 1, 0, 1); // 1 = centered
  DrawBitmapTextSmall("NEXT LVL", leftAlignedX-50, uiPositions.levelY+20, 1, 0, 1); // New "NEXT LVL" label
  DrawBitmapTextSmall("TIME", leftAlignedX-50, uiPositions.timerY+12, 1, 0, 1); // 1 = centered
  
  // IMPORTANT CHANGE: Always use window.score if available to display score
  // This ensures we're showing the most up-to-date score value
  const scoreToDisplay = (typeof window.score === 'number') ? window.score : score;
  
  // Format values with leading zeros
  const formattedLines = lines.toString().padStart(3, '0');
  const formattedLevel = level.toString().padStart(2, '0');
  
  // Draw values with larger bitmap font below labels with consistent padding
  DrawBitmapTextSmall(scoreToDisplay.toString(), leftAlignedX-50, uiPositions.scoreY - 10, 8, 0, 1); // Yellow
  DrawBitmapTextSmall(formattedLines, leftAlignedX-50, uiPositions.linesY - 10, 6, 0, 1); // Blue, now with leading zeros
  DrawBitmapTextSmall(formattedLevel, leftAlignedX-50, uiPositions.levelY - 10, getLevelColor(level), 0, 1); // Level-based color, with leading zeros
  
  // Draw lines to next level with progress indicator
  const formattedLinesToNextLevel = linesToNextLevel.toString().padStart(2, '0');
  const linesToNextLevelText = formattedLinesToNextLevel + " LINES";
  DrawBitmapTextSmall(linesToNextLevelText, leftAlignedX-50, uiPositions.levelY+42, 3, 0, 1); // Green color
  
  DrawBitmapTextSmall(timer, leftAlignedX-50, uiPositions.timerY + 35, 7, 0, 1); // Magenta
  
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
  
  // Synchronize the local score with window.score if needed
  if (typeof window.score === 'number' && score !== window.score) {
    score = window.score;
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
  const panelWidth = Math.max(gridState.block_width * 11, 280); // Increased from 9 to 11 blocks
  const panelHeight = Math.max(gridState.block_width * 10, 290); // Further increased height for more space
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
    
    // Label column positions with even more padding
    labelX: panelX + 65, // Increased from 45 to 65
    
    // Value column positions with even more padding
    valueX: panelX + panelWidth - 65, // Increased from 45 to 65
    
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

/**
 * Draw icon buttons for game controls (Mute, Pause, Restart, Menu)
 */
function drawGameIcons() {
  // Sync music state with global setting
  if (typeof window.music_on === 'boolean') {
    isMusicEnabled = window.music_on;
  }

  const iconSize = 35;
  const margin = 15;
  const spacing = 10;
  const topY = margin;

  // Calculate positions for each icon, aligned at the top of the screen
  const muteX = margin;
  const pauseX = muteX + iconSize + spacing;
  const restartX = pauseX + iconSize + spacing;
  const menuX = restartX + iconSize + spacing;

  // Draw background circles for each icon
  drawIconBackground(muteX, topY, iconSize);
  drawIconBackground(pauseX, topY, iconSize);
  drawIconBackground(restartX, topY, iconSize);
  drawIconBackground(menuX, topY, iconSize);

  // Draw specific icons
  drawMuteIcon(muteX + iconSize/2, topY + iconSize/2, iconSize * 0.5, isMusicEnabled);
  drawPauseIcon(pauseX + iconSize/2, topY + iconSize/2, iconSize * 0.5, game_pause);
  drawRestartIcon(restartX + iconSize/2, topY + iconSize/2, iconSize * 0.5);
  drawMenuIcon(menuX + iconSize/2, topY + iconSize/2, iconSize * 0.5);
}

/**
 * Draw a background circle for an icon
 * 
 * @param {number} x - Left position
 * @param {number} y - Top position
 * @param {number} size - Size of the icon
 */
function drawIconBackground(x, y, size) {
  // Button background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.beginPath();
  ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI * 2);
  ctx.fill();
  
  // Button border
  ctx.strokeStyle = '#ffcc00';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * Draw a mute icon (speaker with or without X)
 * 
 * @param {number} x - Center X position
 * @param {number} y - Center Y position
 * @param {number} size - Size of the icon
 * @param {boolean} enabled - Whether music is enabled
 */
function drawMuteIcon(x, y, size, enabled) {
  const s = size * 0.8; // Slightly smaller for better fit
  ctx.save();
  ctx.strokeStyle = '#ffcc00';
  ctx.fillStyle = '#ffcc00';
  ctx.lineWidth = 2;
  
  // Draw speaker shape
  ctx.beginPath();
  ctx.moveTo(x - s/2, y);
  ctx.lineTo(x - s/4, y - s/3);
  ctx.lineTo(x, y - s/3);
  ctx.lineTo(x, y + s/3);
  ctx.lineTo(x - s/4, y + s/3);
  ctx.lineTo(x - s/2, y);
  ctx.fill();
  
  // Draw sound waves if enabled
  if (enabled) {
    ctx.beginPath();
    ctx.arc(x + s/8, y, s/3, -Math.PI/3, Math.PI/3);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(x + s/4, y, s/2, -Math.PI/3, Math.PI/3);
    ctx.stroke();
  } else {
    // Draw X if muted
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y - s/3);
    ctx.lineTo(x + s/2, y + s/3);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(x + s/2, y - s/3);
    ctx.lineTo(x, y + s/3);
    ctx.stroke();
  }
  
  ctx.restore();
}

/**
 * Draw a pause/play icon
 * 
 * @param {number} x - Center X position
 * @param {number} y - Center Y position
 * @param {number} size - Size of the icon
 * @param {boolean} paused - Whether game is paused
 */
function drawPauseIcon(x, y, size, paused) {
  const s = size * 0.8; // Slightly smaller for better fit
  ctx.save();
  ctx.fillStyle = '#ffcc00';
  ctx.strokeStyle = '#ffcc00';
  
  if (paused) {
    // Draw play triangle when paused
    ctx.beginPath();
    ctx.moveTo(x - s/4, y - s/2);
    ctx.lineTo(x - s/4, y + s/2);
    ctx.lineTo(x + s/2, y);
    ctx.closePath();
    ctx.fill();
  } else {
    // Draw pause symbol when playing
    ctx.fillRect(x - s/2, y - s/2, s/3, s);
    ctx.fillRect(x + s/6, y - s/2, s/3, s);
  }
  
  ctx.restore();
}

/**
 * Draw a restart icon (circular arrow)
 * 
 * @param {number} x - Center X position
 * @param {number} y - Center Y position
 * @param {number} size - Size of the icon
 */
function drawRestartIcon(x, y, size) {
  const s = size; // Full size for restart icon
  ctx.save();
  ctx.strokeStyle = '#ffcc00';
  ctx.lineWidth = 2;
  
  // Draw circular arrow
  ctx.beginPath();
  ctx.arc(x, y, s/2, Math.PI * 0.1, Math.PI * 1.9, false);
  ctx.stroke();
  
  // Draw arrowhead
  const arrowX = x + Math.cos(Math.PI * 0.1) * s/2;
  const arrowY = y + Math.sin(Math.PI * 0.1) * s/2;
  
  ctx.beginPath();
  ctx.moveTo(arrowX, arrowY);
  ctx.lineTo(arrowX + s/4, arrowY - s/8);
  ctx.lineTo(arrowX + s/6, arrowY + s/8);
  ctx.closePath();
  ctx.fillStyle = '#ffcc00';
  ctx.fill();
  
  ctx.restore();
}

/**
 * Draw a menu icon (hamburger menu)
 * 
 * @param {number} x - Center X position
 * @param {number} y - Center Y position
 * @param {number} size - Size of the icon
 */
function drawMenuIcon(x, y, size) {
  const s = size * 0.8; // Slightly smaller for better fit
  ctx.save();
  ctx.strokeStyle = '#ffcc00';
  ctx.lineWidth = 3;
  
  // Draw three horizontal lines
  const top = y - s/2;
  const middle = y;
  const bottom = y + s/2;
  
  ctx.beginPath();
  ctx.moveTo(x - s/2, top);
  ctx.lineTo(x + s/2, top);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(x - s/2, middle);
  ctx.lineTo(x + s/2, middle);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(x - s/2, bottom);
  ctx.lineTo(x + s/2, bottom);
  ctx.stroke();
  
  ctx.restore();
}

/**
 * Handle mouse click on game control icons
 * 
 * @param {MouseEvent} event - Mouse click event
 */
function handleGameIconsClick(event) {
  // Get click position relative to canvas
  const rect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;
  
  const iconSize = 35;
  const margin = 15;
  const spacing = 10;
  const topY = margin;
  
  // Calculate positions for each icon
  const muteX = margin;
  const pauseX = muteX + iconSize + spacing;
  const restartX = pauseX + iconSize + spacing;
  const menuX = restartX + iconSize + spacing;
  
  // Check if mute icon was clicked
  if (isPointInCircle(mouseX, mouseY, muteX + iconSize/2, topY + iconSize/2, iconSize/2)) {
    console.log("Mute button clicked");
    // Toggle music
    isMusicEnabled = !isMusicEnabled;
    
    // Sync with global music state
    if (typeof window.music_on !== 'undefined') {
      window.music_on = isMusicEnabled;
    }
    
    // Toggle music playback using global function
    if (typeof window.toggleGameMusic === 'function') {
      window.toggleGameMusic();
    }
    return;
  }
  
  // Check if pause icon was clicked
  if (isPointInCircle(mouseX, mouseY, pauseX + iconSize/2, topY + iconSize/2, iconSize/2)) {
    console.log("Pause button clicked");
    togglePause();
    return;
  }
  
  // Check if restart icon was clicked
  if (isPointInCircle(mouseX, mouseY, restartX + iconSize/2, topY + iconSize/2, iconSize/2)) {
    console.log("Restart button clicked");
    // Send to game start state to restart
    if (typeof window.game_state !== 'undefined') {
      window.game_state = GAME_STATES.GAME_START;
    }
    return;
  }
  
  // Check if menu icon was clicked
  if (isPointInCircle(mouseX, mouseY, menuX + iconSize/2, topY + iconSize/2, iconSize/2)) {
    console.log("Menu button clicked");
    // Return to intro screen
    if (typeof window.game_state !== 'undefined') {
      window.game_state = GAME_STATES.GAME_INTRO;
    }
    return;
  }
}

/**
 * Helper function to check if a point is inside a circle
 * 
 * @param {number} pointX - Point X position
 * @param {number} pointY - Point Y position
 * @param {number} centerX - Circle center X position
 * @param {number} centerY - Circle center Y position
 * @param {number} radius - Circle radius
 * @returns {boolean} Whether the point is inside the circle
 */
function isPointInCircle(pointX, pointY, centerX, centerY, radius) {
  const distance = Math.sqrt(
    Math.pow(pointX - centerX, 2) + 
    Math.pow(pointY - centerY, 2)
  );
  return distance <= radius;
}