// Firebase configuration for Tetris game
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';

// Your web app's Firebase configuration
// Replace with your actual Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyBO4Pa1KgU-r_D6jCADmyg5ScA_JtzvEjI",
    authDomain: "tetris-90139.firebaseapp.com",
    projectId: "tetris-90139",
    storageBucket: "tetris-90139.firebasestorage.app",
    messagingSenderId: "73950001454",
    appId: "1:73950001454:web:f56cf5240434f3735622bf",
    measurementId: "G-BVD5QHKQ8Q"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Reference to the high scores collection
const highScoresRef = collection(db, 'highScores');

/**
 * Save a high score to Firebase
 * 
 * @param {string} playerName - Player's name
 * @param {number} score - Player's score
 * @param {number} level - Final level reached
 * @param {number} clearedLines - Number of lines cleared
 * @param {string} time - Formatted game time
 * @returns {Promise<Array>} Promise resolving to updated high scores array
 */
export async function saveHighScore(playerName, score, level, clearedLines, time) {
  try {
    // Add the high score document to Firebase
    await addDoc(highScoresRef, {
      player_name: playerName || "UNKNOWN",
      score: score,
      level: level,
      cleared_lines: clearedLines,
      time: time,
      date: new Date().toISOString()
    });

    // Return the updated high scores list
    return await loadHighScores();
  } catch (error) {
    console.error("Error saving high score to Firebase:", error);
    return [];
  }
}

/**
 * Load high scores from Firebase
 * 
 * @returns {Promise<Array>} Promise resolving to high scores array
 */
export async function loadHighScores() {
  try {
    // Create a query to get the top 10 scores, ordered by score descending
    const q = query(highScoresRef, orderBy('score', 'desc'), limit(20));
    
    // Get the documents
    const querySnapshot = await getDocs(q);
    
    // Map the documents to an array of high score objects
    const highScores = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        player_name: data.player_name,
        score: data.score,
        level: data.level,
        cleared_lines: data.cleared_lines,
        time: data.time,
        date: data.date
      };
    });
    
    return highScores;
  } catch (error) {
    console.error("Error loading high scores from Firebase:", error);
    return [];
  }
}