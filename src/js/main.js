/**
 * Main Tetris Game Entry Point
 * Initializes the game and handles bootstrapping
 */
import { preloadAssets } from './assetManager.js';
import { GAME_STATES, STORAGE_KEYS } from './config/config.js';
import { changeState, addListener, getState, toggleMusic } from './gameState.js';
import { initGame } from './game.js';
import { setCanvasSize } from './functions.js';

// Wait for DOM to be ready before initializing
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded, initializing Tetris game');
  
  // Get canvas reference
  const canvas = document.getElementById('mainCanvas');
  
  if (!canvas || !canvas.getContext) {
    console.error("Canvas not supported by browser");
    document.body.innerHTML = '<div style="text-align:center;color:white;padding:20px;">Your browser does not support HTML5 Canvas. Please use a modern browser to play Tetris.</div>';
    return;
  }

  // Set proper canvas size based on device
  setCanvasSize();
  
  // Add resize handler
  window.addEventListener('resize', handleResize);
  
  // Initialize loading screen
  initializeLoadingScreen();
  
  // Set up user interaction handlers (needed for audio)
  setupUserInteractionHandlers();
  
  // Set up touch controls for mobile devices
  setupTouchControls();
  
  // Start asset loading
  preloadAssets(
    (progress) => updateLoadingProgress(progress),
    () => onAssetsLoaded()
  );
});

/**
 * Initialize the loading screen
 */
function initializeLoadingScreen() {
  const canvas = document.getElementById('mainCanvas');
  const ctx = canvas.getContext('2d');
  
  // Simple loading animation while the asset manager initializes
  let dots = 0;
  const loadingInterval = setInterval(() => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#fff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const dotString = '.'.repeat(dots + 1);
    ctx.fillText(`Loading${dotString}`, canvas.width/2, canvas.height/2);
    
    dots = (dots + 1) % 3;
  }, 500);
  
  // Store the interval ID in a global variable so we can clear it later
  window.loadingInterval = loadingInterval;
}

/**
 * Update loading progress display
 * @param {number} progress - Loading progress from 0 to 1
 */
function updateLoadingProgress(progress) {
  const canvas = document.getElementById('mainCanvas');
  const ctx = canvas.getContext('2d');
  
  // Clear screen
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw progress bar
  const barWidth = canvas.width * 0.7;
  const barHeight = 20;
  const barX = (canvas.width - barWidth) / 2;
  const barY = canvas.height / 2 + 40;
  
  // Draw progress bar background
  ctx.fillStyle = '#333';
  ctx.fillRect(barX, barY, barWidth, barHeight);
  
  // Draw progress bar fill
  ctx.fillStyle = '#0f0';
  ctx.fillRect(barX, barY, barWidth * progress, barHeight);
  
  // Draw text
  ctx.fillStyle = '#fff';
  ctx.font = '18px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Loading assets: ${Math.floor(progress * 100)}%`, canvas.width/2, barY - 20);
}

/**
 * Handle completion of asset loading
 */
function onAssetsLoaded() {
  console.log('All assets loaded successfully');
  
  // Clear the simple loading animation
  clearInterval(window.loadingInterval);
  
  // Initialize the full game with all modules
  initGame();
  
  // Load saved preferences
  loadPreferences();
  
  // Register listener for game state changes
  addListener(handleGameStateChange);
}

/**
 * Load user preferences from local storage
 */
function loadPreferences() {
  if (typeof(Storage) !== "undefined") {
    // Load music preference
    const musicPref = localStorage.getItem(STORAGE_KEYS.MUSIC_PREFERENCE);
    if (musicPref !== null && musicPref === "false") {
      // Disable music if preference was set to false
      toggleMusic();
    }
  }
}

/**
 * Set up event listeners for initial user interaction
 * Modern browsers require user interaction before playing audio
 */
function setupUserInteractionHandlers() {
  const userInteractionEvents = ['click', 'touchstart', 'keydown'];
  
  const handleFirstInteraction = () => {
    console.log('User interaction detected, audio can play now');
    
    // Remove all interaction listeners since we only need one interaction
    userInteractionEvents.forEach(event => {
      document.removeEventListener(event, handleFirstInteraction);
    });
  };
  
  // Add event listeners for first user interaction
  userInteractionEvents.forEach(event => {
    document.addEventListener(event, handleFirstInteraction);
  });
}

