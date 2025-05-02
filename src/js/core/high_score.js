import { DrawBitmapText, DrawBitmapTextSmall } from '../utils/functions.js';
import { changeState } from './gameState.js';
import { getImage } from '../utils/assetManager.js';
import { GAME_STATES, IMAGES } from '../config/config.js';
import { saveHighScore, loadHighScores } from '../config/firebase.js';

// Variables that will be initialized
let ctx, WIDTH, HEIGHT;
let high_scores = [];
let sc = 0;
let k = 0;
let lines = 0, level = 1, TotalSeconds = 0;
let introEventListenersAdded = false;
let frontCounter = 0;

/**
 * Initialize the high score module
 * @param {CanvasRenderingContext2D} context - Canvas context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 */
export function initHighScore(context, width, height) {
    ctx = context;
    WIDTH = width;
    HEIGHT = height;
    
    // Load high scores from Firebase
    LoadHighScoreData();
}

/**
 * Display the high score screen
 */
export function ShowHighScore() {
    // Set up event listeners for high score screen
    setupHighScoreEventListeners();
    
    DrawBitmapText("HIGH SCORES", 0, 20, 0, 0, 40);
    
    let y = 100;
    let p = 0;
    
    high_scores.forEach((val) => {
        p++;
        if(p % 5 == 0) {
            p = 1;
        }
        const x = WIDTH / 2 - Math.floor(Math.sin(sc/100) * (p*5)) - 450;
        DrawBitmapTextSmall(val.player_name + " - " + val.score, x, y, 1, 0);
        
        sc += 1;
        y += 25;
    });
    
    DrawBitmapTextSmall("PRESS SPACE OR CLICK TO START A NEW GAME", 0, 380, 1, 1, 1);
}

/**
 * Load high score data from Firebase
 * @returns {Array} High score data array
 */
export function LoadHighScoreData() {
    // Load high scores from Firebase with fallback to localStorage
    loadHighScores().then(scores => {
        if (scores && scores.length > 0) {
            high_scores = scores;
        } else {
            // Fallback to localStorage if Firebase fails or returns empty
            const storedScores = localStorage.getItem('tetrisHighScores');
            if (storedScores) {
                high_scores = JSON.parse(storedScores);
            } else {
                high_scores = [];
            }
        }
    }).catch(error => {
        console.error("Error loading high scores from Firebase:", error);
        // Fallback to localStorage if Firebase fails
        const storedScores = localStorage.getItem('tetrisHighScores');
        if (storedScores) {
            high_scores = JSON.parse(storedScores);
        } else {
            high_scores = [];
        }
    });
    
    return high_scores;
}

/**
 * Save high score data
 * @param {string} player_name - Player's name
 * @param {number} player_score - Player's score
 * @returns {Array} Updated high score array
 */
export function saveHighScoreData(player_name, player_score) {
    if (typeof(Storage) !== "undefined") {
        localStorage["player_name"] = player_name;
    }
    
    // Format time for display
    const formattedTime = formatTime(TotalSeconds);
    
    // Save to Firebase
    saveHighScore(player_name, player_score, level, lines, formattedTime)
        .then(updatedScores => {
            if (updatedScores && updatedScores.length > 0) {
                high_scores = updatedScores;
            }
        })
        .catch(error => {
            console.error("Error saving to Firebase, falling back to localStorage:", error);
            
            // Fallback to localStorage if Firebase fails
            const scoreData = {
                player_name: player_name,
                score: player_score,
                cleared_lines: lines,
                level: level,
                time: formattedTime,
                date: new Date().toISOString()
            };
            
            const scores = JSON.parse(localStorage.getItem('tetrisHighScores') || '[]');
            scores.push(scoreData);
            
            // Sort by score (highest first)
            scores.sort((a, b) => b.score - a.score);
            
            // Keep only top 10
            const top10 = scores.slice(0, 10);
            
            localStorage.setItem('tetrisHighScores', JSON.stringify(top10));
            high_scores = top10;
        });
    
    return high_scores;
}

/**
 * Start a new game - updates game state via the gameState module
 */
function startNewGame() {
    try {
        // Remove all event listeners
        removeAllEventListeners();
        
        // Reset the secure score to prevent "Score tampering detected" error
        if (typeof window.setScore === 'function') {
            console.log("Resetting secure score to 0 before starting new game");
            window.setScore(0);
        }
        
        // Use the central gameState module to change state
        changeState(GAME_STATES.GAME_START);
        
        // Update global game state variables to ensure all modules are notified
        window.game_state = GAME_STATES.GAME_START;
        
        console.log("Starting new game - state set to: game_start");
    } catch(e) {
        console.error("Error starting new game:", e);
    }
}

/**
 * Remove all event listeners
 */
function removeAllEventListeners() {
    // Remove high score event listeners
    document.removeEventListener('keydown', handleHighScoreKeyDown);
    document.removeEventListener('mousedown', handleHighScoreMouseDown);
    
    // Remove intro screen event listeners
    removeIntroEventListeners();
}

/**
 * Remove intro screen event listeners
 */
function removeIntroEventListeners() {
    if (introEventListenersAdded) {
        document.removeEventListener('keydown', handleIntroKeyDown);
        document.removeEventListener('mousedown', handleIntroMouseDown);
        introEventListenersAdded = false;
    }
}

/**
 * Set up high score screen event listeners
 */
function setupHighScoreEventListeners() {
    // Remove any existing event listeners first
    removeAllEventListeners();
    
    // Add high score specific event listeners
    document.addEventListener('keydown', handleHighScoreKeyDown);
    document.addEventListener('mousedown', handleHighScoreMouseDown);
}

