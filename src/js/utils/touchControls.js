/**
 * Touch Controls Module
 * Handles touch-based interactions for mobile devices, including a virtual joystick.
 */

import { eventBus, GAME_EVENTS } from './events.js';
import { getState } from '../core/gameState.js';
import { GAME_STATES } from '../config/config.js';
import { moveBlockDirection, rotateBlock, HoldBlock } from '../components/gameplay/block.js';

// Configuration for touch controls
const CONFIG = {
  joystick: {
    deadzone: 10, // Minimum distance to register joystick movement
    maxDistance: 35, // Maximum distance joystick can move from center
    repeatDelay: 150, // Time in ms between action repeats when joystick held
  },
  controlType: 'buttons', // 'buttons' or 'joystick'
};

// State variables for touch controls
let joystickActive = false;
let joystickAngle = 0;
let joystickDistance = 0;
let joystickX = 0;
let joystickY = 0;
let joystickBaseX = 0;
let joystickBaseY = 0;
let joystickTimers = {
  left: null,
  right: null,
  down: null,
};

// Long press timer
let longPressTimer = null;
const LONG_PRESS_DELAY = 500; // ms to trigger long press

// Elements references
let joystickContainer;
let joystick;

/**
 * Initialize touch controls for mobile devices
 */
export function initTouchControls() {
  joystickContainer = document.getElementById('joystick-container');
  joystick = document.getElementById('joystick');
  
  if (!joystickContainer || !joystick) {
    console.warn('Joystick elements not found in the DOM');
    return;
  }

  // Get button references
  const rotateBtn = document.getElementById('rotate-btn');
  const leftBtn = document.getElementById('left-btn');
  const rightBtn = document.getElementById('right-btn');
  const downBtn = document.getElementById('down-btn');
  const dropBtn = document.getElementById('drop-btn');
  const holdBtn = document.getElementById('hold-btn');
  const pauseBtn = document.getElementById('pause-btn');

  // Helper function to prevent default behavior and add events
  function addButtonListeners(button, handler, options = {}) {
    if (!button) return;
    
    const touchStartHandler = (e) => {
      e.preventDefault();
      
      // If long press is configured
      if (options.longPress) {
        longPressTimer = setTimeout(() => {
          options.longPress();
          longPressTimer = null;
        }, LONG_PRESS_DELAY);
      }
      
      handler();
    };
    
    const touchEndHandler = (e) => {
      e.preventDefault();
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      
      if (options.touchEnd) {
        options.touchEnd();
      }
    };
    
    button.addEventListener('touchstart', touchStartHandler, { passive: false });
    button.addEventListener('touchend', touchEndHandler, { passive: false });
    button.addEventListener('mousedown', handler); // For desktop testing
    
    if (options.touchEnd) {
      button.addEventListener('mouseup', options.touchEnd);
    }
  }

  // Add touch events to buttons
  addButtonListeners(rotateBtn, () => rotateBlock());
  addButtonListeners(leftBtn, () => moveBlockDirection('left'));
  addButtonListeners(rightBtn, () => moveBlockDirection('right'));
  addButtonListeners(downBtn, () => moveBlockDirection('down'));
  addButtonListeners(dropBtn, () => moveBlockDirection('drop'));
  addButtonListeners(holdBtn, () => HoldBlock());
  
  // Pause button with special handling
  if (pauseBtn) {
    pauseBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      togglePause();
    }, { passive: false });
    
    pauseBtn.addEventListener('click', togglePause);
  }

  // Initialize virtual joystick
  initJoystick();
  
  // Load control preferences
  loadControlPreferences();
  
  // Handle device detection for showing touch controls
  if (isTouchDevice()) {
    // Initially set visibility based on current state
    showTouchControls();
    
    // Add event listener to update visibility when game state changes
    eventBus.on(GAME_EVENTS.STATE_CHANGED, (data) => {
      showTouchControls();
    });
  }

  // Listen for orientation changes
  window.addEventListener('orientationchange', handleOrientationChange);
  handleOrientationChange(); // Check initial orientation
}

/**
 * Initialize the virtual joystick
 */
function initJoystick() {
  if (!joystickContainer || !joystick) return;

  // Set initial position
  updateJoystickPos(0, 0);
  
  // Handle touch events for joystick container
  joystickContainer.addEventListener('touchstart', handleJoystickStart, { passive: false });
  joystickContainer.addEventListener('touchmove', handleJoystickMove, { passive: false });
  joystickContainer.addEventListener('touchend', handleJoystickEnd, { passive: false });
  
  // Mouse events for testing on desktop
  joystickContainer.addEventListener('mousedown', handleJoystickStart);
  document.addEventListener('mousemove', handleJoystickMove);
  document.addEventListener('mouseup', handleJoystickEnd);
}

/**
 * Handle joystick touch start
 * @param {Event} e - Touch or mouse event
 */
