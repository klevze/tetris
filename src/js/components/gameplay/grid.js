import { DrawLine } from '../../utils/functions.js';
import { BLOCK, AUDIO, ANIMATION, VOICE_LINES } from '../../config/config.js'; // Import VOICE_LINES structure
import { EVENTS, eventDispatcher } from '../../utils/functions.js';
import { setupFireworks, updateFireworks, createTetrisFireworks, createLevelUpFireworks } from '../effects/fireworks.js';
import { updateScore } from '../../utils/events.js'; // Import updateScore function

/**
 * GRID MODULE
 * Handles the game grid operations:
 * - Grid initialization and rendering
 * - Row clearing and scoring
 * - Game state management
 */

// Animation constants for line clearing
const LINE_CLEAR_ANIMATION = {
  FADE_TO_WHITE: 'FADE_TO_WHITE',
  FADE_OUT_WITH_SPARKLES: 'FADE_OUT_WITH_SPARKLES',
  DROP_BLOCKS: 'DROP_BLOCKS'
};

// Animation timing (in frames)
const ANIMATION_FRAMES = {
  FADE_TO_WHITE: 50,        // Time to fade from color to white (increased)
  FADE_OUT_WITH_SPARKLES: 40, // Time to fade out white blocks with sparkles
  DROP_BLOCKS: 20           // Time for blocks to drop down
};

// Voice feedback delay in milliseconds - easy to adjust
const VOICE_FEEDBACK_DELAY = ANIMATION.VOICE_FEEDBACK_DELAY;

// Grid properties
let grid_width, grid_height, block_width;
let gridData = {}; // Grid storage - switched to object-based grid for memory efficiency

// Grid origin point (top-left corner)
let origin = { x: 0, y: 0 }; 

// Canvas context and audio
let ctx, clear_line_audio, tetris_audio;
let double_row_audio = []; // Array to hold audio files for 2-row clears
let triple_row_audio = []; // Array to hold audio files for 3-row clears

// Preload all voice audio files
let nice_combo_audio = null;
let you_fire_audio = null;
let great_move_audio = null; 
let smooth_clear_audio = null;
let amazing_audio = null;

// Remember parameters for grid recalculation on resize
let canvasWidth, canvasHeight, verticalOffsetFactor;

// Game variables
let lines = 0, level = 0, level_goal = 10, score = 0;
let showAddScore = false;
let addScoreValue = 0;
let scoreTextTimer = 0;
let scoreTextPosition = { x: 0, y: 0 };

// Store original starting level to use for level progression logic
let startingLevel = 0;

// Standard Tetris scoring system base points
const SCORE_SYSTEM = {
  SINGLE: 40,    // 1 line cleared
  DOUBLE: 100,   // 2 lines cleared
  TRIPLE: 300,   // 3 lines cleared
  TETRIS: 1200   // 4 lines cleared (Tetris!)
};

// Animation state variables
let rowsToBeCleared = []; // Track which rows are marked for clearing
let clearAnimationState = LINE_CLEAR_ANIMATION.FADE_TO_WHITE;
let clearAnimationFrame = 0;
let particles = []; // Array to store particles for clearing effect
let lego; // Blocks image reference
let drawBlock; // Function reference for drawing blocks
let isRowClearingInProgress = false; // Flag to track when row clearing animation is in progress
let shouldTriggerFireworks = false; // Flag to track when fireworks should be triggered
let fireworksDisplayActive = false; // Flag to track if fireworks are currently active
let shouldTriggerLevelUpFireworks = false; // Flag to trigger level-up fireworks

// Store original block colors for animation
let originalBlockColors = {};

// Custom grid variables
let gridBackgroundColor = 'rgba(0, 0, 0, 0)'; // Completely transparent background
let gridLineColor = 'rgba(60, 60, 100, 0.4)'; // Subtle blue-tinted grid lines
let gridBorderColor = 'rgba(100, 100, 180, 0.8)'; // Slightly more visible border
let gridOuterBorderColor = '#4455aa'; // More visible outer border
let gridOutline = true; // Whether to draw an outline around the grid

/**
 * Particle class for line clearing effects
 */
