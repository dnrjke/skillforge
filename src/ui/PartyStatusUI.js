// 파티 현황판 UI (유니콘 오버로드 스타일)
// 좌하단: 아군 현황판 / 우하단: 적군 현황판
// HTML/CSS 기반, z-index: 20 (패시브 알림보다 낮음)

export default class PartyStatusUI {
    constructor(scene, battleManager, options = {}) {
        this.scene = scene;
        this.battleManager = battleManager;

        // 설정
        this.isEnemy = options.isEnemy || false;
        this.maxSlots = options.maxSlots || 6; // 3x2 그리드
        this.activeSlots = options.activeSlots || [1, 2, 4]; // 실제 배치된 슬롯 인덱스

        // DOM 요소
        this.containerElement = null;
        this.unitElements = new Map(); // unitId -> DOM element

        // 상태 추적 (애니메이션용)
        this.previousHp = new Map();

        // 모바일 감지
        this.isMobile = this.detectMobile();

        this.create();
        this.setupEventListeners();
    }

    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    }

    create() {
        // 스타일 주입 (한 번만)
        this.injectStyles();

        // 메인 컨테이너 생성
        this.containerElement = document.createElement('div');
        this.containerElement.className = `party-status-board ${this.isEnemy ? 'enemy' : 'ally'}`;

        // 그리드 컨테이너
        const gridContainer = document.createElement('div');
        gridContainer.className = 'party-grid';

        // 3x2 그리드 슬롯 생성 (후열/중열/전열 x 상/하)
        // 아군: 왼쪽이 후열, 오른쪽이 전열
        // 적군: 오른쪽이 후열, 왼쪽이 전열 (미러링)
        for (let row = 0; row < 2; row++) {
            for (let col = 0; col < 3; col++) {
                const slotIndex = row * 3 + col;
                const slot = document.createElement('div');
                slot.className = 'party-slot';
                slot.dataset.slotIndex = slotIndex;

                // 빈 슬롯 표시
                slot.innerHTML = `<div class="slot-empty"></div>`;

                gridContainer.appendChild(slot);
            }
        }

        this.containerElement.appendChild(gridContainer);

        // 파티 전체 정보 (리더 패널 영역)
        const partyInfo = document.createElement('div');
        partyInfo.className = 'party-info';
        partyInfo.innerHTML = `
            <div class="party-label">${this.isEnemy ? 'ENEMY' : 'ALLY'}</div>
            <div class="party-hp-total">
                <span class="total-current">0</span>/<span class="total-max">0</span>
            </div>
        `;
        this.containerElement.appendChild(partyInfo);

        // ui-overlay에 추가
        const uiOverlay = document.getElementById('ui-overlay');
        uiOverlay.appendChild(this.containerElement);

        // 초기 유닛 렌더링
        this.renderUnits();
    }

    injectStyles() {
        if (document.getElementById('party-status-style')) return;

        const style = document.createElement('style');
        style.id = 'party-status-style';
        style.textContent = `
            /* 파티 현황판 메인 컨테이너 */
            .party-status-board {
                position: absolute;
                z-index: 20;
                pointer-events: none;
                display: flex;
                flex-direction: column;
                gap: 8px;
                padding: 10px;
                background: linear-gradient(
                    135deg,
                    rgba(20, 25, 35, 0.92),
                    rgba(15, 20, 30, 0.88)
                );
                border: 2px solid rgba(120, 140, 170, 0.6);
                border-radius: 8px;
                box-shadow:
                    0 0 15px rgba(0, 0, 0, 0.5),
                    inset 0 0 20px rgba(80, 100, 140, 0.1),
                    inset 0 1px 0 rgba(255, 255, 255, 0.05);
                backdrop-filter: blur(4px);
            }

            /* 아군 - 좌하단 */
            .party-status-board.ally {
                left: 2%;
                bottom: 3%;
            }

            /* 적군 - 우하단 */
            .party-status-board.enemy {
                right: 2%;
                bottom: 3%;
            }

            /* 적군 그리드는 좌우 반전 */
            .party-status-board.enemy .party-grid {
                direction: rtl;
            }

            .party-status-board.enemy .party-slot {
                direction: ltr;
            }

            /* 그리드 컨테이너 */
            .party-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                grid-template-rows: repeat(2, 1fr);
                gap: 4px;
            }

            /* 개별 슬롯 */
            .party-slot {
                width: 70px;
                height: 50px;
                background: rgba(30, 35, 50, 0.6);
                border: 1px solid rgba(80, 90, 110, 0.4);
                border-radius: 4px;
                position: relative;
                overflow: hidden;
            }

            /* 빈 슬롯 */
            .slot-empty {
                width: 100%;
                height: 100%;
                background: repeating-linear-gradient(
                    45deg,
                    transparent,
                    transparent 5px,
                    rgba(50, 60, 80, 0.2) 5px,
                    rgba(50, 60, 80, 0.2) 10px
                );
            }

            /* 유닛이 배치된 슬롯 */
            .party-slot.occupied {
                border-color: rgba(100, 120, 150, 0.6);
                background: linear-gradient(
                    180deg,
                    rgba(40, 50, 70, 0.8),
                    rgba(25, 30, 45, 0.9)
                );
            }

            .party-slot.occupied.enemy-unit {
                border-color: rgba(150, 80, 80, 0.6);
                background: linear-gradient(
                    180deg,
                    rgba(60, 40, 45, 0.8),
                    rgba(35, 25, 30, 0.9)
                );
            }

            /* 유닛 컨텐츠 */
            .unit-content {
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                padding: 3px;
            }

            /* 초상화 영역 */
            .unit-portrait {
                width: 24px;
                height: 24px;
                background: rgba(60, 70, 90, 0.8);
                border: 1px solid rgba(100, 110, 130, 0.5);
                border-radius: 3px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                color: #aabbcc;
                position: absolute;
                top: 3px;
                left: 3px;
            }

            .unit-portrait.enemy-portrait {
                background: rgba(90, 60, 65, 0.8);
                border-color: rgba(130, 90, 95, 0.5);
                color: #ffaaaa;
            }

            /* HP 데이터 영역 */
            .unit-hp-data {
                position: absolute;
                top: 3px;
                right: 3px;
                text-align: right;
                font-family: 'Consolas', 'Monaco', monospace;
            }

            .hp-value {
                font-size: 13px;
                font-weight: bold;
                color: #66dd66;
                text-shadow:
                    -1px -1px 0 #000,
                    1px -1px 0 #000,
                    -1px 1px 0 #000,
                    1px 1px 0 #000;
                transition: all 0.3s ease;
            }

            .hp-value.enemy-hp {
                color: #ff8888;
            }

            .hp-value.low-hp {
                color: #ffaa44;
            }

            .hp-value.critical-hp {
                color: #ff4444;
                animation: criticalPulse 0.5s ease-in-out infinite;
            }

            /* HP 변동 애니메이션 */
            .hp-value.hp-changed {
                transform: scale(1.3);
                color: #ffffff;
            }

            .hp-value.hp-damage {
                color: #ff4444 !important;
                transform: scale(1.4);
            }

            .hp-value.hp-heal {
                color: #44ff88 !important;
                transform: scale(1.3);
            }

            /* HP 바 */
            .unit-hp-bar {
                position: absolute;
                bottom: 3px;
                left: 3px;
                right: 3px;
                height: 6px;
                background: rgba(20, 20, 30, 0.8);
                border: 1px solid rgba(60, 70, 90, 0.6);
                border-radius: 2px;
                overflow: hidden;
            }

            .hp-bar-fill {
                height: 100%;
                background: linear-gradient(
                    180deg,
                    #66ee66,
                    #44aa44
                );
                transition: width 0.4s ease-out;
                box-shadow: 0 0 4px rgba(100, 238, 100, 0.4);
            }

            .hp-bar-fill.enemy-bar {
                background: linear-gradient(
                    180deg,
                    #ee6666,
                    #aa4444
                );
                box-shadow: 0 0 4px rgba(238, 100, 100, 0.4);
            }

            .hp-bar-fill.low-hp {
                background: linear-gradient(180deg, #eeaa44, #aa7722);
            }

            .hp-bar-fill.critical-hp {
                background: linear-gradient(180deg, #ee4444, #aa2222);
                animation: barPulse 0.5s ease-in-out infinite;
            }

            /* 파티 정보 */
            .party-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 4px 8px;
                background: rgba(40, 50, 70, 0.5);
                border-radius: 4px;
                border: 1px solid rgba(80, 90, 110, 0.3);
            }

            .party-label {
                font-family: Arial, sans-serif;
                font-size: 11px;
                font-weight: bold;
                color: rgba(150, 170, 200, 0.8);
                letter-spacing: 1px;
            }

            .enemy .party-label {
                color: rgba(200, 150, 150, 0.8);
            }

            .party-hp-total {
                font-family: 'Consolas', 'Monaco', monospace;
                font-size: 12px;
                color: #88aacc;
            }

            .party-hp-total .total-current {
                color: #66dd66;
                font-weight: bold;
            }

            .enemy .party-hp-total .total-current {
                color: #ff8888;
            }

            /* 애니메이션 */
            @keyframes criticalPulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.6; }
            }

            @keyframes barPulse {
                0%, 100% { filter: brightness(1); }
                50% { filter: brightness(1.3); }
            }

            /* 모바일 대응 */
            @media (max-width: 768px) {
                .party-status-board {
                    padding: 6px;
                    gap: 4px;
                }

                .party-status-board.ally {
                    left: 1%;
                    bottom: 2%;
                }

                .party-status-board.enemy {
                    right: 1%;
                    bottom: 2%;
                }

                .party-slot {
                    width: 55px;
                    height: 40px;
                }

                .unit-portrait {
                    width: 18px;
                    height: 18px;
                    font-size: 10px;
                }

                .hp-value {
                    font-size: 11px;
                }

                .unit-hp-bar {
                    height: 4px;
                }

                .party-info {
                    padding: 2px 4px;
                }

                .party-label {
                    font-size: 9px;
                }

                .party-hp-total {
                    font-size: 10px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    renderUnits() {
        const units = this.isEnemy
            ? this.battleManager.enemies
            : this.battleManager.allies;

        // 슬롯과 유닛 매핑
        // activeSlots: [1, 2, 4] -> 후열하, 중열상, 전열상
        // 그리드 인덱스 매핑:
        // 0(후열상), 1(중열상), 2(전열상)
        // 3(후열하), 4(중열하), 5(전열하)
        const slotMapping = {
            1: 3,  // 후열 하 -> 그리드 인덱스 3
            2: 1,  // 중열 상 -> 그리드 인덱스 1
            4: 2   // 전열 상 -> 그리드 인덱스 2
        };

        const slots = this.containerElement.querySelectorAll('.party-slot');

        units.forEach((unit, unitIndex) => {
            const activeSlotIndex = this.activeSlots[unitIndex];
            const gridIndex = slotMapping[activeSlotIndex];
            const slot = slots[gridIndex];

            if (!slot) return;

            // 슬롯에 유닛 배치
            slot.classList.add('occupied');
            if (this.isEnemy) {
                slot.classList.add('enemy-unit');
            }

            // 유닛 컨텐츠 생성
            const unitContent = document.createElement('div');
            unitContent.className = 'unit-content';
            unitContent.innerHTML = `
                <div class="unit-portrait ${this.isEnemy ? 'enemy-portrait' : ''}">
                    ${this.getUnitIcon(unit, unitIndex)}
                </div>
                <div class="unit-hp-data">
                    <span class="hp-value ${this.isEnemy ? 'enemy-hp' : ''}">${unit.currentHp}/${unit.maxHp}</span>
                </div>
                <div class="unit-hp-bar">
                    <div class="hp-bar-fill ${this.isEnemy ? 'enemy-bar' : ''}" style="width: ${(unit.currentHp / unit.maxHp) * 100}%"></div>
                </div>
            `;

            // 기존 컨텐츠 교체
            slot.innerHTML = '';
            slot.appendChild(unitContent);

            // 요소 저장
            this.unitElements.set(unit.id, {
                slot: slot,
                hpValue: unitContent.querySelector('.hp-value'),
                hpBar: unitContent.querySelector('.hp-bar-fill'),
                unit: unit
            });

            // 초기 HP 저장
            this.previousHp.set(unit.id, unit.currentHp);
        });

        // 전체 HP 업데이트
        this.updateTotalHp();
    }

    getUnitIcon(unit, index) {
        // 간단한 아이콘 (나중에 실제 초상화로 교체 가능)
        const icons = ['⚔', '🔮', '🗡'];
        return icons[index % icons.length];
    }

    setupEventListeners() {
        // 주기적 업데이트 (100ms 간격)
        this.updateInterval = setInterval(() => {
            this.update();
        }, 100);
    }

    update() {
        const units = this.isEnemy
            ? this.battleManager.enemies
            : this.battleManager.allies;

        units.forEach(unit => {
            const elements = this.unitElements.get(unit.id);
            if (!elements) return;

            const prevHp = this.previousHp.get(unit.id);
            const currentHp = unit.currentHp;
            const maxHp = unit.maxHp;
            const hpRatio = currentHp / maxHp;

            // HP 변동 감지
            if (prevHp !== currentHp) {
                const isDamage = currentHp < prevHp;
                const isHeal = currentHp > prevHp;

                // HP 값 업데이트
                elements.hpValue.textContent = `${currentHp}/${maxHp}`;

                // HP 바 업데이트
                elements.hpBar.style.width = `${hpRatio * 100}%`;

                // 변동 애니메이션
                elements.hpValue.classList.add('hp-changed');
                if (isDamage) {
                    elements.hpValue.classList.add('hp-damage');
                } else if (isHeal) {
                    elements.hpValue.classList.add('hp-heal');
                }

                // 애니메이션 제거
                setTimeout(() => {
                    elements.hpValue.classList.remove('hp-changed', 'hp-damage', 'hp-heal');
                }, 300);

                // HP 저장
                this.previousHp.set(unit.id, currentHp);
            }

            // HP 상태에 따른 스타일
            elements.hpValue.classList.remove('low-hp', 'critical-hp');
            elements.hpBar.classList.remove('low-hp', 'critical-hp');

            if (hpRatio <= 0.25) {
                elements.hpValue.classList.add('critical-hp');
                elements.hpBar.classList.add('critical-hp');
            } else if (hpRatio <= 0.5) {
                elements.hpValue.classList.add('low-hp');
                elements.hpBar.classList.add('low-hp');
            }

            // 사망 처리
            if (!unit.isAlive) {
                elements.slot.style.opacity = '0.4';
                elements.slot.style.filter = 'grayscale(0.8)';
            }
        });

        // 전체 HP 업데이트
        this.updateTotalHp();
    }

    updateTotalHp() {
        const units = this.isEnemy
            ? this.battleManager.enemies
            : this.battleManager.allies;

        let totalCurrent = 0;
        let totalMax = 0;

        units.forEach(unit => {
            totalCurrent += unit.currentHp;
            totalMax += unit.maxHp;
        });

        const currentEl = this.containerElement.querySelector('.total-current');
        const maxEl = this.containerElement.querySelector('.total-max');

        if (currentEl && maxEl) {
            currentEl.textContent = totalCurrent;
            maxEl.textContent = totalMax;
        }
    }

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        if (this.containerElement && this.containerElement.parentNode) {
            this.containerElement.remove();
        }

        this.unitElements.clear();
        this.previousHp.clear();
    }
}
