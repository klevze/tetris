/**
 * Main entry point for the Tetris game
 * This file initializes the game and connects all components
 *
 * The Tetris game is structured using an ES6 module architecture where:
 * - main.js: Entry point that bootstraps the application
 * - game.js: Core game controller managing state and game flow
 * - Other modules: Handle specific functionality (blocks, grid, effects, etc.)
 */

// Import the game module (this will load all other dependencies indirectly)
import { initGame, initAudio, toggleGamePause } from './core/game.js';

// Import utility functions
import { setCanvasSize } from './utils/functions.js';

// Import game state constants
import { GAME_STATES } from './config/config.js';

// Import the new event system and secure score functions
import { eventBus, GAME_EVENTS, getScore, setScore } from './utils/events.js';

// Import the intro state module to access the click handler
import { handleIntroScreenClick } from './states/introState.js';

// Import touch controls
import { initTouchControls, initCanvasSwipeDetector } from './utils/touchControls.js';

// Import PWA functionality
import { initPWA, toggleFullscreen } from './utils/pwa.js';

// Expose toggleGamePause to window for touchControls to use
window.toggleGamePause = toggleGamePause;
window.toggleFullscreen = toggleFullscreen; // Add fullscreen toggle for UI controls

// Expose event bus and events globally to handle orientation changes
window.eventBus = eventBus;
window.GAME_EVENTS = GAME_EVENTS;

/**
 * Initialize the game when the DOM is fully loaded
 * Sets up the canvas and starts the game initialization process
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM content loaded, initializing Tetris game');
    
    // Get canvas reference
    const canvas = document.getElementById('mainCanvas');
    
    if (!canvas || !canvas.getContext) {
        console.error("Canvas not supported by browser");
        document.body.innerHTML = '<div style="text-align:center;color:white;padding:20px;">Your browser does not support HTML5 Canvas. Please use a modern browser to play Tetris.</div>';
        return;
    }
    
    // Initialize PWA functionality
    initPWA();
    
    // Set proper canvas size based on device
    setCanvasSize();
    
    // Add resize handler
    window.addEventListener('resize', () => {
        const dimensions = setCanvasSize();
        // Emit resize event through the event bus
        eventBus.emit(GAME_EVENTS.WINDOW_RESIZE, dimensions);
    });
    
    // Set up user interaction handlers (needed for audio)
    setupUserInteractionHandlers();
    
    // Initialize touch controls for mobile devices
    initTouchControls();
    
    // Initialize canvas swipe detector for additional touch controls
    initCanvasSwipeDetector();
    
    // Initialize the game (this will handle loading screen and assets)
    initGame();
    
    // Expose secure score setter to window object
    window.setScore = setScore;
    
    // Create secure score getter/setter with Object.defineProperty
    // This prevents direct manipulation via console while maintaining compatibility
    Object.defineProperty(window, 'score', {
        get: function() {
            return getScore(); // Get the secure score value
        },
        set: function(value) {
            // Special case: Allow setting to 0 for game restart
            if (value === 0) {
                console.log("Score reset to 0 via window.score property");
                setScore(0);
                return 0;
            }
            
            // For any other value, prevent direct manipulation
            console.warn('Direct score manipulation is not allowed!');
            return getScore(); // Return the real score value
        },
        configurable: false,
        enumerable: false
    });
});

/**
 * Set up event listeners for initial user interaction
 * Modern browsers require user interaction before playing audio
 */
function setupUserInteractionHandlers() {
    // One-time handlers to initialize audio after user interaction
    const initAudioOnFirstInteraction = () => {
        initAudio();
        document.removeEventListener('click', initAudioOnFirstInteraction);
        document.removeEventListener('keydown', initAudioOnFirstInteraction);
        document.removeEventListener('touchstart', initAudioOnFirstInteraction);
    };
    
    document.addEventListener('click', initAudioOnFirstInteraction);
    document.addEventListener('keydown', initAudioOnFirstInteraction);
    document.addEventListener('touchstart', initAudioOnFirstInteraction);
    
    // Add click event listener for settings button and popup interaction
    const canvas = document.getElementById('mainCanvas');
    if (canvas) {
        canvas.addEventListener('click', handleIntroScreenClick);
    }
}

// Prevent default spacebar and arrow key behavior (scrolling)
window.addEventListener("keydown", function(e) {
    if([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) {
        e.preventDefault();
    }
}, false);

// Log startup info
console.log('Tetris game initialized');