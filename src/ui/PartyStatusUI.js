// 파티 현황판 UI (유니콘 오버로드 스타일)
// 입체 발판 + 캐릭터 스프라이트 + 체력바
// HTML/CSS 기반, z-index: 20

export default class PartyStatusUI {
    constructor(scene, battleManager, options = {}) {
        this.scene = scene;
        this.battleManager = battleManager;

        this.isEnemy = options.isEnemy || false;
        this.maxSlots = options.maxSlots || 6;
        this.activeSlots = options.activeSlots || [1, 2, 4];

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

        // 메인 컨테이너 (perspective 적용)
        this.containerElement = document.createElement('div');
        this.containerElement.className = `battlefield-panel ${this.isEnemy ? 'enemy' : 'ally'}`;

        // 통합 보드 (하나의 큰 체스판 박스)
        const board = document.createElement('div');
        board.className = 'unified-board';

        // 3x2 타일 그리드 (각 타일이 사다리꼴 + 측면)
        for (let row = 0; row < 2; row++) {
            for (let col = 0; col < 3; col++) {
                const slotIndex = row * 3 + col;
                const isLightTile = (col + row) % 2 === 0;

                // 타일 컨테이너 (윗면 + 측면)
                const tileContainer = document.createElement('div');
                tileContainer.className = `tile-container tile-col-${col} tile-row-${row}`;
                tileContainer.dataset.slot = slotIndex;

                // 타일 윗면 (clip-path 사다리꼴)
                const tileTop = document.createElement('div');
                tileTop.className = `tile-top ${isLightTile ? 'tile-light' : 'tile-dark'}`;

                // 타일 측면 (두께)
                const tileSide = document.createElement('div');
                tileSide.className = `tile-side ${isLightTile ? 'side-light' : 'side-dark'}`;

                tileContainer.appendChild(tileTop);
                tileContainer.appendChild(tileSide);
                board.appendChild(tileContainer);
            }
        }

        // 캐릭터 컨테이너 (보드 위에 배치)
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

            /* ===== 메인 패널 (perspective 컨테이너) ===== */
            .battlefield-panel {
                position: absolute;
                z-index: 20;
                pointer-events: none;
                perspective: 800px;
            }

            .battlefield-panel.ally {
                left: 1%;
                bottom: 2%;
            }

            .battlefield-panel.enemy {
                right: 1%;
                bottom: 2%;
            }

            /* ===== 통합 보드 ===== */
            .unified-board {
                position: relative;
                width: 180px;
                height: 100px;
                transform: rotateX(18deg);
                transform-origin: center bottom;
                transform-style: preserve-3d;
            }

            .enemy .unified-board {
                transform: rotateX(18deg) scaleX(-1);
            }

            /* ===== 타일 컨테이너 (3x2 그리드 배치) ===== */
            .tile-container {
                position: absolute;
                width: 58px;
                height: 36px;
            }

            /* 타일 위치 (row 0 = 뒷줄, row 1 = 앞줄) */
            .tile-col-0.tile-row-0 { left: 0; top: 0; }
            .tile-col-1.tile-row-0 { left: 61px; top: 0; }
            .tile-col-2.tile-row-0 { left: 122px; top: 0; }
            .tile-col-0.tile-row-1 { left: 0; top: 38px; }
            .tile-col-1.tile-row-1 { left: 61px; top: 38px; }
            .tile-col-2.tile-row-1 { left: 122px; top: 38px; }

            /* ===== 타일 윗면 (clip-path 사다리꼴) ===== */
            .tile-top {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                border: 2px solid #1a1510;
                box-sizing: border-box;
            }

            /* 좌측 열: 오른쪽으로 기울어진 사다리꼴 (소실점 중앙) */
            .tile-col-0 .tile-top {
                clip-path: polygon(0% 0%, 90% 8%, 90% 92%, 0% 100%);
            }

            /* 중앙 열: 역사다리꼴 (윗변이 넓음) */
            .tile-col-1 .tile-top {
                clip-path: polygon(5% 8%, 95% 8%, 100% 92%, 0% 92%);
            }

            /* 우측 열: 왼쪽으로 기울어진 사다리꼴 */
            .tile-col-2 .tile-top {
                clip-path: polygon(10% 8%, 100% 0%, 100% 100%, 10% 92%);
            }

            /* 타일 색상 */
            .tile-light {
                background: linear-gradient(
                    180deg,
                    #c8b898 0%,
                    #b0a080 50%,
                    #988868 100%
                );
            }

            .tile-dark {
                background: linear-gradient(
                    180deg,
                    #4a4858 0%,
                    #3a3848 50%,
                    #2a2838 100%
                );
            }

            /* ===== 타일 측면 (12px 두께) ===== */
            .tile-side {
                position: absolute;
                bottom: -12px;
                left: 0;
                width: 100%;
                height: 12px;
                border: 2px solid #0a0808;
                border-top: none;
                box-sizing: border-box;
            }

            /* 좌측 열 측면 clip-path */
            .tile-col-0 .tile-side {
                clip-path: polygon(0% 0%, 90% 0%, 90% 100%, 0% 100%);
            }

            /* 중앙 열 측면 clip-path */
            .tile-col-1 .tile-side {
                clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%);
            }

