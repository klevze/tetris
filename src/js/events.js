/**
 * Event Handling Module
 * Manages input events (keyboard, touch, mouse) for game control
 */

import { rotate, check2MoveBlock, HoldBlock, storeBlock, newBlock, moveBlockDirection } from './block.js';
import { getState, changeState, togglePause, toggleMusic } from './gameState.js';
import { GAME_STATES } from './config/config.js';
import { getAudio } from './assetManager.js';

// Block reference and grid parameters are set during initialization
let Block;
let grid_width, grid_height;
let score = 0;

// Touch event tracking
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
let touchTimeout = null;
const TOUCH_THRESHOLD = 30; // Min distance in pixels to register a swipe
const DOUBLE_TAP_DELAY = 300; // Delay in ms to detect double tap
let lastTapTime = 0;

// Game state tracker for compatibility with game.js
export let game_state = GAME_STATES.LOADING;

// Space key tracking for compatibility with game.js
export const eventSpace = {
    pressed: false
};

// Space key function (for backward compatibility)
export function eventSpaceFunc(state) {
    eventSpace.pressed = state;
}

// Keyboard state object to allow accessing keys from outside
export const keyState = {
    space: false,
    left: false,
    right: false,
    down: false,
    up: false,
    p: false,
    m: false,
    h: false
};

/**
 * Update game state - for compatibility with original code
 * @param {string} newState - New game state
 */
export function updateGameState(newState) {
    game_state = newState;
    changeState(newState);
}

/**
 * Initialize event handlers for the game
 * @param {Object} blockRef - Reference to the Block object
 * @param {Object} audioRef - Reference to audio object (for backward compatibility)
 * @param {Object} stateRef - Reference to game state (for backward compatibility)
 * @param {Object} gridParams - Grid dimensions
 */
export function initEventHandlers(blockRef, audioRef, stateRef, gridParams) {
    // Store references
    Block = blockRef;
    
    // Check if gridParams is provided and has the required properties
    if (gridParams && typeof gridParams === 'object' && 
        'grid_width' in gridParams && 'grid_height' in gridParams) {
        grid_width = gridParams.grid_width;
        grid_height = gridParams.grid_height;
    } else {
        // Use default values from config if gridParams is invalid
        console.warn('Invalid grid parameters provided to initEventHandlers, using defaults');
        grid_width = 10; // Default grid width
        grid_height = 20; // Default grid height
    }
    
    // Initialize touch events
    const canvas = document.getElementById('myCanvas');
    if (canvas) {
        // Touch events
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
        
        // Mouse events (click for actions)
        canvas.addEventListener('click', handleClick);
    } else {
        console.warn('Canvas element not found when initializing event handlers');
    }
    
    // Keyboard events
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
}

/**
 * Remove all event handlers
 */
export function removeEventHandlers() {
    const canvas = document.getElementById('myCanvas');
    
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('keyup', handleKeyUp);
    
    canvas.removeEventListener('touchstart', handleTouchStart);
    canvas.removeEventListener('touchmove', handleTouchMove);
    canvas.removeEventListener('touchend', handleTouchEnd);
    canvas.removeEventListener('click', handleClick);
}

/**
 * Handle touch start events
 * @param {TouchEvent} event - Touch event
 */
function handleTouchStart(event) {
    // Prevent default behavior (scrolling, zooming)
    event.preventDefault();
    
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
    
    // Detect double tap
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTapTime;
    
    if (tapLength < DOUBLE_TAP_DELAY && tapLength > 0) {
        // Double tap detected - hard drop
        handleDoubleTap();
        
        // Cancel single tap
        clearTimeout(touchTimeout);
        touchTimeout = null;
        
        // Reset to prevent triple tap
        lastTapTime = 0;
    } else {
        // Single tap - will be confirmed if no second tap occurs
        lastTapTime = currentTime;
    }
}

/**
 * Handle touch move events
 * @param {TouchEvent} event - Touch event
 */
function handleTouchMove(event) {
    // Prevent default behavior (scrolling)
    event.preventDefault();
    
    touchEndX = event.touches[0].clientX;
    touchEndY = event.touches[0].clientY;
}

