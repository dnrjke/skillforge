import Phaser from 'phaser';
import BootScene from './autobattle/scenes/BootScene.js';
import BattleScene from './autobattle/scenes/BattleScene.js';
import PlatformerBootScene from './platformer/scenes/PlatformerBootScene';
import PlatformerScene from './platformer/scenes/PlatformerScene';

// 게임 모드 감지 (URL 파라미터로 전환)
// ?mode=platformer → 플랫포머 모드
// ?mode=battle (기본) → 자동전투 모드
function getGameMode() {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') || 'battle';
}

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

// 컨테이너 기반 Fullscreen (Canvas + HTML UI 모두 포함) - PC 전용
export function requestContainerFullscreen() {
    // 모바일에서는 Fullscreen API를 호출하지 않음
    // (Fullscreen API 호출이 오히려 주소표시줄을 나타나게 함)
    // 초기 로드 시 이미 주소표시줄이 숨겨진 상태를 유지
    if (isMobileDevice()) {
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

// 게임 모드에 따른 씬 선택
function getScenes() {
    const mode = getGameMode();
    if (mode === 'platformer') {
        return [PlatformerBootScene, PlatformerScene];
    }
    return [BootScene, BattleScene];
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
    scene: getScenes()
};

// 모바일 최적화 초기화
preventOverscroll();

const game = new Phaser.Game(config);
