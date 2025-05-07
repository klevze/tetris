/**
 * Intro Screen State Module
 * Handles the game's intro screen with high scores, logo animation, and game start functionality
 */

import { 
  canvas, ctx, WIDTH, HEIGHT, 
  DrawBitmapText, DrawBitmapTextSmall, 
  clearScreen, showBackground 
} from '../utils/functions.js';
import { GAME_STATES, UI } from '../config/config.js';
import { getImage } from '../utils/assetManager.js';
import { loadHighScores } from '../config/firebase.js';

// Animation and display variables
let k = 0; // Animation counter for logo sine wave effect
let sc = 0; // Counter used in score display animations
let introEventListenersAdded = false; // Track if event listeners are active

// Level selection
let selectedLevel = 0; // Selected starting level (0-19)

// Settings popup variables
let showSettingsPopup = false; // Controls visibility of settings popup
let musicEnabled = true;       // Whether music is enabled

// Level selection popup variable
let showLevelPopup = false; // Controls visibility of level selection popup

// Tetris block fireworks animation variables
let tetrisFireworks = [];
const MAX_FIREWORKS = 6;
const FIREWORK_PARTICLES_MIN = 20;
const FIREWORK_PARTICLES_MAX = 40;
const FIREWORK_SPAWN_CHANCE = 0.02; // 2% chance per frame to spawn new firework
const GRAVITY = 0.06;
const FRICTION = 0.98;

// Game statistics (displayed in the intro screen)
let lines = 0;
let level = 1;
let TotalSeconds = 0;

// High scores array 
let high_scores = [];
let gameStateCallback = null;

// Cloud high scores status
let isLoadingScores = false;
let cloudScoresLoaded = false;
let cloudLoadError = false;
let loadStartTime = 0;
let scoreLoadRetries = 0;
const MAX_RETRIES = 3;

// Assets
let back_intro_img;
let logo_img;

/**
 * Initialize the intro screen module
 * 
 * @param {Object} images - Object containing all game images
 * @param {Function} updateGameStateCallback - Function to update game state
 */
export function initIntroState(images, updateGameStateCallback) {
  // Store image references
  back_intro_img = images.back_intro;
  logo_img = images.logo;
  
  // Store callback for state changes
  gameStateCallback = updateGameStateCallback;
  
  // Load settings (level and music preferences) 
  loadSettings();
  
  // First load from localStorage as a fallback
  loadHighScoreData();
  
  // Then try to load from Firebase
  loadCloudHighScores();
  
  // Initialize fireworks
  tetrisFireworks = [];
}

/**
 * Load settings from localStorage
 */
function loadSettings() {
  try {
    if (typeof(Storage) !== "undefined") {
      // Load selected level
      const savedLevel = localStorage.getItem('tetris_selected_level');
      if (savedLevel !== null) {
        selectedLevel = parseInt(savedLevel, 10);
        // Update the global variable used by the game
        window.selected_game_level = selectedLevel;
        console.log(`Loaded selected level ${selectedLevel} from localStorage`);
      }
      
      // Load music preference
      const storedMusicPref = localStorage.getItem('music_on');
      if (storedMusicPref !== null) {
        musicEnabled = storedMusicPref === "true";
        // Update the global music variable if it exists
        if (typeof window.music_on !== 'undefined') {
          window.music_on = musicEnabled;
        }
        console.log(`Loaded music preference: ${musicEnabled} from localStorage`);
      }
    }
  } catch (e) {
    console.error("Error loading settings:", e);
  }
}

/**
 * Save settings to localStorage
 */
function saveSettings() {
  try {
    if (typeof(Storage) !== "undefined") {
      // Save selected level
      localStorage.setItem('tetris_selected_level', selectedLevel.toString());
      // Update the global variable used by the game
      window.selected_game_level = selectedLevel;
      
      // Save music preference
      localStorage.setItem('music_on', musicEnabled.toString());
      // Update the global music variable
      if (typeof window.music_on !== 'undefined') {
        window.music_on = musicEnabled;
      }
      
      console.log(`Saved settings - Level: ${selectedLevel}, Music: ${musicEnabled}`);
    }
  } catch (e) {
    console.error("Error saving settings:", e);
  }
}

/**
 * Load the user's previously selected level from localStorage
 */
function loadSelectedLevel() {
  try {
    if (typeof(Storage) !== "undefined") {
      const savedLevel = localStorage.getItem('tetris_selected_level');
      if (savedLevel !== null) {
        selectedLevel = parseInt(savedLevel, 10);
        console.log(`Loaded selected level ${selectedLevel} from localStorage`);
      }
    }
  } catch (e) {
    console.error("Error loading selected level:", e);
  }
}

/**
 * Tetris block for firework particle
 */
class TetrisBlockParticle {
  constructor(x, y, color, isSecondary = false) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = isSecondary ? 3 + Math.random() * 5 : 6 + Math.random() * 10; // Smaller for secondary explosions
    this.alpha = 1;
    this.decay = Math.random() * 0.03 + (isSecondary ? 0.02 : 0.01); // Faster decay for secondary particles
    this.isSecondary = isSecondary;
    
    // Create random velocity for explosion effect
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * (isSecondary ? 3 : 5) + (isSecondary ? 0.5 : 1);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    
    // Random rotation
    this.rotation = Math.random() * 360;
    this.rotationSpeed = (Math.random() - 0.5) * (isSecondary ? 12 : 8);
    
    // Visual effects
    this.highlight = 'rgba(255, 255, 255, 0.7)';
    this.shadow = 'rgba(0, 0, 0, 0.4)';
    
