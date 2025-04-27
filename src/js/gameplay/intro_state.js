// filepath: d:\Sites\games\Tetris\src\js\gameplay\intro_state.js
import { 
  canvas, ctx, WIDTH, HEIGHT, 
  DrawBitmapText, DrawBitmapTextSmall, 
  clearScreen, showBackground 
} from '../utils/functions.js';
import { GAME_STATES, UI } from '../config/config.js';
import { getImage } from '../utils/assetManager.js';

// Animation and display variables
let k = 0; // Animation counter for logo sine wave effect
let sc = 0; // Counter used in score display animations
let introEventListenersAdded = false; // Track if event listeners are active

// Game statistics (displayed in the intro screen)
let lines = 0;
let level = 1;
let TotalSeconds = 0;

// High scores array 
let high_scores = [];
let gameStateCallback = null;

// Assets
let back_intro_img;
let logo_img;
let fonts_big_img;
let fonts_small_img;

/**
 * Initialize the intro screen module
 * 
 * @param {Object} images - Object containing all game images
 * @param {Function} updateGameStateCallback - Function to update game state
 */
export function initIntroState(images, updateGameStateCallback) {
  // Store image references
  back_intro_img = images.back_intro;
  logo_img = images.logo;
  fonts_big_img = images.fonts_big;
  fonts_small_img = images.fonts_small;
  
  // Store callback for state changes
  gameStateCallback = updateGameStateCallback;
  
  // Load high scores from localStorage
  loadHighScoreData();
}

/**
 * Handle the intro state
 * Shows intro screen with logo, top players and "press space to start" prompt
 * 
 * @param {Function} setGameState - Function to update the game state
 * @returns {boolean} True if state was handled
 */
export function handleIntroState(setGameState) {
  // Set up intro screen event handlers if not already set
  if (!introEventListenersAdded) {
    // Remove any existing listeners first
    removeAllEventListeners();
      
    // Add intro-specific event listeners
    document.addEventListener('keydown', handleIntroKeyDown);
    document.addEventListener('mousedown', handleIntroMouseDown);
    introEventListenersAdded = true;
  }

  // Increment animation counter
  k += 0.8;
  
  // Clear screen and draw background elements
  clearScreen('#000');
  showBackground(back_intro_img, 0, 0, WIDTH, HEIGHT);
  
  // Use direct image access to make sure we get the logo
  try {
    // Check if logo_img is valid before drawing
    if (logo_img && logo_img.complete && logo_img.naturalWidth !== 0) {
      // Original logo dimensions
      const originalWidth = logo_img.naturalWidth || 321;
      const originalHeight = logo_img.naturalHeight || 100;
      
      // Calculate available space respecting MAX_LOGO_WIDTH setting
      const maxLogoWidth = UI.MAX_LOGO_WIDTH;
      const availableWidth = Math.min(WIDTH * 0.9, maxLogoWidth);
      
      // Calculate scaling factor while maintaining aspect ratio
      const scaleFactor = availableWidth / originalWidth;
      
      // Calculate the display width and height
      const displayWidth = originalWidth * scaleFactor;
      const displayHeight = originalHeight * scaleFactor;
      
      // Center the logo horizontally (centered X position)
      const centerX = (WIDTH - displayWidth) / 2;
      
      // Draw the logo with sine wave animation
      for (let l = 0; l < displayHeight && l < originalHeight; l++) {
        const lineHeightRatio = l / displayHeight;
        const sourceY = Math.floor(lineHeightRatio * originalHeight);
        
        const n = (k + l) * 2;
        let m = Math.sin(n/180*3.14) * 30;
        let height = Math.max(5, Math.min(30, m + 15));
        
        // Draw each horizontal slice of the logo - properly centered
        ctx.drawImage(
          logo_img, 
          0, sourceY, originalWidth, 1, // Source rectangle
          centerX + m, 40 + l, displayWidth, height // Destination rectangle
        );
      }
    } else {
      // Fallback if the image isn't loaded yet
      ctx.font = 'bold 40px Arial';
      ctx.fillStyle = '#ffcc00';
      ctx.textAlign = 'center';
      ctx.fillText("TETRIS", WIDTH/2, 40);
    }
  } catch (e) {
    console.error("Error drawing logo:", e);
    // Fallback text in case of error
    ctx.font = 'bold 40px Arial';
    ctx.fillStyle = '#ffcc00';
    ctx.textAlign = 'center';
    ctx.fillText("TETRIS", WIDTH/2, 40);
  }

  // Calculate positions for the high  scores section
  // Logo + space + scores list + space + bottom text
  const verticalSpacing = HEIGHT * 0.19; // Adds spacing from logo
  const topPlayersY = Math.max(170, verticalSpacing + 100); // At least 170px from top
  
  // Draw "TOP PLAYERS" text lower than before
  DrawBitmapTextSmall("TOP PLAYERS", 0, topPlayersY, 1, 0, 0);
    
  // Start high scores list below the title with some spacing
  let y = topPlayersY + 30; // Add 30px spacing below the title
  let p = 0;
  let ps = 0;
    
  high_scores.forEach((val) => {
    p++;
    ps++;
      
    if (p % 2 == 0) {
      p = 0;
    }
      
    if (ps < 12) {
      // Apply sine wave effect for score listings
      const m = Math.sin((k+ps*20) / 180 * 3.14) * 15;
        
      // Draw score entry with shadow effect
      ctx.font = "15px Arial";
      ctx.textAlign = "left";
      ctx.fillStyle = '#111';
      ctx.textAlign = "right";
        
      if (ps > 1) {
        ctx.fillText(ps-1 + ".", 122+m, y+2);
      }
        
      ctx.fillText(val.score, 372+m, y+2);
      ctx.textAlign = "center";
      ctx.fillText(val.cleared_lines, 452+m, y+2);
      ctx.fillText(val.level, 552+m, y+2);
      ctx.fillText(val.time, 652+m, y+2);
      ctx.textAlign = "left";
      ctx.fillText(val.player_name, 152+m, y+2);

      // Draw the actual text over the shadow
      ctx.fillStyle = ps == 1 ? '#faa' : '#eee';
      ctx.textAlign = "right";
      
      if (ps > 1) {
        ctx.fillText(ps-1 + ".", 120+m, y);
      }
        
      ctx.fillText(val.score, 370+m, y);
      ctx.textAlign = "center";
      ctx.fillText(val.cleared_lines, 450+m, y);
      ctx.fillText(val.level, 550+m, y);
      ctx.fillText(val.time, 650+m, y);
      ctx.textAlign = "left";
      ctx.fillText(val.player_name, 150+m, y);
    }
      
    sc += 1;
    y += 25;
  });
    
  // Calculate dynamic position based on screen height
  // Position the text at the bottom of the screen with appropriate padding
  const bottomPadding = HEIGHT * 0.09; // 9% of screen height as padding
  const yPosition = HEIGHT - bottomPadding;
  
  // Determine if we should use larger text on bigger screens
  let useEnhancedText = WIDTH >= 1280 && HEIGHT >= 800;
  
  if (useEnhancedText) {
    // For larger screens, use the big bitmap font with a subtle effect
    DrawBitmapText("PRESS SPACE OR CLICK TO START", 0, yPosition - 10, 1, 0, 0);
  } else {
    // For standard/smaller screens, use the small bitmap font
    DrawBitmapTextSmall("PRESS SPACE OR CLICK TO START A NEW GAME", 0, yPosition, 1, 0, 0);
    
    // Add a subtle glow effect to make the text stand out
    ctx.shadowColor = '#ffcc00';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Re-draw the text with glow effect
    DrawBitmapTextSmall("PRESS SPACE OR CLICK TO START A NEW GAME", 0, yPosition, 1, 0, 0);
    
    // Reset shadow effects
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }
  
  return true;
}

