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
let selectedLevel = 0; // Selected starting level (0-9)
let showLevelSelector = false; // Whether to show the level selector

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
  
  // First load from localStorage as a fallback
  loadHighScoreData();
  
  // Then try to load from Firebase
  loadCloudHighScores();
  
  // Initialize fireworks
  tetrisFireworks = [];
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
    introEventListenersAdded = true;
  }

  // Increment animation counter
  k += 0.8;
  
  // Clear screen and draw background elements
  clearScreen('#000');
  showBackground(back_intro_img, 0, 0, WIDTH, HEIGHT);
  
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

  // Add a level selector on the left side of the screen
  const levelSelectorX = 50;
  const levelSelectorY = 200;
  const levelButtonSize = 40;
  const levelButtonSpacing = 10;
  const levelButtonsPerRow = 5;
  
  // Draw level selector title
  ctx.fillStyle = '#ffcc00'; // Gold color for title
  DrawBitmapTextSmall("STARTING LEVEL", levelSelectorX, levelSelectorY - 30, 0, 0, 0);
  
  // Draw level buttons (0-9)
  for (let i = 0; i <= 9; i++) {
    const row = Math.floor(i / levelButtonsPerRow);
    const col = i % levelButtonsPerRow;
    const buttonX = levelSelectorX + col * (levelButtonSize + levelButtonSpacing);
    const buttonY = levelSelectorY + row * (levelButtonSize + levelButtonSpacing);
    
    // Button background (highlight selected button)
    if (i === selectedLevel) {
      // Selected level - gold gradient with glow
      const gradient = ctx.createRadialGradient(
        buttonX + levelButtonSize/2, buttonY + levelButtonSize/2, 0,
        buttonX + levelButtonSize/2, buttonY + levelButtonSize/2, levelButtonSize
      );
      gradient.addColorStop(0, '#ffcc00');
      gradient.addColorStop(1, '#cc9900');
      ctx.fillStyle = gradient;
      
      // Add glow effect
      ctx.shadowColor = '#ffcc00';
      ctx.shadowBlur = 10;
    } else {
      // Unselected levels - dark gradient
      const gradient = ctx.createRadialGradient(
        buttonX + levelButtonSize/2, buttonY + levelButtonSize/2, 0,
        buttonX + levelButtonSize/2, buttonY + levelButtonSize/2, levelButtonSize
      );
      gradient.addColorStop(0, '#444444');
      gradient.addColorStop(1, '#222222');
      ctx.fillStyle = gradient;
      ctx.shadowBlur = 0;
    }
    
    // Draw button
    ctx.fillRect(buttonX, buttonY, levelButtonSize, levelButtonSize);
    ctx.shadowBlur = 0;
    
    // Button text
    ctx.fillStyle = i === selectedLevel ? '#000' : '#fff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(i.toString(), buttonX + levelButtonSize/2, buttonY + levelButtonSize/2);
    
    // Add click handler for level buttons
    canvas.addEventListener('click', function levelButtonClick(e) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      for (let j = 0; j <= 9; j++) {
        const btnRow = Math.floor(j / levelButtonsPerRow);
        const btnCol = j % levelButtonsPerRow;
        const btnX = levelSelectorX + btnCol * (levelButtonSize + levelButtonSpacing);
        const btnY = levelSelectorY + btnRow * (levelButtonSize + levelButtonSpacing);
        
        if (mouseX >= btnX && mouseX <= btnX + levelButtonSize &&
            mouseY >= btnY && mouseY <= btnY + levelButtonSize) {
          // Update selected level
          selectedLevel = j;
          console.log(`Selected starting level: ${selectedLevel}`);
          
          // Remove this handler to avoid duplicates (will be re-added next frame)
          canvas.removeEventListener('click', levelButtonClick);
          break;
        }
      }
    });
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
  const topPlayersY = Math.max(160, verticalSpacing + 70); // Decreased from 220 to 160 for higher position
  
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
  const rankWidth = 60;   
  const nameWidth = 200;  
  const scoreWidth = 140; 
  const statsWidth = 80;  
  
  // Define column positions from center with more spacing
  const totalWidth = rankWidth + nameWidth + scoreWidth + (statsWidth * 3) + 140; // Increased spacing from 120 to 140
  const startX = centerX - (totalWidth / 2);
  const rankX = startX + 20;
  const nameX = rankX + rankWidth + 25;     
  const scoreX = nameX + nameWidth + 25;    
  const linesX = scoreX + scoreWidth + 40;  // Increased from 25 to 40 for more space between SCORE and LINE
  const levelX = linesX + statsWidth + 25;  
  const timeX = levelX + statsWidth + 25;  
  
  // Add score column headers with shadows
  const headerY = y - 30; // Position headers above the scores
  ctx.fillStyle = '#111'; // Shadow color
  
  // Draw column headers shadows
  DrawBitmapTextSmall("RANK", rankX + 2, headerY + 2, 0, 0, 0);
  DrawBitmapTextSmall("PLAYER", nameX + 2, headerY + 2, 0, 0, 0);
  DrawBitmapTextSmall("SCORE", scoreX + 2, headerY + 2, 0, 0, 0);
  DrawBitmapTextSmall("LINES", linesX + 2, headerY + 2, 0, 0, 0);
  DrawBitmapTextSmall("LEVEL", levelX + 2, headerY + 2, 0, 0, 0);
  DrawBitmapTextSmall("TIME", timeX + 2, headerY + 2, 0, 0, 0);
  
  // Draw column headers
  ctx.fillStyle = '#ffcc00'; // Gold color for headers
  DrawBitmapTextSmall("RANK", rankX, headerY, 0, 0, 0);
  DrawBitmapTextSmall("PLAYER", nameX, headerY, 0, 0, 0);
  DrawBitmapTextSmall("SCORE", scoreX, headerY, 0, 0, 0);
  DrawBitmapTextSmall("LINES", linesX, headerY, 0, 0, 0);
  DrawBitmapTextSmall("LEVEL", levelX, headerY, 0, 0, 0);
  DrawBitmapTextSmall("TIME", timeX, headerY, 0, 0, 0);
    
  high_scores.forEach((val, index) => {
    p++;
    ps++;
      
    if (p % 2 == 0) {
      p = 0;
    }
      
    if (ps < 12) {
      // Apply sine wave effect for score listings (reduced)
      const m = Math.sin((k+ps*20) / 180 * 3.14) * 10;
        
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
        
      // Draw shadows
      ctx.fillStyle = shadowColor;
      
      // Draw rank number for all entries (including first place)
      DrawBitmapText(ps + ".", rankX + m + 2, y + 2, 0, 0, 0);
      
      // Draw player name with shadow
      DrawBitmapText(val.player_name, nameX + m + 2, y + 2, 0, 0, 0);
      
      // Draw score with shadow (with matching leading zeros)
      DrawBitmapText(formattedScore, scoreX + m + 2, y + 2, 0, 0, 0);
      
      // Draw stats with shadow
      DrawBitmapText(val.cleared_lines.toString(), linesX + m + 2, y + 2, 0, 0, 0);
      DrawBitmapText(val.level.toString(), levelX + m + 2, y + 2, 0, 0, 0);
      DrawBitmapText(val.time, timeX + m + 2, y + 2, 0, 0, 0);
      
      // Draw the text with proper color
      ctx.fillStyle = textColor;
      
      // Draw rank number for all entries (including first place)
      DrawBitmapText(ps + ".", rankX + m, y, 0, 0, 0);
      
      // Draw player name
      DrawBitmapText(val.player_name, nameX + m, y, 0, 0, 0);
      
      // Draw score (with matching leading zeros)
      DrawBitmapText(formattedScore, scoreX + m, y, 0, 0, 0);
      
      // Draw stats
      DrawBitmapText(val.cleared_lines.toString(), linesX + m, y, 0, 0, 0);
      DrawBitmapText(val.level.toString(), levelX + m, y, 0, 0, 0);
      DrawBitmapText(val.time, timeX + m, y, 0, 0, 0);
    }
      
    sc += 1;
    
    // Same line height for all entries
    y += 55; // Consistent spacing of 55px between all entries
  });
    
  // Calculate dynamic position based on screen height
  // Position the text at the bottom of the screen with appropriate padding
  const bottomPadding = HEIGHT * 0.09; // 9% of screen height as padding
  const yPosition = HEIGHT - bottomPadding;
  
  // Determine if we should use larger text on bigger screens
  let useEnhancedText = WIDTH >= 1280 && HEIGHT >= 800;
  
  if (useEnhancedText) {
    // For larger screens, use the big bitmap font with a subtle effect
    DrawBitmapText("PRESS SPACE TO START", 0, yPosition - 10, 1, 0, 0);
  } else {
    // For standard/smaller screens, use the small bitmap font
    DrawBitmapTextSmall("PRESS SPACE TO START A NEW GAME", 0, yPosition, 1, 0, 0);
    
    // Add a subtle glow effect to make the text stand out
    ctx.shadowColor = '#ffcc00';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Re-draw the text with glow effect
    DrawBitmapTextSmall("PRESS SPACE TO START A NEW GAME", 0, yPosition, 1, 0, 0);
    
    // Reset shadow effects
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }
  
  // Update and render Tetris block fireworks
  updateTetrisFireworks();
  
  return true;
}

