/**
 * Loading Screen State Module
 * Handles the game's initial loading screen with progress bar and animation
 */

import { canvas, ctx, WIDTH, HEIGHT, DrawBitmapText, DrawBitmapTextSmall, clearScreen } from '../utils/functions.js';
import { Draw3DStars } from '../components/effects/starfield3d.js';
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
    
    // Calculate dimensions and sizes of all elements to properly center them
    const logoHeight = logo_img && logo_img.complete ? calculateLogoHeight() : 0;
    const loadingTextHeight = 20; // Approximate height of "LOADING" text
    const barHeight = UI.LOADING_BAR_HEIGHT;
    const barPaddingVertical = 35; // Space between loading text and bar
    const percentTextHeight = 20; // Approximate height of percentage text
    const pressSpaceHeight = showPressSpace ? 20 : 0; // Height of "PRESS SPACE" text if shown
    const spacingBetweenElements = 15; // Vertical spacing between elements
    
    // Calculate total height of all elements combined
    const totalContentHeight = logoHeight
        + (logoHeight > 0 ? spacingBetweenElements : 0) // Add spacing only if logo exists
        + loadingTextHeight
        + barPaddingVertical
        + barHeight
        + spacingBetweenElements
        + percentTextHeight
        + (pressSpaceHeight > 0 ? spacingBetweenElements : 0)
        + pressSpaceHeight;
    
    // Calculate starting Y position to center everything vertically
    const startY = (HEIGHT - totalContentHeight) / 2;
    
    let currentY = startY;
    
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
        
        // Center the logo horizontally
        const logoX = (WIDTH - displayWidth) / 2;
        
        // Draw the logo at the calculated vertical position
        ctx.drawImage(logo_img, logoX, currentY, displayWidth, displayHeight);
        
        currentY += displayHeight + spacingBetweenElements;
    }
    
    // Define loading bar dimensions and position
    const barWidth = UI.LOADING_BAR_WIDTH;
    const barX = (WIDTH - barWidth) / 2;
    
    // Draw "LOADING" text centered
    currentY += loadingTextHeight;
    DrawBitmapTextSmall("LOADING", 0, currentY, 1, 0, 0);
    
    // Position the bar after the text with padding
    currentY += barPaddingVertical;
    
    // Bar border (dark gray)
    ctx.fillStyle = '#444';
    ctx.fillRect(barX - 3, currentY - 3, barWidth + 6, barHeight + 6);
    
    // Bar background (darker gray)
    ctx.fillStyle = '#222';
    ctx.fillRect(barX, currentY, barWidth, barHeight);
    
    // Progress bar (gold color)
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(barX, currentY, barWidth * loadingProgress, barHeight);
    
    // Progress percentage - position it below the loading bar
    currentY += barHeight + spacingBetweenElements;
    const percentText = `${Math.floor(loadingProgress * 100)}%`;
    DrawBitmapTextSmall(percentText, 0, currentY, 1, 0, 0);
    
    // Show "PRESS SPACE TO START" when loading is done, with smooth blinking effect
    if (showPressSpace) {
        spaceBlinkCounter++;
        if (spaceBlinkCounter > 90) spaceBlinkCounter = 0;
        
        // Create a smooth fade effect rather than an abrupt on/off
        const alpha = Math.sin(spaceBlinkCounter * Math.PI / 45);
        
        if (alpha > 0) {
            // Apply the same bitmap text with alpha for blinking effect - using small text
            currentY += spacingBetweenElements + 20;
            ctx.globalAlpha = alpha;
            DrawBitmapTextSmall("PRESS SPACE TO START", 0, currentY, 1, 0, 0);
            ctx.globalAlpha = 1.0;
        }
    }
}

/**
 * Calculate the actual display height of the logo based on scaling
 * @returns {number} The height of the logo in pixels
 */
function calculateLogoHeight() {
    if (!logo_img || !logo_img.complete) return 0;
    
    const logoWidth = 872;
    const logoHeight = 273;
    
    const maxLogoWidth = UI.MAX_LOGO_WIDTH;
    const availableWidth = Math.min(WIDTH * 0.9, maxLogoWidth);
    const availableHeight = HEIGHT * 0.4;
    
    const scaleFactorWidth = availableWidth / logoWidth;
    const scaleFactorHeight = availableHeight / logoHeight;
    
    const scaleFactor = Math.min(scaleFactorWidth, scaleFactorHeight);
    
    return logoHeight * scaleFactor;
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