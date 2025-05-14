/**
 * Event Management Module
 * Centralized event system for the Tetris game
 */

import { Block, currentBlock as blockCurrentBlock, rotateBlock, moveBlockDirection, HoldBlock } from '../components/gameplay/block.js';
import { getState, changeState, togglePause, toggleMusic } from '../core/gameState.js';
import { toggleGamePause, toggleGameMusic } from '../core/game.js';
import { GAME_STATES } from '../config/config.js';
import { getAudio } from './assetManager.js';
import { isAnimationInProgress } from '../components/gameplay/grid.js';

// Game events enum - centralized definition of all game events
export const GAME_EVENTS = {
    // Game state events
    STATE_CHANGED: 'state_changed',
    LOADING_COMPLETE: 'loading_complete',
    GAME_START: 'game_start',
    GAME_PAUSE: 'game_pause',
    GAME_RESUME: 'game_resume',
    GAME_OVER: 'game_over',
    
    // Block events
    BLOCK_MOVE: 'block_move',
    BLOCK_ROTATE: 'block_rotate',
    BLOCK_LOCK: 'block_lock',
    BLOCK_HOLD: 'block_hold',
    
    // Score events
    SCORE_CHANGE: 'score_change',
    LINE_CLEAR: 'line_clear',
    LEVEL_UP: 'level_up',
    
    // UI events
    WINDOW_RESIZE: 'window_resize',
    LAYOUT_UPDATE: 'layout_update', // For handling orientation changes and layout refreshes
    MUSIC_TOGGLE: 'music_toggle',
    SOUND_TOGGLE: 'sound_toggle',
    
    // Input events
    KEY_DOWN: 'key_down',
    KEY_UP: 'key_up',
    TOUCH_START: 'touch_start',
    TOUCH_MOVE: 'touch_move',
    TOUCH_END: 'touch_end',
    CLICK: 'click'
};

// EventBus - centralized event system
class EventBus {
    constructor() {
        this.listeners = new Map();
    }
    
