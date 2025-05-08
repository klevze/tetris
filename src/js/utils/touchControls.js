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
  buttonsLayout: 'double', // 'single' or 'double' row layout
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

// Add button timers for continuous movement
let buttonTimers = {
  left: null,
  right: null,
  down: null
};

// Configuration for button repeat
const BUTTON_REPEAT_DELAY = 150; // Time in ms before continuous movement starts
const BUTTON_REPEAT_INTERVAL = 100; // Interval for continuous movement

// Cached DOM references
let joystickContainer;
let joystick;
let touchControlsElem;
let controlRows;
let orientationWarningElem;

/**
 * Initialize touch controls for mobile devices
 */
export function initTouchControls() {
  // Cache DOM references - only query the DOM once
  joystickContainer = document.getElementById('joystick-container');
  joystick = document.getElementById('joystick');
  touchControlsElem = document.querySelector('.touch-controls');
  orientationWarningElem = document.querySelector('.orientation-warning');
  
  if (!touchControlsElem) {
    console.warn('Touch controls element not found in the DOM');
    return;
  }
  
  if (!joystickContainer || !joystick) {
    console.warn('Joystick elements not found in the DOM');
  }

  // Cache the control rows for toggling between joystick/buttons
  controlRows = document.querySelectorAll('.movement-controls .controls-row');

  // Get button references (cache these too)
  const buttons = {
    toggle: document.getElementById('toggle-controls'),
    layoutToggle: document.querySelector('.layout-toggle-icon'), // Updated to use the icon
    rotate: document.getElementById('rotate-btn'),
    left: document.getElementById('left-btn'),
    right: document.getElementById('right-btn'),
    down: document.getElementById('down-btn'),
    drop: document.getElementById('drop-btn'),
    hold: document.getElementById('hold-btn'),
    pause: document.getElementById('pause-btn')
  };

  // Initialize draggable functionality
  initDraggableControls();
  
  // Initialize layout toggle icon
  if (buttons.layoutToggle) {
    buttons.layoutToggle.addEventListener('click', toggleButtonsLayout);
    buttons.layoutToggle.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation(); // Prevent dragging when clicking the toggle icon
      toggleButtonsLayout();
    }, { passive: false });
  }
  
  // Initialize minimize/maximize functionality
  if (buttons.toggle) {
    buttons.toggle.addEventListener('click', toggleControlsSize);
    buttons.toggle.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation(); // Prevent dragging when clicking the toggle button
      toggleControlsSize();
    }, { passive: false });
  }

  // Apply initial layout based on preferences
  applyButtonsLayout();

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
      
      // Perform initial action immediately
      handler();
      
      // For movement buttons (left, right, down) add continuous movement
      if (options.continuous) {
        const direction = options.direction;
        
        // Clear any existing timer for this direction
        if (buttonTimers[direction]) {
          clearInterval(buttonTimers[direction]);
          buttonTimers[direction] = null;
        }
        
        // Set up continuous movement after a short delay
        buttonTimers[direction] = setTimeout(() => {
          // First repeat after delay
          handler();
          
          // Then set up interval for continuous movement
          buttonTimers[direction] = setInterval(handler, BUTTON_REPEAT_INTERVAL);
        }, BUTTON_REPEAT_DELAY);
      }
    };
    
    const touchEndHandler = (e) => {
      e.preventDefault();
      
      // Clear long press timer
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      
      // Clear continuous movement timer if exists
      if (options.continuous && buttonTimers[options.direction]) {
        clearInterval(buttonTimers[options.direction]);
        buttonTimers[options.direction] = null;
      }
      
      if (options.touchEnd) {
        options.touchEnd();
      }
    };
    
    button.addEventListener('touchstart', touchStartHandler, { passive: false });
    button.addEventListener('touchend', touchEndHandler, { passive: false });
    button.addEventListener('mousedown', (e) => {
      handler();
      
      // For movement buttons (left, right, down) add continuous movement for desktop testing
      if (options.continuous) {
        const direction = options.direction;
        
        // Clear any existing timer for this direction
        if (buttonTimers[direction]) {
          clearInterval(buttonTimers[direction]);
          buttonTimers[direction] = null;
        }
        
        // Set up continuous movement after a short delay
        buttonTimers[direction] = setTimeout(() => {
          // First repeat after delay
          handler();
          
          // Then set up interval for continuous movement
          buttonTimers[direction] = setInterval(handler, BUTTON_REPEAT_INTERVAL);
        }, BUTTON_REPEAT_DELAY);
      }
    });
    
    if (options.touchEnd || options.continuous) {
      button.addEventListener('mouseup', (e) => {
        // Clear continuous movement timer if exists
        if (options.continuous && buttonTimers[options.direction]) {
          clearInterval(buttonTimers[options.direction]);
          buttonTimers[options.direction] = null;
        }
        
        if (options.touchEnd) {
          options.touchEnd();
        }
      });
      
      // Also stop continuous movement when mouse leaves the button
      button.addEventListener('mouseleave', (e) => {
        if (options.continuous && buttonTimers[options.direction]) {
          clearInterval(buttonTimers[options.direction]);
          buttonTimers[options.direction] = null;
        }
      });
    }
  }

  // Add touch events to buttons using our cached references
  addButtonListeners(buttons.rotate, () => rotateBlock());
  addButtonListeners(buttons.left, () => moveBlockDirection('left'), { continuous: true, direction: 'left' });
  addButtonListeners(buttons.right, () => moveBlockDirection('right'), { continuous: true, direction: 'right' });
  addButtonListeners(buttons.down, () => moveBlockDirection('down'), { continuous: true, direction: 'down' });
  addButtonListeners(buttons.drop, () => moveBlockDirection('drop'));
  addButtonListeners(buttons.hold, () => HoldBlock());
  
  // Pause button with special handling
  if (buttons.pause) {
    buttons.pause.addEventListener('touchstart', (e) => {
      e.preventDefault();
      togglePause();
    }, { passive: false });
    
    buttons.pause.addEventListener('click', togglePause);
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
    eventBus.on(GAME_EVENTS.STATE_CHANGED, showTouchControls);
  }

  // Listen for orientation changes
  window.addEventListener('orientationchange', handleOrientationChange);
  handleOrientationChange(); // Check initial orientation
  
  // Load position from localStorage if available
  loadControlPosition();
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
  if (!joystickActive) return;
  
  e.preventDefault();
  
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
  if (!joystickActive) return;
  
  e.preventDefault();
  
  joystickActive = false;
  updateJoystickPos(0, 0);
  
  // Clear all joystick timers
  Object.keys(joystickTimers).forEach(key => {
    if (joystickTimers[key]) {
      clearInterval(joystickTimers[key]); // Clear both timeouts and intervals
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
      clearInterval(joystickTimers[key]); // Clear both timeouts and intervals
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
  
  // Use transform for better performance (avoids layout recalculation)
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
    
    if (controlRows) {
      controlRows.forEach(row => {
        row.style.display = 'none';
      });
    }
  } else {
    CONFIG.controlType = 'buttons';
    
    // Hide joystick, show directional buttons
    if (joystickContainer) joystickContainer.style.display = 'none';
    
    if (controlRows) {
      controlRows.forEach(row => {
        row.style.display = 'flex';
      });
    }
  }
  
  // Save preference
  saveControlPreferences();
}

/**
 * Toggle between single and double row button layouts
 */
function toggleButtonsLayout() {
  CONFIG.buttonsLayout = CONFIG.buttonsLayout === 'single' ? 'double' : 'single';
  applyButtonsLayout();
  saveControlPreferences();
}

/**
 * Apply the current button layout
 */
function applyButtonsLayout() {
  if (!touchControlsElem) return;
  
  const movementControls = touchControlsElem.querySelector('.movement-controls');
  const firstRow = touchControlsElem.querySelector('.controls-row:first-child');
  const actionRow = touchControlsElem.querySelector('.action-row');
  
  if (!movementControls || !firstRow || !actionRow) return;

  // Get all the buttons from both rows
  const leftBtn = document.getElementById('left-btn');
  const rotateBtn = document.getElementById('rotate-btn');
  const rightBtn = document.getElementById('right-btn');
  const holdBtn = document.getElementById('hold-btn');
  const downBtn = document.getElementById('down-btn');
  const dropBtn = document.getElementById('drop-btn');
  
  if (CONFIG.buttonsLayout === 'single') {
    // Apply single-line layout
    touchControlsElem.classList.add('controls-layout-single');
    
    // Move all buttons to the first row
    while (actionRow.firstChild) {
      firstRow.appendChild(actionRow.firstChild);
    }
    
    // Hide the second row
    actionRow.style.display = 'none';
    
    // Update button order in the single row for better usability
    if (leftBtn && rotateBtn && rightBtn && holdBtn && downBtn && dropBtn) {
      firstRow.innerHTML = ''; // Clear first
      firstRow.appendChild(leftBtn);
      firstRow.appendChild(downBtn);
      firstRow.appendChild(rotateBtn);
      firstRow.appendChild(rightBtn);
      firstRow.appendChild(holdBtn);
      firstRow.appendChild(dropBtn);
    }
  } else {
    // Apply double-line layout
    touchControlsElem.classList.remove('controls-layout-single');
    
    // Make sure the action row is visible
    actionRow.style.display = 'flex';
    
    // Restore original button positions
    if (leftBtn && rotateBtn && rightBtn && holdBtn && downBtn && dropBtn) {
      firstRow.innerHTML = ''; // Clear first
      actionRow.innerHTML = ''; // Clear second
      
      // First row: direction controls
      firstRow.appendChild(leftBtn);
      firstRow.appendChild(rotateBtn);
      firstRow.appendChild(rightBtn);
      
      // Second row: action buttons
      actionRow.appendChild(holdBtn);
      actionRow.appendChild(downBtn);
      actionRow.appendChild(dropBtn);
    }
  }
}

/**
 * Show touch controls only during actual gameplay
 */
function showTouchControls() {
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
  if (!orientationWarningElem) return;
  
  // Check if we're on a mobile device with landscape orientation and limited height
  if (window.innerHeight < 450 && window.innerWidth > window.innerHeight) {
    orientationWarningElem.style.display = 'flex';
  } else {
    orientationWarningElem.style.display = 'none';
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
      localStorage.setItem('tetris_buttons_layout', CONFIG.buttonsLayout);
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
      const savedButtonsLayout = localStorage.getItem('tetris_buttons_layout');
      if (savedControlType) {
        CONFIG.controlType = savedControlType;
        
        // Apply saved preference
        if (CONFIG.controlType === 'joystick') {
          if (joystickContainer) joystickContainer.style.display = 'block';
          
          if (controlRows) {
            controlRows.forEach(row => {
              row.style.display = 'none';
            });
          }
        }
      }
      if (savedButtonsLayout) {
        CONFIG.buttonsLayout = savedButtonsLayout;
        applyButtonsLayout();
      }
    }
  } catch (e) {
    console.error("Could not load control preferences:", e);
  }
}

