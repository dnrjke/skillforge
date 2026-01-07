/**
 * Skillforge Alpha - 모바일 우선 자동전투 RPG
 *
 * MOBILE-FIRST ADAPTIVE LAYOUT
 * "태블릿은 다른 UI가 아니라, 더 여유 있는 모바일이다."
 *
 * 영감:
 * - 브레이브 프론티어 (시각적 쾌감)
 * - 유니콘 오버로드 (전략적 논리)
 *
 * 핵심 특징:
 * - 9:16 Portrait 고정 비율
 * - 논리 해상도 360x640 (스케일만 변경)
 * - 3단 레이어 시스템 (World/Display/System)
 * - CT 기반 순차 전투
 * - Exit Presentation (캐릭터 퇴장 무대)
 *
 * @version 2.0-alpha
 */

import { Game } from './core/Game';

// 전역 게임 인스턴스
let game: Game | null = null;

/**
 * 게임 초기화 및 시작
 */
async function main(): Promise<void> {
    console.log('='.repeat(60));
    console.log('  Skillforge Alpha - Mobile-First Adaptive Layout');
    console.log('  "태블릿은 다른 UI가 아니라, 더 여유 있는 모바일이다."');
    console.log('='.repeat(60));

    try {
        // 게임 인스턴스 생성
        game = Game.getInstance();

        // 초기화
        await game.initialize();

        // 게임 루프 시작
        game.run();

        // 전역 접근용 (디버그)
        (window as unknown as { game: Game }).game = game;

        console.log('[Main] Skillforge is running!');

    } catch (error) {
        console.error('[Main] Failed to start Skillforge:', error);

        // 에러 표시
        const container = document.getElementById('app-container');
        if (container) {
            container.innerHTML = `
                <div style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(0, 0, 0, 0.9);
                    color: #ff4444;
                    padding: 20px;
                    border-radius: 8px;
                    text-align: center;
                    font-family: monospace;
                ">
                    <h2>Failed to Start</h2>
                    <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
                </div>
            `;
        }
    }
}

// DOM 로드 완료 후 시작
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}

// 핫 리로드 지원 (개발용)
if (import.meta.hot) {
    import.meta.hot.accept();
    import.meta.hot.dispose(() => {
        if (game) {
            game.destroy();
            game = null;
        }
    });
}

export { game };