/**
 * Handle touch end events
 * @param {TouchEvent} event - Touch event
 */
function handleTouchEnd(event) {
    event.preventDefault();
    
    // Calculate swipe distance
    const diffX = touchEndX - touchStartX;
    const diffY = touchStartY - touchEndY; // Y is reversed because screen coords
    
    // If significant movement, handle as a swipe
    if (Math.abs(diffX) > TOUCH_THRESHOLD || Math.abs(diffY) > TOUCH_THRESHOLD) {
        // Determine swipe direction
        if (Math.abs(diffX) > Math.abs(diffY)) {
            // Horizontal swipe
            if (diffX > 0) {
                handleRightMove();
            } else {
                handleLeftMove();
            }
        } else {
            // Vertical swipe
            if (diffY > 0) {
                handleUpMove(); // Swipe up = rotate
            } else {
                handleDownMove();
            }
        }
    } else {
        // Short tap/click - handle it after a small delay to allow for double tap detection
        touchTimeout = setTimeout(() => {
            handleTap();
            touchTimeout = null;
        }, DOUBLE_TAP_DELAY);
    }
    
    // Reset touch coordinates
    touchEndX = touchStartX;
    touchEndY = touchStartY;
}

/**
 * Handle mouse click events
 * @param {MouseEvent} event - Mouse event
 */
function handleClick(event) {
    // Get current game state
    const state = getState();
    
    switch (state.currentState) {
        case GAME_STATES.LOADING:
            // On loading screen, any click advances to intro when loading complete
            if (state.loadingComplete) {
                changeState(GAME_STATES.GAME_INTRO);
            }
            break;
            
        case GAME_STATES.GAME_INTRO:
        case GAME_STATES.HIGH_SCORE:
            // Start the game
            changeState(GAME_STATES.GAME_START);
            break;
            
        case GAME_STATES.PLAY_GAME:
            // During gameplay, click rotates the block
            if (!state.isPaused) {
                handleUpMove();
            }
            break;
            
        case GAME_STATES.GAME_OVER:
            // Handle submitting name and going to high score
            // (Game over logic is handled in game_over.js)
            break;
    }
}

/**
 * Handle keyboard down events
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleKeyDown(event) {
    // Handle preventing default actions for game keys
    if ([32, 37, 38, 39, 40, 80, 77, 72].indexOf(event.keyCode) > -1) {
        event.preventDefault();
    }
    
    // Store key state
    switch (event.keyCode) {
        case 32: // Space
            keyState.space = true;
            eventSpace.pressed = true; // Update eventSpace for backward compatibility
            handleSpaceAction();
            break;
        case 37: // Left arrow
            keyState.left = true;
            handleLeftMove();
            break;
        case 38: // Up arrow
            keyState.up = true;
            handleUpMove();
            break;
        case 39: // Right arrow
            keyState.right = true;
            handleRightMove();
            break;
        case 40: // Down arrow
            keyState.down = true;
            handleDownMove();
            break;
        case 80: // P key
            keyState.p = true;
            togglePause();
            break;
        case 77: // M key
            keyState.m = true;
            toggleMusic();
            break;
        case 72: // H key
            keyState.h = true;
            handleHoldBlock();
            break;
    }
}

/**
 * Handle keyboard up events
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleKeyUp(event) {
    // Reset key state
    switch (event.keyCode) {
        case 32: // Space
            keyState.space = false;
            eventSpace.pressed = false; // Update eventSpace for backward compatibility
            break;
        case 37: // Left arrow
            keyState.left = false;
            break;
        case 38: // Up arrow
            keyState.up = false;
            break;
        case 39: // Right arrow
            keyState.right = false;
            break;
        case 40: // Down arrow
            keyState.down = false;
            break;
        case 80: // P key
            keyState.p = false;
            break;
        case 77: // M key
            keyState.m = false;
            break;
        case 72: // H key
            keyState.h = false;
            break;
    }
}

/**
 * Handle space bar action
 * Changes based on game state
 */
