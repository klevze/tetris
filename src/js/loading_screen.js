// filepath: d:\Sites\games\Tetris\src\js\loading_screen.js
import { canvas, ctx, WIDTH, HEIGHT, DrawBitmapText, DrawBitmapTextSmall, clearScreen } from './functions.js';
import { Draw3DStars } from './starfield_3d.js';

/**
 * LOADING SCREEN MODULE
 * 
 * This module implements a graphical loading screen that displays:
 * - A logo with sine wave animation
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
let background_img;     // Background image

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
 * @param {Image} backImage - Background image for loading screen
 * @param {Image} fontsBigImage - Big fonts image
 * @param {Image} fontsSmallImage - Small fonts image
 */
export function initLoadingScreen(logoImage, backImage, fontsBigImage, fontsSmallImage) {
    logo_img = logoImage;
    background_img = backImage;
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
 * - Shows background image (if loaded)
 * - Animates and displays the logo (if loaded)
 * - Draws loading progress bar
 * - Shows "Press SPACE to start" when loading is complete
 */
export function drawLoadingScreen() {
    // Clear screen with black background
    clearScreen('#000');
    
    // Draw 3D stars in background
    Draw3DStars();
    
    // Draw background if loaded (with slight transparency)
    if (background_img && background_img.complete) {
        ctx.globalAlpha = 0.7; // Make background slightly transparent
        ctx.drawImage(background_img, 0, 0, WIDTH, HEIGHT);
        ctx.globalAlpha = 1.0;
    }
    
    // Draw animated logo with sine wave effect if loaded
    if (logo_img && logo_img.complete) {
        logoSineCounter += 0.8;
        for (let l = 0; l < 100; l++) {
            const n = (logoSineCounter + l) * 2;
            let m = Math.sin(n/180*3.14) * 30;
            let height = m + 15;
            
            if (height < 5) height = 5;
            if (height > 20) height = 20;

            ctx.drawImage(logo_img, 0, l, 321, 1, m + 240, l+60, 321, height);
        }
    }
    
    // Draw loading bar container and progress
    const barWidth = 400;
    const barHeight = 20;
    const barX = (WIDTH - barWidth) / 2;
    const barY = HEIGHT / 2 + 50;
    
    // Bar border (dark gray)
    ctx.fillStyle = '#444';
    ctx.fillRect(barX - 3, barY - 3, barWidth + 6, barHeight + 6);
    
    // Bar background (darker gray)
    ctx.fillStyle = '#222';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Progress bar (gold color)
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(barX, barY, barWidth * loadingProgress, barHeight);
    
    // "LOADING" text above bar
    if (fonts_big_img && fonts_big_img.complete) {
        DrawBitmapText("LOADING", 0, barY - 40, 1, 1, 30);
    } else {
        // Fallback text if font image not loaded
        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("LOADING", WIDTH / 2, barY - 20);
    }
    
    // Progress percentage inside bar
    ctx.fillStyle = '#fff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.floor(loadingProgress * 100)}%`, WIDTH / 2, barY + 15);
    
    // Show "Press SPACE to start" when loading is done, with blinking effect
    if (showPressSpace) {
        spaceBlinkCounter++;
        if (spaceBlinkCounter > 60) spaceBlinkCounter = 0;
        
        // Only show text during first half of blink cycle
        if (spaceBlinkCounter < 30) {
            if (fonts_small_img && fonts_small_img.complete) {
                DrawBitmapTextSmall("PRESS SPACE TO START", 0, barY + 80, 1, 1, 20);
            } else {
                // Fallback text if font image not loaded
                ctx.fillStyle = '#fff';
                ctx.font = '18px Arial';
                ctx.textAlign = 'center';
                ctx.fillText("PRESS SPACE TO START", WIDTH / 2, barY + 80);
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