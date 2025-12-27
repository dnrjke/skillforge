// 파티 현황판 UI (유니콘 오버로드 스타일)
// 입체 발판 + 캐릭터 스프라이트 + 체력바
// HTML/CSS 기반, z-index: 20

export default class PartyStatusUI {
    constructor(scene, battleManager, options = {}) {
        this.scene = scene;
        this.battleManager = battleManager;

        this.isEnemy = options.isEnemy || false;
        this.maxSlots = options.maxSlots || 6;
        this.activeSlots = options.activeSlots || [0, 1, 2, 3, 4, 5]; // 테스트용 6슬롯

        this.containerElement = null;
        this.unitElements = new Map();
        this.previousHp = new Map();

        this.isMobile = this.detectMobile();

        this.create();
        this.setupEventListeners();
    }

    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    }

    create() {
        this.injectStyles();

        // 메인 컨테이너
        this.containerElement = document.createElement('div');
        this.containerElement.className = `battlefield-panel ${this.isEnemy ? 'enemy' : 'ally'}`;

        // 보드 스프라이트 이미지
        const board = document.createElement('div');
        board.className = 'board-sprite';

        // 캐릭터 컨테이너
        const unitsContainer = document.createElement('div');
        unitsContainer.className = 'units-container';

        this.containerElement.appendChild(board);
        this.containerElement.appendChild(unitsContainer);

        const uiOverlay = document.getElementById('ui-overlay');
        uiOverlay.appendChild(this.containerElement);

        this.unitsContainer = unitsContainer;
        this.renderUnits();
    }

    injectStyles() {
        if (document.getElementById('battlefield-panel-style')) return;

        const style = document.createElement('style');
        style.id = 'battlefield-panel-style';
        style.textContent = `
            /* ===== Google Fonts ===== */
            @import url('https://fonts.googleapis.com/css2?family=Alexandria:wght@400;700&family=Almendra:wght@400;700&display=swap');

            /* ===== 글로벌 데미지 숫자 폰트 ===== */
            .damage-number, .damage-text, [class*="damage-num"] {
                font-family: 'Almendra', serif !important;
                font-weight: 700;
            }

            /* ===== 메인 패널 ===== */
            .battlefield-panel {
                position: absolute;
                z-index: 20;
                pointer-events: none;
            }

            .battlefield-panel.ally {
                left: 1%;
                bottom: 2%;
            }

            .battlefield-panel.enemy {
                right: 1%;
                bottom: 2%;
            }

            /* ===== 보드 스프라이트 ===== */
            .board-sprite {
                width: 280px;
                height: 110px;
                background-image: url('/assets/ui/UI_Tactical_Block_Stage.webp');
                background-size: contain;
                background-repeat: no-repeat;
                background-position: center;
                position: relative;
                z-index: 0;
            }

            .enemy .board-sprite {
                transform: scaleX(-1);
            }

            /* ===== 캐릭터 컨테이너 ===== */
            .units-container {
                position: absolute;
                top: 0;
                left: 0;
                width: 280px;
                height: 110px;
                pointer-events: none;
                z-index: 1;
            }

            /* 적군: 보드와 함께 유닛 컨테이너도 미러링 */
            .enemy .units-container {
                transform: scaleX(-1);
            }

            /* ===== 개별 유닛 슬롯 ===== */
            .unit-slot {
                position: absolute;
                width: 60px;
                height: 70px;
            }

            /*
             * 타일 좌표 (사용자 제공, 원본 이미지 1280x832px 기준)
             * ==========================================
             * Tile 0: (262, 440)   Tile 1: (572, 328)   Tile 2: (900, 208)
             * Tile 3: (376, 608)   Tile 4: (712, 474)   Tile 5: (1034, 352)
             *
             * 보정: X축 -20px (원본 기준) 적용
             * 보정된 좌표: (242, 440), (552, 328), (880, 208), (356, 608), (692, 474), (1014, 352)
             *
             * 변환 공식:
             *   scale = 110 / 832 = 0.1322
             *   offsetX = (280 - 1280 * scale) / 2 = 55px (중앙 정렬)
             *   CSS_X = (원본_X - 20) * scale + offsetX - 30
             *   CSS_Y = 원본_Y * scale - 48
             */

            /* 뒷줄 (0, 1, 2) */
            .unit-slot[data-pos="0"] { left: 57px; top: 10px; }
            .unit-slot[data-pos="1"] { left: 98px; top: -5px; }
            .unit-slot[data-pos="2"] { left: 141px; top: -20px; }
            /* 앞줄 (3, 4, 5) */
            .unit-slot[data-pos="3"] { left: 72px; top: 32px; }
            .unit-slot[data-pos="4"] { left: 116px; top: 15px; }
            .unit-slot[data-pos="5"] { left: 159px; top: -1px; }

            /* z-index: 보드(0) < 뒷줄(1-2) < 앞줄(3-4) */
            .unit-slot[data-pos="0"] { z-index: 1; }
            .unit-slot[data-pos="1"] { z-index: 2; }
            .unit-slot[data-pos="2"] { z-index: 1; }
            .unit-slot[data-pos="3"] { z-index: 3; }
            .unit-slot[data-pos="4"] { z-index: 4; }
            .unit-slot[data-pos="5"] { z-index: 3; }

            /* ===== 캐릭터 그림자 (발판 위, 앞쪽) ===== */
            .unit-shadow {
                position: absolute;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                width: 30px;
                height: 8px;
                background: radial-gradient(
                    ellipse at center,
                    rgba(0, 0, 0, 0.6) 0%,
                    rgba(0, 0, 0, 0.2) 60%,
                    transparent 80%
                );
                border-radius: 50%;
                z-index: 2;
            }

            /* 중앙 슬롯 그림자 확대 */
            .unit-slot[data-pos="1"] .unit-shadow,
            .unit-slot[data-pos="4"] .unit-shadow {
                width: 34px;
                height: 9px;
            }

            /* ===== 유닛 스프라이트 (발판 위에 크게) ===== */
            .unit-sprite-wrapper {
                position: absolute;
                bottom: 22px;
                left: 50%;
                transform: translateX(-50%) scale(1.3);
                transform-origin: center bottom;
                width: 32px;
                height: 32px;
                overflow: visible;
                animation: spriteFloat 2s ease-in-out infinite;
                z-index: 3;
            }

            /* 중앙 슬롯 캐릭터 1.1배 더 크게 (총 1.43배) */
            .unit-slot[data-pos="1"] .unit-sprite-wrapper,
            .unit-slot[data-pos="4"] .unit-sprite-wrapper {
                transform: translateX(-50%) scale(1.43);
            }

            .unit-sprite {
                width: 32px;
                height: 32px;
                background-image: url('/assets/char/knight_a.png');
                background-repeat: no-repeat;
                image-rendering: pixelated;
                image-rendering: crisp-edges;
                background-position: 0 -96px;
                animation: spriteIdle 0.5s steps(1) infinite;
                filter: drop-shadow(1px 2px 1px rgba(0, 0, 0, 0.9));
            }

            .unit-sprite.enemy-sprite {
                transform: scaleX(-1);
                filter: drop-shadow(-1px 2px 1px rgba(0, 0, 0, 0.9))
                        sepia(0.3) hue-rotate(-30deg) saturate(1.3);
            }

            @keyframes spriteIdle {
                0%   { background-position: 0px -96px; }
                25%  { background-position: -32px -96px; }
                50%  { background-position: -64px -96px; }
                75%  { background-position: -96px -96px; }
                100% { background-position: 0px -96px; }
            }

            @keyframes spriteFloat {
                0%, 100% { transform: translateX(-50%) scale(1.3) translateY(0); }
                50% { transform: translateX(-50%) scale(1.3) translateY(-2px); }
            }

            /* 중앙 슬롯 플로팅 애니메이션 */
            .unit-slot[data-pos="1"] .unit-sprite-wrapper,
            .unit-slot[data-pos="4"] .unit-sprite-wrapper {
                animation: spriteFloatCenter 2s ease-in-out infinite;
            }

            @keyframes spriteFloatCenter {
                0%, 100% { transform: translateX(-50%) scale(1.43) translateY(0); }
                50% { transform: translateX(-50%) scale(1.43) translateY(-2px); }
            }

            /* ===== HP UI 컨테이너 ===== */
            .unit-hp-container {
                position: absolute;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1px;
                z-index: 10;
            }

            /* 윗줄 (0, 1, 2): 머리 위 */
            .unit-slot[data-pos="0"] .unit-hp-container,
            .unit-slot[data-pos="1"] .unit-hp-container,
            .unit-slot[data-pos="2"] .unit-hp-container {
                top: -5px;
                left: 50%;
                transform: translateX(-50%);
            }

            /* 아랫줄 (3, 4, 5): 발 아래, 오른쪽으로 이동 */
            .unit-slot[data-pos="3"] .unit-hp-container,
            .unit-slot[data-pos="4"] .unit-hp-container,
            .unit-slot[data-pos="5"] .unit-hp-container {
                bottom: -8px;
                left: 30px;
                transform: none;
            }

            /* 작은 HP바 (숫자 위에) */
            .mini-hp-bar {
                width: 46px;
                height: 4px;
                background: #080404;
                border: 1px solid #222;
                border-radius: 2px;
                overflow: hidden;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
            }

            .mini-hp-fill {
                height: 100%;
                background: linear-gradient(180deg, #6d6 0%, #4a4 100%);
                transition: width 0.3s ease;
            }

            .mini-hp-fill.enemy-hp {
                background: linear-gradient(180deg, #d66 0%, #944 100%);
            }

            .mini-hp-fill.low {
                background: linear-gradient(180deg, #da6 0%, #a74 100%);
            }

            .mini-hp-fill.critical {
                background: linear-gradient(180deg, #d44 0%, #922 100%);
                animation: hpPulse 0.4s ease-in-out infinite;
            }

            /* 큰 HP 숫자 */
            .mini-hp-text {
                font-family: 'Alexandria', sans-serif;
                font-size: 13px;
                font-weight: 700;
                color: #4e4;
                text-shadow:
                    -1px -1px 0 #000,
                    1px -1px 0 #000,
                    -1px 1px 0 #000,
                    1px 1px 0 #000,
                    0 0 4px rgba(0, 0, 0, 0.9);
                transition: all 0.15s ease;
                white-space: nowrap;
                line-height: 1.1;
                letter-spacing: -0.5px;
            }

            .mini-hp-text.enemy-text { color: #f66; }
            .mini-hp-text.low { color: #fa5; }
            .mini-hp-text.critical {
                color: #f55;
                animation: hpPulse 0.4s ease-in-out infinite;
            }

            .mini-hp-text.hp-changed {
                transform: scale(1.15);
                color: #fff !important;
            }

            .mini-hp-text.damage {
                color: #f33 !important;
                text-shadow: 0 0 6px #f00, -1px -1px 0 #000, 1px 1px 0 #000;
            }

            .mini-hp-text.heal {
                color: #3f7 !important;
                text-shadow: 0 0 6px #0f0, -1px -1px 0 #000, 1px 1px 0 #000;
            }

            /* ===== 피드백 효과 ===== */
            .unit-slot.damage-flash .unit-sprite-wrapper {
                animation: damageShake 0.25s ease;
            }

            @keyframes damageShake {
                0%, 100% { transform: translateX(-50%) translateY(0); }
                25% { transform: translateX(calc(-50% + 3px)) translateY(-1px); }
                75% { transform: translateX(calc(-50% - 3px)) translateY(1px); }
            }

            @keyframes hpPulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.6; }
            }

            /* 사망 */
            .unit-slot.dead {
                opacity: 0.4;
                filter: grayscale(0.8) brightness(0.6);
            }

            .unit-slot.dead .unit-sprite-wrapper {
                animation: none;
            }

            .unit-slot.dead .unit-sprite {
                animation: none;
                background-position: -288px 0px;
                transform: none;
            }

            .unit-slot.dead .unit-sprite.enemy-sprite {
                transform: scaleX(-1);
            }

            .unit-slot.dead .unit-shadow {
                opacity: 0.3;
            }

            /* ===== 모바일 ===== */
            @media (max-width: 768px) {
                .battlefield-panel.ally { left: 0.5%; bottom: 1%; }
                .battlefield-panel.enemy { right: 0.5%; bottom: 1%; }

                .board-sprite {
                    width: 200px;
                    height: 78px;
                }

                .units-container {
                    width: 200px;
                    height: 78px;
                }

                .unit-slot {
                    width: 48px;
                    height: 56px;
                }

                /* 모바일 타일 좌표 (200x78px, 데스크탑의 0.714배, X -20px 보정 적용) */
                .unit-slot[data-pos="0"] { left: 41px; top: 7px; }
                .unit-slot[data-pos="1"] { left: 70px; top: -4px; }
                .unit-slot[data-pos="2"] { left: 101px; top: -14px; }
                .unit-slot[data-pos="3"] { left: 51px; top: 23px; }
                .unit-slot[data-pos="4"] { left: 83px; top: 11px; }
                .unit-slot[data-pos="5"] { left: 114px; top: -1px; }

                .unit-shadow {
                    bottom: 16px;
                    width: 24px;
                    height: 6px;
                }

                .unit-sprite-wrapper {
                    bottom: 17px;
                    transform: translateX(-50%) scale(1.15);
                }

                .unit-slot[data-pos="1"] .unit-sprite-wrapper,
                .unit-slot[data-pos="4"] .unit-sprite-wrapper {
                    transform: translateX(-50%) scale(1.25);
                }

                /* 모바일 HP UI */
                .unit-slot[data-pos="0"] .unit-hp-container,
                .unit-slot[data-pos="1"] .unit-hp-container,
                .unit-slot[data-pos="2"] .unit-hp-container {
                    top: -4px;
                }

                .unit-slot[data-pos="3"] .unit-hp-container,
                .unit-slot[data-pos="4"] .unit-hp-container,
                .unit-slot[data-pos="5"] .unit-hp-container {
                    bottom: -6px;
                    left: 24px;
                }

                .mini-hp-bar { width: 38px; height: 3px; }
                .mini-hp-text { font-size: 10px; }
            }
        `;
        document.head.appendChild(style);
    }

    renderUnits() {
        const units = this.isEnemy
            ? this.battleManager.enemies
            : this.battleManager.allies;

        // 슬롯 매핑: activeSlots 값을 보드 위치로 직접 사용
        units.forEach((unit, unitIndex) => {
            const gridIndex = this.activeSlots[unitIndex];

            // 유닛 슬롯 생성
            const slot = document.createElement('div');
            slot.className = 'unit-slot';
            slot.dataset.pos = gridIndex;
            if (this.isEnemy) {
                slot.classList.add('enemy-slot');
            }

            // 캐릭터 그림자
            const shadow = document.createElement('div');
            shadow.className = 'unit-shadow';

            // HP 컨테이너 (작은 바 + 큰 숫자)
            const hpContainer = document.createElement('div');
            hpContainer.className = 'unit-hp-container';
            hpContainer.innerHTML = `
                <div class="mini-hp-bar">
                    <div class="mini-hp-fill ${this.isEnemy ? 'enemy-hp' : ''}"
                         style="width: ${(unit.currentHp / unit.maxHp) * 100}%"></div>
                </div>
                <span class="mini-hp-text ${this.isEnemy ? 'enemy-text' : ''}">${unit.currentHp}/${unit.maxHp}</span>
            `;

            // 유닛 스프라이트
            const spriteWrapper = document.createElement('div');
            spriteWrapper.className = 'unit-sprite-wrapper';
            spriteWrapper.innerHTML = `
                <div class="unit-sprite ${this.isEnemy ? 'enemy-sprite' : ''}"></div>
            `;

            slot.appendChild(shadow);
            slot.appendChild(hpContainer);
            slot.appendChild(spriteWrapper);

            this.unitsContainer.appendChild(slot);

            this.unitElements.set(unit.id, {
                slot: slot,
                hpBar: hpContainer.querySelector('.mini-hp-fill'),
                hpText: hpContainer.querySelector('.mini-hp-text'),
                sprite: spriteWrapper.querySelector('.unit-sprite'),
                unit: unit
            });

            this.previousHp.set(unit.id, unit.currentHp);
        });
    }

    setupEventListeners() {
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

            if (prevHp !== currentHp) {
                const isDamage = currentHp < prevHp;
                const isHeal = currentHp > prevHp;

                elements.hpText.textContent = `${currentHp}/${maxHp}`;
                elements.hpBar.style.width = `${hpRatio * 100}%`;

                elements.hpText.classList.add('hp-changed');

                if (isDamage) {
                    elements.hpText.classList.add('damage');
                    elements.slot.classList.add('damage-flash');
                    setTimeout(() => elements.slot.classList.remove('damage-flash'), 250);
                } else if (isHeal) {
                    elements.hpText.classList.add('heal');
                }

                setTimeout(() => {
                    elements.hpText.classList.remove('hp-changed', 'damage', 'heal');
                }, 300);

                this.previousHp.set(unit.id, currentHp);
            }

            elements.hpText.classList.remove('low', 'critical');
            elements.hpBar.classList.remove('low', 'critical');

            if (hpRatio <= 0.25) {
                elements.hpText.classList.add('critical');
                elements.hpBar.classList.add('critical');
            } else if (hpRatio <= 0.5) {
                elements.hpText.classList.add('low');
                elements.hpBar.classList.add('low');
            }

            if (!unit.isAlive) {
                elements.slot.classList.add('dead');
            }
        });
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
