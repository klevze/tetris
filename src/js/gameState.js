/**
 * Game State Manager
 * Centralized state management for the Tetris game
 */

import { GAME_STATES, INITIAL_SCORE, INITIAL_LINES, INITIAL_LEVEL, INITIAL_LEVEL_GOAL } from './config/config.js';

// Game state instance (singleton)
const gameState = {
    // Core game state
    currentState: GAME_STATES.LOADING,
    isPaused: false,
    
    // Loading state
    loadingProgress: 0,
    loadingComplete: false,
    
    // Game statistics
    score: INITIAL_SCORE,
    lines: INITIAL_LINES,
    level: INITIAL_LEVEL,
    levelGoal: INITIAL_LEVEL_GOAL,
    
    // Timer
    elapsedSeconds: 0,
    
    // Audio settings
    musicEnabled: true,
    
    // Registered listeners for state changes
    listeners: []
};

/**
 * Change the current game state
 * @param {string} newState - The new state from GAME_STATES
 * @returns {string} The new state
 */
export function changeState(newState) {
    if (!Object.values(GAME_STATES).includes(newState)) {
        console.error(`Invalid game state: ${newState}`);
        return gameState.currentState;
    }
    
    const oldState = gameState.currentState;
    gameState.currentState = newState;
    
    // Notify listeners of state change
    notifyListeners('stateChanged', { oldState, newState });
    
    console.log(`Game state changed from ${oldState} to ${newState}`);
    return newState;
}

/**
 * Toggle the pause state
 * @returns {boolean} New pause state
 */
export function togglePause() {
    gameState.isPaused = !gameState.isPaused;
    notifyListeners('pauseChanged', { isPaused: gameState.isPaused });
    return gameState.isPaused;
}

/**
 * Update the score
 * @param {number} newScore - The new score value
 * @param {number} addedScore - How much was added (for animations)
 */
export function updateScore(newScore, addedScore = 0) {
    gameState.score = newScore;
    notifyListeners('scoreChanged', { score: newScore, added: addedScore });
}

/**
 * Update lines and check level progression
 * @param {number} clearedLines - Number of newly cleared lines
 * @returns {Object} Updated state with lines and level
 */
export function updateLines(clearedLines) {
    gameState.lines += clearedLines;
    
    // Check for level up
    if (gameState.lines >= gameState.levelGoal) {
        gameState.level = Math.min(10, gameState.level + 1);
        gameState.levelGoal += gameState.level * 10;
        notifyListeners('levelUp', { level: gameState.level });
    }
    
    notifyListeners('linesChanged', { 
        lines: gameState.lines, 
        level: gameState.level,
        clearedLines: clearedLines
    });
    
    return {
        lines: gameState.lines,
        level: gameState.level
    };
}

/**
 * Update game timer
 */
export function updateTimer() {
    if (!gameState.isPaused) {
        gameState.elapsedSeconds++;
        notifyListeners('timerUpdated', { seconds: gameState.elapsedSeconds });
    }
}

/**
 * Toggle music state
 * @returns {boolean} New music enabled state
 */
export function toggleMusic() {
    gameState.musicEnabled = !gameState.musicEnabled;
    notifyListeners('musicToggled', { enabled: gameState.musicEnabled });
    
    // Save preference
    if (typeof(Storage) !== "undefined") {
        localStorage.setItem("music_on", gameState.musicEnabled);
    }
    
    return gameState.musicEnabled;
}

/**
 * Reset the game state for a new game
 */
export function resetGame() {
    gameState.score = INITIAL_SCORE;
    gameState.lines = INITIAL_LINES;
    gameState.level = INITIAL_LEVEL;
    gameState.levelGoal = INITIAL_LEVEL_GOAL;
    gameState.elapsedSeconds = 0;
    gameState.isPaused = false;
    
    notifyListeners('gameReset', gameState);
}

/**
 * Register a listener for state changes
 * @param {Function} callback - Function to call with state updates
 * @returns {Function} Function to remove the listener
 */
export function addListener(callback) {
    if (typeof callback !== 'function') {
        console.error('Listener must be a function');
        return () => {};
    }
    
    gameState.listeners.push(callback);
    
    // Return function to remove this listener
    return () => {
        const index = gameState.listeners.indexOf(callback);
        if (index !== -1) {
            gameState.listeners.splice(index, 1);
        }
    };
}

/**
 * Notify all listeners of a state change
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
function notifyListeners(event, data) {
    gameState.listeners.forEach(listener => {
        try {
            listener(event, data);
        } catch (e) {
            console.error('Error in game state listener:', e);
        }
    });
}

/**
 * Get the current game state
 * @returns {Object} Current game state
 */
export function getState() {
    // Return a copy to prevent direct mutation
    return { ...gameState };
}

/**
 * Update the loading progress
 * @param {number} current - Number of items loaded
 * @param {number} total - Total number of items to load
 */
export function updateLoadingProgress(current, total) {
    gameState.loadingProgress = current / total;
    
    if (current >= total && !gameState.loadingComplete) {
        gameState.loadingComplete = true;
        notifyListeners('loadingComplete', { progress: 1 });
    } else {
        notifyListeners('loadingProgress', { 
            progress: gameState.loadingProgress,
            complete: gameState.loadingComplete
        });
    }
}