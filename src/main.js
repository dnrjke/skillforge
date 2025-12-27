import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import BattleScene from './scenes/BattleScene.js';

// 모바일 바운싱 방지 (터치 이벤트)
function preventOverscroll() {
    let startY = 0;

    document.addEventListener('touchstart', (e) => {
        startY = e.touches[0].pageY;
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
        const gameContainer = document.getElementById('game-container');
        // 게임 컨테이너 밖의 스크롤 차단
        if (!gameContainer.contains(e.target)) {
            e.preventDefault();
        }
    }, { passive: false });
}

// Fullscreen API 헬퍼
function requestFullscreen() {
    const elem = document.documentElement;

    if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(err => {
            console.log('Fullscreen request failed:', err);
        });
    } else if (elem.webkitRequestFullscreen) {
        // Safari
        elem.webkitRequestFullscreen();
    } else if (elem.mozRequestFullScreen) {
        // Firefox
        elem.mozRequestFullScreen();
    } else if (elem.msRequestFullscreen) {
        // IE/Edge
        elem.msRequestFullscreen();
    }
}

// 모바일에서 첫 터치 시 Fullscreen 시도
function setupFullscreenOnFirstTouch() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
        let firstTouch = true;

        const handleFirstTouch = () => {
            if (firstTouch) {
                firstTouch = false;
                requestFullscreen();
                // 한 번만 실행 후 리스너 제거
                document.removeEventListener('touchstart', handleFirstTouch);
                document.removeEventListener('click', handleFirstTouch);
            }
        };

        document.addEventListener('touchstart', handleFirstTouch, { once: true, passive: true });
        document.addEventListener('click', handleFirstTouch, { once: true, passive: true });
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

// 모바일 최적화 초기화
preventOverscroll();
setupFullscreenOnFirstTouch();

const game = new Phaser.Game(config);
