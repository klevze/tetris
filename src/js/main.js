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
import { initGame, initAudio } from './game.js';

// Import utility functions
import { setCanvasSize } from './functions.js';

// Import game state constants
import { GAME_STATES } from './config/config.js';

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
    window.addEventListener('resize', setCanvasSize);
    
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
    const userInteractionEvents = ['click', 'touchstart', 'keydown'];
    
    const handleFirstInteraction = () => {
        console.log('User interaction detected, audio can play now');
        
        // Initialize audio after user interaction
        initAudio();
        
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

// Prevent default spacebar and arrow key behavior (scrolling)
window.addEventListener("keydown", function(e) {
    if([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) {
        e.preventDefault();
    }
}, false);

// Log startup info
console.log('Tetris game initialized');