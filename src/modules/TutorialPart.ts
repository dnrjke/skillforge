/**
 * Skyline Blue Tutorial Part Module
 *
 * PlayPart를 참조/상속하여 튜토리얼 전용 가이드와 제약 사항을 추가
 *
 * @module modules/TutorialPart
 */

import { PlayPart, PlayPartConfig, StageData } from './PlayPart';
import {
    AdvancedDynamicTexture,
    TextBlock,
    Rectangle,
    Control,
} from '@babylonjs/gui';

// ============================================
// 타입 정의
// ============================================

export interface TutorialStep {
    id: string;
    message: string;
    messageKo: string;
    highlightNodeId?: string;
    requiredAction?: 'select_node' | 'complete_route' | 'launch';
    targetNodeId?: string;
}

export interface TutorialPartConfig extends PlayPartConfig {
    steps?: TutorialStep[];
    onTutorialComplete?: () => void;
}

// ============================================
// Tutorial Part 클래스
// ============================================

export class TutorialPart extends PlayPart {
    private tutorialSteps: TutorialStep[] = [];
    private currentStepIndex: number = 0;
    private tutorialUI: AdvancedDynamicTexture;
    private messageBox: Rectangle;
    private messageText: TextBlock;
    private onTutorialComplete?: () => void;

    constructor(config: TutorialPartConfig) {
        super(config);

        this.tutorialSteps = config.steps ?? this.getDefaultSteps();
        this.onTutorialComplete = config.onTutorialComplete;

        // 튜토리얼 UI 초기화
        this.tutorialUI = AdvancedDynamicTexture.CreateFullscreenUI(
            'tutorialUI',
            true,
            this.navigationScene.getScene()
        );

        this.messageBox = this.createMessageBox();
        this.messageText = this.createMessageText();

        this.buildTutorialUI();
    }

    // ============================================
    // 튜토리얼 UI 구성
    // ============================================

    private createMessageBox(): Rectangle {
        const box = new Rectangle('tutorialMessageBox');
        box.width = '320px';
        box.height = '100px';
        box.cornerRadius = 12;
        box.thickness = 2;
        box.color = 'rgba(100, 200, 255, 0.8)';
        box.background = 'rgba(0, 0, 20, 0.9)';

        // 상단 중앙
        box.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        box.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        box.top = '80px';

        return box;
    }

    private createMessageText(): TextBlock {
        const text = new TextBlock('tutorialText');
        text.fontSize = 16;
        text.color = 'white';
        text.textWrapping = true;
        text.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        text.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        text.paddingLeft = '16px';
        text.paddingRight = '16px';

        return text;
    }

    private buildTutorialUI(): void {
        this.messageBox.addControl(this.messageText);
        this.tutorialUI.addControl(this.messageBox);
    }

    // ============================================
    // 튜토리얼 스텝 관리
    // ============================================

    private getDefaultSteps(): TutorialStep[] {
        return [
            {
                id: 'welcome',
                message: 'Welcome to Flight Path Planning!\nTap nodes to create your route.',
                messageKo: '항로 설정에 오신 것을 환영합니다!\n노드를 탭하여 경로를 만드세요.',
            },
            {
                id: 'start_explained',
                message: 'The blue node at the bottom is your START point.\nIt\'s already selected.',
                messageKo: '하단의 파란 노드가 시작점입니다.\n이미 선택되어 있어요.',
                highlightNodeId: 'start',
            },
            {
                id: 'select_first',
                message: 'Tap an adjacent node to extend your route.',
                messageKo: '인접한 노드를 탭하여 경로를 확장하세요.',
                requiredAction: 'select_node',
            },
            {
                id: 'continue_path',
                message: 'Great! Keep connecting nodes toward the goal.',
                messageKo: '잘했어요! 목표를 향해 계속 연결하세요.',
                requiredAction: 'select_node',
            },
            {
                id: 'reach_end',
                message: 'Connect to the red node at the top to complete!',
                messageKo: '상단의 빨간 노드에 연결하면 완료!',
                requiredAction: 'complete_route',
                highlightNodeId: 'end',
            },
            {
                id: 'launch',
                message: 'Route complete! Tap the launch button to start flight.',
                messageKo: '경로 완성! 버튼을 눌러 비행을 시작하세요.',
                requiredAction: 'launch',
            },
        ];
    }