    // Secondary explosion trigger
    this.canExplode = !isSecondary; // Only primary particles can explode
    this.explosionThreshold = 0.4 + Math.random() * 0.3; // Alpha threshold for secondary explosion
    this.hasExploded = false;
  }
  
  update() {
    // Apply gravity and friction
    this.vx *= FRICTION;
    this.vy = this.vy * FRICTION + GRAVITY;
    
    // Update position
    this.x += this.vx;
    this.y += this.vy;
    
    // Update rotation
    this.rotation += this.rotationSpeed;
    
    // Reduce alpha as the particle ages
    this.alpha -= this.decay;
    
    return this.alpha > 0;
  }
  
  // Check if this particle should create a secondary explosion
  shouldExplode() {
    if (this.canExplode && !this.hasExploded && this.alpha <= this.explosionThreshold) {
      this.hasExploded = true;
      return true;
    }
    return false;
  }
  
  // Create secondary particles when this one explodes
  createSecondaryParticles() {
    const particles = [];
    
    // Create 4-7 smaller particles
    const count = 4 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < count; i++) {
      // Keep same color for cohesive look, but could use different colors
      particles.push(new TetrisBlockParticle(this.x, this.y, this.color, true));
    }
    
    return particles;
  }
  
  draw() {
    ctx.save();
    
    // Set transparency
    ctx.globalAlpha = this.alpha;
    
    // Translate and rotate
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);
    
    const halfSize = this.size / 2;
    
    // Draw the main block
    ctx.fillStyle = this.color;
    ctx.fillRect(-halfSize, -halfSize, this.size, this.size);
    
    // Draw highlight edge (top-left)
    ctx.fillStyle = this.highlight;
    ctx.beginPath();
    ctx.moveTo(-halfSize, -halfSize);
    ctx.lineTo(halfSize, -halfSize);
    ctx.lineTo(halfSize - this.size * 0.3, -halfSize + this.size * 0.3);
    ctx.lineTo(-halfSize + this.size * 0.3, -halfSize + this.size * 0.3);
    ctx.lineTo(-halfSize + this.size * 0.3, halfSize - this.size * 0.3);
    ctx.lineTo(-halfSize, halfSize);
    ctx.closePath();
    ctx.fill();
    
    // Draw shadow edge (bottom-right)
    ctx.fillStyle = this.shadow;
    ctx.beginPath();
    ctx.moveTo(halfSize, -halfSize);
    ctx.lineTo(halfSize, halfSize);
    ctx.lineTo(-halfSize, halfSize);
    ctx.lineTo(-halfSize + this.size * 0.3, halfSize - this.size * 0.3);
    ctx.lineTo(halfSize - this.size * 0.3, halfSize - this.size * 0.3);
    ctx.lineTo(halfSize - this.size * 0.3, -halfSize + this.size * 0.3);
    ctx.closePath();
    ctx.fill();
    
    // Draw border
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(-halfSize, -halfSize, this.size, this.size);
    
    ctx.restore();
  }
}

/**
 * Tetris block firework explosion
 */
class TetrisFireworkExplosion {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.particles = [];
    
    // Tetris colors
    const tetrisColors = [
      '#00f0f0', // Cyan - I piece
      '#0000f0', // Blue - J piece
      '#f0a000', // Orange - L piece
      '#f0f000', // Yellow - O piece
      '#00f000', // Green - S piece
      '#a000f0', // Purple - T piece
      '#f00000'  // Red - Z piece
    ];
    
    // Choose a random color theme for this firework (single color or multi-color)
    const singleColor = Math.random() < 0.7;
    const mainColor = tetrisColors[Math.floor(Math.random() * tetrisColors.length)];
    
    // Create particles
    const particleCount = FIREWORK_PARTICLES_MIN + 
      Math.floor(Math.random() * (FIREWORK_PARTICLES_MAX - FIREWORK_PARTICLES_MIN));
    
    for (let i = 0; i < particleCount; i++) {
      // If single color theme, use the main color, otherwise random Tetris colors
      const color = singleColor ? 
        mainColor : 
        tetrisColors[Math.floor(Math.random() * tetrisColors.length)];
      
      this.particles.push(new TetrisBlockParticle(this.x, this.y, color));
    }
  }
  
  update() {
    // Secondary explosion particles to be added
    const secondaryParticles = [];
    
    // Update all particles and remove dead ones
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      const isActive = particle.update();
      
      // Check for secondary explosion
      if (particle.shouldExplode()) {
        // Add particles from secondary explosion
        secondaryParticles.push(...particle.createSecondaryParticles());
      }
      
      if (!isActive) {
        this.particles.splice(i, 1);
      }
    }
    
    // Add all secondary particles after the loop to avoid modifying array during iteration
    if (secondaryParticles.length > 0) {
      this.particles.push(...secondaryParticles);
    }
    
    return this.particles.length > 0;
  }
  
  draw() {
    // Draw all particles
    for (const particle of this.particles) {
      particle.draw();
    }
  }
}

/**
 * Create a new Tetris block firework explosion
 */
function createTetrisFirework() {
  if (tetrisFireworks.length < MAX_FIREWORKS) {
    // Create firework specifically under the high score area
    
    // Calculate the position of the high score area
    const topPlayersY = Math.max(160, HEIGHT * 0.18 + 70); 
    const scoreAreaTop = topPlayersY + 80; // Start of high scores
    
    // Estimate how many rows of scores we have (maximum 11 entries with 55px spacing)
    const estimatedScoreRows = Math.min(high_scores.length, 11);
    const scoreAreaBottom = scoreAreaTop + (estimatedScoreRows * 55);
    
    // Position the fireworks below the scores list
    const x = WIDTH * 0.2 + Math.random() * (WIDTH * 0.6); // More centered horizontally
    const y = scoreAreaBottom + 20 + Math.random() * 100; // Just below the score list
    
    // Create a new firework explosion
    tetrisFireworks.push(new TetrisFireworkExplosion(x, y));
    
    // Occasionally create a special coordinated firework pattern
    if (Math.random() < 0.1 && tetrisFireworks.length < MAX_FIREWORKS - 2) {
      setTimeout(() => {
        // Create a pattern with two additional fireworks
        if (tetrisFireworks.length < MAX_FIREWORKS) {
          tetrisFireworks.push(new TetrisFireworkExplosion(x - 100, y + 20));
        }
        setTimeout(() => {
          if (tetrisFireworks.length < MAX_FIREWORKS) {
            tetrisFireworks.push(new TetrisFireworkExplosion(x + 100, y + 20));
          }
        }, 150);
      }, 150);
    }
  }
}

/**
 * Update and render all Tetris block fireworks
 */
function updateTetrisFireworks() {
  // Chance to create new firework
  if (Math.random() < FIREWORK_SPAWN_CHANCE) {
    createTetrisFirework();
  }
  
  // Update and render fireworks
  for (let i = tetrisFireworks.length - 1; i >= 0; i--) {
    const isActive = tetrisFireworks[i].update();
    if (isActive) {
      tetrisFireworks[i].draw();
    } else {
      tetrisFireworks.splice(i, 1);
    }
  }
}

/**
 * Refresh high scores data - can be called externally when returning to intro screen
 * after submitting a new high score
 */
