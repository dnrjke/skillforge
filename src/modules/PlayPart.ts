/**
 * Skyline Blue Play Part Module
 *
 * 항로 선택 게임의 핵심 모듈
 * 모든 요소를 결합한 실제 플레이 파트
 *
 * Logic + View + UI 통합
 *
 * @module modules/PlayPart
 */

import { DijkstraEngine, NodeType } from '../logic/path/DijkstraEngine';
import { GameStateManager } from '../logic/state/GameStateManager';
import { NavigationScene } from '../view/scene/NavigationScene';
import { RouteWatchdog } from '../ui/overlay/RouteWatchdog';
import { ActionButton } from '../ui/components/ActionButton';
import { SuccessGrade } from '../config/NavigationTerms';
import { NarrativeStep } from '../config/LaunchSequence';

// ============================================
// 타입 정의
// ============================================

export interface PlayPartConfig {
    canvas: HTMLCanvasElement;
    narrativeStep?: NarrativeStep;
    onComplete?: (grade: SuccessGrade) => void;
    onLaunch?: () => void;
}

export interface NodeDefinition {
    id: string;
    type: NodeType;
    x: number;  // 0-1
    y: number;  // 0-1 (0=하단, 1=상단)
    row: number;
}

export interface EdgeDefinition {
    fromId: string;
    toId: string;
}

export interface StageData {
    nodes: NodeDefinition[];
    edges: EdgeDefinition[];
}

// ============================================
// Play Part 클래스
// ============================================

export class PlayPart {
    protected engine: DijkstraEngine;
    protected stateManager: GameStateManager;
    protected navigationScene: NavigationScene;
    protected watchdog: RouteWatchdog;
    protected actionButton: ActionButton;

    protected config: PlayPartConfig;
    protected isActive: boolean = false;

    constructor(config: PlayPartConfig) {
        this.config = config;

        // Logic 레이어 초기화
        this.engine = new DijkstraEngine();
        this.stateManager = new GameStateManager(this.engine);

        if (config.narrativeStep) {
            this.stateManager.setNarrativeStep(config.narrativeStep);
        }

        // View 레이어 초기화
        this.navigationScene = new NavigationScene({
            canvas: config.canvas,
            engine: this.engine,
            onNodeSelected: this.onNodeSelected.bind(this),
            onRouteComplete: this.onRouteComplete.bind(this),
        });

        // UI 레이어 초기화
        this.watchdog = new RouteWatchdog({
            scene: this.navigationScene.getScene(),
            stateManager: this.stateManager,
        });

        this.actionButton = new ActionButton({
            scene: this.navigationScene.getScene(),
            stateManager: this.stateManager,
            onLaunch: this.onLaunch.bind(this),
        });

        // 상태 변경 리스너
        this.stateManager.addListener((event) => {
            this.handleStateChange(event);
        });
    }

    // ============================================
    // 스테이지 로드
    // ============================================

    /**
     * 스테이지 데이터 로드
     */
    loadStage(data: StageData): void {
        // 노드 추가
        for (const nodeDef of data.nodes) {
            this.engine.addNode({
                id: nodeDef.id,
                type: nodeDef.type,
                x: nodeDef.x,
                y: nodeDef.y,
                row: nodeDef.row,
                adjacentIds: [],
                isSelected: false,
            });
        }

        // 엣지 추가
        for (const edgeDef of data.edges) {
            this.engine.addEdge(edgeDef.fromId, edgeDef.toId);
        }

        // 씬 빌드
        this.navigationScene.build();
    }

