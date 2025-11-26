import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Game } from './game.js';
import { UIManager } from './ui.js';

// Entry point
window.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('game-container');
    
    // Initialize UI
    const ui = new UIManager();
    
    // Initialize Game
    const game = new Game(container, ui);
    
    // Bind UI buttons
    document.getElementById('start-btn').addEventListener('click', () => {
        ui.showHUD();
        game.start();
        
        // Mobile check
        if(window.innerWidth <= 768) {
            document.getElementById('joystick-zone').style.display = 'block';
            document.getElementById('mobile-action-btn').style.display = 'flex';
        }
    });

    document.getElementById('restart-btn').addEventListener('click', () => {
        ui.showHUD();
        game.reset();
        game.start();
    });

    // Handle Window Resize
    window.addEventListener('resize', () => {
        game.onResize();
    });
});