export function refreshHighScores() {
  // First load from localStorage as a fallback
  loadHighScoreData();
  
  // Then try to load from Firebase
  loadCloudHighScores();
  
  // Make sure event listeners are properly reattached
  if (!introEventListenersAdded) {
    removeAllEventListeners();
    document.addEventListener('keydown', handleIntroKeyDown);
    canvas.addEventListener('click', handleIntroScreenClick);
    introEventListenersAdded = true;
    console.log("Reattached intro screen event listeners during refresh");
  }
}

/**
 * Handle the intro state
 * Shows intro screen with logo, top players and "press space to start" prompt
 * 
 * @param {Function} setGameState - Function to update the game state
 * @returns {boolean} True if state was handled
 */
export function handleIntroState(setGameState) {
  // Set up intro screen event handlers if not already set
  if (!introEventListenersAdded) {
    // Remove any existing listeners first
    removeAllEventListeners();
      
    // Add intro-specific event listeners - only listen for keydown, not mousedown
    document.addEventListener('keydown', handleIntroKeyDown);
    canvas.addEventListener('click', handleIntroScreenClick);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchstart', handleIntroScreenClick); // Added touch event listener
    introEventListenersAdded = true;
  }

  // Increment animation counter
  k += 0.8;
  
  // Clear screen and draw background elements
  clearScreen('#000');
  showBackground(back_intro_img, 0, 0, WIDTH, HEIGHT);
  
  // Check if we need to use a smaller font size based on screen width
  const isSmallScreen = window.innerWidth < 1100;
  const isVerySmallScreen = window.innerWidth < 800;
  const isTinyScreen = window.innerWidth < 600; // Even smaller screens show fewer columns
  
  // Use direct image access to make sure we get the logo
  try {
    // Check if logo_img is valid before drawing
    if (logo_img && logo_img.complete && logo_img.naturalWidth !== 0) {
      // Original logo dimensions
      const originalWidth = logo_img.naturalWidth || 321;
      const originalHeight = logo_img.naturalHeight || 100;
      
      // Calculate available space respecting MAX_LOGO_WIDTH setting
      const maxLogoWidth = UI.MAX_LOGO_WIDTH;
      const availableWidth = Math.min(WIDTH * 0.75, maxLogoWidth); // Reduced from 0.9 to 0.75
      
      // Calculate scaling factor while maintaining aspect ratio
      const scaleFactor = (availableWidth / originalWidth) * 0.85; // Added additional 0.85 scaling factor
      
      // Calculate the display width and height
      const displayWidth = originalWidth * scaleFactor;
      const displayHeight = originalHeight * scaleFactor;
      
      // Center the logo horizontally (centered X position)
      const centerX = (WIDTH - displayWidth) / 2;
      
      // Draw the logo as a single static image without sine wave animation
      ctx.drawImage(
        logo_img,
        0, 0, originalWidth, originalHeight, // Source rectangle (full image)
        centerX, 40, displayWidth, displayHeight // Destination rectangle
      );
    } else {
      // Fallback if the image isn't loaded yet
      ctx.font = 'bold 35px Arial'; // Reduced from 40px to 35px
      ctx.fillStyle = '#ffcc00';
      ctx.textAlign = 'center';
      ctx.fillText("TETRIS", WIDTH/2, 40);
    }
  } catch (e) {
    console.error("Error drawing logo:", e);
    // Fallback text in case of error
    ctx.font = 'bold 40px Arial';
    ctx.fillStyle = '#ffcc00';
    ctx.textAlign = 'center';
    ctx.fillText("TETRIS", WIDTH/2, 40);
  }

  // Add a cloud high scores badge
  const badgeWidth = 170;
  const badgeHeight = 30;
  const badgeX = WIDTH - badgeWidth - 10;
  const badgeY = 10;
  
  // Draw the badge background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(badgeX, badgeY, badgeWidth, badgeHeight);
  
  // Show different status based on cloud loading state
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  
  if (isLoadingScores) {
    // Animate loading dots
    const dots = ".".repeat(1 + Math.floor(Date.now() / 300) % 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`LOADING SCORES${dots}`, badgeX + badgeWidth/2, badgeY + 20);
  } else if (cloudLoadError) {
    ctx.fillStyle = '#ff6b6b'; // Red for error
    ctx.fillText(`USING LOCAL SCORES`, badgeX + badgeWidth/2, badgeY + 20);
  } else if (cloudScoresLoaded) {
    ctx.fillStyle = '#4ecdc4'; // Teal for cloud
    ctx.fillText(`CLOUD HIGH SCORES`, badgeX + badgeWidth/2, badgeY + 20);
  } else {
    ctx.fillStyle = '#ffe66d'; // Yellow for local
    ctx.fillText(`LOCAL HIGH SCORES`, badgeX + badgeWidth/2, badgeY + 20);
  }

  // Calculate positions for the high scores section
  // Logo + space + scores list + space + bottom text
  const verticalSpacing = HEIGHT * 0.18; // Decreased from 0.30 to 0.18 to move higher
  const topPlayersY = Math.max(160, verticalSpacing + 40); // Decreased from 220 to 160 for higher position
  
  // Draw "TOP PLAYERS" text centered with larger font
  DrawBitmapText("TOP PLAYERS", 0, topPlayersY, 1, 0, 0);
    
  // Start high scores list below the title with more spacing
  let y = topPlayersY + 80; // Decreased from 130 to 80 to reduce space between title and first entry
  let p = 0;
  let ps = 0;
  
  // Show a "refresh" button if cloud load failed
  if (cloudLoadError && !isLoadingScores) {
    // Draw a small refresh button
    const btnWidth = 120;
    const btnHeight = 25;
    const btnX = (WIDTH - btnWidth) / 2;
    const btnY = y;
    
    // Button background
    ctx.fillStyle = '#4285F4'; // Google blue
    ctx.fillRect(btnX, btnY, btnWidth, btnHeight);
    
    // Button text
    ctx.font = '14px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText("RETRY CLOUD", btnX + btnWidth/2, btnY + 17);
    
    // Add click handler for the refresh button
    canvas.addEventListener('click', function refreshHandler(e) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      if (mouseX >= btnX && mouseX <= btnX + btnWidth &&
          mouseY >= btnY && mouseY <= btnY + btnHeight) {
        // Remove this handler to avoid duplicates
        canvas.removeEventListener('click', refreshHandler);
        // Reset error state and retry loading
        cloudLoadError = false;
        scoreLoadRetries = 0;
        loadCloudHighScores();
      }
    });
    
    y += btnHeight + 40;
  }
  
  // Calculate center position for the scores list
  const centerX = WIDTH / 2;
  
  // Define column widths with responsive sizing
  let rankWidth, nameWidth, scoreWidth, statsWidth;
  
  if (isTinyScreen) {
    // Tiny screens (<600px) - show only essential columns
    rankWidth = 45;
    nameWidth = 160;
    scoreWidth = 110;
    statsWidth = 0; // Hide stats columns
  } else if (isVerySmallScreen) {
    // Very small screens (<800px) - make columns much smaller
    rankWidth = 45;
    nameWidth = 160;  
    scoreWidth = 110; 
    statsWidth = 70;
  } else if (isSmallScreen) {
    // Small screens (<1100px) - make columns smaller
    rankWidth = 60;
    nameWidth = 200;
    scoreWidth = 140; 
    statsWidth = 95;
  } else {
    // Normal screens - use original sizes
    rankWidth = 70;
    nameWidth = 240;  
    scoreWidth = 170; 
    statsWidth = 110;
  }
  
  // Use responsive spacing between columns based on screen width
  const spacing = isTinyScreen ? 8 : isVerySmallScreen ? 8 : isSmallScreen ? 15 : 25;
  
  // Calculate total width including all columns and spacing
  let totalWidth;
  
  if (isTinyScreen) {
    // For tiny screens, we show rank, name, score, and lines only
    const linesColumnWidth = 65; // Smaller lines column width for tiny screens
    totalWidth = rankWidth + nameWidth + scoreWidth + linesColumnWidth + (spacing * 3);
  } else {
    // Normal calculation for other screen sizes
    totalWidth = rankWidth + nameWidth + scoreWidth + (statsWidth * 3) + (spacing * 5);
  }
  
  // Calculate starting X position to ensure perfect centering 
  const startX = centerX - (totalWidth / 2);
  
  // Define column positions with precise spacing
  const rankX = startX;
  const nameX = rankX + rankWidth + spacing;
  const scoreX = nameX + nameWidth + spacing;
  const linesX = scoreX + scoreWidth + spacing;
  const levelX = linesX + statsWidth + spacing;
  const timeX = levelX + statsWidth + spacing;
  
  // Add score column headers with shadows
  const headerY = y - 30; // Position headers above the scores
  ctx.fillStyle = '#111'; // Shadow color
  
  // Draw column headers shadows
  DrawBitmapTextSmall("RANK", rankX + 2, headerY + 2, 0, 0, 0);
  DrawBitmapTextSmall("PLAYER", nameX + 2, headerY + 2, 0, 0, 0);
  DrawBitmapTextSmall("SCORE", scoreX + 2, headerY + 2, 0, 0, 0);
  if (!isTinyScreen) {
    DrawBitmapTextSmall("LINES", linesX + 2, headerY + 2, 0, 0, 0);
    DrawBitmapTextSmall("LEVEL", levelX + 2, headerY + 2, 0, 0, 0);
    DrawBitmapTextSmall("TIME", timeX + 2, headerY + 2, 0, 0, 0);
  }
  
  // Draw column headers
  ctx.fillStyle = '#ffcc00'; // Gold color for headers
  DrawBitmapTextSmall("RANK", rankX, headerY, 0, 0, 0);
  DrawBitmapTextSmall("PLAYER", nameX, headerY, 0, 0, 0);
  DrawBitmapTextSmall("SCORE", scoreX, headerY, 0, 0, 0);
  if (!isTinyScreen) {
    DrawBitmapTextSmall("LINES", linesX, headerY, 0, 0, 0);
    DrawBitmapTextSmall("LEVEL", levelX, headerY, 0, 0, 0);
    DrawBitmapTextSmall("TIME", timeX, headerY, 0, 0, 0);
  }
    
  high_scores.forEach((val, index) => {
    p++;
    ps++;
      
    if (p % 2 == 0) {
      p = 0;
    }
    
    // Calculate the maximum y position (80% of screen height)
    const maxYPosition = HEIGHT * 0.8;
    
    // If we're going to exceed the maximum height, stop rendering more scores
    if (y + 55 > maxYPosition) {
      return; // Exit the forEach loop early
    }
    
    // Apply sine wave effect for score listings (reduced)
    const m = Math.sin((k+ps*30) / 180 * 3.14) * 20;
      
    // Draw score entry with shadow effect - using larger bitmap font
    const isTopScore = ps == 1;
    const textColor = isTopScore ? '#faa' : (cloudScoresLoaded ? '#b3e5fc' : '#eee');
    const shadowColor = '#111';
    
    // Determine the max score length from the first (highest) score
    const maxScoreLength = index === 0 ? 
      val.score.toString().length : 
      high_scores[0].score.toString().length;
    
    // Format score with leading zeros to match the length of the highest score
    const formattedScore = val.score.toString().padStart(maxScoreLength, '0');
    
    // Format lines and level with leading zeros
    const formattedLines = val.cleared_lines.toString().padStart(3, '0');
    const formattedLevel = val.level.toString().padStart(2, '0');
      
    // Draw shadows
    ctx.fillStyle = shadowColor;
    
    if (isSmallScreen) {
      // Draw with smaller bitmap text for smaller screens
      // Draw rank number with shadow
      DrawBitmapTextSmall(ps + ".", rankX + m + 2, y + 2, 0, 0, 0);
      
      // Draw player name with shadow
      DrawBitmapTextSmall(val.player_name, nameX + m + 2, y + 2, 0, 0, 0);
      
      // Draw score with shadow (with matching leading zeros)
      DrawBitmapTextSmall(formattedScore, scoreX + m + 2, y + 2, 0, 0, 0);
      
      if (!isTinyScreen) {
        // Draw stats with shadow
        DrawBitmapTextSmall(formattedLines, linesX + m + 2, y + 2, 0, 0, 0);
        DrawBitmapTextSmall(formattedLevel, levelX + m + 2, y + 2, 0, 0, 0);
        DrawBitmapTextSmall(val.time, timeX + m + 2, y + 2, 0, 0, 0);
      }
      
      // Draw the text with proper color
      ctx.fillStyle = textColor;
      
      // Draw rank number
      DrawBitmapTextSmall(ps + ".", rankX + m, y, 0, 0, 0);
      
      // Draw player name
      DrawBitmapTextSmall(val.player_name, nameX + m, y, 0, 0, 0);
      
      // Draw score (with matching leading zeros)
      DrawBitmapTextSmall(formattedScore, scoreX + m, y, 0, 0, 0);
      
      if (!isTinyScreen) {
        // Draw stats
        DrawBitmapTextSmall(formattedLines, linesX + m, y, 0, 0, 0);
        DrawBitmapTextSmall(formattedLevel, levelX + m, y, 0, 0, 0);
        DrawBitmapTextSmall(val.time, timeX + m, y, 0, 0, 0);
      }
    } else {
      // Draw with regular larger bitmap font for normal screens
      // Draw rank number with shadow
      DrawBitmapText(ps + ".", rankX + m + 2, y + 2, 0, 0, 0);
      
      // Draw player name with shadow
      DrawBitmapText(val.player_name, nameX + m + 2, y + 2, 0, 0, 0);
      
      // Draw score with shadow (with matching leading zeros)
      DrawBitmapText(formattedScore, scoreX + m + 2, y + 2, 0, 0, 0);
      
      if (!isTinyScreen) {
        // Draw stats with shadow
        DrawBitmapText(formattedLines, linesX + m + 2, y + 2, 0, 0, 0);
        DrawBitmapText(formattedLevel, levelX + m + 2, y + 2, 0, 0, 0);
        DrawBitmapText(val.time, timeX + m + 2, y + 2, 0, 0, 0);
      }
      
      // Draw the text with proper color
      ctx.fillStyle = textColor;
      
      // Draw rank number
      DrawBitmapText(ps + ".", rankX + m, y, 0, 0, 0);
      
      // Draw player name
      DrawBitmapText(val.player_name, nameX + m, y, 0, 0, 0);
      
      // Draw score (with matching leading zeros)
      DrawBitmapText(formattedScore, scoreX + m, y, 0, 0, 0);
      
      if (!isTinyScreen) {
        // Draw stats
        DrawBitmapText(formattedLines, linesX + m, y, 0, 0, 0);
        DrawBitmapText(formattedLevel, levelX + m, y, 0, 0, 0);
        DrawBitmapText(val.time, timeX + m, y, 0, 0, 0);
      }
    }
      
    sc += 1;
    
    // Same line height for all entries
    y += isSmallScreen ? 35 : 55; // Smaller spacing between entries on small screens
  });
    
  // Position the buttons at the bottom of the screen with appropriate padding
  const bottomPadding = HEIGHT * 0.05; // 5% of screen height as padding
  const buttonY = HEIGHT - bottomPadding;
  
  // Draw Play and Select Level buttons instead of "PRESS SPACE TO START" text
  drawActionButtons(buttonY);
  
  // Update and render Tetris block fireworks
  updateTetrisFireworks();
  
  // Draw level selection popup if visible
  if (showLevelPopup) {
    drawLevelPopup();
  }
  
  return true;
}

