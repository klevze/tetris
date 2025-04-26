// filepath: d:\Sites\games\Tetris\src\js\gameplay\loading_state.js
import { canvas, ctx, WIDTH, HEIGHT, DrawBitmapText, DrawBitmapTextSmall, clearScreen } from '../functions.js';
import { Draw3DStars } from '../starfield_3d.js';
import { UI, GAME_STATES } from '../config/config.js';

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
let fonts_big_img;      // Big font bitmap
let fonts_small_img;    // Small font bitmap

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
    fonts_big_img = fontsBigImage;
    fonts_small_img = fontsSmallImage;
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
    
    if (current >= total && !isLoaded) {
        isLoaded = true;
        showPressSpace = true;
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
    
    // Create a beautiful "LOADING" text above the bar - NO SINE EFFECT
    if (fonts_big_img && fonts_big_img.complete) {
        // Use DrawBitmapText but with sinEffect=0 to prevent jumping
        DrawBitmapText("LOADING", 0, barY - 40, 1, 0, 0);
    } else {
        // Enhanced fallback text if font image not loaded
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        
        // Add a stylish glow effect
        ctx.shadowColor = '#ffcc00';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // Draw text stroke for better visibility
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 5;
        ctx.strokeText("LOADING", WIDTH / 2, barY - 44);
        
        // Fill the text with gold gradient
        const gradient = ctx.createLinearGradient(
            WIDTH / 2 - 60, barY - 44, 
            WIDTH / 2 + 60, barY - 24
        );
        gradient.addColorStop(0, '#ffcc00');
        gradient.addColorStop(0.5, '#fff');
        gradient.addColorStop(1, '#ffcc00');
        ctx.fillStyle = gradient;
        ctx.fillText("LOADING", WIDTH / 2, barY - 44);
        
        // Reset shadow
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
    }
    
    // Bar border (dark gray)
    ctx.fillStyle = '#444';
    ctx.fillRect(barX - 3, barY - 3, barWidth + 6, barHeight + 6);
    
    // Bar background (darker gray)
    ctx.fillStyle = '#222';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Progress bar (gold color)
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(barX, barY, barWidth * loadingProgress, barHeight);
    
    // Progress percentage - position it below the loading bar with a subtle fade effect
    const percentText = `${Math.floor(loadingProgress * 100)}%`;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    // Add a gentle shadow for depth
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    
    // Draw text with outline
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeText(percentText, WIDTH / 2, barY + barHeight + 5);
    
    // Fill with gold color matching progress bar
    ctx.fillStyle = '#ffcc00';
    ctx.fillText(percentText, WIDTH / 2, barY + barHeight + 5);
    
    // Reset shadow effects
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Show "PRESS SPACE TO START" when loading is done, with smooth blinking effect
    if (showPressSpace) {
        spaceBlinkCounter++;
        if (spaceBlinkCounter > 90) spaceBlinkCounter = 0;
        
        // Create a smooth fade effect rather than an abrupt on/off
        const alpha = Math.sin(spaceBlinkCounter * Math.PI / 45);
        
        if (alpha > 0) {
            if (fonts_small_img && fonts_small_img.complete) {
                // Use sine effect 0 to prevent jumpiness
                DrawBitmapTextSmall("PRESS SPACE TO START", 0, barY + barHeight + 40, 1, 0, 0);
            } else {
                // Enhanced fallback with fade effect
                ctx.globalAlpha = alpha;
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 18px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                
                // Add glow effect
                ctx.shadowColor = '#ffcc00';
                ctx.shadowBlur = 10;
                
                ctx.fillText("PRESS SPACE TO START", WIDTH / 2, barY + barHeight + 40);
                
                // Reset effects
                ctx.shadowBlur = 0;
                ctx.shadowColor = 'transparent';
                ctx.globalAlpha = 1.0;
            }
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
    
    // If loading is complete and space is pressed, proceed to intro screen
    if (isLoadingComplete() && eventSpace.pressed) {
        hidePressSpace();           // Hide "Press SPACE" prompt
        setGameState(GAME_STATES.GAME_INTRO); // Switch to intro screen
        eventSpace.pressed = false; // Reset space key state
        return true; // State transition handled
    }
    
    // Still in loading state
    return true;
}