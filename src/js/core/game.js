import { 
  canvas, ctx, WIDTH, HEIGHT, 
  DrawBitmapText, DrawBitmapTextSmall, 
  clearScreen, showBackground, showSlika 
} from '../utils/functions.js';
import { init3DStarfield, Draw3DStars } from '../components/effects/starfield3d.js';
import { setupFireworks, createFirework, updateFireworks } from '../components/effects/fireworks.js';
import { initGrid, fillGrid, checkRows, clearRows, showGrid, setupGrid, getGridState, setDrawBlockFunction } from '../components/gameplay/grid.js';
import { 
  setupBlockHandler, showBlock, showNextBlock, showHoldBlock, 
  drawFallingBlock, newBlock, moveBlock, Block, storeBlock, drawBlock 
} from '../components/gameplay/block.js';
import { initEventHandlers, updateGameState, eventSpace, eventSpaceFunc, game_state as events_game_state } from '../utils/events.js';
import { initHighScore, ShowHighScore, LoadHighScoreData } from './high_score.js';
import {
  initLoadingScreen, updateLoadingProgress, isLoadingComplete, hidePressSpace, handleLoadingState
} from '../states/loadingState.js';
import {
  FPS, GRID_WIDTH, GRID_HEIGHT, BLOCK_WIDTH, GRID_POS_X, GRID_POS_Y,
  INITIAL_SCORE, INITIAL_LINES, INITIAL_LEVEL, INITIAL_LEVEL_GOAL, INITIAL_GAME_STATE,
  IMAGES, AUDIO, ANIMATION, STORAGE_KEYS, GAME_STATES
} from '../config/config.js';
import { registerImage } from '../utils/assetManager.js';
import {
  initMainState, startMainGame, handleMainGameState, startGameTimer,
  togglePause, getGameStats, setBlockFinish
} from '../states/mainState.js';
import {
  initIntroState, handleIntroState, setGameStats, startNewGame
} from '../states/introState.js';
import {
  initGameOverState, handleGameOverState, resetGameOverState, setGameOverData
} from '../states/gameOverState.js';

// Game variables
let game_state = INITIAL_GAME_STATE; // Initial game state set to loading screen

// Make game_state accessible globally to allow other modules to update it
window.game_state = game_state;

let game_pause = false;
let music_on = true;
let audioInitialized = false; // Flag to track audio initialization status

// Animation frame timing variables
let lastFrameTime = 0;
let frameCounter = 0;
let frameInterval = 1000 / FPS; // Time between frames in ms

// Assets
let background;
let back_intro_img;
let lego;
let controls_img;
let level2_img, level3_img, level4_img, level5_img;
let level6_img, level7_img, level8_img, level9_img, level10_img;
let grid_img;
let logo_img;
let ambient_audio;
let clear_line_audio;

// Image loading status
let imagesLoaded = false;
let totalImages = 0;
let loadedImages = 0;

/**
 * Initialize the game
 * Sets up all modules, loads assets, and prepares the game environment
 * @returns {Promise} A promise that resolves when initialization is complete
 */
export async function init() {
  // Initialize necessary game variables and set up event listeners
  initEventHandlers(Block, ambient_audio, { game_state }, { grid_width: GRID_WIDTH, grid_height: GRID_HEIGHT });
  
  // Load high scores and preferences first (doesn't require graphics loaded)
  LoadHighScoreData();
  
  // Setup audio preferences from local storage
  if (typeof(Storage) !== "undefined") {
    const storedMusicPref = localStorage.getItem(STORAGE_KEYS.MUSIC_PREFERENCE);
    if (storedMusicPref !== null) {
      music_on = storedMusicPref === "true";
    }
  }
  
  // Start loading assets asynchronously
  const assetsPromise = Promise.all([
    loadGraphicsAsync(),
    loadAudioAsync()
  ]).catch(error => {
    console.error('Error loading assets:', error);
    // Continue even if some assets fail to load
  });
  
  // Initialize starfields (can happen before assets are loaded)
  init3DStarfield(ctx, WIDTH, HEIGHT);
  
  // Initialize fireworks system
  setupFireworks(ctx, WIDTH, HEIGHT);
  
  // Initialize high score module with game state change callback
  initHighScore(ctx, WIDTH);
  
  // Start game loop using requestAnimationFrame
  requestAnimationFrame(gameLoop);
  
  // Start the game timer
  startGameTimer();
  
  // Return the assets promise for anyone who wants to await full initialization
  return assetsPromise;
}

/**
 * Main game loop using requestAnimationFrame
 * Controls the frame rate and calls the draw function
 * @param {number} timestamp The current timestamp from requestAnimationFrame
 */
