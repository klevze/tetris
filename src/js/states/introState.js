/**
 * Intro Screen State Module
 * Handles the game's intro screen with high scores, logo animation, and game start functionality
 */

import { 
  canvas, ctx, WIDTH, HEIGHT, 
  DrawBitmapText, DrawBitmapTextSmall, 
  clearScreen, showBackground 
} from '../utils/functions.js';
import { GAME_STATES, UI } from '../config/config.js';
import { getImage } from '../utils/assetManager.js';
import { loadHighScores } from '../config/firebase.js';

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

// Cloud high scores status
let isLoadingScores = false;
let cloudScoresLoaded = false;
let cloudLoadError = false;
let loadStartTime = 0;
let scoreLoadRetries = 0;
const MAX_RETRIES = 3;

// Assets
let back_intro_img;
let logo_img;

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
  
  // Store callback for state changes
  gameStateCallback = updateGameStateCallback;
  
  // First load from localStorage as a fallback
  loadHighScoreData();
  
  // Then try to load from Firebase
  loadCloudHighScores();
}

/**
 * Load high scores from Firebase cloud
 */
function loadCloudHighScores() {
  // Don't start a new load if we're already loading
  if (isLoadingScores) return;
  
  isLoadingScores = true;
  loadStartTime = Date.now();
  cloudLoadError = false;
  
  // Load high scores from Firebase
  loadHighScores()
    .then(scores => {
      if (scores && scores.length > 0) {
        high_scores = scores;
        cloudScoresLoaded = true;
      } else {
        // If no scores returned, keep using localStorage scores
        cloudScoresLoaded = false;
      }
      isLoadingScores = false;
    })
    .catch(error => {
      console.error("Error loading high scores from Firebase:", error);
      cloudLoadError = true;
      isLoadingScores = false;
      
      // Retry a few times if needed
      if (scoreLoadRetries < MAX_RETRIES) {
        scoreLoadRetries++;
        setTimeout(loadCloudHighScores, 3000); // Retry after 3 seconds
      }
    });
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

  // Add a cloud high scores badge
  const badgeWidth = 170;
  const badgeHeight = 30;
  const badgeX = WIDTH - badgeWidth - 10;
  const badgeY = 10;
  
  // Draw the badge background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(badgeX, badgeY, badgeWidth, badgeHeight);
  
  // Show different status based on cloud loading state
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  
  if (isLoadingScores) {
    // Animate loading dots
    const dots = ".".repeat(1 + Math.floor(Date.now() / 300) % 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`LOADING SCORES${dots}`, badgeX + badgeWidth/2, badgeY + 20);
  } else if (cloudLoadError) {
    ctx.fillStyle = '#ff6b6b'; // Red for error
    ctx.fillText(`USING LOCAL SCORES`, badgeX + badgeWidth/2, badgeY + 20);
  } else if (cloudScoresLoaded) {
    ctx.fillStyle = '#4ecdc4'; // Teal for cloud
    ctx.fillText(`CLOUD HIGH SCORES`, badgeX + badgeWidth/2, badgeY + 20);
  } else {
    ctx.fillStyle = '#ffe66d'; // Yellow for local
    ctx.fillText(`LOCAL HIGH SCORES`, badgeX + badgeWidth/2, badgeY + 20);
  }

  // Calculate positions for the high scores section
  // Logo + space + scores list + space + bottom text
  const verticalSpacing = HEIGHT * 0.30; // Increased from 0.25 to 0.30 to move lower
  const topPlayersY = Math.max(220, verticalSpacing + 100); // Increased from 200 to 220
  
  // Draw "TOP PLAYERS" text centered with larger font
  DrawBitmapText("TOP PLAYERS", 0, topPlayersY, 1, 0, 0);
    
  // Start high scores list below the title with more spacing
  let y = topPlayersY + 130; // Increased from 110 to 130 for first entry to be even lower
  let p = 0;
  let ps = 0;
  
  // Show a "refresh" button if cloud load failed
  if (cloudLoadError && !isLoadingScores) {
    // Draw a small refresh button
    const btnWidth = 120;
    const btnHeight = 25;
    const btnX = (WIDTH - btnWidth) / 2;
    const btnY = y;
    
    // Button background
    ctx.fillStyle = '#4285F4'; // Google blue
    ctx.fillRect(btnX, btnY, btnWidth, btnHeight);
    
    // Button text
    ctx.font = '14px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText("RETRY CLOUD", btnX + btnWidth/2, btnY + 17);
    
    // Add click handler for the refresh button
    canvas.addEventListener('click', function refreshHandler(e) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      if (mouseX >= btnX && mouseX <= btnX + btnWidth &&
          mouseY >= btnY && mouseY <= btnY + btnHeight) {
        // Remove this handler to avoid duplicates
        canvas.removeEventListener('click', refreshHandler);
        // Reset error state and retry loading
        cloudLoadError = false;
        scoreLoadRetries = 0;
        loadCloudHighScores();
      }
    });
    
    y += btnHeight + 40;
  }
  
  // Calculate center position for the scores list
  const centerX = WIDTH / 2;
  const rankWidth = 60;   
  const nameWidth = 200;  
  const scoreWidth = 140; 
  const statsWidth = 80;  
  
  // Define column positions from center with more spacing
  const totalWidth = rankWidth + nameWidth + scoreWidth + (statsWidth * 3) + 140; // Increased spacing from 120 to 140
  const startX = centerX - (totalWidth / 2);
  const rankX = startX + 20;
  const nameX = rankX + rankWidth + 25;     
  const scoreX = nameX + nameWidth + 25;    
  const linesX = scoreX + scoreWidth + 40;  // Increased from 25 to 40 for more space between SCORE and LINE
  const levelX = linesX + statsWidth + 25;  
  const timeX = levelX + statsWidth + 25;  
  
  // Add score column headers with shadows
  const headerY = y - 30; // Position headers above the scores
  ctx.fillStyle = '#111'; // Shadow color
  
  // Draw column headers shadows
  DrawBitmapTextSmall("RANK", rankX + 2, headerY + 2, 0, 0, 0);
  DrawBitmapTextSmall("PLAYER", nameX + 2, headerY + 2, 0, 0, 0);
  DrawBitmapTextSmall("SCORE", scoreX + 2, headerY + 2, 0, 0, 0);
  DrawBitmapTextSmall("LINES", linesX + 2, headerY + 2, 0, 0, 0);
  DrawBitmapTextSmall("LEVEL", levelX + 2, headerY + 2, 0, 0, 0);
  DrawBitmapTextSmall("TIME", timeX + 2, headerY + 2, 0, 0, 0);
  
  // Draw column headers
  ctx.fillStyle = '#ffcc00'; // Gold color for headers
  DrawBitmapTextSmall("RANK", rankX, headerY, 0, 0, 0);
  DrawBitmapTextSmall("PLAYER", nameX, headerY, 0, 0, 0);
  DrawBitmapTextSmall("SCORE", scoreX, headerY, 0, 0, 0);
  DrawBitmapTextSmall("LINES", linesX, headerY, 0, 0, 0);
  DrawBitmapTextSmall("LEVEL", levelX, headerY, 0, 0, 0);
  DrawBitmapTextSmall("TIME", timeX, headerY, 0, 0, 0);
    
  high_scores.forEach((val, index) => {
    p++;
    ps++;
      
    if (p % 2 == 0) {
      p = 0;
    }
      
    if (ps < 12) {
      // Apply sine wave effect for score listings (reduced)
      const m = Math.sin((k+ps*20) / 180 * 3.14) * 10;
        
      // Draw score entry with shadow effect - using larger bitmap font
      const isTopScore = ps == 1;
      const textColor = isTopScore ? '#faa' : (cloudScoresLoaded ? '#b3e5fc' : '#eee');
      const shadowColor = '#111';
      
      // Determine the max score length from the first (highest) score
      const maxScoreLength = index === 0 ? 
        val.score.toString().length : 
        high_scores[0].score.toString().length;
      
      // Format score with leading zeros to match the length of the highest score
      const formattedScore = val.score.toString().padStart(maxScoreLength, '0');
        
      // Draw shadows
      ctx.fillStyle = shadowColor;
      
      // Draw rank number for all entries (including first place)
      DrawBitmapText(ps + ".", rankX + m + 2, y + 2, 0, 0, 0);
      
      // Draw player name with shadow
      DrawBitmapText(val.player_name, nameX + m + 2, y + 2, 0, 0, 0);
      
      // Draw score with shadow (with matching leading zeros)
      DrawBitmapText(formattedScore, scoreX + m + 2, y + 2, 0, 0, 0);
      
      // Draw stats with shadow
      DrawBitmapText(val.cleared_lines.toString(), linesX + m + 2, y + 2, 0, 0, 0);
      DrawBitmapText(val.level.toString(), levelX + m + 2, y + 2, 0, 0, 0);
      DrawBitmapText(val.time, timeX + m + 2, y + 2, 0, 0, 0);
      
      // Draw the text with proper color
      ctx.fillStyle = textColor;
      
      // Draw rank number for all entries (including first place)
      DrawBitmapText(ps + ".", rankX + m, y, 0, 0, 0);
      
      // Draw player name
      DrawBitmapText(val.player_name, nameX + m, y, 0, 0, 0);
      
      // Draw score (with matching leading zeros)
      DrawBitmapText(formattedScore, scoreX + m, y, 0, 0, 0);
      
      // Draw stats
      DrawBitmapText(val.cleared_lines.toString(), linesX + m, y, 0, 0, 0);
      DrawBitmapText(val.level.toString(), levelX + m, y, 0, 0, 0);
      DrawBitmapText(val.time, timeX + m, y, 0, 0, 0);
    }
      
    sc += 1;
    
    // Same line height for all entries
    y += 55; // Consistent spacing of 55px between all entries
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