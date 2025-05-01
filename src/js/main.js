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
import { initGame, initAudio } from './core/game.js';

// Import utility functions
import { setCanvasSize } from './utils/functions.js';

// Import game state constants
import { GAME_STATES } from './config/config.js';

// Import the new event system
import { eventBus, GAME_EVENTS } from './utils/events.js';

// Import the intro state module to access the click handler
import { handleIntroScreenClick } from './states/introState.js';

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
    
    // Initialize the game (this will handle loading screen and assets)
    initGame();
});

/**
 * Set up event listeners for initial user interaction
 * Modern browsers require user interaction before playing audio
 */
function setupUserInteractionHandlers() {
    // Flag to track if audio has been initialized
    let audioInitialized = false;
    
    // Function to initialize audio once on any user interaction
    const initAudioOnInteraction = () => {
        if (!audioInitialized) {
            console.log('User interaction detected, initializing audio');
            audioInitialized = true;
            
            // Initialize audio after user interaction
            initAudio();
            
            // Emit event through the event bus
            eventBus.emit(GAME_EVENTS.SOUND_TOGGLE, { enabled: true });
            
            // Remove event listeners once audio is initialized
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('click', handleClick);
            document.removeEventListener('touchstart', handleTouch);
        }
    };
    
    // Handle keydown event for any key
    const handleKeyDown = (event) => {
        initAudioOnInteraction();
    };
    
    // Handle mouse click anywhere
    const handleClick = () => {
        initAudioOnInteraction();
    };
    
    // Handle touch events for mobile
    const handleTouch = () => {
        initAudioOnInteraction();
    };
    
    // Add event listeners for multiple interaction types
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClick);
    document.addEventListener('touchstart', handleTouch);
    
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