function gameLoop(timestamp) {
  // Request next frame first for smoother animation
  requestAnimationFrame(gameLoop);
  
  // Calculate time elapsed since last frame
  if (!lastFrameTime) {
    lastFrameTime = timestamp;
    return;
  }
  
  const elapsed = timestamp - lastFrameTime;
  
  // Throttle to our target frame rate
  if (elapsed < frameInterval) {
    return; // Skip this frame to maintain target FPS
  }
  
  // Update last frame time, accounting for any accumulated delay
  // This helps prevent "spiral of death" when frames take longer than expected
  lastFrameTime = timestamp - (elapsed % frameInterval);
  
  // Always call draw function to render the current frame - even when paused
  // This ensures the pause screen is drawn
  draw();
  
  // Performance monitoring
  frameCounter++;
  if (elapsed > 1000) {
    const actualFPS = Math.round(frameCounter * 1000 / elapsed);
    if (actualFPS < FPS - 5) {
      console.log(`Performance warning: ${actualFPS}fps (target: ${FPS}fps)`);
    }
    frameCounter = 0;
  }
}

// Function to handle game state changes from other modules
function handleGameStateChange(newState) {
  game_state = newState;
  window.game_state = newState; // Update the global reference
  console.log(`Game state changed to: ${newState} via callback`);
}

/**
 * Load all graphic assets for the game asynchronously
 * Initializes image objects, sets up their loading handlers, and tracks loading progress
 * @returns {Promise} A promise that resolves when all images are loaded
 */
function loadGraphicsAsync() {
  return new Promise((resolve, reject) => {
    // Define and load all game graphics
    logo_img = new Image();
    background = new Image();
    grid_img = new Image();
    level2_img = new Image();
    level3_img = new Image();
    level4_img = new Image();
    level5_img = new Image();
    level6_img = new Image();
    level7_img = new Image();
    level8_img = new Image();
    level9_img = new Image();
    level10_img = new Image();
    controls_img = new Image();
    back_intro_img = new Image();
    lego = new Image();
    
    // Create an array of all images for tracking load status
    const imageObjects = [
      { img: logo_img, src: IMAGES.LOGO },
      { img: background, src: IMAGES.BACKGROUND_LEVEL1 },
      { img: grid_img, src: IMAGES.GRID },
      { img: level2_img, src: IMAGES.BACKGROUND_LEVEL2 },
      { img: level3_img, src: IMAGES.BACKGROUND_LEVEL3 },
      { img: level4_img, src: IMAGES.BACKGROUND_LEVEL4 },
      { img: level5_img, src: IMAGES.BACKGROUND_LEVEL5 },
      { img: level6_img, src: IMAGES.BACKGROUND_LEVEL6 },
      { img: level7_img, src: IMAGES.BACKGROUND_LEVEL7 },
      { img: level8_img, src: IMAGES.BACKGROUND_LEVEL8 },
      { img: level9_img, src: IMAGES.BACKGROUND_LEVEL9 },
      { img: level10_img, src: IMAGES.BACKGROUND_LEVEL10 },
      { img: controls_img, src: IMAGES.CONTROLS },
      { img: back_intro_img, src: IMAGES.INTRO_BACKGROUND },
      { img: lego, src: IMAGES.BLOCKS },
    ];

    totalImages = imageObjects.length;
    loadedImages = 0;
    
    // Initialize the loading screen with the required images
    // We pass images immediately even though they might not be fully loaded yet
    // The loading screen will handle this gracefully
    initLoadingScreen(logo_img);
    
    // Setup onload handler for each image
    const onImageLoad = (img, id) => {
      loadedImages++;
      console.log(`Loaded ${loadedImages} of ${totalImages} images`);
      
      // Register key images with the asset manager
      if (id === 'LOGO') {
        registerImage('LOGO', img);
        console.log('Registered logo with asset manager');
      }
      
      // Update loading progress for the loading screen
      updateLoadingProgress(loadedImages, totalImages);
      
      if (loadedImages === totalImages) {
        console.log('All images loaded successfully');
        imagesLoaded = true;
        
        // Initialize main game state module with loaded assets
        const imageAssets = {
          background,
          controls: controls_img,
          back_intro: back_intro_img,
          logo: logo_img,
          level2: level2_img,
          level3: level3_img,
          level4: level4_img,
          level5: level5_img,
          level6: level6_img,
          level7: level7_img,
          level8: level8_img,
          level9: level9_img,
          level10: level10_img,
          grid: grid_img,
          blocks: lego,
        };
        
        const audioAssets = {
          clear_line: clear_line_audio
        };
        
        // Initialize all state modules
        initMainState(imageAssets, audioAssets, handleGameStateChange);
        initIntroState(imageAssets, handleGameStateChange);
        initGameOverState(imageAssets, handleGameStateChange);
        
        resolve();
      }
    };
    
    // Setup onerror handler for each image
    const onImageError = (img, src) => {
      console.error(`Failed to load image: ${src}`);
      loadedImages++;
      
      // Update loading progress for the loading screen even for failed images
      updateLoadingProgress(loadedImages, totalImages);
      
      // Even if an image fails, we continue with the game
      if (loadedImages === totalImages) {
        console.log('Finished loading images with some errors');
        imagesLoaded = true;
        resolve();
      }
    };
    
    // Start loading all images
    imageObjects.forEach(item => {
      const id = Object.keys(IMAGES).find(key => IMAGES[key] === item.src);
      item.img.onload = () => onImageLoad(item.img, id);
      item.img.onerror = () => onImageError(item.img, item.src);
      item.img.src = item.src;
    });
  });
}

