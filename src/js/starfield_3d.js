import { rect } from './functions.js';

// Variables that will be initialized later
let ctx;
let WIDTH = window.innerWidth || 800; // Default to window width or fallback to 800
let height_3d = window.innerHeight || 600; // Default to window height or fallback to 600

const MAX_DEPTH = 32;
let d = 0;
let dd = 0;
let o = 0;

let num_stars = 300;
let stars = new Array(num_stars);
let dif = 128.0;

// Field of view values for star perspective
let hfov = 100 * Math.PI / 180;
let vfov = 80 * Math.PI / 180;

// View distance variables
let hViewDistance, vViewDistance;
let cx, cy, distance;

class Star3D {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.color = '#fff';
        this.type = 1;
    }
}

function draw3DStar(x, y, color) {
    ctx.fillStyle = color;
    rect(x, y, 1, 1);
    ctx.strokeStyle = color;
    ctx.stroke();
}

export function create3DStarfield() {
    for (let i = 0; i < stars.length; i++) {
        stars[i] = new Star3D();
        
        stars[i].x = randomRange(-25, 25);
        stars[i].y = randomRange(-25, 25);
        stars[i].z = randomRange(1, MAX_DEPTH);
        stars[i].type = Math.floor(Math.random() * 5);
    }
}

function update3DStar(i) {
    stars[i].x = randomRange(-25, 25);
    stars[i].y = randomRange(-25, 25);
    stars[i].z = randomRange(1, MAX_DEPTH);
    stars[i].type = Math.floor(Math.random() * 5);
}

function randomRange(minVal, maxVal) {
    return Math.floor(Math.random() * (maxVal - minVal - 1)) + minVal;
}

export function Draw3DStars() {
    try {
        for (let i = 0; i < stars.length; i++) {
            let color;
            
            switch(stars[i].type) {
                case 0:
                    color = '#fff';
                    break;
                
                case 1:
                    color = '#aaa';
                    break;
                
                case 2:
                    color = '#999';
                    break;
                
                case 3:
                    color = '#777';
                    break;
                
                case 4:
                    color = '#555';
                    break;
            }
            
            stars[i].z -= 0.4;
            if (stars[i].z <= 0.1) { // Use 0.1 as threshold to prevent division by near-zero values
                update3DStar(i);
            }
            
            // Safe division - prevent division by zero
            const z = Math.max(stars[i].z, 0.1); 
            const k = dif / z;
            
            // Don't increment dd globally as it could grow infinitely
            // dd++;
            
            const px = stars[i].x * k + cx;
            const py = stars[i].y * k + cy;
        
            if (px >= 0 && px <= WIDTH && py >= 0 && py <= height_3d) {
                draw3DStar(px, py, color);
            }
        }
    } catch (error) {
        console.error('Error in Draw3DStars:', error);
    }
}

// Initialize function that should be called when setting up the starfield
export function init3DStarfield(context, canvasWidth, canvasHeight) {
    ctx = context;
    WIDTH = canvasWidth || window.innerWidth || 800; // Default to canvas width, window width, or fallback to 800
    height_3d = canvasHeight || window.innerHeight || 600; // Default to canvas height, window height, or fallback to 600
    
    cx = WIDTH / 2;
    cy = height_3d / 2;
    distance = Math.floor(Math.sqrt(cx * cx + cy * cy));
    
    hViewDistance = (WIDTH / 2) / Math.tan(hfov / 2);
    vViewDistance = (height_3d / 2) / Math.tan(vfov / 2);
    
    create3DStarfield();
}