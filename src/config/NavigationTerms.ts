/**
 * Skyline Blue Navigation Terms Configuration
 *
 * 항로 설정 게임의 등급 시스템 및 용어 정의
 * 비행 게임에서도 참조되는 공통 문서
 *
 * @module config/NavigationTerms
 */

// ============================================
// 등급 시스템 (Grade System)
// ============================================

/**
 * 성공 등급 타입
 */
export type SuccessGrade = 'none' | 'normal' | 'high' | 'top';

/**
 * 등급별 정의 인터페이스
 */
export interface GradeDefinition {
    id: SuccessGrade;
    condition: string;
    conditionKo: string;
    titleEng: string;
    titleKor: string;
    description: string;
    emotion: string;
    color: string;
    glowColor: string;
}

/**
 * 등급 정의 테이블
 */
export const GRADE_DEFINITIONS: Record<SuccessGrade, GradeDefinition> = {
    none: {
        id: 'none',
        condition: 'Route incomplete',
        conditionKo: '항로 미완성',
        titleEng: 'Incomplete',
        titleKor: '미완성',
        description: '시작점과 도착점이 연결되지 않음',
        emotion: '미완의 비행',
        color: '#666666',
        glowColor: 'rgba(102, 102, 102, 0.3)',
    },
    normal: {
        id: 'normal',
        condition: 'Destination reached',
        conditionKo: '목적지 도착',
        titleEng: 'Flight Success',
        titleKor: '비행 성공',
        description: '시작점에서 도착점까지 연결',
        emotion: '일상의 잔잔한 성취감',
        color: '#4a9eff',
        glowColor: 'rgba(74, 158, 255, 0.4)',
    },
    high: {
        id: 'high',
        condition: 'All waypoints visited',
        conditionKo: '전 경유지 방문',
        titleEng: 'Full Course Clear',
        titleKor: '풀 코스 완주 성공',
        description: '모든 경유지를 거쳐 도착점 도달',
        emotion: '섬 전체를 눈에 담은 기쁨',
        color: '#66ff99',
        glowColor: 'rgba(102, 255, 153, 0.4)',
    },
    top: {
        id: 'top',
        condition: 'Optimal route (Dijkstra)',
        conditionKo: '최적 경로 (Dijkstra)',
        titleEng: 'Best Route Success',
        titleKor: '최적 항로 성공',
        description: '다익스트라 알고리즘 최적 경로와 일치',
        emotion: '정령과 하나가 된 듯한 완벽한 궤적',
        color: '#ffd700',
        glowColor: 'rgba(255, 215, 0, 0.5)',
    },
};

// ============================================
// 효율성 등급 (Efficiency Rating)
// ============================================

/**
 * 효율성 등급 계산
 * 다익스트라 최적값과의 거리 차이를 백분율로 표시
 *
 * @param userDistance 사용자 선택 경로의 총 거리
 * @param optimalDistance 다익스트라 최적 경로의 총 거리
 * @returns 효율성 백분율 (0-100)
 */
export function calculateEfficiency(userDistance: number, optimalDistance: number): number {
    if (optimalDistance === 0) return 100;
    if (userDistance < optimalDistance) return 100; // 불가능하지만 방어

    const efficiency = (optimalDistance / userDistance) * 100;
    return Math.round(Math.max(0, Math.min(100, efficiency)));
}

/**
 * 효율성에 따른 등급 텍스트
 */
export function getEfficiencyLabel(efficiency: number): string {
    if (efficiency === 100) return 'PERFECT';
    if (efficiency >= 95) return 'EXCELLENT';
    if (efficiency >= 85) return 'GREAT';
    if (efficiency >= 70) return 'GOOD';
    if (efficiency >= 50) return 'FAIR';
    return 'POOR';
}

// ============================================
// 연결 상태 (Connectivity Status)
// ============================================

export interface ConnectivityStatus {
    isConnected: boolean;
    waypointsVisited: number;
    waypointsTotal: number;
    efficiency: number;
    grade: SuccessGrade;
}

/**
 * 연결 상태 텍스트 생성
 */
export function formatConnectivityText(status: ConnectivityStatus): {
    connectivity: string;
    waypoints: string;
    efficiency: string;
} {
    return {
        connectivity: status.isConnected ? 'YES' : 'NO',
        waypoints: `${status.waypointsVisited} / ${status.waypointsTotal}`,
        efficiency: `${status.efficiency}%`,
    };
}

// ============================================
// 연출 파라미터 (Visual Effect Parameters)
// ============================================

export interface GradeEffectParams {
    nodeEmissiveColor: string;
    pathGlowIntensity: number;
    particleCount: number;
    soundEffect: string;
}

export const GRADE_EFFECTS: Record<SuccessGrade, GradeEffectParams> = {
    none: {
        nodeEmissiveColor: '#333333',
        pathGlowIntensity: 0.2,
        particleCount: 0,
        soundEffect: '',
    },
    normal: {
        nodeEmissiveColor: '#4a9eff',
        pathGlowIntensity: 0.5,
        particleCount: 10,
        soundEffect: 'sfx_success_normal',
    },
    high: {
        nodeEmissiveColor: '#66ff99',
        pathGlowIntensity: 0.7,
        particleCount: 25,
        soundEffect: 'sfx_success_high',
    },
    top: {
        nodeEmissiveColor: '#ffd700',
        pathGlowIntensity: 1.0,
        particleCount: 50,
        soundEffect: 'sfx_success_top',
    },
};
