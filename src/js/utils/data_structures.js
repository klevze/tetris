/**
 * TETRIS DATA STRUCTURES
 * This module defines the core data structures for the Tetris game:
 * - Tetromino shapes and rotation states
 * - Block and Star objects
 */

// Block object template (used directly, not as constructor)
export const Block = {
    x: 0,
    y: 0, 
    speed: 1,
    type: 1,
    rotate: 0,
    shape: {}
};

// Star object template for starfield effect
export const starData = {
    x: 0,
    y: 0,
    color: '#fff',
    type: 1,
    speed: 1
};

/**
 * TETROMINO DEFINITIONS
 * Standard Tetris pieces with their 4 rotation states each
 * 
 * Optimized format:
 * Each tetromino is defined in a more compact representation that's easier to understand:
 * - Each shape has a clear name (I, J, L, O, S, Z, T)
 * - Each rotation state (0-3) is defined with a 4x4 or 4x3 grid using 0s and 1s
 * - Each rotation is more readable with proper spacing
 */
export const TETROMINOES = {
    // I-piece (long bar)
    I: {
        color: 0, // Color index matches the original Block.type
        rotations: [
            [
                1, 1, 1, 1,
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0
            ],
            [
                1, 0, 0, 0,
                1, 0, 0, 0,
                1, 0, 0, 0,
                1, 0, 0, 0
            ],
            [
                1, 1, 1, 1,
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0
            ],
            [
                1, 0, 0, 0,
                1, 0, 0, 0,
                1, 0, 0, 0,
                1, 0, 0, 0
            ]
        ]
    },
    
    // J-piece
    J: {
        color: 1,
        rotations: [
            [
                1, 1, 1, 0,
                1, 0, 0, 0,
                0, 0, 0, 0
            ],
            [
                1, 1, 0, 0,
                0, 1, 0, 0,
                0, 1, 0, 0
            ],
            [
                0, 0, 1, 0,
                1, 1, 1, 0,
                0, 0, 0, 0
            ],
            [
                1, 0, 0, 0,
                1, 0, 0, 0,
                1, 1, 0, 0
            ]
        ]
    },
    
    // L-piece
    L: {
        color: 2,
        rotations: [
            [
                1, 1, 1, 0,
                0, 0, 1, 0,
                0, 0, 0, 0
            ],
            [
                0, 1, 0, 0,
                0, 1, 0, 0,
                1, 1, 0, 0
            ],
            [
                1, 0, 0, 0,
                1, 1, 1, 0,
                0, 0, 0, 0
            ],
            [
                1, 1, 0, 0,
                1, 0, 0, 0,
                1, 0, 0, 0
            ]
        ]
    },
    
    // O-piece (square)
    O: {
        color: 3,
        rotations: [
            [
                1, 1, 0, 0,
                1, 1, 0, 0,
                0, 0, 0, 0
            ],
            [
                1, 1, 0, 0,
                1, 1, 0, 0,
                0, 0, 0, 0
            ],
            [
                1, 1, 0, 0,
                1, 1, 0, 0,
                0, 0, 0, 0
            ],
            [
                1, 1, 0, 0,
                1, 1, 0, 0,
                0, 0, 0, 0
            ]
        ]
    },
    
    // S-piece
    S: {
        color: 4,
        rotations: [
            [
                0, 1, 1, 0,
                1, 1, 0, 0,
                0, 0, 0, 0
            ],
            [
                1, 0, 0, 0,
                1, 1, 0, 0,
                0, 1, 0, 0
            ],
            [
                0, 1, 1, 0,
                1, 1, 0, 0,
                0, 0, 0, 0
            ],
            [
                1, 0, 0, 0,
                1, 1, 0, 0,
                0, 1, 0, 0
            ]
        ]
    },
    
    // Z-piece
    Z: {
        color: 5,
        rotations: [
            [
                1, 1, 0, 0,
                0, 1, 1, 0,
                0, 0, 0, 0
            ],
            [
                0, 1, 0, 0,
                1, 1, 0, 0,
                1, 0, 0, 0
            ],
            [
                1, 1, 0, 0,
                0, 1, 1, 0,
                0, 0, 0, 0
            ],
            [
                0, 1, 0, 0,
                1, 1, 0, 0,
                1, 0, 0, 0
            ]
        ]
    },
    
    // T-piece
    T: {
        color: 6,
        rotations: [
            [
                0, 1, 0, 0,
                1, 1, 1, 0,
                0, 0, 0, 0
            ],
            [
                0, 1, 0, 0,
                0, 1, 1, 0,
                0, 1, 0, 0
            ],
            [
                0, 0, 0, 0,
                1, 1, 1, 0,
                0, 1, 0, 0
            ],
            [
                0, 1, 0, 0,
                1, 1, 0, 0,
                0, 1, 0, 0
            ]
        ]
    }
};

// Generate the original shapes format for backward compatibility
export const shapes = {};

// Convert the new TETROMINOES format to the original format
function generateShapes() {
    // Create arrays for each rotation state
    for (let rotation = 0; rotation < 4; rotation++) {
        shapes[rotation] = [];
        
        // Create array entries for each tetromino type
        const tetroArray = Object.values(TETROMINOES);
        for (let type = 0; type < tetroArray.length; type++) {
            shapes[rotation][type] = tetroArray[type].rotations[rotation];
        }
    }
}

// Generate the shapes on module load
generateShapes();