function handleJoystickStart(e) {
  e.preventDefault();
  
  joystickActive = true;
  
  // Get container position
  const rect = joystickContainer.getBoundingClientRect();
  joystickBaseX = rect.left + rect.width / 2;
  joystickBaseY = rect.top + rect.height / 2;
  
  // Handle touch or mouse
  const clientX = e.clientX || (e.touches && e.touches[0].clientX);
  const clientY = e.clientY || (e.touches && e.touches[0].clientY);
  
  updateJoystickState(clientX, clientY);
}

/**
 * Handle joystick touch move
 * @param {Event} e - Touch or mouse event
 */
function handleJoystickMove(e) {
  e.preventDefault();
  
  if (!joystickActive) return;
  
  // Handle touch or mouse
  const clientX = e.clientX || (e.touches && e.touches[0].clientX);
  const clientY = e.clientY || (e.touches && e.touches[0].clientY);
  
  updateJoystickState(clientX, clientY);
  processJoystickInput();
}

/**
 * Handle joystick touch end
 * @param {Event} e - Touch or mouse event
 */
function handleJoystickEnd(e) {
  e.preventDefault();
  
  if (!joystickActive) return;
  
  joystickActive = false;
  updateJoystickPos(0, 0);
  
  // Clear all joystick timers
  Object.keys(joystickTimers).forEach(key => {
    if (joystickTimers[key]) {
      clearTimeout(joystickTimers[key]);
      joystickTimers[key] = null;
    }
  });
}

/**
 * Update joystick position and state
 * @param {number} clientX - Client X position
 * @param {number} clientY - Client Y position
 */
function updateJoystickState(clientX, clientY) {
  // Calculate displacement from center
  const deltaX = clientX - joystickBaseX;
  const deltaY = clientY - joystickBaseY;
  
  // Calculate angle and distance
  joystickAngle = Math.atan2(deltaY, deltaX);
  joystickDistance = Math.min(
    CONFIG.joystick.maxDistance,
    Math.sqrt(deltaX * deltaX + deltaY * deltaY)
  );
  
  // Calculate joystick position
  if (joystickDistance > CONFIG.joystick.deadzone) {
    joystickX = Math.cos(joystickAngle) * joystickDistance;
    joystickY = Math.sin(joystickAngle) * joystickDistance;
  } else {
    joystickX = 0;
    joystickY = 0;
  }
  
  updateJoystickPos(joystickX, joystickY);
}

/**
 * Process joystick input to trigger game actions
 */
function processJoystickInput() {
  // Only process input if joystick moved beyond deadzone
  if (joystickDistance <= CONFIG.joystick.deadzone) return;
  
  // Determine the dominant direction
  const absX = Math.abs(joystickX);
  const absY = Math.abs(joystickY);
  
  // Clear existing timers
  Object.keys(joystickTimers).forEach(key => {
    if (joystickTimers[key]) {
      clearTimeout(joystickTimers[key]);
      joystickTimers[key] = null;
    }
  });
  
  // Process directional input based on dominant axis
  if (absX > absY) {
    // Horizontal movement dominates
    if (joystickX < 0) {
      moveBlockDirection('left');
      joystickTimers.left = setTimeout(() => {
        moveBlockDirection('left');
        joystickTimers.left = setInterval(() => moveBlockDirection('left'), CONFIG.joystick.repeatDelay);
      }, CONFIG.joystick.repeatDelay);
    } else {
      moveBlockDirection('right');
      joystickTimers.right = setTimeout(() => {
        moveBlockDirection('right');
        joystickTimers.right = setInterval(() => moveBlockDirection('right'), CONFIG.joystick.repeatDelay);
      }, CONFIG.joystick.repeatDelay);
    }
  } else {
    // Vertical movement dominates
    if (joystickY > 0) {
      moveBlockDirection('down');
      joystickTimers.down = setTimeout(() => {
        moveBlockDirection('down');
        joystickTimers.down = setInterval(() => moveBlockDirection('down'), CONFIG.joystick.repeatDelay);
      }, CONFIG.joystick.repeatDelay);
    } else {
      // Up direction - rotate
      rotateBlock();
      // No repeat for rotation
    }
  }
}

/**
 * Update joystick visual position
 * @param {number} x - Joystick X offset
 * @param {number} y - Joystick Y offset
 */
function updateJoystickPos(x, y) {
  if (!joystick) return;
  
  joystick.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
}

/**
 * Toggle between virtual joystick and button controls
 */
export function toggleControlType() {
  if (CONFIG.controlType === 'buttons') {
    CONFIG.controlType = 'joystick';
    
    // Show joystick, hide directional buttons
    if (joystickContainer) joystickContainer.style.display = 'block';
    
    const buttons = document.querySelectorAll('.movement-controls .controls-row');
    buttons.forEach(row => {
      row.style.display = 'none';
    });
  } else {
    CONFIG.controlType = 'buttons';
    
    // Hide joystick, show directional buttons
    if (joystickContainer) joystickContainer.style.display = 'none';
    
    const buttons = document.querySelectorAll('.movement-controls .controls-row');
    buttons.forEach(row => {
      row.style.display = 'flex';
    });
  }
  
  // Save preference
  saveControlPreferences();
}