    /**
     * Register an event listener
     * @param {string} eventName - Name of the event to listen for
     * @param {Function} callback - Function to call when the event occurs
     * @returns {Function} Function to remove this specific listener
     */
    on(eventName, callback) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, new Set());
        }
        
        this.listeners.get(eventName).add(callback);
        
        // Return a function that will remove this listener
        return () => this.off(eventName, callback);
    }
    
    /**
     * Remove an event listener
     * @param {string} eventName - Name of the event
     * @param {Function} callback - Function to remove
     */
    off(eventName, callback) {
        if (!this.listeners.has(eventName)) return;
        
        const eventListeners = this.listeners.get(eventName);
        eventListeners.delete(callback);
        
        // Clean up if no listeners remain
        if (eventListeners.size === 0) {
            this.listeners.delete(eventName);
        }
    }
    
    /**
     * Emit an event with data
     * @param {string} eventName - Name of the event to emit
     * @param {*} data - Data to pass to listeners
     */
    emit(eventName, data) {
        if (!this.listeners.has(eventName)) return;
        
        this.listeners.get(eventName).forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event listener for ${eventName}:`, error);
            }
        });
    }
    
    /**
     * Remove all listeners for an event
     * @param {string} eventName - Name of the event
     */
    clearEvent(eventName) {
        if (this.listeners.has(eventName)) {
            this.listeners.delete(eventName);
        }
    }
    
    /**
     * Remove all event listeners
     */
    clearAll() {
        this.listeners.clear();
    }
}

// Create a singleton instance
export const eventBus = new EventBus();

// Block reference and grid parameters are set during initialization
let currentBlock;
let grid_width, grid_height;
// Create a secure score module using IIFE and closures for protection
const secureScore = (function() {
    let _score = 0;
    let _checksum = 0;
    
    // Update the checksum whenever the score changes
    function updateChecksum(score) {
        // Simple checksum - can be made more complex for better security
        return (score * 31) ^ 0xF7A3C1D6;
    }
    
    return {
        // Getter - returns current score
        get: function() {
            // Verify score integrity before returning
            if (_checksum !== updateChecksum(_score)) {
                console.error("Score tampering detected! Resetting score.");
                _score = 0;
                _checksum = updateChecksum(0);
            }
            return _score;
        },
        // Setter - updates score with validation
        set: function(newScore) {
            if (typeof newScore !== 'number' || isNaN(newScore)) {
                console.error("Invalid score value");
                return _score;
            }
            _score = newScore;
            _checksum = updateChecksum(newScore);
            return _score;
        },
        // Add points to current score
        add: function(points) {
            if (typeof points !== 'number' || isNaN(points)) {
                console.error("Invalid points value");
                return _score;
            }
            _score += points;
            _checksum = updateChecksum(_score);
            return _score;
        }
    };
})();

let score = 0; // Kept for compatibility with existing code

// Game pause state
let game_pause = false;

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
    // Emit state change event
    eventBus.emit(GAME_EVENTS.STATE_CHANGED, { state: newState });
}

/**
 * Update the score across all parts of the game
 * This function centralizes score updates to ensure consistency
 * @param {number} points - Points to add to the score
 * @param {boolean} showAnimation - Whether to show a score animation
 */
export function updateScore(points, showAnimation = false) {
    // Update our secure score module
    const currentScore = secureScore.get();
    const newScore = secureScore.add(points);
    
    // For compatibility with old code - update the local score variable
    score = newScore;
    
    // Update grid state score
    const state = getState();
    if (state && state.score !== undefined) {
        state.score = newScore;
    }
    
    // Update display using mainState's setScoreData if available
    if (typeof window.setScoreData === 'function') {
        window.setScoreData({
            score: newScore,
            showAddScore: showAnimation,
            addScore: points
        });
    }
    
    // Emit score change event for other components that might be listening
    eventBus.emit(GAME_EVENTS.SCORE_CHANGE, { 
        score: newScore,
        added: points
    });
    
    // Optional logging for debugging
    console.log(`Score updated: +${points}, total: ${newScore}`);
}

/**
 * Get current score value (secure)
 * @returns {number} The current score
 */
export function getScore() {
    return secureScore.get();
}

/**
 * Set score value (with validation)
 * @param {number} newScore - The new score value
 * @returns {number} The updated score value
 */
export function setScore(newScore) {
    // Special case: Always allow resetting the score to 0
    if (newScore === 0) {
        console.log("Score reset to 0");
        // Directly reset the secureScore's internal values
        secureScore.set(0);
        score = 0; // For compatibility
        return 0;
    }
    
    // Normal case: Apply validation through secureScore.set()
    const updatedScore = secureScore.set(newScore);
    score = updatedScore; // For compatibility
    return updatedScore;
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
    currentBlock = blockRef;
    
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
    const canvas = document.getElementById('mainCanvas');
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
    const canvas = document.getElementById('mainCanvas');
    
    if (canvas) {
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchend', handleTouchEnd);
        canvas.removeEventListener('click', handleClick);
    }
    
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('keyup', handleKeyUp);
    
    // Clear all event bus listeners
    eventBus.clearAll();
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
    
    // Emit touch start event
    eventBus.emit(GAME_EVENTS.TOUCH_START, { 
        x: touchStartX, 
        y: touchStartY,
        originalEvent: event
    });
    
    // Handle loading state touch
    const state = getState();
    if (state.currentState === GAME_STATES.LOADING) {
        // Import and call loading touch handler
        import('../states/loadingState.js').then(module => {
            if (module.handleLoadingTouch && module.handleLoadingTouch()) {
                console.log("Touch event detected, transitioning from loading to intro");
                
                // Set the global game state objects
                updateGameState(GAME_STATES.GAME_INTRO);
                
                // Force window.game_state to update
                window.game_state = GAME_STATES.GAME_INTRO;
                
                // Call game state change function if available
                if (typeof window.onGameStateChange === 'function') {
                    window.onGameStateChange(GAME_STATES.GAME_INTRO);
                }
                
                // Also hide the press space prompt
                module.hidePressSpace();
            }
        });
        return;
    }
    
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
    
    // Emit touch move event
    eventBus.emit(GAME_EVENTS.TOUCH_MOVE, {
        startX: touchStartX,
        startY: touchStartY,
        currentX: touchEndX,
        currentY: touchEndY,
        originalEvent: event
    });
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
    
    // Emit touch end event
    eventBus.emit(GAME_EVENTS.TOUCH_END, {
        startX: touchStartX,
        startY: touchStartY,
        endX: touchEndX,
        endY: touchEndY,
        diffX: diffX,
        diffY: diffY,
        originalEvent: event
    });
    
    // Handle touch events for game over screen
    const state = getState();
    if (state.currentState === GAME_STATES.GAME_OVER) {
        import('../states/gameOverState.js').then(module => {
            if (module.handleGameOverTouch) {
                module.handleGameOverTouch(event);
            }
        });
    }
    
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
    // Emit click event
    eventBus.emit(GAME_EVENTS.CLICK, {
        x: event.clientX,
        y: event.clientY,
        originalEvent: event
    });
    
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
            // DISABLED: Generic clicks no longer start the game on intro screen
            // Only the PLAY button should start the game now
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
 * @param {KeyboardEvent} e - Keyboard event
 */
function handleKeyDown(e) {
    // Emit key down event
    eventBus.emit(GAME_EVENTS.KEY_DOWN, {
        key: e.key,
        keyCode: e.keyCode,
        originalEvent: e
    });
    
    // Handle space key in loading state
    if (game_state === GAME_STATES.LOADING && e.key === ' ') {
        e.preventDefault();
        eventSpace.pressed = true;
        keyState.space = true;
        handleSpaceAction();
        return;
    }
    
    // Handle space key in intro or high score states
    if ((game_state === GAME_STATES.GAME_INTRO || 
         game_state === GAME_STATES.HIGH_SCORE) && 
        e.key === ' ') {
        e.preventDefault();
        eventSpace.pressed = true;
        keyState.space = true;
        handleSpaceAction();
        return;
    }
    
    // M key can toggle music in ANY game state
    if (e.key === 'm') {
        e.preventDefault();
        keyState.m = true;
        // Toggle music using the game.js function and emit event
        const musicEnabled = toggleGameMusic();
        eventBus.emit(GAME_EVENTS.MUSIC_TOGGLE, { enabled: musicEnabled });
        return;
    }
    
    // Handle gameplay keys
    if (game_state === GAME_STATES.PLAY_GAME) {
        // P key can be used ANY time to toggle pause
        if (e.key === 'p') {
            e.preventDefault();
            keyState.p = true;
            // Update the local game_pause state with the new value returned by toggleGamePause()
            game_pause = toggleGamePause();
            // Emit event to notify other modules
            eventBus.emit(game_pause ? GAME_EVENTS.GAME_PAUSE : GAME_EVENTS.GAME_RESUME);
            return;
        }
        
        // Only allow these keys when game is not paused and no animation is in progress
        if (!game_pause && !isAnimationInProgress()) {
            if (e.key === 'ArrowLeft' || e.key === 'a') {
                e.preventDefault();
                moveBlockDirection('left');
            }
            if (e.key === 'ArrowRight' || e.key === 'd') {
                e.preventDefault();
                moveBlockDirection('right');
            }
            if (e.key === 'ArrowDown' || e.key === 's') {
                e.preventDefault();
                moveBlockDirection('down');
            }
            if (e.key === ' ') {
                e.preventDefault();
                eventSpace.pressed = true;
                keyState.space = true;
                moveBlockDirection('drop');
            }
            if (e.key === 'ArrowUp' || e.key === 'w') {
                e.preventDefault();
                rotateBlock();
            }
            if (e.key === 'h' || e.key === 'c') {
                e.preventDefault();
                HoldBlock();
            }
        }
    }
}

/**
 * Handle keyboard up events
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleKeyUp(event) {
    // Emit key up event
    eventBus.emit(GAME_EVENTS.KEY_UP, {
        key: event.key,
        keyCode: event.keyCode,
        originalEvent: event
    });
    
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
            // DISABLED: On intro/high score screens, space no longer starts the game
            // Only the PLAY button should start the game now
            break;
            
        case GAME_STATES.PLAY_GAME:
            if (!state.isPaused) {
                // During gameplay, space performs a hard drop
                hardDrop();
            }
            break;
    }
}

// Action handlers - These emit the appropriate events when actions occur

/**
 * Handle right arrow/swipe
 * Move block right if possible
 */
function handleRightMove() {
    const state = getState();
    
    // Also check if countdown is in progress (by checking isCountingDown from mainState)
    const isCountdownActive = typeof window.isCountingDown === 'boolean' ? window.isCountingDown : false;
    
    if (state.currentState === GAME_STATES.PLAY_GAME && !state.isPaused && !isAnimationInProgress() && !isCountdownActive) {
        moveBlockDirection('right');
        eventBus.emit(GAME_EVENTS.BLOCK_MOVE, { direction: 'right' });
    }
} 

/**
 * Handle left arrow/swipe
 * Move block left if possible
 */
function handleLeftMove() {
    const state = getState();
    
    // Also check if countdown is in progress (by checking isCountingDown from mainState)
    const isCountdownActive = typeof window.isCountingDown === 'boolean' ? window.isCountingDown : false;
    
    if (state.currentState === GAME_STATES.PLAY_GAME && !state.isPaused && !isAnimationInProgress() && !isCountdownActive) {
        moveBlockDirection('left');
        eventBus.emit(GAME_EVENTS.BLOCK_MOVE, { direction: 'left' });
    }
}

/**
 * Handle down arrow/swipe
 * Move block down if possible
 */
function handleDownMove() {
    const state = getState();
    
    // Also check if countdown is in progress
    const isCountdownActive = typeof window.isCountingDown === 'boolean' ? window.isCountingDown : false;
    
    if (state.currentState === GAME_STATES.PLAY_GAME && !state.isPaused && !isAnimationInProgress() && !isCountdownActive) {
        moveBlockDirection('down');
        eventBus.emit(GAME_EVENTS.BLOCK_MOVE, { direction: 'down' });
    }
}

/**
 * Handle up arrow/swipe/tap
 * Rotate block if possible
 */
function handleUpMove() {
    const state = getState();
    
    // Also check if countdown is in progress
    const isCountdownActive = typeof window.isCountingDown === 'boolean' ? window.isCountingDown : false;
    
    if (state.currentState === GAME_STATES.PLAY_GAME && !state.isPaused && !isAnimationInProgress() && !isCountdownActive) {
        rotateBlock();
        eventBus.emit(GAME_EVENTS.BLOCK_ROTATE);
    }
}

/**
 * Handle double tap action
 * Performs hard drop
 */
function handleDoubleTap() {
    const state = getState();
    
    // Also check if countdown is in progress
    const isCountdownActive = typeof window.isCountingDown === 'boolean' ? window.isCountingDown : false;
    
    if (state.currentState === GAME_STATES.PLAY_GAME && !state.isPaused && !isAnimationInProgress() && !isCountdownActive) {
        moveBlockDirection('drop');
        eventBus.emit(GAME_EVENTS.BLOCK_MOVE, { direction: 'drop' });
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
            // DISABLED: Taps/clicks no longer start the game on intro screen
            // Only the PLAY button should start the game now
            break;
            
        case GAME_STATES.PLAY_GAME:
            if (!state.isPaused && !isAnimationInProgress()) {
                // Single tap rotates block during gameplay
                rotateBlock();
                eventBus.emit(GAME_EVENTS.BLOCK_ROTATE);
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
    
    if (state.currentState === GAME_STATES.PLAY_GAME && !state.isPaused && !isAnimationInProgress()) {
        moveBlockDirection('drop');
        // Use the new updateScore function instead of manually updating score
        // The score is actually calculated and applied in the moveBlockDirection function
        // We just emit the block move event here
        eventBus.emit(GAME_EVENTS.BLOCK_MOVE, { direction: 'drop' });
    }
}

/**
 * Handle H key - hold current block
 */
function handleHoldBlock() {
    const state = getState();
    
    if (state.currentState === GAME_STATES.PLAY_GAME && !state.isPaused && !isAnimationInProgress()) {
        HoldBlock();
        eventBus.emit(GAME_EVENTS.BLOCK_HOLD);
    }
}

/**
 * External function to check if space is currently pressed
 * @returns {boolean} True if space is pressed
 */
export function isSpacePressed() {
    return keyState.space;
}