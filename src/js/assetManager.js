/**
 * Asset Manager - Centralized asset loading and caching system
 * Handles efficient loading of images and audio with progress tracking
 */

import { IMAGES, AUDIO } from './config/config.js';

// Cache containing all loaded assets
const assetCache = {
    images: {},
    audio: {}
};

// Loading status tracking
let totalAssets = 0;
let loadedAssets = 0;
let progressCallback = null;
let completeCallback = null;

/**
 * Preload all game assets
 * @param {Function} onProgress - Progress callback with value between 0-1
 * @param {Function} onComplete - Called when all assets are loaded
 * @returns {Promise} Resolves when all assets are loaded
 */
export function preloadAssets(onProgress, onComplete) {
    progressCallback = onProgress;
    completeCallback = onComplete;
    
    const imagePromises = preloadImages(IMAGES);
    const audioPromises = preloadAudio(AUDIO);
    
    const allPromises = [...imagePromises, ...audioPromises];
    totalAssets = allPromises.length;
    
    return Promise.allSettled(allPromises)
        .then(results => {
            const failures = results.filter(result => result.status === 'rejected').length;
            if (failures > 0) {
                console.warn(`${failures} assets failed to load`);
            }
            
            if (completeCallback) {
                completeCallback();
            }
            
            return assetCache;
        });
}

/**
 * Preload all required game images
 * @param {Object} imageCollection - Key-value pairs of image IDs and URLs
 * @returns {Array<Promise>} Array of loading promises
 */
function preloadImages(imageCollection) {
    return Object.entries(imageCollection).map(([id, url]) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                assetCache.images[id] = img;
                updateProgress();
                resolve(img);
            };
            
            img.onerror = (err) => {
                console.error(`Failed to load image: ${url}`, err);
                updateProgress();
                reject(err);
            };
            
            img.src = url;
        });
    });
}

/**
 * Preload all required game audio
 * @param {Object} audioCollection - Key-value pairs of audio IDs and URLs
 * @returns {Array<Promise>} Array of loading promises
 */
function preloadAudio(audioCollection) {
    return Object.entries(audioCollection).map(([id, url]) => {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            
            audio.oncanplaythrough = () => {
                assetCache.audio[id] = audio;
                updateProgress();
                resolve(audio);
            };
            
            audio.onerror = (err) => {
                console.error(`Failed to load audio: ${url}`, err);
                updateProgress();
                reject(err);
            };
            
            audio.src = url;
        });
    });
}

/**
 * Update progress tracking and trigger callback
 */
function updateProgress() {
    loadedAssets++;
    const progress = loadedAssets / totalAssets;
    
    if (progressCallback) {
        progressCallback(progress);
    }
}

/**
 * Get a loaded image by its ID
 * @param {string} id - Image identifier from IMAGES config
 * @returns {HTMLImageElement} The loaded image
 */
export function getImage(id) {
    const image = assetCache.images[id];
    if (!image) {
        console.warn(`Image not found: ${id}`);
        return createPlaceholder('image');
    }
    return image;
}

/**
 * Get a loaded audio file by its ID
 * @param {string} id - Audio identifier from AUDIO config
 * @returns {HTMLAudioElement} The loaded audio
 */
export function getAudio(id) {
    const audio = assetCache.audio[id];
    if (!audio) {
        console.warn(`Audio not found: ${id}`);
        return new Audio();
    }
    return audio.cloneNode(); // Return a clone to allow multiple playback
}

/**
 * Check if all assets are loaded
 * @returns {boolean} True if all assets are loaded
 */
export function isLoaded() {
    return loadedAssets === totalAssets;
}

/**
 * Create placeholder for missing assets
 * @private
 */
function createPlaceholder(type) {
    if (type === 'image') {
        // Create a small canvas with an X in it as placeholder
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#444';
        ctx.fillRect(0, 0, 32, 32);
        ctx.strokeStyle = '#f00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(4, 4);
        ctx.lineTo(28, 28);
        ctx.moveTo(28, 4);
        ctx.lineTo(4, 28);
        ctx.stroke();
        
        const img = new Image();
        img.src = canvas.toDataURL();
        return img;
    }
    return null;
}