/**
 * Load all audio assets for the game asynchronously
 * @returns {Promise} A promise that resolves when all audio files are loaded
 */
function loadAudioAsync() {
  return new Promise((resolve, reject) => {
    try {
      // Load game audio files
      ambient_audio = new Audio();
      ambient_audio.src = AUDIO.AMBIENT;
      
      clear_line_audio = new Audio();
      clear_line_audio.src = AUDIO.CLEAR_LINE;
      
      ambient_audio.oncanplaythrough = () => {
        console.log('Ambient audio loaded successfully');
        resolve();
      };
      
      clear_line_audio.oncanplaythrough = () => {
        console.log('Clear line audio loaded successfully');
        resolve();
      };
      
      ambient_audio.onerror = () => {
        console.error('Failed to load ambient audio');
        resolve(); // Resolve even if audio fails
      };
      
      clear_line_audio.onerror = () => {
        console.error('Failed to load clear line audio');
        resolve(); // Resolve even if audio fails
      };
    } catch (error) {
      console.error('Error loading audio:', error);
      resolve(); // Resolve even if audio fails
    }
  });
}

/**
 * Main game loop - renders different screens based on game state
 * Handles transitions between game states (loading → intro → play → etc)
 */
function draw() {
  // Check if the window.game_state has been updated from another module
  if (window.game_state !== game_state) {
    game_state = window.game_state;
    console.log(`Game state synchronized from window object: ${game_state}`);
  }

  // Check if game state was changed in events.js
  if (events_game_state === GAME_STATES.GAME_START && game_state !== GAME_STATES.GAME_START) {
    game_state = GAME_STATES.GAME_START;
    console.log("Game state changed to game_start from events module");
  }

  // Handle loading screen state
  if (game_state === GAME_STATES.LOADING) {
    // Use the loading state module
    handleLoadingState(eventSpace, (newState) => {
      game_state = newState;
      window.game_state = newState;
    });
    return;
  }
  
  // Fallback loading indicator (should rarely be shown)
  if (!imagesLoaded) {
    clearScreen('#000');
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Loading game assets... ${Math.floor((loadedImages / totalImages) * 100)}%`, WIDTH/2, HEIGHT/2);
    return;
  }

  // Handle appropriate action based on game state
  if (game_state === GAME_STATES.GAME_START) {
    console.log("Starting main game");
    game_state = startMainGame();
    window.game_state = game_state;
    updateGameState(game_state);
  }
  
  if (game_state === GAME_STATES.GAME_INTRO) {
    // Use the intro state module to handle the intro screen
    handleIntroState((newState) => {
      game_state = newState;
      window.game_state = newState;
      updateGameState(newState);
    });
    return;
  }
  
  if (game_state === GAME_STATES.GAME_OVER) {
    // Get current game stats before showing the game over screen
    const gameStats = getGameStats();
    
    // Update game over state with final score data
    setGameOverData(gameStats.score, gameStats.level, gameStats.lines, gameStats.time);
    
    // Use the game over state module to handle the game over screen
    handleGameOverState((newState) => {
      game_state = newState;
      window.game_state = newState;
      updateGameState(newState);
    });
    
    // Save game stats for high scores display on intro screen
    setGameStats(gameStats.lines, gameStats.level, gameStats.time);
    return;
  }
  
  if (game_state === GAME_STATES.HIGH_SCORE) {
    clearScreen('#000');
    showBackground(background, 0, 0, 1280, HEIGHT);
    Draw3DStars();
    ShowHighScore();
    return;
  }
  
  if (game_state === GAME_STATES.PLAY_GAME) {
    // Use the main state module to handle the gameplay
    handleMainGameState((newState) => {
      game_state = newState;
      window.game_state = newState;
      updateGameState(newState);
    });
  }
}

// In main.js, this will be imported and initialized when the page loads
export function initGame() {
  init();
}

// Prevent default spacebar and arrow key behavior (scrolling)
window.addEventListener("keydown", function(e) {
  if([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) {
    e.preventDefault();
  }
}, false);

// Function to initialize audio after user interaction
export function initAudio() {
  if (!audioInitialized && music_on) {
    // Try to play the ambient audio
    const playPromise = ambient_audio.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          audioInitialized = true;
          console.log("Audio playback started successfully");
        })
        .catch(error => {
          console.log("Audio playback was prevented: ", error);
        });
    }
  }
}

// Export game pause toggle for events.js to use
export function toggleGamePause() {
  game_pause = togglePause();
  return game_pause;
}

// Export music toggle for events.js to use
export function toggleGameMusic() {
  music_on = !music_on;
  
  // Save music preference to local storage
  if (typeof(Storage) !== "undefined") {
    localStorage.setItem(STORAGE_KEYS.MUSIC_PREFERENCE, music_on);
  }
  
  // Control audio playback based on preference
  if (music_on && ambient_audio) {
    if (audioInitialized) {
      const playPromise = ambient_audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.log("Audio playback failed: ", error);
        });
      }
    }
  } else if (ambient_audio) {
    ambient_audio.pause();
  }
  
  return music_on;
}