import { DrawBitmapText, DrawBitmapTextSmall } from './functions.js';

// Variables that will be initialized
let ctx;
let player_name = "PLAYER";
let score = 0;
let game_state = 'game_over';
let doKeyDown;

export function initGameOver(context, scoreValue, removeMainKeyListener) {
    ctx = context;
    score = scoreValue;
    doKeyDown = removeMainKeyListener;
}

export function ShowGameOver() {
    window.removeEventListener('keydown', doKeyDown, true);
    window.addEventListener('keydown', doKeyDown_GO, true);
    
    DrawBitmapText('GAME OVER', 0, 30, 1, 0, 0);
    DrawBitmapTextSmall('PLEASE ENTER YOUR NAME', 0, 180, 1, 0, 0);
    
    ctx.font = "40px Arial";
    ctx.textAlign = "center";
    ctx.fillText(player_name, 403, 283);
    ctx.fillStyle = '#fff';
    ctx.fillText(player_name, 400, 280);
    
    DrawBitmapText('YOUR SCORE ' + score, 0, 520, 1, 1, 10);
}

function doKeyDown_GO(evt) {
    if (player_name == "PLAYER") {
        player_name = "";
    }
    
    if (evt.keyCode == 8) {
        evt.preventDefault();
        player_name = player_name.slice(0, -1);
    }

    if (evt.keyCode == 13) {
        saveHighScoreData(player_name, score);
        game_state = 'high_score';
        LoadHighScoreData();
        window.removeEventListener('keydown', doKeyDown_GO, true);
        game_state = 'game_intro';
        return game_state;
    }
    
    if ((evt.keyCode >= 64 && evt.keyCode <= 90) || 
        (evt.keyCode >= 48 && evt.keyCode <= 57) || 
        evt.keyCode == 188 || evt.keyCode == 190 || 
        evt.keyCode == 173 || evt.keyCode == 32) {
        
        player_name = player_name + String.fromCharCode(evt.keyCode);
    }
}

// In a modern JS application, we'd use fetch API instead of $.ajax for high score data
function saveHighScoreData(name, scoreVal) {
    // Store highscore in localStorage as a simple alternative to server-side storage
    const highScores = JSON.parse(localStorage.getItem('tetrisHighScores') || '[]');
    highScores.push({
        name: name,
        score: scoreVal,
        date: new Date().toISOString()
    });
    
    // Sort by score (highest first)
    highScores.sort((a, b) => b.score - a.score);
    
    // Keep only top 10
    const top10 = highScores.slice(0, 10);
    
    localStorage.setItem('tetrisHighScores', JSON.stringify(top10));
    return top10;
}

function LoadHighScoreData() {
    // Load highscores from localStorage
    return JSON.parse(localStorage.getItem('tetrisHighScores') || '[]');
}

export { player_name, saveHighScoreData, LoadHighScoreData };