/**
 * Draw Play and Select Level buttons
 * 
 * @param {number} y - Y position for the buttons
 */
function drawActionButtons(y) {
  // Check for small screen (less than 700px width)
  const isSmallScreen = window.innerWidth < 700;
  const isTinyScreen = window.innerWidth < 600; // Special handling for very small screens
  
  // Calculate button sizes - on small screens, limit to 40% of screen width
  const buttonWidth = isSmallScreen 
    ? Math.floor(window.innerWidth * 0.4) // 40% of screen width
    : 300; // Default width on larger screens
  
  const buttonHeight = isSmallScreen ? 60 : 70; // Slightly smaller height on small screens
  const buttonSpacing = isSmallScreen ? 20 : 30; // Less spacing on small screens
  
  const totalWidth = (buttonWidth * 2) + buttonSpacing;
  
  // Center the buttons horizontally
  const startX = (WIDTH - totalWidth) / 2;
  
  // Play button position
  const playX = startX;
  
  // Select Level button position
  const levelX = startX + buttonWidth + buttonSpacing;
  
  // Button style (Play button)
  ctx.fillStyle = '#4CAF50'; // Green
  roundRect(ctx, playX, y - buttonHeight, buttonWidth, buttonHeight, 12); // Increased corner radius
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  roundRect(ctx, playX, y - buttonHeight, buttonWidth, buttonHeight, 12);
  ctx.stroke();
  
  // Button style (Select Level button)
  ctx.fillStyle = '#2196F3'; // Blue
  roundRect(ctx, levelX, y - buttonHeight, buttonWidth, buttonHeight, 12); // Increased corner radius
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  roundRect(ctx, levelX, y - buttonHeight, buttonWidth, buttonHeight, 12);
  ctx.stroke();
  
  // Button text with shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  
  // Draw PLAY and LEVEL buttons with centered text
  if (isSmallScreen) {
    // Small screen text rendering - use DrawBitmapTextSmall for better fit
    
    // Measure text width for PLAY button - approximate for bitmap text
    const playTextWidth = "PLAY".length * 10; // Approximate bitmap text width
    const playButtonCenterX = playX + (buttonWidth / 2);
    const playButtonCenterY = y - (buttonHeight / 2);
    
    // Calculate vertical adjustment to move text upwards for better centering
    // On tiny screens move up more (10px), on small screens move up less (5px)
    const verticalOffset = isTinyScreen ? -10 : -5;
    
    // Center PLAY text horizontally and vertically within the button
    DrawBitmapTextSmall(
      "PLAY", 
      playButtonCenterX - (playTextWidth / 2), 
      playButtonCenterY + verticalOffset, 
      0, 0, 0
    );
    
    // Measure text width for LEVEL button - approximate for bitmap text
    const levelText = "LEVEL " + selectedLevel;
    const levelTextWidth = levelText.length * 10; // Approximate bitmap text width
    const levelButtonCenterX = levelX + (buttonWidth / 2);
    const levelButtonCenterY = y - (buttonHeight / 2);
    
    // Center LEVEL text horizontally and vertically within the button
    DrawBitmapTextSmall(
      levelText, 
      levelButtonCenterX - (levelTextWidth / 2), 
      levelButtonCenterY + verticalOffset, 
      0, 0, 0
    );
  } else {
    // Regular size screen - use DrawBitmapText for larger buttons
    
    // Measure text width for PLAY button - approximate for bitmap text
    const playTextWidth = "PLAY".length * 20; // Approximate bitmap text width
    const playButtonCenterX = playX + (buttonWidth / 2);
    const playButtonCenterY = y - (buttonHeight / 2);
    
    // Center PLAY text horizontally within the button - move up by 15px for better vertical centering
    DrawBitmapText(
      "PLAY", 
      playButtonCenterX - (playTextWidth / 2), 
      playButtonCenterY - 15, 
      0, 0, 0
    );
    
    // Calculate text width for LEVEL button with improved digit handling
    const levelText = "LEVEL " + selectedLevel;
    
    // Adjust character width based on whether the level is 1 or 2 digits
    // For numbers > 9, we need extra space for the wider text
    const digitWidth = selectedLevel > 9 ? 22 : 20; // Wider for 2+ digits
    
    // Calculate total width - "LEVEL " has 6 characters at 20px, plus the digits
    const levelTextWidth = "LEVEL ".length * 20 + String(selectedLevel).length * digitWidth;
    
    const levelButtonCenterX = levelX + (buttonWidth / 2);
    const levelButtonCenterY = y - (buttonHeight / 2);
    
    // Apply horizontal offset of -10px when level has 2 digits
    const horizontalOffset = selectedLevel > 9 ? -10 : 0;
    
    // Center LEVEL text horizontally within the button with improved alignment
    DrawBitmapText(
      levelText, 
      levelButtonCenterX - (levelTextWidth / 2) + horizontalOffset, 
      levelButtonCenterY - 15, 
      0, 0, 0
    );
  }
  
  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

/**
 * Draw level selection popup
 */
function drawLevelPopup() {
  // Popup dimensions and position
  const popupWidth = Math.min(WIDTH * 0.8, 500);
  const popupHeight = 270; // Height only for level selection
  const popupX = (WIDTH - popupWidth) / 2;
  const popupY = (HEIGHT - popupHeight) / 2;
  
  // Semi-transparent background overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  
  // Popup background
  ctx.fillStyle = '#222';
  ctx.strokeStyle = '#ffcc00';
  ctx.lineWidth = 3;
  roundRect(ctx, popupX, popupY, popupWidth, popupHeight, 10);
  ctx.fill();
  ctx.stroke();
  
  // Popup title
  DrawBitmapText("SELECT LEVEL", 0, popupY + 40, 1, 0, 0);
  
  // Divider line
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(popupX + 20, popupY + 70);
  ctx.lineTo(popupX + popupWidth - 20, popupY + 70);
  ctx.stroke();
  
  // Draw level buttons (0-19)
  const buttonSize = 32; // Increased size for better visibility
  const buttonSpacing = 10;
  
  // Reorganize buttons into 2 rows with 10 buttons each
  const maxButtonsPerRow = 10;
  const rows = 2;
  const buttonsPerRow = 10;
  
  // Calculate starting position for the grid of buttons
  const gridWidth = (buttonSize * buttonsPerRow) + (buttonSpacing * (buttonsPerRow - 1));
  let startX = (WIDTH - gridWidth) / 2;
  let startY = popupY + 100;
  
  for (let i = 0; i < 20; i++) {
    const row = Math.floor(i / buttonsPerRow);
    const col = i % buttonsPerRow;
    const buttonX = startX + (col * (buttonSize + buttonSpacing));
    const buttonY = startY + (row * (buttonSize + buttonSpacing));
    
    // Button background (highlight selected level)
    if (i === selectedLevel) {
      // Selected level - gold gradient with glow
      const gradient = ctx.createRadialGradient(
        buttonX + buttonSize/2, buttonY + buttonSize/2, 0,
        buttonX + buttonSize/2, buttonY + buttonSize/2, buttonSize
      );
      gradient.addColorStop(0, '#ffcc00');
      gradient.addColorStop(1, '#cc9900');
      ctx.fillStyle = gradient;
      ctx.shadowColor = '#ffcc00';
      ctx.shadowBlur = 10;
    } else {
      // Unselected levels - dark gradient
      const gradient = ctx.createRadialGradient(
        buttonX + buttonSize/2, buttonY + buttonSize/2, 0,
        buttonX + buttonSize/2, buttonY + buttonSize/2, buttonSize
      );
      gradient.addColorStop(0, '#444444');
      gradient.addColorStop(1, '#222222');
      ctx.fillStyle = gradient;
      ctx.shadowBlur = 0;
    }
    
    // Draw button
    ctx.fillRect(buttonX, buttonY, buttonSize, buttonSize);
    ctx.shadowBlur = 0;
    
    // Button text
    ctx.fillStyle = i === selectedLevel ? '#000' : '#fff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(i.toString(), buttonX + buttonSize/2, buttonY + buttonSize/2);
  }
  
  // Close button
  const closeButtonSize = 30;
  const closeButtonX = popupX + popupWidth - closeButtonSize - 10;
  const closeButtonY = popupY + 10;
  
  // Button circle
  ctx.fillStyle = '#cc0000';
  ctx.beginPath();
  ctx.arc(closeButtonX + closeButtonSize / 2, closeButtonY + closeButtonSize / 2, closeButtonSize / 2, 0, Math.PI * 2);
  ctx.fill();
  
  // X mark
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(closeButtonX + closeButtonSize * 0.3, closeButtonY + closeButtonSize * 0.3);
  ctx.lineTo(closeButtonX + closeButtonSize * 0.7, closeButtonY + closeButtonSize * 0.7);
  ctx.moveTo(closeButtonX + closeButtonSize * 0.7, closeButtonY + closeButtonSize * 0.3);
  ctx.lineTo(closeButtonX + closeButtonSize * 0.3, closeButtonY + closeButtonSize * 0.7);
  ctx.stroke();
}

/**
 * Helper function to draw rounded rectangles
 * 
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - Top-left X position
 * @param {number} y - Top-left Y position
 * @param {number} width - Rectangle width
 * @param {number} height - Rectangle height
 * @param {number} radius - Corner radius
 */
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Export click handler for intro screen
 * Handles clicks on settings button, settings popup, and level buttons
 * 
 * @param {MouseEvent|TouchEvent} event - Mouse click or touch event
 */
export function handleIntroScreenClick(event) {
  // Get click/touch position relative to canvas
  const rect = canvas.getBoundingClientRect();
  
  // Handle both mouse clicks and touch events
  let clientX, clientY;
  
  if (event.type === 'touchstart') {
    // Prevent default behavior for touch events (scrolling/zooming)
    event.preventDefault();
    // Get the first touch point
    const touch = event.touches[0] || event.changedTouches[0];
    clientX = touch.clientX;
    clientY = touch.clientY;
  } else {
    // Regular mouse event
    clientX = event.clientX;
    clientY = event.clientY;
  }
  
  const mouseX = clientX - rect.left;
  const mouseY = clientY - rect.top;
  
  if (showSettingsPopup) {
    // Handle clicks within settings popup
    handleSettingsPopupClick(mouseX, mouseY);
  } else if (showLevelPopup) {
    // Handle clicks within level selection popup
    handleLevelPopupClick(mouseX, mouseY);
  } else {
    // Check if action buttons (Play or Select Level) were clicked
    checkActionButtonsClick(mouseX, mouseY);
  }
}

/**
 * Handle clicks within the settings popup
 * 
 * @param {number} mouseX - Mouse X position
 * @param {number} mouseY - Mouse Y position
 */
function handleSettingsPopupClick(mouseX, mouseY) {
  const popupWidth = Math.min(WIDTH * 0.8, 500);
  const popupHeight = 350;
  const popupX = (WIDTH - popupWidth) / 2;
  const popupY = (HEIGHT - popupHeight) / 2;
  
  // Check close button click
  const closeButtonSize = 30;
  const closeButtonX = popupX + popupWidth - closeButtonSize - 10;
  const closeButtonY = popupY + 10;
  
  // Calculate distance from close button center
  const closeCenterX = closeButtonX + closeButtonSize/2;
  const closeCenterY = closeButtonY + closeButtonSize/2;
  const closeDistance = Math.sqrt(Math.pow(mouseX - closeCenterX, 2) + Math.pow(mouseY - closeCenterY, 2));
  
  if (closeDistance <= closeButtonSize/2) {
    console.log("Settings popup close button clicked");
    showSettingsPopup = false;
    saveSettings(); // Save settings when closing popup
    return;
  }
  
  // Check music toggle click
  const toggleWidth = 80;
  const toggleHeight = 30;
  const toggleX = (WIDTH - toggleWidth) / 2;
  const toggleY = popupY + 260;
  
  if (mouseX >= toggleX && mouseX <= toggleX + toggleWidth &&
      mouseY >= toggleY && mouseY <= toggleY + toggleHeight) {
    console.log("Music toggle clicked");
    musicEnabled = !musicEnabled;
    
    // Apply music setting immediately
    if (typeof window.music_on !== 'undefined') {
      window.music_on = musicEnabled;
    }
    
    return;
  }
  
  // Check level button clicks with updated layout
  const buttonSize = 32;
  const buttonSpacing = 10;
  const maxButtonsPerRow = 10; // Match the drawing logic
  const rows = Math.ceil(20 / maxButtonsPerRow); // Will be 2 for 20 levels
  const buttonsPerRow = Math.ceil(20 / rows); // Evenly distribute buttons
  const gridWidth = (buttonSize * buttonsPerRow) + (buttonSpacing * (buttonsPerRow - 1));
  const startX = (WIDTH - gridWidth) / 2;
  const startY = popupY + 130;
  
  for (let i = 0; i < 20; i++) {
    const row = Math.floor(i / buttonsPerRow);
    const col = i % buttonsPerRow;
    const buttonX = startX + (col * (buttonSize + buttonSpacing));
    const buttonY = startY + (row * (buttonSize + buttonSpacing));
    
    if (mouseX >= buttonX && mouseX <= buttonX + buttonSize &&
        mouseY >= buttonY && mouseY <= buttonY + buttonSize) {
      console.log(`Level ${i} button clicked`);
      selectedLevel = i;
      return;
    }
  }
}

/**
 * Handle clicks within the level selection popup
 * 
 * @param {number} mouseX - Mouse X position
 * @param {number} mouseY - Mouse Y position
 */
function handleLevelPopupClick(mouseX, mouseY) {
  const popupWidth = Math.min(WIDTH * 0.8, 500);
  const popupHeight = 270;
  const popupX = (WIDTH - popupWidth) / 2;
  const popupY = (HEIGHT - popupHeight) / 2;
  
  // Check close button click
  const closeButtonSize = 30;
  const closeButtonX = popupX + popupWidth - closeButtonSize - 10;
  const closeButtonY = popupY + 10;
  
  // Calculate distance from close button center
  const closeCenterX = closeButtonX + closeButtonSize/2;
  const closeCenterY = closeButtonY + closeButtonSize/2;
  const closeDistance = Math.sqrt(Math.pow(mouseX - closeCenterX, 2) + Math.pow(mouseY - closeCenterY, 2));
  
  if (closeDistance <= closeButtonSize/2) {
    console.log("Level popup close button clicked");
    showLevelPopup = false;
    saveSettings(); // Save settings when closing popup
    return;
  }
  
  // Check level button clicks
  const buttonSize = 32;
  const buttonSpacing = 10;
  const buttonsPerRow = 10;
  const gridWidth = (buttonSize * buttonsPerRow) + (buttonSpacing * (buttonsPerRow - 1));
  const startX = (WIDTH - gridWidth) / 2;
  const startY = popupY + 100;
  
  for (let i = 0; i < 20; i++) {
    const row = Math.floor(i / buttonsPerRow);
    const col = i % buttonsPerRow;
    const buttonX = startX + (col * (buttonSize + buttonSpacing));
    const buttonY = startY + (row * (buttonSize + buttonSpacing));
    
    if (mouseX >= buttonX && mouseX <= buttonX + buttonSize &&
        mouseY >= buttonY && mouseY <= buttonY + buttonSize) {
      console.log(`Level ${i} button clicked`);
      selectedLevel = i;
      return;
    }
  }
}

/**
 * Check if action buttons were clicked
 * 
 * @param {number} mouseX - Mouse X position
 * @param {number} mouseY - Mouse Y position
 */
function checkActionButtonsClick(mouseX, mouseY) {
  const buttonWidth = 300;  // Updated from 200 to match drawing logic
  const buttonHeight = 70;  // Updated from 60 to match drawing logic
  const buttonSpacing = 30;
  const totalWidth = (buttonWidth * 2) + buttonSpacing;
  const bottomPadding = HEIGHT * 0.05;  // Update to 0.05 to match drawActionButtons
  const buttonY = HEIGHT - bottomPadding;
  const startX = (WIDTH - totalWidth) / 2;
  const playX = startX;
  const levelX = startX + buttonWidth + buttonSpacing;
  
  if (mouseX >= playX && mouseX <= playX + buttonWidth &&
      mouseY >= buttonY - buttonHeight && mouseY <= buttonY) {
    console.log("Play button clicked");
    startNewGame();
    return;
  }
  
  if (mouseX >= levelX && mouseX <= levelX + buttonWidth &&
      mouseY >= buttonY - buttonHeight && mouseY <= buttonY) {
    console.log("Select Level button clicked");
    showLevelPopup = true;
    return;
  }
}

/**
 * Check if the mouse is over one of the action buttons
 * And change cursor style appropriately
 * 
 * @param {number} mouseX - Mouse X position
 * @param {number} mouseY - Mouse Y position
 * @returns {boolean} True if mouse is over a button
 */
function checkButtonHover(mouseX, mouseY) {
  const buttonWidth = 300;
  const buttonHeight = 70;
  const buttonSpacing = 30;
  const totalWidth = (buttonWidth * 2) + buttonSpacing;
  const bottomPadding = HEIGHT * 0.05;
  const buttonY = HEIGHT - bottomPadding;
  const startX = (WIDTH - totalWidth) / 2;
  const playX = startX;
  const levelX = startX + buttonWidth + buttonSpacing;
  
  if (mouseX >= playX && mouseX <= playX + buttonWidth &&
      mouseY >= buttonY - buttonHeight && mouseY <= buttonY) {
    canvas.style.cursor = 'pointer';
    return true;
  }
  
  if (mouseX >= levelX && mouseX <= levelX + buttonWidth &&
      mouseY >= buttonY - buttonHeight && mouseY <= buttonY) {
    canvas.style.cursor = 'pointer';
    return true;
  }
  
  canvas.style.cursor = 'default';
  return false;
}

/**
 * Handle mouse move events to check for button hover
 * 
 * @param {MouseEvent} event - Mouse move event
 */
function handleMouseMove(event) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;
  checkButtonHover(mouseX, mouseY);
}