/**
 * Load control position from localStorage
 */
function loadControlPosition() {
  try {
    if (typeof(Storage) !== "undefined") {
      const savedPosition = localStorage.getItem('tetris_control_position');
      if (savedPosition) {
        const position = JSON.parse(savedPosition);
        if (touchControlsElem) {
          touchControlsElem.style.left = `${position.x}px`;
          touchControlsElem.style.top = `${position.y}px`;
        }
      }
    }
  } catch (e) {
    console.error("Could not load control position:", e);
  }
}

/**
 * Save control position to localStorage
 */
function saveControlPosition(x, y) {
  try {
    if (typeof(Storage) !== "undefined") {
      const position = { x, y };
      localStorage.setItem('tetris_control_position', JSON.stringify(position));
    }
  } catch (e) {
    console.error("Could not save control position:", e);
  }
}

/**
 * Initialize draggable functionality for touch controls
 */
function initDraggableControls() {
  if (!touchControlsElem) return;

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialLeft = 0;
  let initialTop = 0;
  
  // Create drag handle if it doesn't exist
  let dragHandle = document.getElementById('controls-drag-handle');
  if (!dragHandle) {
    dragHandle = document.createElement('div');
    dragHandle.id = 'controls-drag-handle';
    dragHandle.className = 'controls-drag-handle';
    dragHandle.innerHTML = '⋮⋮'; // Drag icon
    
    // Style the drag handle
    dragHandle.style.position = 'absolute';
    dragHandle.style.top = '0';
    dragHandle.style.left = '50%';
    dragHandle.style.transform = 'translateX(-50%)';
    dragHandle.style.background = 'rgba(0, 0, 0, 0.6)';
    dragHandle.style.color = '#ffcc00';
    dragHandle.style.padding = '5px 10px';
    dragHandle.style.borderRadius = '0 0 10px 10px';
    dragHandle.style.fontSize = '16px';
    dragHandle.style.cursor = 'move';
    dragHandle.style.userSelect = 'none';
    dragHandle.style.touchAction = 'none';
    dragHandle.style.zIndex = '1000';
    
    // Append the drag handle to the touch controls
    touchControlsElem.appendChild(dragHandle);
  }

  // Touch event listeners specifically for the drag handle
  dragHandle.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent default touch behavior
    isDragging = true;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    const rect = touchControlsElem.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
    
    // Visual feedback when dragging starts
    dragHandle.style.background = 'rgba(255, 204, 0, 0.6)';
    dragHandle.style.color = '#000';
  }, { passive: false });

  // Add the touchmove event to the document instead of the handle
  // This allows dragging to continue even if the finger moves off the handle
  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const deltaX = e.touches[0].clientX - startX;
    const deltaY = e.touches[0].clientY - startY;
    
    // Calculate new position with boundary constraints
    const newLeft = Math.max(0, Math.min(window.innerWidth - touchControlsElem.offsetWidth, initialLeft + deltaX));
    const newTop = Math.max(0, Math.min(window.innerHeight - touchControlsElem.offsetHeight, initialTop + deltaY));
    
    // Apply the new position
    touchControlsElem.style.left = `${newLeft}px`;
    touchControlsElem.style.top = `${newTop}px`;
  }, { passive: false });

  // Add the touchend event to the document
  document.addEventListener('touchend', (e) => {
    if (!isDragging) return;
    isDragging = false;
    
    // Reset visual feedback
    dragHandle.style.background = 'rgba(0, 0, 0, 0.6)';
    dragHandle.style.color = '#ffcc00';
    
    // Save the final position
    const rect = touchControlsElem.getBoundingClientRect();
    saveControlPosition(rect.left, rect.top);
  }, { passive: false });
  
  // Mouse events for testing on desktop
  dragHandle.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = touchControlsElem.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
    
    // Visual feedback
    dragHandle.style.background = 'rgba(255, 204, 0, 0.6)';
    dragHandle.style.color = '#000';
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    
    // Calculate new position with boundary constraints
    const newLeft = Math.max(0, Math.min(window.innerWidth - touchControlsElem.offsetWidth, initialLeft + deltaX));
    const newTop = Math.max(0, Math.min(window.innerHeight - touchControlsElem.offsetHeight, initialTop + deltaY));
    
    touchControlsElem.style.left = `${newLeft}px`;
    touchControlsElem.style.top = `${newTop}px`;
  });
  
  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    
    // Reset visual feedback
    dragHandle.style.background = 'rgba(0, 0, 0, 0.6)';
    dragHandle.style.color = '#ffcc00';
    
    // Save position
    const rect = touchControlsElem.getBoundingClientRect();
    saveControlPosition(rect.left, rect.top);
  });
}

/**
 * Toggle the size of touch controls between minimized and maximized
 */
function toggleControlsSize() {
  if (!touchControlsElem) return;

  if (touchControlsElem.classList.contains('minimized')) {
    touchControlsElem.classList.remove('minimized');
    touchControlsElem.classList.add('maximized');
  } else {
    touchControlsElem.classList.remove('maximized');
    touchControlsElem.classList.add('minimized');
  }
}

// Add a swipe detector for the canvas to handle game-wide swipe gestures
export function initCanvasSwipeDetector() {
  // Cache canvas reference
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