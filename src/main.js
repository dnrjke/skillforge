import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import BattleScene from './scenes/BattleScene.js';

// 모바일 감지
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768 && 'ontouchstart' in window);
}

// 모바일 바운싱 방지 (터치 이벤트)
function preventOverscroll() {
    document.addEventListener('touchstart', () => {}, { passive: false });

    document.addEventListener('touchmove', (e) => {
        const gameContainer = document.getElementById('game-container');
        // 게임 컨테이너 밖의 스크롤 차단
        if (!gameContainer.contains(e.target)) {
            e.preventDefault();
        }
    }, { passive: false });
}

// iOS Safari 주소표시줄 숨기기 (스크롤 트릭) - AUTO 버튼 클릭 시 호출
export function hideAddressBar() {
    if (!isMobileDevice()) return;

    // 스크롤 가능하게 임시로 설정
    const originalOverflow = document.body.style.overflow;
    const originalHeight = document.body.style.height;

    document.body.style.overflow = 'auto';
    document.body.style.height = (window.innerHeight + 1) + 'px';

    window.scrollTo(0, 1);

    setTimeout(() => {
        document.body.style.overflow = originalOverflow || 'hidden';
        document.body.style.height = originalHeight || '100%';
    }, 100);
}

// 컨테이너 기반 Fullscreen (Canvas + HTML UI 모두 포함) - PC 전용
export function requestContainerFullscreen() {
    // 모바일에서는 Fullscreen API를 사용하지 않음 (오히려 주소표시줄을 나타나게 함)
    if (isMobileDevice()) {
        hideAddressBar();
        return;
    }

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

// 모바일 최적화 초기화
preventOverscroll();

const game = new Phaser.Game(config);
