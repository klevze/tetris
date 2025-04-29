/**
 * Tetris Game Configuration
 * Central location for all game constants and settings
 */

// Game states
export const GAME_STATES = {
    LOADING: 'loading',
    GAME_INTRO: 'game_intro',
    GAME_START: 'game_start',
    PLAY_GAME: 'play_game',
    GAME_OVER: 'game_over',
    HIGH_SCORE: 'high_score',
    PAUSED: 'paused'
};

// Canvas dimensions (these will be overridden by setCanvasSize in functions.js)
export const CANVAS = {
    WIDTH: window.innerWidth || 800,   // Default to window width or 800px fallback
    HEIGHT: window.innerHeight || 600  // Default to window height or 600px fallback
};

// Block settings - new variables to control block dimensions
export const BLOCK = {
    MAX_WIDTH: 30,   // Maximum width for blocks in pixels
    MAX_HEIGHT: 30,  // Maximum height for blocks in pixels
    SPRITE_SIZE: 90  // Size of blocks in sprite sheet (was 30px)
};

// Grid settings
export const GRID = {
    WIDTH: 10,
    HEIGHT: 20,
    BLOCK_WIDTH: BLOCK.MAX_WIDTH, // Use the block size variable
    // We'll calculate these dynamically in the setupGrid function
    POS_X: 277,
    POS_Y: 28,  // Increased from 10 to move blocks down by 15px
    // Offset values for aligning blocks with grid image
    OFFSET_X: 80, // Horizontal adjustment to align blocks with grid (changed from 85 to 80)
    OFFSET_Y: -10  // Vertical adjustment (move blocks up by 10px)
};

// Individual grid values (for backwards compatibility)
export const GRID_WIDTH = GRID.WIDTH;
export const GRID_HEIGHT = GRID.HEIGHT;
export const BLOCK_WIDTH = GRID.BLOCK_WIDTH;
export const GRID_POS_X = GRID.POS_X;
export const GRID_POS_Y = GRID.POS_Y;

// Game settings
export const GAME = {
    FPS: 60,
    INITIAL_SPEED: 45, // Frames per block drop at level 1
    SPEED_INCREMENT: 4,  // How much to reduce frames per level
    
    // Level-based drop speed in milliseconds
    LEVEL_SPEEDS: [
        1000,   // Level 0: 1000ms
        920,    // Level 1: 920ms
        840,    // Level 2: 840ms
        760,    // Level 3: 760ms
        680,    // Level 4: 680ms
        600,    // Level 5: 600ms
        520,    // Level 6: 520ms
        440,    // Level 7: 440ms
        360,    // Level 8: 360ms
        280,    // Level 9: 280ms
        200,    // Level 10: 200ms
        160,    // Level 11: 160ms
        160,    // Level 12: 160ms
        120,    // Level 13: 120ms
        120,    // Level 14: 120ms
        100,    // Level 15: 100ms
        100,    // Level 16: 100ms
        80,     // Level 17: 80ms
        80,     // Level 18: 80ms
        60      // Level 19+: 60ms
    ]
};

// Individual game settings for backwards compatibility
export const FPS = GAME.FPS;

// Initial game values
export const INITIAL_SCORE = 0;
export const INITIAL_LINES = 0;
export const INITIAL_LEVEL = 0;  // Changed from 1 to 0
export const INITIAL_LEVEL_GOAL = 10;
export const INITIAL_GAME_STATE = GAME_STATES.LOADING;

// Animation settings
export const ANIMATION = {
    LINE_CLEAR_FRAMES: 20,    // Number of frames for line clear animation
    LEVEL_UP_FRAMES: 45,      // Number of frames for level up animation
    GAME_OVER_FRAMES: 60,     // Number of frames for game over animation
    TEXT_FLOAT_SPEED: 2,      // Speed for floating text animations
    SINE_WAVE_SPEED: 0.8,     // Speed for sine wave animations
    TITLE_ANIMATION_SPEED: 0.5, // Speed for title animations
    SCORE_DISPLAY_FRAMES: 60  // Number of frames to display score animation
};

// Local storage keys
export const STORAGE_KEYS = {
    HIGH_SCORES: 'tetrisHighScores',
    MUSIC_PREFERENCE: 'music_on',
    PLAYER_NAME: 'player_name'
};

// Image assets with their paths
export const IMAGES = {
    BLOCKS: '/images/blocks90px_001.png', // Using the new 90px block image
    GRID: '/images/grid5.png',
    BACKGROUND_LEVEL1: '/images/tetris_main_level_1.webp',
    BACKGROUND_LEVEL2: '/images/tetris_main_back_level2.jpg',
    BACKGROUND_LEVEL3: '/images/tetris_main_back_level3.jpg',
    BACKGROUND_LEVEL4: '/images/tetris_main_back_level4.jpg',
    BACKGROUND_LEVEL5: '/images/tetris_main_back_level5.jpg',
    BACKGROUND_LEVEL6: '/images/tetris_main_back_level6.jpg',
    BACKGROUND_LEVEL7: '/images/tetris_main_back_level7.jpg',
    BACKGROUND_LEVEL8: '/images/tetris_main_back_level8.jpg',
    BACKGROUND_LEVEL9: '/images/tetris_main_back_level9.jpg',
    BACKGROUND_LEVEL10: '/images/tetris_main_back_level10.jpg',
    INTRO_BACKGROUND: '/images/main_background.webp',
    LOGO: '/images/logo.webp',
    CONTROLS: '/images/controls.png'
};

// Audio assets with their paths
export const AUDIO = {
    AMBIENT: '/music/48997.wav',
    CLEAR_LINE: '/music/GONG0.WAV'
};

// Point values for actions
export const POINTS = {
    SOFT_DROP: 1,     // Points per cell for soft drop
    HARD_DROP: 2,     // Points per cell for hard drop
    SINGLE: 100,      // Points for 1 line clear
    DOUBLE: 300,      // Points for 2 lines clear
    TRIPLE: 500,      // Points for 3 lines clear
    TETRIS: 800       // Points for 4 lines clear
};

// User Interface settings
export const UI = {
    MAX_LOGO_WIDTH: 600,     // Reduced from 800 to 600 for smaller logo
    LOADING_BAR_WIDTH: 400,  // Width of the loading progress bar
    LOADING_BAR_HEIGHT: 20   // Height of the loading progress bar
};

// Touch controls settings
export const TOUCH = {
    SWIPE_THRESHOLD: 30,    // Minimum swipe distance in pixels
    DOUBLE_TAP_DELAY: 300   // Maximum delay between taps for double-tap in ms
};