/**
 * Show touch controls only during actual gameplay
 */
function showTouchControls() {
  const touchControlsElem = document.querySelector('.touch-controls');
  if (!touchControlsElem) return;
  
  const state = getState();
  
  // Only show touch controls during active gameplay
  if (state.currentState === GAME_STATES.PLAY_GAME) {
    touchControlsElem.style.display = 'flex';
  } else {
    // Hide controls on loading or intro screens
    touchControlsElem.style.display = 'none';
  }
}

/**
 * Hide touch controls
 */
export function hideTouchControls() {
  const touchControlsElem = document.querySelector('.touch-controls');
  if (touchControlsElem) {
    touchControlsElem.style.display = 'none';
  }
}

/**
 * Toggle pause state
 */
function togglePause() {
  const state = getState();
  
  if (state.currentState === GAME_STATES.PLAY_GAME) {
    // Find togglePause function from game.js and call it
    if (typeof window.toggleGamePause === 'function') {
      window.toggleGamePause();
    } else {
      // Fallback - emit pause event
      const isPaused = !state.isPaused;
      eventBus.emit(isPaused ? GAME_EVENTS.GAME_PAUSE : GAME_EVENTS.GAME_RESUME);
    }
  }
}

/**
 * Handle device orientation changes
 */
function handleOrientationChange() {
  const orientationWarning = document.querySelector('.orientation-warning');
  if (!orientationWarning) return;
  
  // Check if we're on a mobile device with landscape orientation and limited height
  if (window.innerHeight < 450 && window.innerWidth > window.innerHeight) {
    orientationWarning.style.display = 'flex';
  } else {
    orientationWarning.style.display = 'none';
  }
}

/**
 * Check if current device is a touch device
 * @returns {boolean} True if device has touch support
 */
function isTouchDevice() {
  return (
    ('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0) ||
    (navigator.msMaxTouchPoints > 0)
  );
}

/**
 * Save control preferences
 */
function saveControlPreferences() {
  try {
    if (typeof(Storage) !== "undefined") {
      localStorage.setItem('tetris_control_type', CONFIG.controlType);
    }
  } catch (e) {
    console.error("Could not save control preferences:", e);
  }
}

/**
 * Load control preferences
 */
function loadControlPreferences() {
  try {
    if (typeof(Storage) !== "undefined") {
      const savedControlType = localStorage.getItem('tetris_control_type');
      if (savedControlType) {
        CONFIG.controlType = savedControlType;
        
        // Apply saved preference
        if (CONFIG.controlType === 'joystick') {
          if (joystickContainer) joystickContainer.style.display = 'block';
          
          const buttons = document.querySelectorAll('.movement-controls .controls-row');
          buttons.forEach(row => {
            row.style.display = 'none';
          });
        }
      }
    }
  } catch (e) {
    console.error("Could not load control preferences:", e);
  }
}

// Add a swipe detector for the canvas to handle game-wide swipe gestures
export function initCanvasSwipeDetector() {
  const canvas = document.getElementById('mainCanvas');
  if (!canvas) return;
  
  let touchStartX = 0;
  let touchStartY = 0;
  let lastTapTime = 0;
  
  // Threshold for swipe detection
  const SWIPE_THRESHOLD = 30;
  const DOUBLE_TAP_DELAY = 300; // ms
  
  // Touch start
  canvas.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    
    // Check for double tap
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTapTime;
    
    if (tapLength < DOUBLE_TAP_DELAY && tapLength > 0) {
      // Double tap detected
      e.preventDefault();
      moveBlockDirection('drop');
      lastTapTime = 0; // Reset to prevent triple tap
    } else {
      // Single tap
      lastTapTime = currentTime;
    }
  }, { passive: false });
  
  // Touch end
  canvas.addEventListener('touchend', (e) => {
    if (e.changedTouches.length === 0) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const diffX = touchEndX - touchStartX;
    const diffY = touchStartY - touchEndY; // Invert Y for intuitive directions
    
    // Check if movement is significant enough to be a swipe
    if (Math.abs(diffX) > SWIPE_THRESHOLD || Math.abs(diffY) > SWIPE_THRESHOLD) {
      e.preventDefault();
      
      // Determine direction based on which axis has greater movement
      if (Math.abs(diffX) > Math.abs(diffY)) {
        // Horizontal swipe
        if (diffX > 0) {
          moveBlockDirection('right');
        } else {
          moveBlockDirection('left');
        }
      } else {
        // Vertical swipe
        if (diffY > 0) {
          rotateBlock(); // Swipe up = rotate
        } else {
          moveBlockDirection('down');
        }
      }
    }
  }, { passive: false });
}