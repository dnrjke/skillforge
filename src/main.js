import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import BattleScene from './scenes/BattleScene.js';

// iOS Safari 주소표시줄 숨기기 (스크롤 트릭)
function hideAddressBar() {
    // iOS Safari는 스크롤 시 주소표시줄이 자동으로 숨겨짐
    // 페이지 로드 후 약간 스크롤하여 강제로 주소표시줄 숨김
    setTimeout(() => {
        window.scrollTo(0, 1);
        // 다시 원래 위치로 (하지만 주소표시줄은 숨겨진 상태 유지)
        setTimeout(() => {
            window.scrollTo(0, 0);
        }, 50);
    }, 100);
}

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
hideAddressBar(); // iOS Safari 주소표시줄 숨기기
preventOverscroll();
setupFullscreenOnFirstTouch();

const game = new Phaser.Game(config);

// 리사이즈/회전 시에도 주소표시줄 숨기기 재시도
window.addEventListener('resize', () => {
    hideAddressBar();
});

window.addEventListener('orientationchange', () => {
    hideAddressBar();
});