/**
 * Set up touch controls for mobile devices
 */
function setupTouchControls() {
  // Get references to all touch control buttons
  const rotateBtn = document.getElementById('rotate-btn');
  const leftBtn = document.getElementById('left-btn');
  const rightBtn = document.getElementById('right-btn');
  const downBtn = document.getElementById('down-btn');
  const dropBtn = document.getElementById('drop-btn');
  const holdBtn = document.getElementById('hold-btn');
  const pauseBtn = document.getElementById('pause-btn');
  
  // Helper function to create touch events
  const createKeyEvent = (keyCode) => {
    return new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      keyCode: keyCode
    });
  };
  
  // Add touch event listeners with vibration feedback when available
  if (rotateBtn) {
    rotateBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      document.dispatchEvent(createKeyEvent(38)); // Up arrow
      if (window.navigator.vibrate) window.navigator.vibrate(15);
    });
  }
  
  if (leftBtn) {
    leftBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      document.dispatchEvent(createKeyEvent(37)); // Left arrow
      if (window.navigator.vibrate) window.navigator.vibrate(15);
    });
  }
  
  if (rightBtn) {
    rightBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      document.dispatchEvent(createKeyEvent(39)); // Right arrow
      if (window.navigator.vibrate) window.navigator.vibrate(15);
    });
  }
  
  if (downBtn) {
    downBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      document.dispatchEvent(createKeyEvent(40)); // Down arrow
      if (window.navigator.vibrate) window.navigator.vibrate(15);
    });
  }
  
  if (dropBtn) {
    dropBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      document.dispatchEvent(createKeyEvent(32)); // Space
      if (window.navigator.vibrate) window.navigator.vibrate([20, 10, 20]);
    });
  }
  
  if (holdBtn) {
    holdBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      document.dispatchEvent(createKeyEvent(72)); // H key
      if (window.navigator.vibrate) window.navigator.vibrate(15);
    });
  }
  
  if (pauseBtn) {
    pauseBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      document.dispatchEvent(createKeyEvent(80)); // P key
      if (window.navigator.vibrate) window.navigator.vibrate([15, 15, 15]);
    });
  }
  
  // Add button press animation
  const buttons = document.querySelectorAll('.touch-controls button');
  buttons.forEach(button => {
    button.addEventListener('touchstart', () => {
      button.style.transform = 'scale(0.95)';
    });
    
    button.addEventListener('touchend', () => {
      button.style.transform = 'scale(1)';
    });
  });
}

/**
 * Handle window resize events
 */
function handleResize() {
  setCanvasSize();
  
  // Only redraw immediately if we're not in the game loop yet
  const state = getState();
  if (state.currentState === GAME_STATES.LOADING) {
    const canvas = document.getElementById('mainCanvas');
    const ctx = canvas.getContext('2d');
    
    // Force a redraw of loading screen
    updateLoadingProgress(0.5); // Use an approximate value
  }
}

/**
 * Handle game state changes
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
function handleGameStateChange(event, data) {
  if (event === 'stateChanged') {
    console.log(`Game state changed: ${data.oldState} -> ${data.newState}`);
    
    // Update page title based on game state
    const baseTitle = 'Tetris';
    switch (data.newState) {
      case GAME_STATES.GAME_OVER:
        document.title = `${baseTitle} - Game Over`;
        break;
      case GAME_STATES.HIGH_SCORE:
        document.title = `${baseTitle} - High Scores`;
        break;
      default:
        document.title = baseTitle;
    }
  }
}

// Prevent default spacebar and arrow key behavior (scrolling)
window.addEventListener("keydown", function(e) {
  if([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) {
    e.preventDefault();
  }
}, false);

// Optional: Temporarily disable exit confirmation
// window.onbeforeunload = function() {
//   return 'Are you sure you want to leave Tetris? Your progress will be lost.';
// };