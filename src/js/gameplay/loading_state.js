// filepath: d:\Sites\games\Tetris\src\js\gameplay\loading_state.js
import { canvas, ctx, WIDTH, HEIGHT, DrawBitmapText, DrawBitmapTextSmall, clearScreen } from '../utils/functions.js';
import { Draw3DStars } from '../components/starfield_3d.js';
import { UI, GAME_STATES } from '../config/config.js';
// Import gameState functions to sync loading state
import { updateLoadingProgress as updateStateLoadingProgress, getState } from '../core/gameState.js';

/**
 * LOADING SCREEN MODULE
 * 
 * This module implements a graphical loading screen that displays:
 * - A logo centered on screen
 * - 3D star field background
 * - Loading progress bar
 * - "Press SPACE to start" prompt after loading completes
 * 
 * The loading screen appears when the game launches and remains visible
 * until all assets are loaded and the player presses the space key.
 */

// Image resources for the loading screen
let logo_img;           // Game logo image

// Loading screen state variables
let loadingProgress = 0;      // Progress from 0.0 to 1.0
let isLoaded = false;         // Flag indicating if loading is complete
let showPressSpace = false;   // Controls visibility of "Press SPACE" prompt
let spaceBlinkCounter = 0;    // Counter for blinking effect of prompt
let logoSineCounter = 0;      // Counter for sine wave animation of logo

/**
 * Initialize the loading screen module with required images
 * 
 * @param {Image} logoImage - The game logo image
 * @param {Image} fontsBigImage - Big fonts image
 * @param {Image} fontsSmallImage - Small fonts image
 */
export function initLoadingScreen(logoImage, fontsBigImage, fontsSmallImage) {
    logo_img = logoImage;
}

/**
 * Update the loading progress value
 * When loading completes (current >= total), enables the "Press SPACE" prompt
 * 
 * @param {number} current - Current number of loaded items
 * @param {number} total - Total number of items to load
 */
export function updateLoadingProgress(current, total) {
    loadingProgress = current / total;
    
    // Update the game state system as well
    updateStateLoadingProgress(current, total);
    
    if (current >= total && !isLoaded) {
        isLoaded = true;
        showPressSpace = true;
        console.log("Loading complete, press space to continue");
    }
}

/**
 * Draw the loading screen with all its elements
 * - Clears the screen
 * - Draws 3D stars background
 * - Displays the logo (static, centered)
 * - Draws loading progress bar
 * - Shows "Press SPACE to start" when loading is complete
 */
export function drawLoadingScreen() {
    // Clear screen with black background
    clearScreen('#000');
    
    // Draw 3D stars in background
    Draw3DStars();
    
    // Calculate the vertical center of the screen
    const screenCenterY = HEIGHT / 2;
    
    // Define loading bar dimensions and position
    const barWidth = UI.LOADING_BAR_WIDTH;
    const barHeight = UI.LOADING_BAR_HEIGHT;
    const barX = (WIDTH - barWidth) / 2;
    
    // The loading bar will be positioned slightly below the center
    const barY = screenCenterY + 80;
    
    // Draw static logo without sine wave effect if loaded
    if (logo_img && logo_img.complete) {
        // Use new logo dimensions
        const logoWidth = 872;
        const logoHeight = 273;
        
        // Calculate available space with respect to MAX_LOGO_WIDTH setting
        const maxLogoWidth = UI.MAX_LOGO_WIDTH;
        const availableWidth = Math.min(WIDTH * 0.9, maxLogoWidth);
        const availableHeight = HEIGHT * 0.4; // Use up to 40% of screen height for logo
        
        // Calculate the scaling factors for both dimensions
        const scaleFactorWidth = availableWidth / logoWidth;
        const scaleFactorHeight = availableHeight / logoHeight;
        
        // Use the smaller scale factor to ensure the logo fits entirely
        const scaleFactor = Math.min(scaleFactorWidth, scaleFactorHeight);
        
        // Calculate the display dimensions
        const displayWidth = logoWidth * scaleFactor;
        const displayHeight = logoHeight * scaleFactor;
        
        // Center the logo horizontally and position it above "LOADING" text
        const logoX = (WIDTH - displayWidth) / 2;
        
        // Position logo at 25% from top on smaller screens, higher up on larger screens
        const logoY = HEIGHT * 0.25 - displayHeight / 2;
        
        // Draw the logo as a complete image without slicing or sine effect
        ctx.drawImage(logo_img, logoX, logoY, displayWidth, displayHeight);
    }
    
    // Use DrawBitmapTextSmall instead of DrawBitmapText for "LOADING" to make it smaller
    DrawBitmapTextSmall("LOADING", 0, barY - 35, 1, 0, 0);
    
    // Bar border (dark gray)
    ctx.fillStyle = '#444';
    ctx.fillRect(barX - 3, barY - 3, barWidth + 6, barHeight + 6);
    
    // Bar background (darker gray)
    ctx.fillStyle = '#222';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Progress bar (gold color)
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(barX, barY, barWidth * loadingProgress, barHeight);
    
    // Progress percentage - position it below the loading bar
    const percentText = `${Math.floor(loadingProgress * 100)}%`;
    DrawBitmapTextSmall(percentText, 0, barY + barHeight + 5, 1, 0, 0);
    
    // Show "PRESS SPACE TO START" when loading is done, with smooth blinking effect
    if (showPressSpace) {
        spaceBlinkCounter++;
        if (spaceBlinkCounter > 90) spaceBlinkCounter = 0;
        
        // Create a smooth fade effect rather than an abrupt on/off
        const alpha = Math.sin(spaceBlinkCounter * Math.PI / 45);
        
        if (alpha > 0) {
            // Apply the same bitmap text with alpha for blinking effect - using small text
            ctx.globalAlpha = alpha;
            DrawBitmapTextSmall("PRESS SPACE TO START", 0, barY + barHeight + 40, 1, 0, 0);
            ctx.globalAlpha = 1.0;
        }
    }
}

/**
 * Check if asset loading is completed
 * @returns {boolean} True if loading is completed
 */
export function isLoadingComplete() {
    return isLoaded;
}

/**
 * Hide the "Press SPACE" prompt
 * Called when transitioning from loading to game intro
 */
export function hidePressSpace() {
    showPressSpace = false;
}

/**
 * Handle the loading state
 * Shows loading screen and handles transition to intro screen
 * 
 * @param {Object} eventSpace - Space key event object
 * @param {Function} setGameState - Function to update the game state
 * @returns {boolean} True if state was handled, false otherwise
 */
export function handleLoadingState(eventSpace, setGameState) {
    // Show the loading screen with progress bar and stars
    drawLoadingScreen();
    
    // Check if loading is complete and space is pressed
    // Handle both eventSpace object formats (supporting our refactored code)
    const isSpacePressed = 
        (eventSpace && eventSpace.pressed) || // New format from our refactored code
        (typeof eventSpace === 'boolean' && eventSpace); // Original format 
    
    if (isLoadingComplete() && isSpacePressed) {
        console.log("Space pressed on loading screen, transitioning to intro");
        hidePressSpace();           // Hide "Press SPACE" prompt
        setGameState(GAME_STATES.GAME_INTRO); // Switch to intro screen
        
        // Reset space key state in both possible formats
        if (eventSpace && typeof eventSpace === 'object') {
            eventSpace.pressed = false;
        }
        return true; // State transition handled
    }
    
    // Still in loading state
    return true;
}