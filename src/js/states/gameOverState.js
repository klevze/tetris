/**
 * Game Over State Module
 * Handles the game over screen with name entry and high score saving
 */

import { 
  canvas, ctx, WIDTH, HEIGHT, 
  DrawBitmapText, DrawBitmapTextSmall, 
  clearScreen, showBackground 
} from '../utils/functions.js';
import { GAME_STATES, STORAGE_KEYS } from '../config/config.js';
import { Draw3DStars } from '../components/effects/starfield3d.js';
import { saveHighScore } from '../config/firebase.js';

// Game variables
let player_name = "PLAYER";
let score = 0;
let level = 1;
let lines = 0;
let gameTime = 0;
let gameStateCallback = null;
let gameOverEventListenersAdded = false;
let savingToCloud = false;
let saveSuccess = false;
let saveMessage = "";
let saveMessageTimer = 0;
let cursorBlinkTimer = 0;
let cursorBlinking = true;

// Asset references
let back_intro_img;

/**
 * Initialize the game over state module
 * 
 * @param {Object} images - Object containing all game images
 * @param {Function} updateGameStateCallback - Function to update game state
 */
export function initGameOverState(images, updateGameStateCallback) {
  // Store image references
  back_intro_img = images.back_intro;
  
  // Store callback for state changes
  gameStateCallback = updateGameStateCallback;
  
  // Try to get saved player name from localStorage
  try {
    const savedName = localStorage.getItem("player_name");
    if (savedName && savedName.trim() !== "") {
      player_name = savedName;
    }
  } catch (e) {
    console.warn("Could not retrieve saved player name:", e);
  }
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
    
    // Update cursor blink state every 30 frames (approximately 0.5 seconds)
    if (cursorBlinkTimer++ > 30) {
      cursorBlinkTimer = 0;
      cursorBlinking = !cursorBlinking;
    }
    
    // Draw player name with shadow effect - centered
    const displayName = cursorBlinking ? player_name + "_" : player_name + " ";
    ctx.font = "40px Arial";
    ctx.textAlign = "center"; // Center alignment
    
    // Draw shadow
    ctx.fillStyle = '#333';
    ctx.fillText(displayName, WIDTH / 2 + 3, 283);
    
    // Draw text
    ctx.fillStyle = '#fff';
    ctx.fillText(displayName, WIDTH / 2, 280);
    
    // Show cloud save status message if applicable
    if (saveMessage) {
      ctx.font = "20px Arial";
      ctx.textAlign = "center";
      ctx.fillStyle = saveSuccess ? '#4CAF50' : '#F44336'; // Green for success, red for error
      ctx.fillText(saveMessage, WIDTH / 2, 350);
      
      if (saveMessageTimer > 0) {
        saveMessageTimer--;
      } else {
        // Clear message after timer expires
        saveMessage = "";
      }
    }
    
    // Add a hint about using the previous name
    if (player_name !== "PLAYER" && player_name !== "") {
      ctx.font = "16px Arial";
      ctx.textAlign = "center";
      ctx.fillStyle = '#aaa';
      ctx.fillText("Press ENTER to submit", WIDTH / 2, 320);
    }
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
    
    // CRITICAL: Reset score to 0 immediately after saving high score
    // This ensures we don't carry the old score into the next game
    if (typeof window.score !== 'undefined') {
      window.score = 0;
      console.log("Reset window.score to 0 after submitting high score");
    }

    // Reset secure score system too
    if (typeof window.setScore === 'function') {
      window.setScore(0);
      console.log("Reset secure score to 0 after submitting high score");
    }
    
    // Import the refreshHighScores function to update high scores in the intro state
    import('../states/introState.js').then(introModule => {
      // Refresh high scores before transitioning to intro screen
      if (typeof introModule.refreshHighScores === 'function') {
        introModule.refreshHighScores();
      }
      
      // Transition to intro state
      if (gameStateCallback) {
        gameStateCallback(GAME_STATES.GAME_INTRO);
      }
    }).catch(error => {
      console.error("Error importing introState module:", error);
      // Still transition to intro state even if refresh fails
      if (gameStateCallback) {
        gameStateCallback(GAME_STATES.GAME_INTRO);
      }
    });
    
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
  
  // CRITICAL: Reset score to 0 before returning to intro screen
  if (typeof window.score !== 'undefined') {
    window.score = 0;
    console.log("Reset window.score to 0 when returning to intro with zero score");
  }

  // Reset secure score system too
  if (typeof window.setScore === 'function') {
    window.setScore(0);
    console.log("Reset secure score to 0 when returning to intro with zero score");
  }
  
  // Import the refreshHighScores function to update high scores in the intro state
  import('../states/introState.js').then(introModule => {
    // Refresh high scores before transitioning to intro screen
    if (typeof introModule.refreshHighScores === 'function') {
      introModule.refreshHighScores();
    }
    
    // Transition to intro state
    if (gameStateCallback) {
      gameStateCallback(GAME_STATES.GAME_INTRO);
    }
  }).catch(error => {
    console.error("Error importing introState module:", error);
    // Still transition to intro state even if refresh fails
    if (gameStateCallback) {
      gameStateCallback(GAME_STATES.GAME_INTRO);
    }
  });
}

