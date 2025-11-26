export class UIManager {
    constructor() {
        this.splash = document.getElementById('splash-screen');
        this.hud = document.getElementById('hud');
        this.gameOver = document.getElementById('game-over-screen');
        this.scoreDisplay = document.getElementById('score-display');
        this.msgDisplay = document.getElementById('message-display');
        this.statsDisplay = document.getElementById('final-stats');
    }

    showSplash() {
        this.splash.classList.remove('hidden');
        this.hud.classList.add('hidden');
        this.gameOver.classList.add('hidden');
    }

    showHUD() {
        this.splash.classList.add('hidden');
        this.hud.classList.remove('hidden');
        this.gameOver.classList.add('hidden');
    }

    showGameOver(stats) {
        this.splash.classList.add('hidden');
        this.hud.classList.add('hidden');
        this.gameOver.classList.remove('hidden');
        
        this.statsDisplay.innerHTML = `
            Loot Value: $${stats.score}<br>
            Items Stolen: ${stats.items}<br>
            Time Survived: ${stats.time}s
        `;
    }

    updateScore(score) {
        this.scoreDisplay.textContent = `Loot: $${score}`;
    }

    showMessage(msg) {
        this.msgDisplay.textContent = msg;
        this.msgDisplay.style.animation = 'none';
        this.msgDisplay.offsetHeight; /* trigger reflow */
        this.msgDisplay.style.animation = 'pop 0.3s ease-out';
    }
}