class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 3 + 1;
    this.speedX = Math.random() * 3 - 1.5;
    this.speedY = Math.random() * 3 - 1.5;
    this.color = `rgba(255, 255, ${Math.random() * 100 + 155}, ${Math.random() * 0.8 + 0.2})`;
    this.alpha = 1;
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.alpha -= 0.02;
    if (this.alpha < 0) this.alpha = 0;
  }

  draw() {
    if (this.alpha > 0) {
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

/**
 * Create particles for each block in a line
 * @param {number} row - Row index where particles should be created
 */
function createParticles(row) {
  for (let x = 0; x < grid_width; x++) {
    const posX = origin.x + x * block_width + block_width / 2;
    const posY = origin.y + row * block_width + block_width / 2;

    // Create multiple particles per block
    for (let i = 0; i < 5; i++) {
      particles.push(new Particle(posX, posY));
    }
  }
}

/**
 * Render the line clearing animation
 * @returns {boolean} True if animation is complete
 */
function renderClearAnimation() {
  if (rowsToBeCleared.length === 0) {
    return true; // No rows to clear, animation is "complete"
  }

  // Set flag that animation is in progress
  isRowClearingInProgress = true;

  // Update animation frame counter
  clearAnimationFrame++;

  // IMPORTANT: This version uses a much simpler, bolder approach to ensure visibility
  if (clearAnimationState === LINE_CLEAR_ANIMATION.FADE_TO_WHITE) {
    // Calculate a simpler 0-1 progress value
    const fadeProgress = clearAnimationFrame / ANIMATION_FRAMES.FADE_TO_WHITE;

    // Draw the entire cleared rows as solid WHITE rectangles - no gradual fade
    rowsToBeCleared.forEach(row => {
      const rowY = origin.y + row * block_width;

      // SOLID WHITE with blue glow around it
      ctx.shadowColor = "rgba(100, 150, 255, 0.9)";
      ctx.shadowBlur = 15;

      // Create flashing effect by alternating opacity
      const flashOpacity = Math.sin(fadeProgress * Math.PI * 15) * 0.5 + 0.5;

      // Draw a very visible white rectangle covering the entire row
      ctx.fillStyle = `rgba(255, 255, 255, ${flashOpacity})`;
      ctx.fillRect(origin.x - 4, rowY - 4, grid_width * block_width + 8, block_width + 8);

      // Draw bright white border
      ctx.strokeStyle = "rgb(255, 255, 255)";
      ctx.lineWidth = 3;
      ctx.strokeRect(origin.x - 4, rowY - 4, grid_width * block_width + 8, block_width + 8);

      // Reset shadow for other drawing
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
    });

    // Transition to sparkle phase after fade is complete
    if (clearAnimationFrame >= ANIMATION_FRAMES.FADE_TO_WHITE) {
      clearAnimationState = LINE_CLEAR_ANIMATION.FADE_OUT_WITH_SPARKLES;
      clearAnimationFrame = 0;

      // Mark grid cells as cleared
      rowsToBeCleared.forEach(row => {
        for (let x = 0; x < grid_width; x++) {
          if (gridData[x]) {
            gridData[x][row] = 8; // Special value to mark cleared cells
          }
        }
      });

      // Generate particles
      rowsToBeCleared.forEach(row => {
        // Create lots of particles for a more dramatic effect
        for (let i = 0; i < 5; i++) {
          createParticles(row);
        }
      });
      
      // Trigger fireworks if this is a Tetris (4 lines)
      if (shouldTriggerFireworks && rowsToBeCleared.length === 4) {
        createTetrisFireworks(rowsToBeCleared, origin, block_width, grid_width);
        shouldTriggerFireworks = false;
      }
    }

    return false;
  }

  // Rest of the animation phases remain unchanged
  else if (clearAnimationState === LINE_CLEAR_ANIMATION.FADE_OUT_WITH_SPARKLES) {
    const fadeOutProgress = clearAnimationFrame / ANIMATION_FRAMES.FADE_OUT_WITH_SPARKLES;

    rowsToBeCleared.forEach(row => {
      for (let x = 0; x < grid_width; x++) {
        const drawX = origin.x + x * block_width;
        const drawY = origin.y + row * block_width;

        // White blocks gradually fade out (from solid white to transparent)
        ctx.fillStyle = `rgba(255, 255, 255, ${1 - fadeOutProgress})`;
        ctx.fillRect(drawX, drawY, block_width, block_width);
      }
    });

    // Update and draw all particles (sparkles)
    particles.forEach((particle, index) => {
      particle.update();
      particle.draw();
      if (particle.alpha <= 0) {
        particles.splice(index, 1);
      }
    });

    // Add more particles throughout the fade out phase for sustained sparkle effect
    if (clearAnimationFrame % 5 === 0) {
      rowsToBeCleared.forEach(row => {
        // Add fewer particles as the animation progresses
        const particleCount = Math.floor(8 * (1 - fadeOutProgress));
        for (let i = 0; i < particleCount; i++) {
          const randomX = Math.floor(Math.random() * grid_width);
          const posX = origin.x + randomX * block_width + block_width / 2;
          const posY = origin.y + row * block_width + block_width / 2;
          particles.push(new Particle(posX, posY));
        }
      });
    }

    // Transition to drop blocks phase after fade out is complete
    if (clearAnimationFrame >= ANIMATION_FRAMES.FADE_OUT_WITH_SPARKLES) {
      clearAnimationState = LINE_CLEAR_ANIMATION.DROP_BLOCKS;
      clearAnimationFrame = 0;
    }

    return false;
  }

  else if (clearAnimationState === LINE_CLEAR_ANIMATION.DROP_BLOCKS) {
    const dropProgress = clearAnimationFrame / ANIMATION_FRAMES.DROP_BLOCKS;

    // First draw blocks that aren't moving
    for (let x = 0; x < grid_width; x++) {
      if (!gridData[x]) continue;

      for (let y = 0; y < grid_height; y++) {
        // Skip cleared rows
        if (rowsToBeCleared.includes(y)) continue;

        const blockType = gridData[x][y];
        if (blockType && blockType > 0 && blockType <= 7) {
          const blockTypeIndex = blockType - 1;

          // Count how many cleared rows are below this block
          let dropDistance = 0;
          for (const clearedRow of rowsToBeCleared) {
            if (clearedRow > y) {
              dropDistance++;
            }
          }

          if (dropDistance === 0) {
            // This block doesn't need to drop, draw it normally
            const drawX = origin.x + x * block_width;
            const drawY = origin.y + y * block_width;

            if (drawBlock && typeof drawBlock === 'function') {
              drawBlock(drawX, drawY, blockTypeIndex);
            } else {
              // Fallback to using the lego sprite
              const spriteSize = BLOCK.SPRITE_SIZE;
              const sx = blockTypeIndex * spriteSize;
              ctx.drawImage(
                lego,
                sx + 2,
                2,
                spriteSize - 4,
                spriteSize - 4,
                drawX,
                drawY,
                block_width,
                block_width
              );
            }
          } else {
            // This block needs to drop, animate it
            const drawX = origin.x + x * block_width;
            const fromDrawY = origin.y + y * block_width;
            const toDrawY = origin.y + (y + dropDistance) * block_width;

            // Apply easing function for smoother drop
            let easedProgress;
            if (dropProgress < 0.5) {
              // Ease in - start slow, accelerate
              easedProgress = 2 * dropProgress * dropProgress;
            } else {
              // Ease out - decelerate to a stop
              easedProgress = 1 - Math.pow(-2 * dropProgress + 2, 2) / 2;
            }

            const currentY = fromDrawY + (toDrawY - fromDrawY) * easedProgress;

            if (drawBlock && typeof drawBlock === 'function') {
              drawBlock(drawX, currentY, blockTypeIndex);
            } else {
              // Fallback to using the lego sprite
              const spriteSize = BLOCK.SPRITE_SIZE;
              const sx = blockTypeIndex * spriteSize;
              ctx.drawImage(
                lego,
                sx + 2,
                2,
                spriteSize - 4,
                spriteSize - 4,
                drawX,
                currentY + 10 - 30, // Apply the same vertical offset for consistency
                block_width,
                block_width
              );
            }

            // Add dust/trail particles as blocks drop
            if (Math.random() < 0.1 && dropProgress > 0.2) {
              const particleX = drawX + Math.random() * block_width;
              const particleY = currentY + block_width * 0.8;

              const dustParticle = new Particle(particleX, particleY);
              dustParticle.size = Math.random() * 2 + 1;
              dustParticle.speedY = 0.5 + Math.random() * 1;
              dustParticle.speedX = (Math.random() - 0.5) * 0.5;
              dustParticle.color = `rgba(255, 255, 255, ${Math.random() * 0.7 + 0.3})`;
              particles.push(dustParticle);
            }
          }
        }
      }
    }

    // Update and render existing particles
    particles.forEach((particle, index) => {
      particle.update();
      particle.draw();
      if (particle.alpha <= 0) {
        particles.splice(index, 1);
      }
    });

    // Animation complete, time to clear the rows
    if (clearAnimationFrame >= ANIMATION_FRAMES.DROP_BLOCKS) {
      clearAnimationState = LINE_CLEAR_ANIMATION.FADE_TO_WHITE; // Reset for next time
      clearAnimationFrame = 0;
      isRowClearingInProgress = false;
      originalBlockColors = {}; // Clear the stored colors
      return true; // Signal to perform actual row clearing
    }

    return false;
  }

  return false;
}

/**
 * Check all rows for completions and mark them for clearing
 * @returns {Object} Game state including score, lines, level and animation state
 */
export function checkRows() {
  let completedRows = 0;
  let addScore = 0;

  // Clear the rows-to-clear array
  rowsToBeCleared = [];

  // Check each row from bottom to top
  for (let y = grid_height - 1; y >= 0; y--) {
    let filledCells = 0;

    // Count filled cells in this row
    for (let x = 0; x < grid_width; x++) {
      // Skip checking cells if gridData[x] doesn't exist
      if (gridData[x] && gridData[x][y] > 0) {
        filledCells++;
      }
    }

    // Complete row found
    if (filledCells === grid_width) {
      completedRows++;
      lines++;

      // Track this row for clearing
      rowsToBeCleared.push(y);
    }
  }

  // Now determine score and play voice based on the TOTAL completed rows
  if (completedRows === 1) {
    addScore = SCORE_SYSTEM.SINGLE * (level + 1); // Single
    shouldTriggerFireworks = true; 
    
    // Check if we have voice lines for single line clears
    if (VOICE_LINES.SINGLE && VOICE_LINES.SINGLE.length > 0) {
      playRandomVoiceLine(VOICE_LINES.SINGLE, "single line");
    }
  } else if (completedRows === 2) {
    addScore = SCORE_SYSTEM.DOUBLE * (level + 1); // Double
    shouldTriggerFireworks = true; 
    
    // Play random voice from the DOUBLE lines
    if (VOICE_LINES.DOUBLE && VOICE_LINES.DOUBLE.length > 0) {
      playRandomVoiceLine(VOICE_LINES.DOUBLE, "double line");
    }
  } else if (completedRows === 3) {
    addScore = SCORE_SYSTEM.TRIPLE * (level + 1); // Triple
    shouldTriggerFireworks = true;
    
    // Play random voice from the TRIPLE lines
    if (VOICE_LINES.TRIPLE && VOICE_LINES.TRIPLE.length > 0) {
      playRandomVoiceLine(VOICE_LINES.TRIPLE, "triple line");
    }
  } else if (completedRows === 4) {
    addScore = SCORE_SYSTEM.TETRIS * (level + 1); // Tetris!
    shouldTriggerFireworks = true; // Trigger fireworks for Tetris
    
    // Play random voice from the TETRIS lines
    if (VOICE_LINES.TETRIS && VOICE_LINES.TETRIS.length > 0) {
      playRandomVoiceLine(VOICE_LINES.TETRIS, "tetris");
    }
  }
  
  // Process the completed rows, marking them and creating particles
  if (completedRows > 0) {
    // Mark rows for clearing animation
    rowsToBeCleared.forEach(y => {
      markRow(y);
      // Create particles for the row
      createParticles(y);
    });

    // Update score and check level up
    score += addScore;
    addScoreValue = addScore;

    // CRITICAL FIX: Update the score in multiple ways immediately when rows are cleared
    // This ensures score updates are not delayed or lost during animation
    try {
      console.log(`Adding score immediately: ${addScore}, new total: ${score}`);
      
      // 1. Update global window.score directly 
      if (typeof window !== 'undefined') {
        // Use secure setter if available
        if (typeof window.setScore === 'function') {
          window.setScore(score);
        } else if (typeof window.updateScore === 'function') {
          window.updateScore(score, addScore);
        } else {
          // Last resort - direct assignment
          window.score = score;
        }
      }
      
      // 2. Update UI immediately with setScoreData
      if (typeof window !== 'undefined' && typeof window.setScoreData === 'function') {
        window.setScoreData({
          score: score,
          lines: lines,
          level: level,
          showAddScore: true,
          addScore: addScore
        });
      }
      
      // 3. Emit score change event
      if (typeof window !== 'undefined' && typeof window.eventBus !== 'undefined' && 
          typeof window.eventBus.emit === 'function' && typeof window.GAME_EVENTS !== 'undefined') {
        window.eventBus.emit(window.GAME_EVENTS.SCORE_CHANGE, { 
          score: score,
          added: addScore
        });
      }
    } catch (e) {
      console.error('Error updating score in checkRows:', e);
    }

    // Check for level up based on starting level rules
    if (startingLevel >= 10) {
      // For starting levels 10+: Stay on starting level until cleared (StartLevel + 1) * 10 lines, then level up every 10 lines
      const threshold = (startingLevel + 1) * 10;
      
      if (lines >= threshold) {
        // Once we've cleared the threshold lines, we follow the standard "every 10 lines" rule
        // Calculate how many levels to add after passing threshold
        const linesAfterThreshold = lines - threshold;
        if (linesAfterThreshold === 0 || linesAfterThreshold % 10 === 0) {
          level++;
          console.log(`Leveled up to ${level} after clearing ${lines} lines (threshold was ${threshold})`);
          shouldTriggerLevelUpFireworks = true;
        }
      }
    } else {
      // For starting levels 0-9: Level up at specific thresholds according to the table
      // Level 0: 10, 20, 30...
      // Level 1: 20, 30, 40...
      // Level 2: 30, 40, 50...
      // And so on...
      const levelThreshold = (startingLevel + 1) * 10;
      
      // Check if we've reached the threshold based on starting level
      if (lines === levelThreshold) {
        level++;
        console.log(`Leveled up to ${level} after clearing ${lines} lines (threshold was ${levelThreshold})`);
        shouldTriggerLevelUpFireworks = true;
      } 
      // After first level up, follow standard "every 10 lines" rule
      else if (lines > levelThreshold && (lines - levelThreshold) % 10 === 0) {
        level++;
        console.log(`Leveled up to ${level} after clearing ${lines} lines`);
        shouldTriggerLevelUpFireworks = true;
      }
    }

    // Play regular line clear sound effect immediately (not delayed)
    if (clear_line_audio) {
      clear_line_audio.currentTime = 0;
      clear_line_audio.play().catch(e => console.log('Audio play prevented:', e));
    }
  }

  // Show score animation only if rows were cleared
  showAddScore = completedRows > 0;
  scoreTextTimer = completedRows > 0 ? 20 : 0;

  return { score, lines, level, showAddScore, addScore: addScoreValue };
}

/**
 * Clear rows marked for removal and move blocks down
 * Uses a more direct approach for block shifting
 */
export function clearRows() {
  // If no rows to clear, exit early
  if (rowsToBeCleared.length === 0) {
    return;
  }

  // Sort rows in ascending order (top to bottom)
  rowsToBeCleared.sort((a, b) => a - b);

  // For each row that needs to be cleared, starting from the top
  for (const rowToClear of rowsToBeCleared) {
    // Move all rows above this one down by 1
    for (let y = rowToClear; y > 0; y--) {
      for (let x = 0; x < grid_width; x++) {
        if (!gridData[x]) {
          gridData[x] = {};
        }
        // Copy from row above
        gridData[x][y] = gridData[x][y - 1] || 0;
      }
    }

    // Clear the top row
    for (let x = 0; x < grid_width; x++) {
      if (gridData[x]) {
        gridData[x][0] = 0;
      }
    }
  }

  // Reset the clearing array
  rowsToBeCleared = [];

  // Play clear line sound effect
  if (clear_line_audio) {
    clear_line_audio.currentTime = 0;
    try {
      clear_line_audio.play().catch(e => console.log("Audio play prevented:", e));
    } catch (e) {
      console.log("Audio play error:", e);
    }
  }

  // Ensure score is updated correctly using the same updateScore approach as in hard drop
  try {
    // Use the imported updateScore function for consistency
    if (addScoreValue > 0) {
      console.log(`Updating score in clearRows: adding ${addScoreValue}, total: ${score}`);
      updateScore(addScoreValue, true); // Use true to show animation
    }
  } catch (e) {
    console.error("Error updating score after clearing rows:", e);
  }
}

/**
 * Mark a row for clearing by storing the original color but NOT changing the grid data yet
 * @param {number} y - Row to mark
 */
function markRow(y) {
  // Store original block colors for animation
  if (!originalBlockColors[y]) {
    originalBlockColors[y] = {};
  }

  for (let x = 0; x < grid_width; x++) {
    if (!gridData[x]) {
      gridData[x] = {};
    }

    // Store the original color before marking
    if (gridData[x][y]) {
      originalBlockColors[y][x] = gridData[x][y];
    }

    // We no longer immediately mark cells with value 8, we'll animate them first
  }
}

/**
 * Draw the custom grid background and lines
 */
export function drawCustomGrid() {
  if (!ctx) return;

  // Calculate the total grid size
  const totalWidth = grid_width * block_width;
  const totalHeight = grid_height * block_width;

  // Draw the outer frame with gradient background
  const padding = 10; // Padding around the actual grid
  const cornerRadius = 5; // Rounded corners

  // Draw the outer background with rounded corners
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(origin.x - padding, origin.y - padding + cornerRadius);
  ctx.arcTo(origin.x - padding, origin.y - padding, origin.x - padding + cornerRadius, origin.y - padding, cornerRadius);
  ctx.lineTo(origin.x + totalWidth + padding - cornerRadius, origin.y - padding);
  ctx.arcTo(origin.x + totalWidth + padding, origin.y - padding, origin.x + totalWidth + padding, origin.y - padding + cornerRadius, cornerRadius);
  ctx.lineTo(origin.x + totalWidth + padding, origin.y + totalHeight + padding - cornerRadius);
  ctx.arcTo(origin.x + totalWidth + padding, origin.y + totalHeight + padding, origin.x + totalWidth + padding - cornerRadius, origin.y + totalHeight + padding, cornerRadius);
  ctx.lineTo(origin.x - padding + cornerRadius, origin.y + totalHeight + padding);
  ctx.arcTo(origin.x - padding, origin.y + totalHeight + padding, origin.x - padding, origin.y + totalHeight + padding - cornerRadius, cornerRadius);
  ctx.closePath();

  // Create gradient for background
  const gradient = ctx.createLinearGradient(
    origin.x - padding,
    origin.y - padding,
    origin.x + totalWidth + padding,
    origin.y + totalHeight + padding
  );
  gradient.addColorStop(0, '#121218');
  gradient.addColorStop(0.5, '#1a1a2a');
  gradient.addColorStop(1, '#121218');

  // Apply gradient fill
  ctx.fillStyle = gradient;
  ctx.fill();

  // Draw glowing outer border
  ctx.shadowColor = 'rgba(70, 70, 140, 0.7)';
  ctx.shadowBlur = 10;
  ctx.strokeStyle = gridOuterBorderColor;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Draw grid border
  if (gridOutline) {
    ctx.strokeStyle = gridBorderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(origin.x, origin.y, totalWidth, totalHeight);
  }

  // Draw vertical grid lines
  for (let x = 1; x < grid_width; x++) {
    const xPos = origin.x + x * block_width;
    ctx.beginPath();
    ctx.moveTo(xPos, origin.y);
    ctx.lineTo(xPos, origin.y + totalHeight);
    ctx.strokeStyle = gridLineColor;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Draw horizontal grid lines
  for (let y = 1; y < grid_height; y++) {
    const yPos = origin.y + y * block_width;
    ctx.beginPath();
    ctx.moveTo(origin.x, yPos);
    ctx.lineTo(origin.x + totalWidth, yPos);
    ctx.strokeStyle = gridLineColor;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  
  // DRAW NEXT BLOCK BORDER ABOVE THE MAIN GRID
  // -----------------------------------------
  // Calculate position for the next block preview area
  const nextBlockSize = 4; // Size of the next block area (4x4 grid)
  // Position starting from the 2nd block to the 9th block horizontally (8 blocks width)
  const nextBlockWidth = block_width * 8; // Width spans 8 blocks (reduced by 1)
  const nextBlockX = origin.x + block_width; // Start at the second column (x + 1 block width)
  // Position above the grid, raised by height of the next block area plus padding, but moved down 10px
  const nextBlockY = origin.y - (block_width * nextBlockSize) - padding * 2 + 10; // Added +10px to move down
  
  // Calculate the dimensions of the next block border box
  const nextBlockTotalWidth = nextBlockWidth;
  const nextBlockTotalHeight = block_width * nextBlockSize;
  
  // Draw next block border with rounded corners
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(nextBlockX - padding, nextBlockY - padding + cornerRadius);
  ctx.arcTo(nextBlockX - padding, nextBlockY - padding, nextBlockX - padding + cornerRadius, nextBlockY - padding, cornerRadius);
  ctx.lineTo(nextBlockX + nextBlockTotalWidth + padding - cornerRadius, nextBlockY - padding);
  ctx.arcTo(nextBlockX + nextBlockTotalWidth + padding, nextBlockY - padding, nextBlockX + nextBlockTotalWidth + padding, nextBlockY - padding + cornerRadius, cornerRadius);
  ctx.lineTo(nextBlockX + nextBlockTotalWidth + padding, nextBlockY + nextBlockTotalHeight + padding - cornerRadius);
  ctx.arcTo(nextBlockX + nextBlockTotalWidth + padding, nextBlockY + nextBlockTotalHeight + padding, nextBlockX + nextBlockTotalWidth + padding - cornerRadius, nextBlockY + nextBlockTotalHeight + padding, cornerRadius);
  ctx.lineTo(nextBlockX - padding + cornerRadius, nextBlockY + nextBlockTotalHeight + padding);
  ctx.arcTo(nextBlockX - padding, nextBlockY + nextBlockTotalHeight + padding, nextBlockX - padding, nextBlockY + nextBlockTotalHeight + padding - cornerRadius, cornerRadius);
  ctx.closePath();
  
  // Create gradient for next block background (same style as main grid)
  const nextGradient = ctx.createLinearGradient(
    nextBlockX - padding, 
    nextBlockY - padding,
    nextBlockX + nextBlockTotalWidth + padding,
    nextBlockY + nextBlockTotalHeight + padding
  );
  nextGradient.addColorStop(0, '#121218');
  nextGradient.addColorStop(0.5, '#1a1a2a');
  nextGradient.addColorStop(1, '#121218');
  
  // Apply gradient fill
  ctx.fillStyle = nextGradient;
  ctx.fill();
  
  // Draw glowing outer border
  ctx.shadowColor = 'rgba(70, 70, 140, 0.7)';
  ctx.shadowBlur = 10;
  ctx.strokeStyle = gridOuterBorderColor;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  
  // Draw inner border, but without the bottom line
  ctx.strokeStyle = gridBorderColor;
  ctx.lineWidth = 2;
  
  // Draw only the top line of the inner border
  ctx.beginPath();
  ctx.moveTo(nextBlockX, nextBlockY);
  ctx.lineTo(nextBlockX + nextBlockTotalWidth, nextBlockY);
  ctx.stroke();
  
  // Draw only the left side of the inner border
  ctx.beginPath();
  ctx.moveTo(nextBlockX, nextBlockY);
  ctx.lineTo(nextBlockX, nextBlockY + nextBlockTotalHeight);
  ctx.stroke();
  
  // Draw only the right side of the inner border
  ctx.beginPath();
  ctx.moveTo(nextBlockX + nextBlockTotalWidth, nextBlockY);
  ctx.lineTo(nextBlockX + nextBlockTotalWidth, nextBlockY + nextBlockTotalHeight);
  ctx.stroke();
  
  // Note: We're not drawing the bottom line as requested
  
  ctx.restore();
}

/**
 * Fill the grid - render all blocks in the grid
 * Optimized to skip empty cells and use batch rendering
 */
export function fillGrid() {
  // First draw our custom grid BEFORE any blocks
  drawCustomGrid();

  // Check if we should render the clearing animation
  if (rowsToBeCleared.length > 0) {
    // Handle the clear animation - if it's complete, move to the actual clearing
    const animationComplete = renderClearAnimation();

    if (animationComplete) {
      // Animation is complete, NOW perform the actual row clearing
      clearRows();

      // Reset animation state for next time
      clearAnimationState = LINE_CLEAR_ANIMATION.FADE_TO_WHITE;
      clearAnimationFrame = 0;
    }

    // If animation is still in progress, don't render regular blocks
    return;
  }

  // Regular block rendering - batch similar blocks together to minimize state changes
  const renderQueue = new Map(); // Map of blockType -> positions array

  // Collect all blocks to render by type
  for (let x = 0; x < grid_width; x++) {
    if (!gridData[x]) continue;

    for (let y = 0; y < grid_height; y++) {
      const blockType = gridData[x][y];
      if (!blockType) continue;

      const blockTypeIndex = blockType - 1;
      if (blockTypeIndex >= 0 && blockTypeIndex <= 7) {
        if (!renderQueue.has(blockTypeIndex)) {
          renderQueue.set(blockTypeIndex, []);
        }

        renderQueue.get(blockTypeIndex).push({
          x: origin.x + x * block_width,
          y: origin.y + y * block_width
        });
      }
    }
  }

  // Render blocks in batches by type - with enhanced visibility
  renderQueue.forEach((positions, blockType) => {
    // Use the sprite size from configuration
    const spriteSize = BLOCK.SPRITE_SIZE;
    const sx = blockType * spriteSize;
    const bufferX = 2;
    const bufferY = 2;
    const bufferWidth = 4;
    const bufferHeight = 4;

    // Draw all blocks of this type in a batch
    positions.forEach(pos => {
      const drawX = Math.floor(pos.x);
      const drawY = Math.floor(pos.y);

      ctx.drawImage(
        lego,
        sx + bufferX,
        bufferY,
        spriteSize - bufferWidth,
        spriteSize - bufferHeight,
        drawX,
        drawY,
        block_width,
        block_width
      );
    });
  });

  // Render score floating text if active
  if (showAddScore && scoreTextTimer > 0) {
    renderScoreText();
    scoreTextTimer--;
    if (scoreTextTimer <= 0) {
      showAddScore = false;
    }
  }

  // Render any active particles
  particles.forEach((particle, index) => {
    particle.update();
    particle.draw();
    if (particle.alpha <= 0) {
      particles.splice(index, 1);
    }
  });

  // Only trigger fireworks when level > 0
  if (level > 0) {
    // Trigger fireworks if a Tetris was achieved
    if (shouldTriggerFireworks) {
      createTetrisFireworks(rowsToBeCleared, origin, block_width, grid_width);
      shouldTriggerFireworks = false;
    }

    // Trigger level-up fireworks if applicable
    if (shouldTriggerLevelUpFireworks) {
      createLevelUpFireworks(level, origin, block_width, grid_width);
      shouldTriggerLevelUpFireworks = false;
    }
  } else {
    // If we're at level 0, just reset the flags without creating fireworks
    shouldTriggerFireworks = false;
    shouldTriggerLevelUpFireworks = false;
  }

  // Update and render active fireworks
  updateFireworks();
}

/**
 * Render floating score text animation
 */
function renderScoreText() {
  // Score text animation is disabled by default
  return;
}

/**
 * Draw grid lines
 * @param {string} color - Color of grid lines
 */
export function showGrid(color) {
  // Draw vertical lines
  for (let x = 0; x <= grid_width; x++) {
    const x1 = origin.x + x * block_width;
    DrawLine(x1, origin.y, x1, origin.y + grid_height * block_width, color);
  }

  // Draw horizontal lines
  for (let y = 0; y <= grid_height; y++) {
    const y1 = origin.y + y * block_width;
    DrawLine(origin.x, y1, origin.x + grid_width * block_width, y1, color);
  }
}

/**
 * Initialize the game grid - creates an empty grid
 */
export function initGrid() {
  // Optimized grid initialization - use objects for sparse storage
  gridData = {};

  // Only initialize columns when needed (lazy initialization)
  // This saves memory especially for empty areas
}

/**
 * Preload all audio files to ensure they're ready when needed
 */
function preloadAudioFiles() {
  // Preload all voice feedback audio files
  nice_combo_audio = new Audio(AUDIO.NICE_COMBO);
  you_fire_audio = new Audio(AUDIO.YOU_FIRE);
  great_move_audio = new Audio(AUDIO.GREAT_MOVE);
  smooth_clear_audio = new Audio(AUDIO.SMOOTH_CLEAR);
  amazing_audio = new Audio(AUDIO.AMAZING);
  
  // Set volume for all audio files
  [nice_combo_audio, you_fire_audio, great_move_audio, smooth_clear_audio, amazing_audio].forEach(audio => {
    if (audio) {
      audio.volume = 1.0;
      // Preload the audio by loading it
      audio.load();
    }
  });
  
  // Store in the audio arrays for easier random selection
  double_row_audio = [nice_combo_audio, you_fire_audio];
  triple_row_audio = [great_move_audio, smooth_clear_audio];
  tetris_audio = amazing_audio;
  
  console.log('All voice feedback audio files preloaded');
}

/**
 * Set up the grid module with required parameters
 * @param {CanvasRenderingContext2D} context - Canvas context
 * @param {Object} params - Grid parameters
 * @param {HTMLAudioElement} audio - Audio for line clearing
 * @param {HTMLImageElement} gridImage - The grid image (no longer used visually, but kept for positioning reference)
 * @param {HTMLImageElement} blocksImage - The blocks image (lego)
 */
export function setupGrid(context, params, audio, gridImage, blocksImage) {
  ctx = context;
  grid_width = params.grid_width;
  grid_height = params.grid_height;
  block_width = params.block_width;
  
  // Store the blocks image 
  if (blocksImage) {
    lego = blocksImage;
  }
  
  // Get canvas dimensions from context
  canvasWidth = ctx.canvas.width / (window.devicePixelRatio || 1);
  canvasHeight = ctx.canvas.height / (window.devicePixelRatio || 1);
  
  // Calculate the total grid dimensions based on block size
  const totalGridWidth = grid_width * block_width;
  const totalGridHeight = grid_height * block_width;
  
  // Center the grid precisely in the middle of the screen
  origin.x = Math.floor((canvasWidth - totalGridWidth) / 2);
  origin.y = Math.floor((canvasHeight - totalGridHeight) / 2);
  
  // Apply a small vertical offset to improve visual balance (move grid slightly up)
  verticalOffsetFactor = 0.5; // Scale the offset with block size
  const verticalOffset = Math.floor(block_width * verticalOffsetFactor);
  origin.y -= verticalOffset;
  
  console.log(`Grid positioned at: ${origin.x},${origin.y} with block size ${block_width}px`);
  console.log(`Grid dimensions: ${totalGridWidth}x${totalGridHeight}`);
  
  // Store audio and reset game state
  clear_line_audio = audio;
  
  // Preload all audio files
  preloadAudioFiles();
  
  // Reset game state, but preserve selected level if available
  lines = 0;
  
  // Use the global selected level if available, otherwise default to 0
  if (typeof window.selected_game_level === 'number') {
    level = window.selected_game_level;
    startingLevel = window.selected_game_level; // Store starting level
    console.log(`Grid using selected level: ${level} from global variable`);
  } else {
    level = 0;
    startingLevel = 0; // Store starting level
    console.log(`Grid using default level 0`);
  }
  
  // Set initial level goal based on starting level
  if (startingLevel >= 10) {
    // For level 10+: need to clear (startingLevel + 1) * 10 lines before first level up
    level_goal = (startingLevel + 1) * 10;
    console.log(`Level goal set to ${level_goal} lines for starting level ${startingLevel}`);
  } else {
    // For levels 0-9: level up every 10 lines
    level_goal = 10;
    console.log(`Level goal set to ${level_goal} lines for starting level ${startingLevel}`);
  }
  
  score = 0;
  showAddScore = false;
  scoreTextTimer = 0;
  rowsToBeCleared = [];
  
  // Initialize grid
  initGrid();
  
  // Draw our custom grid once to initialize it
  drawCustomGrid();

  // Add resize event listener using the eventDispatcher
  eventDispatcher.addEventListener(EVENTS.WINDOW_RESIZE, handleResize);

  // Initialize fireworks system with canvas dimensions, but don't create any actual fireworks
  setupFireworks(ctx, canvasWidth, canvasHeight);
  
  // Reset fireworks flags to prevent any automatic fireworks display at level 0
  shouldTriggerFireworks = false;
  fireworksDisplayActive = false;
  shouldTriggerLevelUpFireworks = false;
}

/**
 * Handle window resize event to update grid position
 * @param {Object} dimensions - New canvas dimensions from resize event
 */
function handleResize(dimensions) {
  // Get new canvas dimensions
  canvasWidth = ctx.canvas.width / (window.devicePixelRatio || 1);
  canvasHeight = ctx.canvas.height / (window.devicePixelRatio || 1);

  // Recalculate grid position
  const totalGridWidth = grid_width * block_width;
  const totalGridHeight = grid_height * block_width;
  
  // Center the grid precisely in the middle of the screen
  origin.x = Math.floor((canvasWidth - totalGridWidth) / 2);
  origin.y = Math.floor((canvasHeight - totalGridHeight) / 2);
  
  // Reapply the same vertical offset as in the initial setup
  const verticalOffset = Math.floor(block_width * verticalOffsetFactor);
  origin.y -= verticalOffset;

  console.log(`Grid repositioned at: ${origin.x},${origin.y} after resize (canvas: ${canvasWidth}x${canvasHeight})`);

  // Force redraw of UI with new grid position
  drawCustomGrid();
}

/**
 * Get the current grid state
 * @returns {Object} Grid state object
 */
export function getGridState() {
  return {
    gridData,
    lines,
    level,
    score,
    level_goal,
    origin,
    grid_width,
    grid_height,
    block_width,
    isPaused: false // Add pause state to grid state
  };
}

/**
 * Convert grid coordinates to screen coordinates
 * @param {number} gridX - X position in grid coordinates (0-based)
 * @param {number} gridY - Y position in grid coordinates (0-based)
 * @returns {Object} Screen coordinates {x, y}
 */
export function gridToScreenCoordinates(gridX, gridY) {
  return {
    x: origin.x + gridX * block_width,
    y: origin.y + gridY * block_width
  };
}

/**
 * Convert screen coordinates to grid coordinates
 * @param {number} screenX - X position in screen coordinates
 * @param {number} screenY - Y position in screen coordinates
 * @returns {Object} Grid coordinates {x, y}, rounded down to nearest cell
 */
export function screenToGridCoordinates(screenX, screenY) {
  return {
    x: Math.floor((screenX - origin.x) / block_width),
    y: Math.floor((screenY - origin.y) / block_width)
  };
}

/**
 * Draw a block at the specified grid position
 * @param {number} gridX - X position in grid coordinates (0-based)
 * @param {number} gridY - Y position in grid coordinates (0-based)
 * @param {number} blockType - Type of block to draw (0-6)
 */
export function drawBlockAtGridPosition(gridX, gridY, blockType) {
  const screenPos = gridToScreenCoordinates(gridX, gridY);
  
  if (drawBlock && typeof drawBlock === 'function') {
    drawBlock(screenPos.x, screenPos.y, blockType);
  } else {
    // Fallback to using the lego sprite
    const spriteSize = BLOCK.SPRITE_SIZE;
    const sx = blockType * spriteSize;
    ctx.drawImage(
      lego,
      sx + 2,
      2,
      spriteSize - 4,
      spriteSize - 4,
      screenPos.x,
      screenPos.y,
      block_width,
      block_width
    );
  }
}

/**
 * Set the block drawing function from another module
 * @param {Function} drawBlockFn - Function to draw a block
 */
export function setDrawBlockFunction(drawBlockFn) {
  // Store the reference to the drawBlock function provided by block.js
  drawBlock = drawBlockFn;

  // Set up fallback if function is invalid
  if (!drawBlock || typeof drawBlock !== 'function') {
    console.error('Invalid drawBlock function provided');
    drawBlock = (x, y, type) => {
      if (ctx) {
        ctx.fillStyle = '#f00'; // Red fallback
        ctx.fillRect(x, y, block_width, block_width);
      }
    };
  }
}

/**
 * Check if grid is currently displaying an animation
 */
export function isAnimationInProgress() {
  return isRowClearingInProgress || rowsToBeCleared.length > 0;
}

/**
 * Play a random voice line from the provided array
 * @param {Array} voiceLines - Array of voice lines (either Audio objects or file paths)
 * @param {string} context - Context for logging
 */
function playRandomVoiceLine(voiceLines, context) {
  // Exit early if the array is empty or undefined
  if (!voiceLines || voiceLines.length === 0) {
    console.log(`No voice lines available for ${context}`);
    return;
  }

  try {
    const randomIndex = Math.floor(Math.random() * voiceLines.length);
    let voiceLine = voiceLines[randomIndex];
    
    // Check if the voice line is a string path instead of an Audio object
    if (typeof voiceLine === 'string') {
      // Create a new Audio object from the path
      voiceLine = new Audio(voiceLine);
      // Replace the string in the array with the Audio object for future use
      voiceLines[randomIndex] = voiceLine;
    }
    
    // Now we can safely use Audio properties and methods
    if (voiceLine instanceof Audio) {
      voiceLine.currentTime = 0;
      
      setTimeout(() => {
        voiceLine.play().catch(e => console.log(`${context} voice line play prevented:`, e));
        console.log(`Playing ${context} voice line: ${voiceLine.src}`);
      }, VOICE_FEEDBACK_DELAY);
    } else {
      console.error(`Invalid voice line type for ${context}:`, typeof voiceLine);
    }
  } catch (e) {
    console.error(`Error playing ${context} voice line:`, e);
  }
}