/**
 * Start a new game from the intro screen
 */
export function startNewGame() {
  try {
    removeAllEventListeners();
    
    // IMPORTANT: Reset score to 0 when starting a new game
    // This ensures we start with a fresh score every time
    
    // Reset local score in mainState.js 
    // (This will be imported by other modules)
    if (typeof window.setScoreData === 'function') {
      window.setScoreData({ score: 0 });
      console.log("Score reset to 0 via setScoreData");
    }
    
    // Reset the secure score system
    if (typeof window.setScore === 'function') {
      window.setScore(0);
      console.log("Secure score reset to 0 before starting new game");
    }
    
    // Also reset window.score directly as a fallback
    window.score = 0;
    
    // Set the selected level in the global variable
    window.selected_game_level = selectedLevel;
    console.log(`Starting game with level: ${selectedLevel}, stored in global variable as: ${window.selected_game_level}`);
    
    if (typeof window.startGameMusic === 'function') {
      window.startGameMusic();
    }
    
    if (gameStateCallback) {
      gameStateCallback(GAME_STATES.GAME_START);
    }
    
    window.game_state = GAME_STATES.GAME_START;
    console.log("Starting new game from intro screen - state set to: game_start");
  } catch(e) {
    console.error("Error starting new game from intro screen:", e);
  }
}

