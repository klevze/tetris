import { DrawBitmapText, DrawBitmapTextSmall } from './functions.js';
import { changeState } from './gameState.js';
import { getImage } from './assetManager.js';
import { GAME_STATES, IMAGES } from './config/config.js';

// Variables that will be initialized
let ctx, WIDTH;
let high_scores = [];
let sc = 0;
let k = 0;
let lines = 0, level = 1, TotalSeconds = 0;
let introEventListenersAdded = false;

/**
 * Initialize the high score module
 * @param {CanvasRenderingContext2D} context - Canvas context
 * @param {number} width - Canvas width
 */
export function initHighScore(context, width) {
    ctx = context;
    WIDTH = width;
    
    // Load high scores from localStorage
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
 * Load high score data from localStorage
 * @returns {Array} High score data array
 */
export function LoadHighScoreData() {
    // Load high scores from localStorage
    const storedScores = localStorage.getItem('tetrisHighScores');
    if (storedScores) {
        high_scores = JSON.parse(storedScores);
    } else {
        high_scores = [];
    }
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
    
    // Save to localStorage
    const scoreData = {
        player_name: player_name,
        score: player_score,
        cleared_lines: lines,
        level: level,
        time: formatTime(TotalSeconds),
        date: new Date().toISOString()
    };
    
    const scores = LoadHighScoreData();
    scores.push(scoreData);
    
    // Sort by score (highest first)
    scores.sort((a, b) => b.score - a.score);
    
    // Keep only top 10
    const top10 = scores.slice(0, 10);
    
    localStorage.setItem('tetrisHighScores', JSON.stringify(top10));
    high_scores = top10;
    return top10;
}

/**
 * Start a new game - updates game state via the gameState module
 */
function startNewGame() {
    try {
        // Remove all event listeners
        removeAllEventListeners();
        
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
 * Show the intro screen
 */
export function ShowIntroScreen() {
    // Set up intro screen event handlers if not already set
    if (!introEventListenersAdded) {
        // Remove any existing listeners first
        removeAllEventListeners();
        
        // Add intro-specific event listeners
        document.addEventListener('keydown', handleIntroKeyDown);
        document.addEventListener('mousedown', handleIntroMouseDown);
        introEventListenersAdded = true;
        console.log("Added intro screen event listeners");
    }

    k += .8;
    
    // Use direct image access to make sure we get the logo
    const logo_img = getImage('LOGO');
    
    try {
        // Check if logo_img is valid before drawing
        if (logo_img && logo_img.complete && logo_img.naturalWidth !== 0) {
            // Draw the logo with sine wave animation, moving it 20px higher (from 60 to 40)
            for (let l = 0; l < 100; l++) {
                const n = (k + l) * 2;
                let m = Math.sin(n/180*3.14) * 30;
                let height = m + 15;
                
                if(height < 5) {
                    height = 5;
                }
                if(height > 30) {
                    height = 30;
                }

                // Draw each horizontal slice of the logo (changed y-position from l+60 to l+40)
                ctx.drawImage(logo_img, 0, l, 321, 1, m + 240, l+40, 321, height);
            }
        } else {
            // Fallback if the image isn't loaded yet
            console.warn("Logo image not available, using fallback text");
            ctx.font = 'bold 40px Arial';
            ctx.fillStyle = '#ffcc00';
            ctx.textAlign = 'center';
            ctx.fillText("TETRIS", WIDTH/2, 40); // Also moved higher (from 50 to 40)
        }
    } catch (e) {
        console.error("Error drawing logo:", e);
        // Fallback text in case of error
        ctx.font = 'bold 40px Arial';
        ctx.fillStyle = '#ffcc00';
        ctx.textAlign = 'center';
        ctx.fillText("TETRIS", WIDTH/2, 40); // Also moved higher (from 50 to 40)
    }

    // Move "TOP PLAYERS" text further down to avoid overlap with the logo
    // Changed from y=130 to y=170
    DrawBitmapTextSmall("TOP PLAYERS", 0, 170, 1, 0, 0);
    
    let y = 200; // Changed initial y position from 150 to 200
    let p = 0;
    let ps = 0;
    
    high_scores.forEach((val) => {
        p++;
        ps++;
        
        if(p % 2 == 0) {
            p = 0;
        }
        
        if(ps < 12) {
            // Reduce sine wave effect for score listings by dividing by 2
            const m = Math.sin((k+ps*20) / 180 * 3.14) * 15; // Reduced from 30 to 15
            
            ctx.font = "15px Arial";
            ctx.textAlign = "left";
            ctx.fillStyle = '#111';
            ctx.textAlign = "right";
            
            if (ps > 1) {
                ctx.fillText(ps-1 + ".", 122+m, y+2);
            }
            
            ctx.fillText(val.score, 372+m, y+2);
            ctx.textAlign = "center";
            ctx.fillText(val.cleared_lines, 452+m, y+2);
            ctx.fillText(val.level, 552+m, y+2);
            ctx.fillText(val.time, 652+m, y+2);
            ctx.textAlign = "left";
            ctx.fillText(val.player_name, 152+m, y+2);

            ctx.fillStyle = ps == 1 ? '#faa' : '#eee';

            ctx.textAlign = "right";
            if (ps > 1) {
                ctx.fillText(ps-1 + ".", 120+m, y);
            }
            
            ctx.fillText(val.score, 370+m, y);
            ctx.textAlign = "center";
            ctx.fillText(val.cleared_lines, 450+m, y);
            ctx.fillText(val.level, 550+m, y);
            ctx.fillText(val.time, 650+m, y);

            ctx.textAlign = "left";
            ctx.fillText(val.player_name, 150+m, y);
        }
        
        sc += 1;
        y += 25;
    });
    
    // Fix the jumping bottom text by removing the sine effect (changed 1,1,1 to 1,0,0)
    DrawBitmapTextSmall("PRESS SPACE OR CLICK TO START A NEW GAME", 0, 525, 1, 0, 0);
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