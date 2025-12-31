/**
 * Skillforge Alpha - Entry Point
 *
 * 키워드 조합 기반 자동전투 RPG
 * - 브레이브 프론티어의 시각적 쾌감
 * - 유니콘 오버로드의 전략적 논리
 */

import { Game } from './core/Game';

// 전역 참조 (디버깅용)
declare global {
    interface Window {
        skillforge: {
            game: Game;
        };
    }
}

/**
 * 애플리케이션 초기화
 */
async function initializeApp(): Promise<void> {
    console.log('╔════════════════════════════════════════╗');
    console.log('║     SKILLFORGE ALPHA - Initializing    ║');
    console.log('╚════════════════════════════════════════╝');

    try {
        // 게임 인스턴스 생성
        const game = Game.getInstance();

        // 전역 참조 등록 (디버깅용)
        window.skillforge = { game };

        // 초기화
        await game.initialize();

        // 게임 루프 시작
        game.run();

        console.log('[App] Skillforge Alpha is ready!');
        console.log('[App] Access game via window.skillforge.game');

    } catch (error) {
        console.error('[App] Failed to initialize:', error);

        // 에러 표시
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            padding: 20px;
            background: rgba(100, 0, 0, 0.9);
            color: white;
            font-family: monospace;
            border-radius: 8px;
            z-index: 9999;
            text-align: center;
        `;
        errorDiv.innerHTML = `
            <h2>Initialization Error</h2>
            <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
            <p style="font-size: 12px; color: #aaa;">Check console for details</p>
        `;
        document.body.appendChild(errorDiv);
    }
}

// DOM 로드 완료 후 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
