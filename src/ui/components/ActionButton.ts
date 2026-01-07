/**
 * Skyline Blue Action Button
 *
 * Take Wing / Sync Start / Vector Thrust / Manifest 가변 버튼
 * 하단 중앙 배치, 항로 완성 시 활성화
 *
 * @module ui/components/ActionButton
 */

import {
    AdvancedDynamicTexture,
    Button,
    TextBlock,
    Rectangle,
    Control,
    StackPanel,
} from '@babylonjs/gui';
import { Scene } from '@babylonjs/core';
import { GameStateManager } from '../../logic/state/GameStateManager';
import { ButtonState, STEP_DEFINITIONS } from '../../config/LaunchSequence';

// ============================================
// 타입 정의
// ============================================

export interface ActionButtonConfig {
    scene: Scene;
    stateManager: GameStateManager;
    onLaunch?: () => void;
}

// ============================================
// Action Button 클래스
// ============================================

export class ActionButton {
    private advancedTexture: AdvancedDynamicTexture;
    private stateManager: GameStateManager;
    private onLaunch?: () => void;

    // UI 요소
    private container: Rectangle;
    private button: Button;
    private mainText: TextBlock;
    private subText: TextBlock;

    // 상태
    private currentState: ButtonState | null = null;

    constructor(config: ActionButtonConfig) {
        this.stateManager = config.stateManager;
        this.onLaunch = config.onLaunch;

        // Fullscreen UI 생성
        this.advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI(
            'actionButtonUI',
            true,
            config.scene
        );

        this.container = this.createContainer();
        this.button = this.createButton();
        this.mainText = this.createMainText();
        this.subText = this.createSubText();

        this.buildUI();
        this.update();
    }

    // ============================================
    // UI 구성
    // ============================================

    private createContainer(): Rectangle {
        const container = new Rectangle('actionButtonContainer');
        container.width = '200px';
        container.height = '80px';

        // 하단 중앙 배치
        container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        container.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        container.top = '-30px';

        container.thickness = 0;

        return container;
    }

    private createButton(): Button {
        const button = Button.CreateSimpleButton('launchButton', '');
        button.width = '180px';
        button.height = '60px';
        button.cornerRadius = 30;
        button.thickness = 2;
        button.color = 'white';
        button.background = 'rgba(74, 158, 255, 0.8)';

        button.onPointerClickObservable.add(() => {
            this.handleClick();
        });

        // 호버 효과
        button.onPointerEnterObservable.add(() => {
            if (this.currentState?.isEnabled) {
                button.background = 'rgba(74, 158, 255, 1)';
            }
        });

        button.onPointerOutObservable.add(() => {
            this.updateButtonStyle();
        });

        return button;
    }

    private createMainText(): TextBlock {
        const text = new TextBlock('mainText');
        text.fontSize = 18;
        text.fontWeight = 'bold';
        text.color = 'white';
        text.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        text.height = '30px';

        return text;
    }

    private createSubText(): TextBlock {
        const text = new TextBlock('subText');
        text.fontSize = 12;
        text.color = 'rgba(255, 255, 255, 0.7)';
        text.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        text.height = '20px';

        return text;
    }

    private buildUI(): void {
        // 버튼 내부 스택 패널
        const stackPanel = new StackPanel('buttonStack');
        stackPanel.isVertical = true;
        stackPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;

        stackPanel.addControl(this.mainText);
        stackPanel.addControl(this.subText);

        this.button.addControl(stackPanel);
        this.container.addControl(this.button);
        this.advancedTexture.addControl(this.container);
    }

    // ============================================
    // 상태 업데이트
    // ============================================

    /**
     * 버튼 상태 업데이트
     */
    update(): void {
        const newState = this.stateManager.getButtonState();

        // 상태 변경 시에만 업데이트
        if (this.hasStateChanged(newState)) {
            this.currentState = newState;
            this.updateButtonText();
            this.updateButtonStyle();
        }
    }

    private hasStateChanged(newState: ButtonState): boolean {
        if (!this.currentState) return true;

        return (
            this.currentState.isEnabled !== newState.isEnabled ||
            this.currentState.currentStep !== newState.currentStep ||
            this.currentState.isSpecialAvailable !== newState.isSpecialAvailable
        );
    }

    private updateButtonText(): void {
        if (!this.currentState) return;

        // 메인 텍스트: 영문
        this.mainText.text = this.currentState.displayText;

        // 서브 텍스트: 한글
        this.subText.text = this.currentState.displayTextKo;
    }

    private updateButtonStyle(): void {
        if (!this.currentState) return;

        const step = STEP_DEFINITIONS[this.currentState.currentStep];
        const { primaryColor } = step.visualStyle;

        if (this.currentState.isEnabled) {
            // 활성화 상태
            this.button.isEnabled = true;
            this.button.alpha = 1;
            this.button.background = primaryColor;
            this.button.color = 'white';

            // Special 상태면 금빛 테두리
            if (this.currentState.isSpecialAvailable) {
                this.button.thickness = 3;
                this.button.color = '#ffd700';
            } else {
                this.button.thickness = 2;
                this.button.color = 'white';
            }
        } else {
            // 비활성화 상태
            this.button.isEnabled = false;
            this.button.alpha = 0.5;
            this.button.background = 'rgba(100, 100, 100, 0.5)';
            this.button.color = 'rgba(255, 255, 255, 0.5)';
            this.button.thickness = 1;
        }
    }

    // ============================================
    // 클릭 처리
    // ============================================

    private handleClick(): void {
        if (!this.currentState?.isEnabled) return;

        // 비행 시작
        const launched = this.stateManager.launchFlight();

        if (launched) {
            this.playLaunchAnimation();
            this.onLaunch?.();
        }
    }

    /**
     * 발사 애니메이션
     */
    private playLaunchAnimation(): void {
        if (!this.currentState) return;

        // 버튼 확대 후 페이드
        // (Babylon.js GUI 애니메이션으로 구현 가능하나 여기선 간단히 처리)
        this.button.scaleX = 1.1;
        this.button.scaleY = 1.1;

        setTimeout(() => {
            this.button.scaleX = 1;
            this.button.scaleY = 1;
        }, 200);
    }

    // ============================================
    // 특수 효과
    // ============================================

    /**
     * Special 버튼 활성화 시 금빛 펄스 효과
     */
    showSpecialPulse(): void {
        if (!this.currentState?.isSpecialAvailable) return;

        // 금빛 펄스 (반복)
        let pulseCount = 0;
        const maxPulse = 3;

        const pulse = () => {
            if (pulseCount >= maxPulse) return;

            this.button.thickness = 5;
            setTimeout(() => {
                this.button.thickness = 3;
                pulseCount++;
                setTimeout(pulse, 300);
            }, 150);
        };

        pulse();
    }

    // ============================================
    // 표시/숨김
    // ============================================

    show(): void {
        this.container.isVisible = true;
    }

    hide(): void {
        this.container.isVisible = false;
    }

    // ============================================
    // 정리
    // ============================================

    dispose(): void {
        this.advancedTexture.dispose();
    }
}