            /* 우측 열 측면 clip-path */
            .tile-col-2 .tile-side {
                clip-path: polygon(10% 0%, 100% 0%, 100% 100%, 10% 100%);
            }

            /* 측면 색상 (윗면보다 어둡게) */
            .side-light {
                background: linear-gradient(
                    180deg,
                    #8a7858 0%,
                    #6a5838 100%
                );
            }

            .side-dark {
                background: linear-gradient(
                    180deg,
                    #2a2838 0%,
                    #1a1828 100%
                );
            }

            /* ===== 캐릭터 컨테이너 ===== */
            .units-container {
                position: absolute;
                top: 0;
                left: 0;
                width: 180px;
                height: 100px;
                pointer-events: none;
            }

            /* ===== 개별 유닛 슬롯 ===== */
            .unit-slot {
                position: absolute;
                width: 58px;
                height: 65px;
            }

            /* 슬롯 위치 (3x2 그리드, 타일에 맞춤) */
            .unit-slot[data-pos="0"] { left: 0; top: -8px; }
            .unit-slot[data-pos="1"] { left: 61px; top: -12px; }
            .unit-slot[data-pos="2"] { left: 122px; top: -8px; }
            .unit-slot[data-pos="3"] { left: 0; top: 26px; }
            .unit-slot[data-pos="4"] { left: 61px; top: 22px; }
            .unit-slot[data-pos="5"] { left: 122px; top: 26px; }

            /* 중앙 열 슬롯 강조 */
            .unit-slot[data-pos="1"],
            .unit-slot[data-pos="4"] {
                z-index: 5;
            }

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

            /* ===== HP: 큰 숫자 + 작은 바 (발판 앞면에 붙임) ===== */
            .unit-hp-container {
                position: absolute;
                bottom: 3px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1px;
                z-index: 10;
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
                .battlefield-panel {
                    perspective: 600px;
                }
                .battlefield-panel.ally { left: 0.5%; bottom: 1%; }
                .battlefield-panel.enemy { right: 0.5%; bottom: 1%; }

                .unified-board {
                    width: 140px;
                    height: 78px;
                    transform: rotateX(16deg);
                }

                .enemy .unified-board {
                    transform: rotateX(16deg) scaleX(-1);
                }

                .tile-container {
                    width: 45px;
                    height: 28px;
                }

                .tile-col-0.tile-row-0 { left: 0; top: 0; }
                .tile-col-1.tile-row-0 { left: 47px; top: 0; }
                .tile-col-2.tile-row-0 { left: 94px; top: 0; }
                .tile-col-0.tile-row-1 { left: 0; top: 30px; }
                .tile-col-1.tile-row-1 { left: 47px; top: 30px; }
                .tile-col-2.tile-row-1 { left: 94px; top: 30px; }

                .tile-side {
                    height: 10px;
                    bottom: -10px;
                }

                .units-container {
                    width: 140px;
                    height: 78px;
                }

                .unit-slot {
                    width: 45px;
                    height: 52px;
                }

                .unit-slot[data-pos="0"] { left: 0; top: -6px; }
                .unit-slot[data-pos="1"] { left: 47px; top: -10px; }
                .unit-slot[data-pos="2"] { left: 94px; top: -6px; }
                .unit-slot[data-pos="3"] { left: 0; top: 20px; }
                .unit-slot[data-pos="4"] { left: 47px; top: 16px; }
                .unit-slot[data-pos="5"] { left: 94px; top: 20px; }

                .unit-shadow {
                    bottom: 16px;
                    width: 24px;
                    height: 6px;
                }

                .unit-slot[data-pos="1"] .unit-shadow,
                .unit-slot[data-pos="4"] .unit-shadow {
                    width: 28px;
                    height: 7px;
                }

                .unit-sprite-wrapper {
                    bottom: 17px;
                    transform: translateX(-50%) scale(1.15);
                }

                .unit-slot[data-pos="1"] .unit-sprite-wrapper,
                .unit-slot[data-pos="4"] .unit-sprite-wrapper {
                    transform: translateX(-50%) scale(1.25);
                }

                @keyframes spriteFloat {
                    0%, 100% { transform: translateX(-50%) scale(1.15) translateY(0); }
                    50% { transform: translateX(-50%) scale(1.15) translateY(-1px); }
                }

                @keyframes spriteFloatCenter {
                    0%, 100% { transform: translateX(-50%) scale(1.25) translateY(0); }
                    50% { transform: translateX(-50%) scale(1.25) translateY(-1px); }
                }

                .unit-hp-container { bottom: 2px; }
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

        // 슬롯 매핑: activeSlots 값을 보드 위치로 변환
        const slotMapping = {
            1: 1,  // 중앙 뒷줄
            2: 2,  // 오른쪽 뒷줄
            4: 4   // 중앙 앞줄
        };

        units.forEach((unit, unitIndex) => {
            const activeSlotIndex = this.activeSlots[unitIndex];
            const gridIndex = slotMapping[activeSlotIndex];

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