/**
 * Remove all event listeners
 */
function removeAllEventListeners() {
  if (introEventListenersAdded) {
    document.removeEventListener('keydown', handleIntroKeyDown);
    canvas.removeEventListener('click', handleIntroScreenClick);
    canvas.removeEventListener('mousemove', handleMouseMove);
    canvas.removeEventListener('touchstart', handleIntroScreenClick); // Remove touch event listener
    introEventListenersAdded = false;
  }
}

/**
 * Handle key presses on intro screen
 */
function handleIntroKeyDown(evt) {
  // All space key functionality has been removed
  // Only other keyboard controls remain (if any)
}

/**
 * Load high score data from localStorage
 */
function loadHighScoreData() {
  try {
    if (typeof(Storage) !== "undefined") {
      const storedHighScores = localStorage.getItem('tetris_high_scores');
      if (storedHighScores) {
        high_scores = JSON.parse(storedHighScores);
        console.log("Loaded high scores from local storage:", high_scores.length);
      } else {
        high_scores = [];
      }
    }
  } catch (e) {
    console.error("Error loading high scores:", e);
    high_scores = [];
  }
}

/**
 * Load high scores from Firebase cloud
 */
function loadCloudHighScores() {
  if (isLoadingScores) return;
  
  isLoadingScores = true;
  loadStartTime = Date.now();
  cloudLoadError = false;
  
  loadHighScores()
    .then(scores => {
      if (scores && scores.length > 0) {
        high_scores = scores;
        cloudScoresLoaded = true;
      } else {
        if (high_scores.length === 0) {
          high_scores = createSampleHighScores();
        }
        cloudScoresLoaded = false;
      }
      isLoadingScores = false;
    })
    .catch(error => {
      console.error("Error loading high scores from Firebase:", error);
      cloudLoadError = true;
      isLoadingScores = false;
      
      if (scoreLoadRetries < MAX_RETRIES) {
        scoreLoadRetries++;
        setTimeout(loadCloudHighScores, 3000);
      }
    });
}