    /**
     * 현재 스텝 메시지 표시
     */
    private showCurrentStep(): void {
        const step = this.tutorialSteps[this.currentStepIndex];
        if (!step) {
            this.completeTutorial();
            return;
        }

        // 메시지 표시 (한글 우선)
        this.messageText.text = step.messageKo || step.message;

        // 하이라이트 노드가 있으면 강조
        if (step.highlightNodeId) {
            // TODO: 노드 하이라이트 효과
        }
    }

    /**
     * 다음 스텝으로 진행
     */
    private advanceStep(): void {
        this.currentStepIndex++;

        if (this.currentStepIndex >= this.tutorialSteps.length) {
            this.completeTutorial();
        } else {
            this.showCurrentStep();
        }
    }

    /**
     * 튜토리얼 완료
     */
    private completeTutorial(): void {
        console.log('[Tutorial] Complete!');

        this.messageText.text = '튜토리얼 완료!\nTutorial Complete!';

        setTimeout(() => {
            this.messageBox.isVisible = false;
            this.onTutorialComplete?.();
        }, 2000);
    }

    // ============================================
    // 이벤트 오버라이드
    // ============================================

    protected override onNodeSelected(nodeId: string): void {
        super.onNodeSelected(nodeId);

        // 튜토리얼 스텝 진행 확인
        const currentStep = this.tutorialSteps[this.currentStepIndex];

        if (currentStep?.requiredAction === 'select_node') {
            if (!currentStep.targetNodeId || currentStep.targetNodeId === nodeId) {
                this.advanceStep();
            }
        }
    }

    protected override onRouteComplete(): void {
        super.onRouteComplete();

        // 경로 완성 스텝
        const currentStep = this.tutorialSteps[this.currentStepIndex];

        if (currentStep?.requiredAction === 'complete_route') {
            this.advanceStep();
        }
    }

    protected override onLaunch(): void {
        super.onLaunch();

        // 발사 스텝
        const currentStep = this.tutorialSteps[this.currentStepIndex];

        if (currentStep?.requiredAction === 'launch') {
            this.advanceStep();
        }
    }

    // ============================================
    // 튜토리얼 전용 스테이지
    // ============================================

    /**
     * 간단한 튜토리얼 스테이지 로드
     */
    loadTutorialStage(): void {
        // 단순한 3행 구조
        const tutorialStage: StageData = {
            nodes: [
                // 시작
                { id: 'start', type: 'start', x: 0.5, y: 0.15, row: 0 },

                // 경유지 (2개)
                { id: 'w1', type: 'waypoint', x: 0.35, y: 0.45, row: 1 },
                { id: 'w2', type: 'waypoint', x: 0.65, y: 0.45, row: 1 },

                // 도착
                { id: 'end', type: 'end', x: 0.5, y: 0.75, row: 2 },
            ],
            edges: [
                { fromId: 'start', toId: 'w1' },
                { fromId: 'start', toId: 'w2' },
                { fromId: 'w1', toId: 'w2' },
                { fromId: 'w1', toId: 'end' },
                { fromId: 'w2', toId: 'end' },
            ],
        };

        this.loadStage(tutorialStage);
    }

    // ============================================
    // 공개 메서드 오버라이드
    // ============================================

    override start(): void {
        super.start();
        this.currentStepIndex = 0;
        this.messageBox.isVisible = true;
        this.showCurrentStep();
    }

    override reset(): void {
        super.reset();
        this.currentStepIndex = 0;
        this.showCurrentStep();
    }

    override dispose(): void {
        super.dispose();
        this.tutorialUI.dispose();
    }

    // ============================================
    // 스텝 스킵 (디버그/스킵 버튼용)
    // ============================================

    /**
     * 전체 튜토리얼 스킵
     */
    skipTutorial(): void {
        this.completeTutorial();
    }

    /**
     * 현재 스텝 스킵
     */
    skipCurrentStep(): void {
        this.advanceStep();
    }
}
