/**
 * Music Player Module
 * Handles background music playback with multiple tracks in random order
 */

import { AUDIO } from '../config/config.js';

// Music player variables
let musicTracks = [];
let currentTrack = null;
let currentTrackIndex = -1;
let isPlaying = false;
let musicEnabled = true;
let trackOrder = [];
let audioInitialized = false;

/**
 * Initialize the music player
 * @param {boolean} enabled - Whether music should be enabled initially
 */
export function initMusicPlayer(enabled) {
  musicEnabled = enabled;
  audioInitialized = false;
  
  // Create track order array
  createRandomTrackOrder();
  
  console.log('Music player initialized with', musicEnabled ? 'enabled' : 'disabled', 'music');
}

/**
 * Create a random order for playing tracks
 */
function createRandomTrackOrder() {
  // Reset the track order
  trackOrder = [];
  
  // Create an array with indexes of all tracks
  const trackCount = Object.keys(AUDIO).filter(key => key.startsWith('MUSIC_TRACK')).length;
  const indexes = Array.from({ length: trackCount }, (_, i) => i);
  
  // Shuffle the array
  for (let i = indexes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
  }
  
  trackOrder = indexes.map(i => `MUSIC_TRACK_${i + 1}`);
  console.log('Music track order:', trackOrder);
}

/**
 * Load all music tracks
 * @returns {Promise} A promise that resolves when all tracks are loaded
 */
export function loadMusicTracks() {
  return new Promise((resolve) => {
    try {
      musicTracks = [];
      
      // Get all music track keys from AUDIO config
      const musicKeys = Object.keys(AUDIO).filter(key => key.startsWith('MUSIC_TRACK'));
      let tracksLoaded = 0;
      
      // Load each track
      musicKeys.forEach(key => {
        const audio = new Audio();
        audio.src = AUDIO[key];
        
        // When the track ends, play the next one
        audio.addEventListener('ended', playNextTrack);
        
        // Count loaded tracks
        audio.addEventListener('canplaythrough', () => {
          tracksLoaded++;
          if (tracksLoaded === musicKeys.length) {
            console.log(`All ${tracksLoaded} music tracks loaded successfully`);
            resolve();
          }
        });
        
        // Handle loading errors
        audio.addEventListener('error', () => {
          console.error(`Failed to load music track: ${AUDIO[key]}`);
          tracksLoaded++;
          if (tracksLoaded === musicKeys.length) {
            console.log(`Finished loading music tracks with some errors`);
            resolve();
          }
        });
        
        // Store the track
        musicTracks.push({ key, audio });
      });
      
      // If there are no tracks to load, resolve immediately
      if (musicKeys.length === 0) {
        console.log('No music tracks to load');
        resolve();
      }
    } catch (error) {
      console.error('Error loading music tracks:', error);
      resolve(); // Resolve even if loading fails
    }
  });
}

/**
 * Start playing music in random order
 */
export function startMusic() {
  if (!musicEnabled || musicTracks.length === 0) {
    console.log('Music is disabled or no tracks available');
    return;
  }
  
  // Make sure audio is initialized
  initAudio();
  
  if (!isPlaying) {
    // Start with the first track in the random order
    playTrack(trackOrder[0]);
  }
}

/**
 * Play a specific track by key
 * @param {string} trackKey - The key of the track to play
 */
function playTrack(trackKey) {
  // Stop current track if playing
  if (currentTrack) {
    currentTrack.pause();
    currentTrack.currentTime = 0;
  }
  
  // Find the track by key
  const trackObj = musicTracks.find(t => t.key === trackKey);
  if (!trackObj) {
    console.error(`Track "${trackKey}" not found`);
    return;
  }
  
  currentTrack = trackObj.audio;
  currentTrackIndex = trackOrder.indexOf(trackKey);
  
  // Set volume and start playing
  currentTrack.volume = 0.7;
  
  // Try to play the track with better error handling
  try {
    const playPromise = currentTrack.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          isPlaying = true;
          console.log(`Now playing: ${trackKey}`);
        })
        .catch(error => {
          console.log("Music playback prevented:", error);
          
          // If playback was prevented, we'll try again after user interaction
          const musicStartHandler = function() {
            if (musicEnabled) {
              currentTrack.play().catch(e => console.error("Still cannot play audio:", e));
              document.removeEventListener('click', musicStartHandler);
            }
          };
          
          document.addEventListener('click', musicStartHandler, { once: true });
        });
    }
  } catch (error) {
    console.error("Error playing music:", error);
  }
}

/**
 * Play the next track in the random order
 */
function playNextTrack() {
  if (!musicEnabled) return;
  
  // Get the next track index
  let nextIndex = currentTrackIndex + 1;
  
  // If we reached the end of the track order, create a new random order
  if (nextIndex >= trackOrder.length) {
    createRandomTrackOrder();
    nextIndex = 0;
  }
  
  // Play the next track
  playTrack(trackOrder[nextIndex]);
}

/**
 * Stop music playback
 */
export function stopMusic() {
  if (currentTrack) {
    currentTrack.pause();
    currentTrack.currentTime = 0;
    isPlaying = false;
  }
}

/**
 * Toggle music on/off
 * @returns {boolean} New music enabled state
 */
export function toggleMusic() {
  musicEnabled = !musicEnabled;
  
  if (musicEnabled) {
    startMusic();
  } else {
    stopMusic();
  }
  
  return musicEnabled;
}

/**
 * Initialize audio system (call after user interaction)
 */
function initAudio() {
  if (!audioInitialized) {
    audioInitialized = true;
    console.log("Music player audio initialization completed");
  }
}