/**
 * Save high score data to Firebase and localStorage as backup
 * 
 * @param {string} name - Player name
 * @param {number} scoreVal - Final score
 * @returns {Array} Updated high scores array
 */
function saveHighScoreData(name, scoreVal) {
  try {
    // Format game time 
    const minutes = Math.floor(gameTime / 60);
    const seconds = gameTime % 60;
    const formattedTime = `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    
    // Indicate we're saving to cloud
    savingToCloud = true;
    saveMessage = "Saving high score to cloud...";
    saveMessageTimer = 90; // About 1.5 seconds at 60fps
    
    // Save to Firebase
    saveHighScore(name || "UNKNOWN", scoreVal, level, lines, formattedTime)
      .then(updatedScores => {
        console.log(`High score saved to Firebase: ${name} - ${scoreVal}, Level: ${level}, Lines: ${lines}`);
        savingToCloud = false;
        saveSuccess = true;
        saveMessage = "High score saved to cloud!";
        saveMessageTimer = 120; // About 2 seconds at 60fps
      })
      .catch(error => {
        console.error("Error saving to Firebase, using localStorage fallback:", error);
        savingToCloud = false;
        saveSuccess = false;
        saveMessage = "Could not save to cloud - using local storage";
        saveMessageTimer = 120; // About 2 seconds at 60fps
        saveToLocalStorage(name, scoreVal, formattedTime);
      });
    
    // Also save to localStorage as backup
    saveToLocalStorage(name, scoreVal, formattedTime);
    
    return [];
  } catch (e) {
    console.error("Error saving high score:", e);
    saveMessage = "Error saving high score";
    saveMessageTimer = 120;
    saveSuccess = false;
    return [];
  }
}

/**
 * Save high score to localStorage as backup
 * 
 * @param {string} name - Player name
 * @param {number} scoreVal - Player score
 * @param {string} formattedTime - Formatted game time
 */
function saveToLocalStorage(name, scoreVal, formattedTime) {
  try {
    // Save player name for future games
    if (name && name.trim() !== "" && name !== "UNKNOWN") {
      localStorage.setItem("player_name", name);
    }
    
    // Get existing high scores from localStorage or initialize empty array
    const highScores = JSON.parse(localStorage.getItem(STORAGE_KEYS.HIGH_SCORES) || '[]');
    
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
    
    console.log(`High score saved to localStorage: ${name} - ${scoreVal}, Level: ${level}, Lines: ${lines}`);
  } catch (e) {
    console.error("Error saving high score to localStorage:", e);
  }
}

/**
 * Reset state when leaving the game over screen
 */
export function resetGameOverState() {
  // Try to get saved player name from localStorage
  try {
    const savedName = localStorage.getItem("player_name");
    if (savedName && savedName.trim() !== "") {
      player_name = savedName;
    } else {
      player_name = "PLAYER"; // Default if no saved name found
    }
  } catch (e) {
    console.warn("Could not retrieve saved player name:", e);
    player_name = "PLAYER"; // Default on error
  }
  
  // Reset cursor blinking
  cursorBlinking = true;
  cursorBlinkTimer = 0;
  
  // Reset save status
  savingToCloud = false;
  saveSuccess = false;
  saveMessage = "";
  saveMessageTimer = 0;
  
  // Remove event listeners if active
  if (gameOverEventListenersAdded) {
    document.removeEventListener('keydown', handleGameOverKeyDown, true);
    document.removeEventListener('keydown', handleZeroScoreKeyDown, true);
    gameOverEventListenersAdded = false;
  }
}