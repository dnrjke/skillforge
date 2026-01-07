/**
 * Skyline Blue Game State Manager
 *
 * 게임 단계 및 성공 등급 관리
 * 항로 완성 여부에 따른 버튼 활성화 상태 트리거
 *
 * @module logic/state/GameStateManager
 */

import { DijkstraEngine } from '../path/DijkstraEngine';
import { SuccessGrade, ConnectivityStatus, GRADE_DEFINITIONS } from '../../config/NavigationTerms';
import { NarrativeStep, ButtonState, getButtonState } from '../../config/LaunchSequence';

// ============================================
// 타입 정의
// ============================================

/**
 * 게임 페이즈
 */
export type GamePhase = 'navigation' | 'flight' | 'result';

/**
 * 게임 상태 스냅샷
 */
export interface GameStateSnapshot {
    phase: GamePhase;
    narrativeStep: NarrativeStep;
    connectivity: ConnectivityStatus;
    buttonState: ButtonState;
    canLaunch: boolean;
}

/**
 * 상태 변경 이벤트
 */
export interface StateChangeEvent {
    type: 'grade_change' | 'route_complete' | 'route_incomplete' | 'button_enabled' | 'button_disabled';
    previousGrade?: SuccessGrade;
    currentGrade?: SuccessGrade;
}

/**
 * 상태 변경 리스너
 */
export type StateChangeListener = (event: StateChangeEvent) => void;

// ============================================
// Game State Manager 클래스
// ============================================

export class GameStateManager {
    private engine: DijkstraEngine;
    private currentPhase: GamePhase = 'navigation';
    private currentNarrativeStep: NarrativeStep = 'step1';
    private previousGrade: SuccessGrade = 'none';
    private specialConditionMet: boolean = false;
    private listeners: StateChangeListener[] = [];

    constructor(engine: DijkstraEngine) {
        this.engine = engine;
    }

    // ============================================
    // 상태 업데이트
    // ============================================

    /**
     * 상태 업데이트 (매 프레임 또는 노드 선택 시 호출)
     */
    update(): void {
        const currentGrade = this.engine.evaluateGrade();

        // 등급 변경 감지
        if (currentGrade !== this.previousGrade) {
            this.emitEvent({
                type: 'grade_change',
                previousGrade: this.previousGrade,
                currentGrade,
            });

            // 항로 완성/미완성 이벤트
            if (this.previousGrade === 'none' && currentGrade !== 'none') {
                this.emitEvent({ type: 'route_complete' });
                this.emitEvent({ type: 'button_enabled' });
            } else if (this.previousGrade !== 'none' && currentGrade === 'none') {
                this.emitEvent({ type: 'route_incomplete' });
                this.emitEvent({ type: 'button_disabled' });
            }

            this.previousGrade = currentGrade;
        }
    }

    // ============================================
    // 상태 조회
    // ============================================

    /**
     * 현재 상태 스냅샷 반환
     */
    getState(): GameStateSnapshot {
        const isRouteComplete = this.engine.isRouteComplete();
        const currentGrade = this.engine.evaluateGrade();
        const isTopGrade = currentGrade === 'top';
        const waypointCount = this.engine.getWaypointCount();

        const connectivity: ConnectivityStatus = {
            isConnected: isRouteComplete,
            waypointsVisited: waypointCount.visited,
            waypointsTotal: waypointCount.total,
            efficiency: this.engine.getEfficiency(),
            grade: currentGrade,
        };

        const buttonState = getButtonState(
            isRouteComplete,
            this.currentNarrativeStep,
            isTopGrade,
            this.specialConditionMet
        );

        return {
            phase: this.currentPhase,
            narrativeStep: this.currentNarrativeStep,
            connectivity,
            buttonState,
            canLaunch: buttonState.isEnabled,
        };
    }

    /**
     * 연결 상태 조회
     */
    getConnectivity(): ConnectivityStatus {
        return this.getState().connectivity;
    }

    /**
     * 버튼 상태 조회
     */
    getButtonState(): ButtonState {
        return this.getState().buttonState;
    }

    /**
     * 현재 등급 조회
     */
    getCurrentGrade(): SuccessGrade {
        return this.engine.evaluateGrade();
    }

    /**
     * 등급 정의 조회
     */
    getGradeDefinition(): typeof GRADE_DEFINITIONS[SuccessGrade] {
        return GRADE_DEFINITIONS[this.getCurrentGrade()];
    }

    // ============================================
    // 상태 설정
    // ============================================

    /**
     * 게임 페이즈 설정
     */
    setPhase(phase: GamePhase): void {
        this.currentPhase = phase;
    }

    /**
     * 서사 단계 설정
     */
    setNarrativeStep(step: NarrativeStep): void {
        this.currentNarrativeStep = step;
    }

    /**
     * Special 조건 충족 설정
     */
    setSpecialConditionMet(met: boolean): void {
        this.specialConditionMet = met;
    }

    // ============================================
    // 게임 액션
    // ============================================

    /**
     * 비행 시작 (항로 완성 시)
     * @returns 비행 시작 가능 여부
     */
    launchFlight(): boolean {
        const state = this.getState();

        if (!state.canLaunch) {
            return false;
        }

        this.setPhase('flight');
        return true;
    }

    /**
     * 항로 설정으로 돌아가기
     */
    returnToNavigation(): void {
        this.setPhase('navigation');
    }

    /**
     * 결과 화면으로 이동
     */
    showResult(): void {
        this.setPhase('result');
    }

    // ============================================
    // 이벤트 시스템
    // ============================================

    /**
     * 리스너 등록
     */
    addListener(listener: StateChangeListener): void {
        this.listeners.push(listener);
    }

    /**
     * 리스너 제거
     */
    removeListener(listener: StateChangeListener): void {
        const index = this.listeners.indexOf(listener);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    /**
     * 이벤트 발생
     */
    private emitEvent(event: StateChangeEvent): void {
        for (const listener of this.listeners) {
            listener(event);
        }
    }

    // ============================================
    // 디버그
    // ============================================

    /**
     * 디버그 정보 출력
     */
    debugLog(): void {
        const state = this.getState();
        console.log('=== GameStateManager Debug ===');
        console.log('Phase:', state.phase);
        console.log('Narrative Step:', state.narrativeStep);
        console.log('Connectivity:', state.connectivity);
        console.log('Button State:', state.buttonState);
        console.log('Can Launch:', state.canLaunch);
    }
}