/**
 * Handle key presses on high score screen
 */
function handleHighScoreKeyDown(evt) {
    if (evt.keyCode == 32) { // Space key
        evt.preventDefault();
        console.log("Space key pressed on high score screen");
        startNewGame();
    }
}

/**
 * Handle mouse clicks on high score screen
 */
function handleHighScoreMouseDown(evt) {
    // Any mouse click starts a new game
    console.log("Mouse clicked on high score screen");
    startNewGame();
}

/**
 * Handle key presses on intro screen
 */
function handleIntroKeyDown(evt) {
    if (evt.keyCode == 32) { // Space key
        evt.preventDefault();
        console.log("Space key pressed on intro screen");
        startNewGame();
    }
}

/**
 * Handle mouse clicks on intro screen
 */
function handleIntroMouseDown(evt) {
    // Any mouse click starts a new game
    console.log("Mouse clicked on intro screen");
    startNewGame();
}

/**
 * Set up intro screen event listeners
 */
function setupIntroEventListeners() {
    if (!introEventListenersAdded) {
        removeAllEventListeners();
        document.addEventListener('keydown', handleIntroKeyDown);
        document.addEventListener('mousedown', handleIntroMouseDown);
        introEventListenersAdded = true;
    }
}

/**
 * Show the intro screen
 */
export function ShowIntroScreen() {
    // Set up event listeners for intro screen
    setupIntroEventListeners();
    
    try {
        // Check if we're in a limited height scenario (mobile device with limited vertical space)
        const isLimitedHeight = HEIGHT < 450;
        
        // Draw the background image - different on mobile with limited height
        const back_img = getImage('BACKGROUND');
        if (back_img && back_img.complete) {
            showBackgroundCover(back_img);
        }
        
        const logo_img = getImage('LOGO');
        // Show the game logo with animated slicing effect
        if (logo_img && logo_img.complete) {
            // Adjust logo position to be higher when on limited height screens
            const logoYPosition = isLimitedHeight ? 30 : 40;
            
            // Animate each slice of the logo with sine wave
            for (let l = 0; l < 200; l++) {
                let n = l + frontCounter;
                let m = Math.sin(n/180*3.14) * 30;
                let height = m + 15;
                
                if(height < 5) {
                    height = 5;
                }
                if(height > 30) {
                    height = 30;
                }

                // Draw each horizontal slice of the logo at adjusted height
                ctx.drawImage(logo_img, 0, l, 321, 1, m + 240, l + logoYPosition, 321, height);
            }
        } else {
            // Fallback if the image isn't loaded yet
            console.warn("Logo image not available, using fallback text");
            ctx.font = 'bold 40px Arial';
            ctx.fillStyle = '#ffcc00';
            ctx.textAlign = 'center';
            ctx.fillText("TETRIS", WIDTH/2, isLimitedHeight ? 30 : 40);
        }
        
        // Add a cloud high scores badge
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(WIDTH - 180, 10, 170, 30);
        ctx.fillStyle = '#4285F4'; // Google blue color
        ctx.fillText("CLOUD HIGH SCORES", WIDTH - 20, 30);

        // Move "TOP PLAYERS" text further up when on limited height screens
        const topPlayersY = isLimitedHeight ? 230 : 290;
        DrawBitmapText("TOP PLAYERS", 0, topPlayersY, 1);

        // Calculate the maximum number of high scores based on available space
        // Show fewer high scores when on limited height screens
        const maxScores = isLimitedHeight ? 3 : 5;
        let y = topPlayersY + 50;

        // Display the top players (only show the first maxScores entries)
        let displayCount = 0;
        for (let i = 0; i < high_scores.length && displayCount < maxScores; i++) {
            const score = high_scores[i];
            DrawBitmapTextSmall(`${displayCount+1}. ${score.player_name} - ${score.score}`, 0, y, 0);
            y += 30;
            displayCount++;
        }

        // Display "Press space to start" or "Tap to start" message
        const ctaY = isLimitedHeight ? HEIGHT - 50 : HEIGHT - 100;
        
        // Check if this is a touch device
        const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        
        const ctaText = isTouchDevice ? "TAP TO START" : "PRESS SPACE TO START";
        DrawBitmapText(ctaText, 0, ctaY, 1, 1);
        
        // Display controls hint at the bottom
        const controlsY = isLimitedHeight ? HEIGHT - 30 : HEIGHT - 70;
        const controlsText = "ARROWS TO MOVE, SPACE TO DROP, P TO PAUSE";
        DrawBitmapTextSmall(controlsText, 0, controlsY, 0);
        
        // Update counter for animation
        frontCounter += 2;
        if (frontCounter > 180) {
            frontCounter = 0;
        }
    } catch (e) {
        console.error("Error drawing intro screen:", e);
    }
}

/**
 * Set game stats for high score tracking
 * @param {number} gameLines - Number of lines cleared
 * @param {number} gameLevel - Game level reached
 * @param {number} gameTotalSeconds - Total game time in seconds
 */
export function setGameStats(gameLines, gameLevel, gameTotalSeconds) {
    lines = gameLines;
    level = gameLevel;
    TotalSeconds = gameTotalSeconds;
}

/**
 * Format seconds into mm:ss display format
 * @param {number} seconds - Total seconds
 * @returns {string} Formatted time string
 */
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Show background cover image
 * @param {HTMLImageElement} image - Background image
 */
function showBackgroundCover(image) {
    ctx.drawImage(image, 0, 0, WIDTH, HEIGHT);
}