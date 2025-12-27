import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import BattleScene from './scenes/BattleScene.js';

// iOS Safari 주소표시줄 숨기기 (스크롤 트릭) - AUTO 버튼 클릭 시 호출
export function hideAddressBar() {
    window.scrollTo(0, 1);
    setTimeout(() => {
        window.scrollTo(0, 0);
    }, 50);
}

// 컨테이너 기반 Fullscreen (Canvas + HTML UI 모두 포함)
export function requestContainerFullscreen() {
    const gameContainer = document.getElementById('game-container');
    if (!gameContainer) return;

    if (gameContainer.requestFullscreen) {
        gameContainer.requestFullscreen().catch(() => {});
    } else if (gameContainer.webkitRequestFullscreen) {
        gameContainer.webkitRequestFullscreen();
    } else if (gameContainer.mozRequestFullScreen) {
        gameContainer.mozRequestFullScreen();
    } else if (gameContainer.msRequestFullscreen) {
        gameContainer.msRequestFullscreen();
    }
}

const config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    parent: 'game-container',
    backgroundColor: 0x000000,
    pixelArt: true,
    dom: {
        createContainer: true
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [BootScene, BattleScene]
};

const game = new Phaser.Game(config);
