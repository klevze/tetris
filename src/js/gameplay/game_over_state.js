// filepath: d:\Sites\games\Tetris\src\js\gameplay\game_over_state.js
import { 
  canvas, ctx, WIDTH, HEIGHT, 
  DrawBitmapText, DrawBitmapTextSmall, 
  clearScreen, showBackground 
} from '../utils/functions.js';
import { GAME_STATES, STORAGE_KEYS } from '../config/config.js';
import { Draw3DStars } from '../components/starfield_3d.js';

// Game variables
let player_name = "PLAYER";
let score = 0;
let level = 1;
let lines = 0;
let gameTime = 0;
let gameStateCallback = null;
let gameOverEventListenersAdded = false;
let mainKeyHandler = null;

// Asset references
let back_intro_img;
let fonts_big_img;
let fonts_small_img;

/**
 * Initialize the game over state module
 * 
 * @param {Object} images - Object containing all game images
 * @param {Function} updateGameStateCallback - Function to update game state
 */
export function initGameOverState(images, updateGameStateCallback) {
  // Store image references
  back_intro_img = images.back_intro;
  fonts_big_img = images.fonts_big;
  fonts_small_img = images.fonts_small;
  
  // Store callback for state changes
  gameStateCallback = updateGameStateCallback;
}

/**
 * Update game over state with final score data
 * 
 * @param {number} finalScore - Final score from the game
 * @param {number} finalLevel - Final level reached
 * @param {number} finalLines - Total lines cleared
 * @param {number} finalTime - Total game time in seconds
 */
export function setGameOverData(finalScore, finalLevel, finalLines, finalTime) {
  score = finalScore;
  level = finalLevel;
  lines = finalLines;
  gameTime = finalTime;
}

/**
 * Handle the game over state
 * Shows game over screen with name entry field
 * 
 * @param {Function} setGameState - Function to update game state
 * @returns {boolean} True if state was handled
 */
export function handleGameOverState(setGameState) {
  // Set up game over screen event handlers if not already set
  if (!gameOverEventListenersAdded) {
    // Add game over specific event listeners
    // Only allow name entry if score is greater than 0
    if (score > 0) {
      document.addEventListener('keydown', handleGameOverKeyDown, true);
    } else {
      // For score of 0, add a simpler listener that just returns to intro on any key press
      document.addEventListener('keydown', handleZeroScoreKeyDown, true);
    }
    gameOverEventListenersAdded = true;
  }

  // Clear screen and draw background with starfield effect
  clearScreen('#000');
  showBackground(back_intro_img, 0, 0, WIDTH, HEIGHT);
  Draw3DStars();
  
  // Draw game over texts
  DrawBitmapText('GAME OVER', 0, 30, 1, 0, 0);
  
  // Only show name entry prompt if score > 0
  if (score > 0) {
    DrawBitmapTextSmall('PLEASE ENTER YOUR NAME', 0, 180, 1, 0, 0);
    
    // Draw player name with shadow effect
    ctx.font = "40px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = '#333';
    ctx.fillText(player_name, 403, 283);
    ctx.fillStyle = '#fff';
    ctx.fillText(player_name, 400, 280);
  } else {
    // For score of 0, show different message
    DrawBitmapTextSmall('PRESS ANY KEY TO CONTINUE', 0, 180, 1, 0, 0);
  }
  
  // Draw score display
  DrawBitmapText('YOUR SCORE ' + score, 0, 520, 1, 1, 10);
  
  return true;
}

/**
 * Handle key presses on the game over screen
 * Manages name entry and submission
 * 
 * @param {KeyboardEvent} evt - Keyboard event
 */
function handleGameOverKeyDown(evt) {
  // Clear placeholder text on first keypress
  if (player_name === "PLAYER") {
    player_name = "";
  }
  
  // Handle backspace (delete last character)
  if (evt.keyCode === 8) {
    evt.preventDefault();
    player_name = player_name.slice(0, -1);
    return;
  }

  // Handle Enter key (submit score)
  if (evt.keyCode === 13) {
    // Save the high score data
    saveHighScoreData(player_name, score);
    
    // Clean up event listeners
    document.removeEventListener('keydown', handleGameOverKeyDown, true);
    gameOverEventListenersAdded = false;
    
    // Transition to intro state
    if (gameStateCallback) {
      gameStateCallback(GAME_STATES.GAME_INTRO);
    }
    
    return;
  }
  
  // Only allow alphanumeric characters, comma, period, hyphen, and space
  if ((evt.keyCode >= 65 && evt.keyCode <= 90) ||   // A-Z
      (evt.keyCode >= 48 && evt.keyCode <= 57) ||   // 0-9
      evt.keyCode === 188 || evt.keyCode === 190 || // comma, period
      evt.keyCode === 173 || evt.keyCode === 32) {  // hyphen, space
    
    // Limit name length to 15 characters
    if (player_name.length < 15) {
      player_name += String.fromCharCode(evt.keyCode);
    }
  }
}

/**
 * Handle key presses for zero score game over screen
 * Any key press returns to intro screen
 * 
 * @param {KeyboardEvent} evt - Keyboard event
 */
function handleZeroScoreKeyDown(evt) {
  // Any key press goes back to intro screen
  document.removeEventListener('keydown', handleZeroScoreKeyDown, true);
  gameOverEventListenersAdded = false;
  
  // Transition to intro state
  if (gameStateCallback) {
    gameStateCallback(GAME_STATES.GAME_INTRO);
  }
}

/**
 * Save high score data to localStorage
 * 
 * @param {string} name - Player name
 * @param {number} scoreVal - Final score
 * @returns {Array} Updated high scores array
 */
function saveHighScoreData(name, scoreVal) {
  try {
    // Get existing high scores from localStorage or initialize empty array
    const highScores = JSON.parse(localStorage.getItem(STORAGE_KEYS.HIGH_SCORES) || '[]');
    
    // Format game time 
    const minutes = Math.floor(gameTime / 60);
    const seconds = gameTime % 60;
    const formattedTime = `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    
    // Add new score entry with additional game stats
    highScores.push({
      player_name: name || "UNKNOWN",
      score: scoreVal,
      level: level,
      cleared_lines: lines,
      time: formattedTime,
      date: new Date().toISOString()
    });
    
    // Sort by score (highest first)
    highScores.sort((a, b) => b.score - a.score);
    
    // Keep only top 10
    const top10 = highScores.slice(0, 10);
    
    // Save back to localStorage
    localStorage.setItem(STORAGE_KEYS.HIGH_SCORES, JSON.stringify(top10));
    
    console.log(`High score saved: ${name} - ${scoreVal}, Level: ${level}, Lines: ${lines}`);
    return top10;
  } catch (e) {
    console.error("Error saving high score:", e);
    return [];
  }
}

/**
 * Reset state when leaving the game over screen
 */
export function resetGameOverState() {
  // Reset player name for next game
  player_name = "PLAYER";
  
  // Remove event listeners if active
  if (gameOverEventListenersAdded) {
    document.removeEventListener('keydown', handleGameOverKeyDown, true);
    gameOverEventListenersAdded = false;
  }
}