/**
 * Create sample high scores for initial display
 * 
 * @returns {Array} Array of sample high score objects
 */
function createSampleHighScores() {
  return [
    {
      player_name: "TETRIS-MASTER",
      score: 25000,
      level: 10,
      cleared_lines: 125,
      time: "08:43"
    },
    {
      player_name: "BLOCK-WIZARD",
      score: 18750,
      level: 8,
      cleared_lines: 96,
      time: "06:12"
    },
    {
      player_name: "LINE-CRUSHER",
      score: 15300,
      level: 7,
      cleared_lines: 82,
      time: "05:38"
    },
    {
      player_name: "TETRA-PRO",
      score: 12400,
      level: 6,
      cleared_lines: 67,
      time: "04:55"
    },
    {
      player_name: "SQUARE-STACKER",
      score: 9800,
      level: 5,
      cleared_lines: 52,
      time: "04:10"
    },
    {
      player_name: "J-FLIPPER",
      score: 7500,
      level: 4,
      cleared_lines: 43,
      time: "03:25"
    },
    {
      player_name: "L-MASTER",
      score: 5250,
      level: 3,
      cleared_lines: 32,
      time: "02:48"
    },
    {
      player_name: "Z-SPINNER",
      score: 3800,
      level: 2,
      cleared_lines: 24,
      time: "02:15"
    },
    {
      player_name: "T-SLAMMER",
      score: 2200,
      level: 1,
      cleared_lines: 15,
      time: "01:42"
    },
    {
      player_name: "I-DROPPER",
      score: 1000,
      level: 1,
      cleared_lines: 8,
      time: "01:05"
    }
  ];
}

/**
 * Set game statistics for display in the intro screen
 * 
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
 * 
 * @param {number} seconds - Total seconds
 * @returns {string} Formatted time string
 */
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes < 10 ? '0' : ''}${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}