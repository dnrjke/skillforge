import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import BattleScene from './scenes/BattleScene.js';

// iOS Safari 주소표시줄 숨기기 (스크롤 트릭) - AUTO 버튼 클릭 시 호출
export function hideAddressBar() {
    // iOS Safari는 스크롤 시 주소표시줄이 자동으로 숨겨짐
    // 사용자 액션(AUTO 버튼 클릭) 후 약간 스크롤하여 강제로 주소표시줄 숨김
    window.scrollTo(0, 1);
    // 다시 원래 위치로 (하지만 주소표시줄은 숨겨진 상태 유지)
    setTimeout(() => {
        window.scrollTo(0, 0);
    }, 50);
}

// 컨테이너 기반 Fullscreen (Canvas + HTML UI 모두 포함)
export function requestContainerFullscreen() {
    const gameContainer = document.getElementById('game-container');

    if (!gameContainer) {
        console.log('Game container not found');
        return;
    }

    if (gameContainer.requestFullscreen) {
        gameContainer.requestFullscreen().catch(err => {
            console.log('Fullscreen request failed:', err);
        });
    } else if (gameContainer.webkitRequestFullscreen) {
        // Safari
        gameContainer.webkitRequestFullscreen();
    } else if (gameContainer.mozRequestFullScreen) {
        // Firefox
        gameContainer.mozRequestFullScreen();
    } else if (gameContainer.msRequestFullscreen) {
        // IE/Edge
        gameContainer.msRequestFullscreen();
    }
}

// 모바일 바운싱 방지 (터치 이벤트)
function preventOverscroll() {
    document.addEventListener('touchmove', (e) => {
        const gameContainer = document.getElementById('game-container');
        // 게임 컨테이너 밖의 스크롤 차단
        if (!gameContainer.contains(e.target)) {
            e.preventDefault();
        }
    }, { passive: false });
}

// VisualViewport 대응 - 주소창 변화 시 UI 위치 재계산
function setupVisualViewportListener() {
    if (!window.visualViewport) {
        console.log('VisualViewport API not supported');
        return;
    }

    const handleViewportChange = () => {
        // iOS Safari 주소창이 나타나거나 사라질 때 실행
        const viewportHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;

        // UI 요소들의 위치 재계산 (필요 시)
        // CSS dvh를 사용하므로 대부분 자동 조정되지만,
        // 필요한 경우 추가 로직 구현 가능

        console.log(`Viewport changed: ${viewportHeight}px / ${windowHeight}px`);
    };

    window.visualViewport.addEventListener('resize', handleViewportChange);
    window.visualViewport.addEventListener('scroll', handleViewportChange);
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
setupVisualViewportListener();

const game = new Phaser.Game(config);