function handleSpaceAction() {
    const state = getState();
    
    switch (state.currentState) {
        case GAME_STATES.LOADING:
            // On loading screen, space advances to intro when loading complete
            if (state.loadingComplete) {
                changeState(GAME_STATES.GAME_INTRO);
                // Update internal state tracker for compatibility
                game_state = GAME_STATES.GAME_INTRO;
            }
            break;
            
        case GAME_STATES.GAME_INTRO:
        case GAME_STATES.HIGH_SCORE:
            // On intro/high score screens, space starts the game
            changeState(GAME_STATES.GAME_START);
            // Update internal state tracker for compatibility
            game_state = GAME_STATES.GAME_START;
            // Ensure the event is propagated to other modules
            window.game_state = GAME_STATES.GAME_START;
            break;
            
        case GAME_STATES.PLAY_GAME:
            if (!state.isPaused) {
                // During gameplay, space performs a hard drop
                hardDrop();
            }
            break;
    }
}

/**
 * Handle right arrow/swipe
 * Move block right if possible
 */
function handleRightMove() {
    const state = getState();
    
    if (state.currentState === GAME_STATES.PLAY_GAME && !state.isPaused) {
        if (check2MoveBlock(Block.x+1, Block.y, Block.type) && Block.x+1 < grid_width) {
            Block.x++;
        }
    }
}

/**
 * Handle left arrow/swipe
 * Move block left if possible
 */
function handleLeftMove() {
    const state = getState();
    
    if (state.currentState === GAME_STATES.PLAY_GAME && !state.isPaused) {
        if (check2MoveBlock(Block.x-1, Block.y, Block.type)) {
            Block.x--;
        }
    }
}

/**
 * Handle down arrow/swipe
 * Move block down if possible
 */
function handleDownMove() {
    const state = getState();
    
    if (state.currentState === GAME_STATES.PLAY_GAME && !state.isPaused) {
        if (check2MoveBlock(Block.x, Block.y+1, Block.type)) {
            Block.y++;
        }
    }
}

/**
 * Handle up arrow/swipe/tap
 * Rotate block if possible
 */
function handleUpMove() {
    const state = getState();
    
    if (state.currentState === GAME_STATES.PLAY_GAME && !state.isPaused) {
        rotate();
    }
}

/**
 * Handle double tap action
 * Performs hard drop
 */
function handleDoubleTap() {
    const state = getState();
    
    if (state.currentState === GAME_STATES.PLAY_GAME && !state.isPaused) {
        hardDrop();
    }
}

/**
 * Handle single tap action
 * Rotates block during gameplay or advances screens in menus
 */
function handleTap() {
    const state = getState();
    
    switch (state.currentState) {
        case GAME_STATES.LOADING:
            if (state.loadingComplete) {
                changeState(GAME_STATES.GAME_INTRO);
            }
            break;
            
        case GAME_STATES.GAME_INTRO:
        case GAME_STATES.HIGH_SCORE:
            changeState(GAME_STATES.GAME_START);
            break;
            
        case GAME_STATES.PLAY_GAME:
            if (!state.isPaused) {
                // Single tap rotates block during gameplay
                rotate();
            }
            break;
    }
}

/**
 * Hard drop the current block
 * Moves block down until it collides, then locks it
 */
function hardDrop() {
    const state = getState();
    
    if (state.currentState === GAME_STATES.PLAY_GAME && !state.isPaused) {
        let check = true;
        
        // Fast drop until collision
        for (let y = Block.y; y < grid_height; y++) {
            if (check2MoveBlock(Block.x, y+1, Block.type) && check) {
                Block.y++;
            } else {
                check = false;
            }
        }
        
        // Add points for hard drop
        score += 20;
        
        // Store block and generate new one
        storeBlock();
        newBlock();
    }
}

/**
 * Handle H key - hold current block
 */
function handleHoldBlock() {
    const state = getState();
    
    if (state.currentState === GAME_STATES.PLAY_GAME && !state.isPaused) {
        HoldBlock();
    }
}

/**
 * External function to check if space is currently pressed
 * @returns {boolean} True if space is pressed
 */
export function isSpacePressed() {
    return keyState.space;
}