    /**
     * 기본 테스트 스테이지 생성
     */
    loadDefaultStage(): void {
        // 5행 구조: 시작(1) → 경유(2) → 경유(2) → 경유(2) → 도착(1)
        const stageData: StageData = {
            nodes: [
                // 행 0: 시작점 (하단)
                { id: 'start', type: 'start', x: 0.5, y: 0.1, row: 0 },

                // 행 1: 경유지
                { id: 'w1_1', type: 'waypoint', x: 0.3, y: 0.3, row: 1 },
                { id: 'w1_2', type: 'waypoint', x: 0.7, y: 0.3, row: 1 },

                // 행 2: 경유지
                { id: 'w2_1', type: 'waypoint', x: 0.25, y: 0.5, row: 2 },
                { id: 'w2_2', type: 'waypoint', x: 0.5, y: 0.5, row: 2 },
                { id: 'w2_3', type: 'waypoint', x: 0.75, y: 0.5, row: 2 },

                // 행 3: 경유지
                { id: 'w3_1', type: 'waypoint', x: 0.3, y: 0.7, row: 3 },
                { id: 'w3_2', type: 'waypoint', x: 0.7, y: 0.7, row: 3 },

                // 행 4: 도착점 (상단)
                { id: 'end', type: 'end', x: 0.5, y: 0.9, row: 4 },
            ],
            edges: [
                // 시작 → 행1
                { fromId: 'start', toId: 'w1_1' },
                { fromId: 'start', toId: 'w1_2' },

                // 행1 → 행2
                { fromId: 'w1_1', toId: 'w2_1' },
                { fromId: 'w1_1', toId: 'w2_2' },
                { fromId: 'w1_2', toId: 'w2_2' },
                { fromId: 'w1_2', toId: 'w2_3' },

                // 행2 → 행3
                { fromId: 'w2_1', toId: 'w3_1' },
                { fromId: 'w2_2', toId: 'w3_1' },
                { fromId: 'w2_2', toId: 'w3_2' },
                { fromId: 'w2_3', toId: 'w3_2' },

                // 행3 → 도착
                { fromId: 'w3_1', toId: 'end' },
                { fromId: 'w3_2', toId: 'end' },

                // 수평 연결 (같은 행 내)
                { fromId: 'w1_1', toId: 'w1_2' },
                { fromId: 'w2_1', toId: 'w2_2' },
                { fromId: 'w2_2', toId: 'w2_3' },
                { fromId: 'w3_1', toId: 'w3_2' },
            ],
        };

        this.loadStage(stageData);
    }

    // ============================================
    // 이벤트 핸들러
    // ============================================

    protected onNodeSelected(nodeId: string): void {
        console.log(`[PlayPart] Node selected: ${nodeId}`);

        // 상태 업데이트
        this.stateManager.update();

        // UI 업데이트
        this.watchdog.update();
        this.actionButton.update();
    }

    protected onRouteComplete(): void {
        console.log('[PlayPart] Route complete!');

        const grade = this.engine.evaluateGrade();

        // Top 등급이면 특수 효과
        if (grade === 'top') {
            this.navigationScene.showTopGradeEffect();
            this.watchdog.showTopGradeEffect();
            this.actionButton.showSpecialPulse();
        }
    }

    protected onLaunch(): void {
        console.log('[PlayPart] Launch!');

        const grade = this.engine.evaluateGrade();
        this.config.onLaunch?.();
        this.config.onComplete?.(grade);
    }

    protected handleStateChange(event: { type: string }): void {
        console.log(`[PlayPart] State change: ${event.type}`);

        // UI 동기화
        this.watchdog.update();
        this.actionButton.update();
    }

    // ============================================
    // 공개 메서드
    // ============================================

    /**
     * 시작
     */
    start(): void {
        this.isActive = true;
        this.watchdog.show();
        this.actionButton.show();
    }

    /**
     * 일시 정지
     */
    pause(): void {
        this.isActive = false;
    }

    /**
     * 재개
     */
    resume(): void {
        this.isActive = true;
    }

    /**
     * 초기화
     */
    reset(): void {
        this.navigationScene.reset();
        this.stateManager.update();
        this.watchdog.update();
        this.actionButton.update();
    }

    /**
     * Undo
     */
    undo(): void {
        this.navigationScene.undo();
        this.stateManager.update();
        this.watchdog.update();
        this.actionButton.update();
    }

    /**
     * 종료
     */
    stop(): void {
        this.isActive = false;
        this.watchdog.hide();
        this.actionButton.hide();
    }

    /**
     * 리소스 정리
     */
    dispose(): void {
        this.navigationScene.dispose();
        this.watchdog.dispose();
        this.actionButton.dispose();
    }

    // ============================================
    // 접근자
    // ============================================

    getEngine(): DijkstraEngine {
        return this.engine;
    }

    getStateManager(): GameStateManager {
        return this.stateManager;
    }

    getScene(): NavigationScene {
        return this.navigationScene;
    }

    isPlaying(): boolean {
        return this.isActive;
    }
}