/**
 * Start a new game from the intro screen
 */
export function startNewGame() {
  try {
    // Remove all event listeners
    removeAllEventListeners();
    
    // Call the callback to update game state
    if (gameStateCallback) {
      gameStateCallback(GAME_STATES.GAME_START);
    }
    
    // Update global game state variable
    window.game_state = GAME_STATES.GAME_START;
    
    console.log("Starting new game from intro screen - state set to: game_start");
  } catch(e) {
    console.error("Error starting new game from intro screen:", e);
  }
}

/**
 * Remove all event listeners
 */
function removeAllEventListeners() {
  if (introEventListenersAdded) {
    document.removeEventListener('keydown', handleIntroKeyDown);
    document.removeEventListener('mousedown', handleIntroMouseDown);
    introEventListenersAdded = false;
  }
}

/**
 * Handle key presses on intro screen
 */
function handleIntroKeyDown(evt) {
  if (evt.keyCode == 32) { // Space key
    evt.preventDefault();
    console.log("Space key pressed on intro screen");
    startNewGame();
  }
}

/**
 * Handle mouse clicks on intro screen
 */
function handleIntroMouseDown(evt) {
  // Any mouse click starts a new game
  console.log("Mouse clicked on intro screen");
  startNewGame();
}

/**
 * Load high score data from localStorage
 */
function loadHighScoreData() {
  try {
    if (typeof(Storage) !== "undefined") {
      const storedHighScores = localStorage.getItem('tetris_high_scores');
      if (storedHighScores) {
        high_scores = JSON.parse(storedHighScores);
        console.log("Loaded high scores from local storage:", high_scores.length);
      } else {
        // Initialize with empty array if no high scores exist
        high_scores = [];
      }
    }
  } catch (e) {
    console.error("Error loading high scores:", e);
    high_scores = [];
  }
}

/**
 * Set game statistics for display in the intro screen
 * 
 * @param {number} gameLines - Number of lines cleared
 * @param {number} gameLevel - Game level reached
 * @param {number} gameTotalSeconds - Total game time in seconds
 */
export function setGameStats(gameLines, gameLevel, gameTotalSeconds) {
  lines = gameLines;
  level = gameLevel;
  TotalSeconds = gameTotalSeconds;
}

/**
 * Format seconds into mm:ss display format
 * 
 * @param {number} seconds - Total seconds
 * @returns {string} Formatted time string
 */
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes < 10 ? '0' : ''}${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}