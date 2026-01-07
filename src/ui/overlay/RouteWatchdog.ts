/**
 * Skyline Blue Route Watchdog
 *
 * 항로 현황 UI 오버레이
 * Babylon.js GUI (AdvancedDynamicTexture) 활용
 * 좌상단에 작고 투명하게 표시
 *
 * @module ui/overlay/RouteWatchdog
 */

import {
    AdvancedDynamicTexture,
    StackPanel,
    TextBlock,
    Rectangle,
    Control,
} from '@babylonjs/gui';
import { Scene } from '@babylonjs/core';
import { GameStateManager } from '../../logic/state/GameStateManager';
import {
    ConnectivityStatus,
    GRADE_DEFINITIONS,
    getEfficiencyLabel,
} from '../../config/NavigationTerms';

// ============================================
// 타입 정의
// ============================================

export interface WatchdogConfig {
    scene: Scene;
    stateManager: GameStateManager;
}

// ============================================
// Route Watchdog 클래스
// ============================================

export class RouteWatchdog {
    private advancedTexture: AdvancedDynamicTexture;
    private stateManager: GameStateManager;

    // UI 요소
    private container: Rectangle;
    private connectivityText: TextBlock;
    private waypointsText: TextBlock;
    private efficiencyText: TextBlock;
    private gradeText: TextBlock;

    // 스타일 상수
    private readonly FONT_SIZE = 14;
    private readonly PADDING = 8;
    private readonly OPACITY = 0.75;

    constructor(config: WatchdogConfig) {
        this.stateManager = config.stateManager;

        // Fullscreen UI 생성
        this.advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI(
            'watchdogUI',
            true,
            config.scene
        );

        this.container = this.createContainer();
        this.connectivityText = this.createTextBlock('connectivity');
        this.waypointsText = this.createTextBlock('waypoints');
        this.efficiencyText = this.createTextBlock('efficiency');
        this.gradeText = this.createTextBlock('grade');

        this.buildUI();
        this.update();
    }

    // ============================================
    // UI 구성
    // ============================================

    private createContainer(): Rectangle {
        const container = new Rectangle('watchdogContainer');
        container.width = '160px';
        container.height = '120px';
        container.cornerRadius = 8;
        container.thickness = 1;
        container.color = 'rgba(255, 255, 255, 0.3)';
        container.background = 'rgba(0, 0, 0, 0.5)';
        container.alpha = this.OPACITY;

        // 좌상단 배치
        container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        container.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        container.left = '10px';
        container.top = '10px';

        return container;
    }

    private createTextBlock(name: string): TextBlock {
        const text = new TextBlock(name);
        text.fontSize = this.FONT_SIZE;
        text.color = 'white';
        text.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        text.paddingLeft = `${this.PADDING}px`;
        text.height = '24px';

        return text;
    }

    private buildUI(): void {
        // 스택 패널 (세로 정렬)
        const stackPanel = new StackPanel('watchdogStack');
        stackPanel.isVertical = true;
        stackPanel.paddingTop = `${this.PADDING}px`;

        // 헤더
        const header = new TextBlock('header');
        header.text = '◈ ROUTE STATUS';
        header.fontSize = 12;
        header.color = 'rgba(255, 255, 255, 0.6)';
        header.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        header.paddingLeft = `${this.PADDING}px`;
        header.height = '20px';

        stackPanel.addControl(header);
        stackPanel.addControl(this.connectivityText);
        stackPanel.addControl(this.waypointsText);
        stackPanel.addControl(this.efficiencyText);
        stackPanel.addControl(this.gradeText);

        this.container.addControl(stackPanel);
        this.advancedTexture.addControl(this.container);
    }

    // ============================================
    // 상태 업데이트
    // ============================================

    /**
     * UI 상태 업데이트
     */
    update(): void {
        const connectivity = this.stateManager.getConnectivity();

        this.updateConnectivity(connectivity);
        this.updateWaypoints(connectivity);
        this.updateEfficiency(connectivity);
        this.updateGrade(connectivity);
    }

    private updateConnectivity(status: ConnectivityStatus): void {
        const connected = status.isConnected;
        const color = connected ? '#66ff99' : '#ff6666';

        this.connectivityText.text = `▸ Link: ${connected ? 'YES' : 'NO'}`;
        this.connectivityText.color = color;
    }

    private updateWaypoints(status: ConnectivityStatus): void {
        const { waypointsVisited, waypointsTotal } = status;
        const allVisited = waypointsVisited === waypointsTotal && waypointsTotal > 0;
        const color = allVisited ? '#66ff99' : 'white';

        this.waypointsText.text = `▸ Stops: ${waypointsVisited} / ${waypointsTotal}`;
        this.waypointsText.color = color;
    }

    private updateEfficiency(status: ConnectivityStatus): void {
        const { efficiency } = status;
        const label = getEfficiencyLabel(efficiency);

        let color = 'white';
        if (efficiency === 100) color = '#ffd700';
        else if (efficiency >= 85) color = '#66ff99';
        else if (efficiency >= 70) color = '#4a9eff';

        this.efficiencyText.text = `▸ Route: ${efficiency}% (${label})`;
        this.efficiencyText.color = color;
    }

    private updateGrade(status: ConnectivityStatus): void {
        const grade = status.grade;
        const definition = GRADE_DEFINITIONS[grade];

        this.gradeText.text = `▸ Grade: ${definition.titleEng}`;
        this.gradeText.color = definition.color;
    }

    // ============================================
    // 등급별 특수 연출
    // ============================================

    /**
     * Top 등급 달성 시 금빛 효과
     */
    showTopGradeEffect(): void {
        const grade = this.stateManager.getCurrentGrade();
        if (grade !== 'top') return;

        // 컨테이너 테두리 금빛으로
        this.container.color = GRADE_DEFINITIONS.top.color;
        this.container.thickness = 2;

        // 3초 후 원래대로
        setTimeout(() => {
            this.container.color = 'rgba(255, 255, 255, 0.3)';
            this.container.thickness = 1;
        }, 3000);
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

    toggle(): void {
        this.container.isVisible = !this.container.isVisible;
    }

    // ============================================
    // 정리
    // ============================================

    dispose(): void {
        this.advancedTexture.dispose();
    }
}