/**
 * Start a new game from the intro screen
 */
export function startNewGame() {
  try {
    // Remove all event listeners
    removeAllEventListeners();
    
    // Store selected level in multiple places to ensure it persists
    window.selected_game_level = selectedLevel;
    console.log(`Starting game with level: ${selectedLevel}, stored in global variable as: ${window.selected_game_level}`);
    
    // Call the callback to update game state
    if (gameStateCallback) {
      gameStateCallback(GAME_STATES.GAME_START);
    }
    
    // Update global game state variable
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
    introEventListenersAdded = false;
  }
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
        // Initialize with empty array if no high scores exist
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
  // Don't start a new load if we're already loading
  if (isLoadingScores) return;
  
  isLoadingScores = true;
  loadStartTime = Date.now();
  cloudLoadError = false;
  
  // Load high scores from Firebase
  loadHighScores()
    .then(scores => {
      if (scores && scores.length > 0) {
        high_scores = scores;
        cloudScoresLoaded = true;
      } else {
        // If no scores returned, keep using localStorage scores
        // or default sample scores
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
      
      // Retry a few times if needed
      if (scoreLoadRetries < MAX_RETRIES) {
        scoreLoadRetries++;
        setTimeout(loadCloudHighScores, 3000); // Retry after 3 seconds
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