// 키워드 기반 전투 시스템 - 키워드 정의
// 각 키워드는 apCost(AP 소모량)와 power(위력 가중치)를 가짐

export const Keywords = {
    // 공격 타입 키워드
    STRIKE: {
        id: 'STRIKE',
        name: '타격',
        apCost: 2,
        power: 10,
        description: '기본 물리 공격'
    },
    SLASH: {
        id: 'SLASH',
        name: '베기',
        apCost: 3,
        power: 15,
        description: '날카로운 참격'
    },
    THRUST: {
        id: 'THRUST',
        name: '찌르기',
        apCost: 2,
        power: 12,
        description: '관통하는 일격'
    },

    // 속성 키워드
    FLAME: {
        id: 'FLAME',
        name: '화염',
        apCost: 3,
        power: 8,
        description: '불꽃 속성 부여'
    },
    FROST: {
        id: 'FROST',
        name: '냉기',
        apCost: 3,
        power: 6,
        description: '얼음 속성 부여'
    },
    LIGHTNING: {
        id: 'LIGHTNING',
        name: '번개',
        apCost: 4,
        power: 10,
        description: '전격 속성 부여'
    },

    // 강화 키워드
    POWER: {
        id: 'POWER',
        name: '강타',
        apCost: 2,
        power: 8,
        description: '공격력 증폭'
    },
    SWIFT: {
        id: 'SWIFT',
        name: '신속',
        apCost: 1,
        power: 3,
        description: '빠른 공격'
    },
    HEAVY: {
        id: 'HEAVY',
        name: '중타',
        apCost: 3,
        power: 12,
        description: '묵직한 일격'
    },

    // 방어/회복 키워드
    GUARD: {
        id: 'GUARD',
        name: '방어',
        apCost: 2,
        power: 0,
        defense: 5,
        description: '방어 태세'
    },
    HEAL: {
        id: 'HEAL',
        name: '치유',
        apCost: 4,
        power: -15, // 음수 = 회복
        description: '생명력 회복'
    },

    // 특수 키워드
    MULTI: {
        id: 'MULTI',
        name: '연타',
        apCost: 2,
        power: 5,
        hits: 2,
        description: '다중 타격'
    },
    PIERCE: {
        id: 'PIERCE',
        name: '관통',
        apCost: 2,
        power: 5,
        ignoreDefense: true,
        description: '방어 무시'
    }
};

// 키워드 ID로 키워드 객체 가져오기
export function getKeyword(id) {
    return Keywords[id] || null;
}

// 키워드 목록의 총 AP 비용 계산
export function calculateTotalApCost(keywordIds) {
    return keywordIds.reduce((total, id) => {
        const keyword = getKeyword(id);
        return total + (keyword ? keyword.apCost : 0);
    }, 0);
}

// 키워드 목록의 총 위력 계산
export function calculateTotalPower(keywordIds) {
    return keywordIds.reduce((total, id) => {
        const keyword = getKeyword(id);
        return total + (keyword ? keyword.power : 0);
    }, 0);
}

export default Keywords;
