// 파티 현황판 UI (유니콘 오버로드 스타일 + Classic RPG 감성)
// 미니어처 전장 그리드 + 유닛 아이콘 + 체력바
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

        // 메인 컨테이너 (Gothic 프레임)
        this.containerElement = document.createElement('div');
        this.containerElement.className = `battlefield-panel ${this.isEnemy ? 'enemy' : 'ally'}`;

        // 헤더 (팀 레이블) - Gothic 장식
        const header = document.createElement('div');
        header.className = 'panel-header';
        header.innerHTML = `
            <span class="corner-deco tl">◆</span>
            <span class="team-label">${this.isEnemy ? '— ENEMY —' : '— ALLY —'}</span>
            <span class="corner-deco tr">◆</span>
        `;
        this.containerElement.appendChild(header);

        // 전장 그리드
        const gridWrapper = document.createElement('div');
        gridWrapper.className = 'grid-wrapper';

        for (let col = 0; col < 3; col++) {
            const column = document.createElement('div');
            column.className = `grid-column col-${col}`;

            for (let row = 0; row < 2; row++) {
                const slotIndex = row * 3 + col;
                const tile = document.createElement('div');
                tile.className = 'grid-tile';
                tile.dataset.slotIndex = slotIndex;
                column.appendChild(tile);
            }

            gridWrapper.appendChild(column);
        }

        this.containerElement.appendChild(gridWrapper);

        // 푸터 (총 HP)
        const footer = document.createElement('div');
        footer.className = 'panel-footer';
        footer.innerHTML = `
            <span class="corner-deco bl">◆</span>
            <div class="total-hp">
                <span class="hp-icon">❤</span>
                <span class="total-current">0</span>
                <span class="hp-slash">/</span>
                <span class="total-max">0</span>
            </div>
            <span class="corner-deco br">◆</span>
        `;
        this.containerElement.appendChild(footer);

        const uiOverlay = document.getElementById('ui-overlay');
        uiOverlay.appendChild(this.containerElement);

        this.renderUnits();
    }

    injectStyles() {
        if (document.getElementById('battlefield-panel-style')) return;

        const style = document.createElement('style');
        style.id = 'battlefield-panel-style';
        style.textContent = `
            /* ===== Google Fonts - 픽셀/중세 폰트 ===== */
            @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

            /* ===== 메인 패널 (Gothic 금속 프레임) ===== */
            .battlefield-panel {
                position: absolute;
                z-index: 20;
                pointer-events: none;
                display: flex;
                flex-direction: column;
                padding: 0;
                background: transparent;
            }

            .battlefield-panel.ally {
                left: 1.5%;
                bottom: 2%;
            }

            .battlefield-panel.enemy {
                right: 1.5%;
                bottom: 2%;
            }

            /* ===== 헤더 (Gothic 장식) ===== */
            .panel-header {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 4px;
                padding: 3px 8px;
                background: linear-gradient(
                    180deg,
                    rgba(60, 50, 40, 0.95) 0%,
                    rgba(40, 32, 25, 0.98) 50%,
                    rgba(50, 40, 32, 0.95) 100%
                );
                border: 2px solid #8b7355;
                border-bottom: none;
                border-radius: 6px 6px 0 0;
                box-shadow:
                    inset 0 1px 0 rgba(255, 220, 180, 0.15),
                    inset 0 -2px 4px rgba(0, 0, 0, 0.4),
                    0 -2px 8px rgba(0, 0, 0, 0.3);
                position: relative;
            }

            .team-label {
                font-family: 'Press Start 2P', monospace;
                font-size: 8px;
                color: #d4c4a8;
                text-shadow:
                    1px 1px 0 #000,
                    -1px -1px 0 #000,
                    0 2px 4px rgba(0, 0, 0, 0.5);
                letter-spacing: 1px;
            }

            .enemy .team-label {
                color: #e8a8a8;
            }

            .corner-deco {
                font-size: 8px;
                color: #a08060;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
            }

            .enemy .corner-deco {
                color: #a06060;
            }

            /* ===== 그리드 래퍼 ===== */
            .grid-wrapper {
                display: flex;
                gap: 3px;
                padding: 6px;
                background: linear-gradient(
                    145deg,
                    rgba(45, 38, 30, 0.95) 0%,
                    rgba(35, 28, 22, 0.98) 100%
                );
                border: 2px solid #8b7355;
                border-top: 1px solid #6b5545;
                border-bottom: 1px solid #6b5545;
                box-shadow:
                    inset 0 2px 8px rgba(0, 0, 0, 0.5),
                    inset 0 -2px 8px rgba(0, 0, 0, 0.3),
                    0 4px 12px rgba(0, 0, 0, 0.4);
                transform: perspective(200px) rotateX(12deg);
                transform-origin: center bottom;
            }

            .enemy .grid-wrapper {
                flex-direction: row-reverse;
            }

            /* ===== 그리드 열 ===== */
            .grid-column {
                display: flex;
                flex-direction: column;
                gap: 3px;
            }

            .grid-column.col-0 { transform: translateY(3px); }
            .grid-column.col-1 { transform: translateY(0px); }
            .grid-column.col-2 { transform: translateY(-3px); }

            /* ===== 그리드 타일 ===== */
            .grid-tile {
                width: 52px;
                height: 48px;
                position: relative;
                background: linear-gradient(
                    135deg,
                    rgba(55, 45, 35, 0.6) 0%,
                    rgba(40, 32, 25, 0.7) 100%
                );
                border: 1px solid rgba(100, 80, 60, 0.4);
                border-radius: 2px;
                box-shadow:
                    inset 1px 1px 0 rgba(255, 220, 180, 0.05),
                    inset -1px -1px 0 rgba(0, 0, 0, 0.2);
            }

            /* 빈 타일 패턴 (양피지 질감) */
            .grid-tile:not(.occupied) {
                background:
                    repeating-linear-gradient(
                        45deg,
                        transparent,
                        transparent 3px,
                        rgba(80, 65, 50, 0.2) 3px,
                        rgba(80, 65, 50, 0.2) 6px
                    ),
                    linear-gradient(135deg, rgba(50, 40, 32, 0.5), rgba(40, 32, 25, 0.6));
            }

            /* 유닛이 있는 타일 */
            .grid-tile.occupied {
                background: linear-gradient(
                    145deg,
                    rgba(60, 55, 45, 0.85) 0%,
                    rgba(45, 40, 32, 0.9) 100%
                );
                border-color: rgba(140, 120, 90, 0.6);
                box-shadow:
                    inset 2px 2px 4px rgba(255, 220, 180, 0.08),
                    inset -2px -2px 4px rgba(0, 0, 0, 0.3),
                    0 2px 4px rgba(0, 0, 0, 0.2);
            }

            .grid-tile.occupied.enemy-tile {
                background: linear-gradient(
                    145deg,
                    rgba(70, 45, 45, 0.85) 0%,
                    rgba(50, 35, 35, 0.9) 100%
                );
                border-color: rgba(160, 100, 100, 0.6);
            }

            /* ===== 유닛 스프라이트 ===== */
            .unit-sprite-wrapper {
                position: absolute;
                bottom: 4px;
                left: 50%;
                transform: translateX(-50%);
                width: 32px;
                height: 32px;
                overflow: hidden;
            }

            .unit-sprite {
                width: 32px;
                height: 32px;
                background-image: url('/assets/char/knight_a.png');
                background-repeat: no-repeat;
                image-rendering: pixelated;
                image-rendering: crisp-edges;
                /* idle animation: row 3 (y=96), frames 0-3 */
                background-position: 0 -96px;
                animation: spriteIdle 0.5s steps(1) infinite;
                filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.7));
            }

            .unit-sprite.enemy-sprite {
                transform: scaleX(-1);
                filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.7))
                        sepia(0.3) hue-rotate(-30deg) saturate(1.3);
            }

            /* idle 애니메이션: 프레임 30-33 (row 3, cols 0-3) */
            @keyframes spriteIdle {
                0%   { background-position: 0px -96px; }
                25%  { background-position: -32px -96px; }
                50%  { background-position: -64px -96px; }
                75%  { background-position: -96px -96px; }
                100% { background-position: 0px -96px; }
            }

            /* 부드러운 부유 효과 */
            .unit-sprite-wrapper {
                animation: spriteFloat 2s ease-in-out infinite;
            }

            @keyframes spriteFloat {
                0%, 100% { transform: translateX(-50%) translateY(0); }
                50% { transform: translateX(-50%) translateY(-2px); }
            }

            /* ===== HP 바 ===== */
            .unit-hp-container {
                position: absolute;
                top: 3px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1px;
            }

            .mini-hp-bar {
                width: 40px;
                height: 6px;
                background: linear-gradient(180deg, #1a1510 0%, #2a2018 100%);
                border: 1px solid #5a4a3a;
                border-radius: 1px;
                overflow: hidden;
                box-shadow:
                    inset 0 1px 2px rgba(0, 0, 0, 0.5);
            }

            .mini-hp-fill {
                height: 100%;
                background: linear-gradient(
                    180deg,
                    #6a6 0%,
                    #4a4 50%,
                    #5a5 100%
                );
                transition: width 0.3s ease;
                box-shadow:
                    inset 0 1px 0 rgba(255, 255, 255, 0.3),
                    0 0 4px rgba(100, 200, 100, 0.3);
            }

            .mini-hp-fill.enemy-hp {
                background: linear-gradient(180deg, #a66 0%, #844 50%, #955 100%);
                box-shadow:
                    inset 0 1px 0 rgba(255, 255, 255, 0.3),
                    0 0 4px rgba(200, 100, 100, 0.3);
            }

            .mini-hp-fill.low {
                background: linear-gradient(180deg, #a84 0%, #863 50%, #974 100%);
            }

            .mini-hp-fill.critical {
                background: linear-gradient(180deg, #a44 0%, #822 50%, #933 100%);
                animation: hpPulse 0.4s ease-in-out infinite;
            }

            .mini-hp-text {
                font-family: 'Press Start 2P', monospace;
                font-size: 7px;
                color: #b8d8b8;
                text-shadow:
                    1px 1px 0 #000,
                    -1px -1px 0 #000;
                transition: all 0.2s ease;
            }

            .mini-hp-text.enemy-text { color: #d8b8b8; }
            .mini-hp-text.low { color: #d8c088; }
            .mini-hp-text.critical { color: #d88888; }

            .mini-hp-text.hp-changed {
                transform: scale(1.5);
                color: #fff !important;
            }

            .mini-hp-text.damage {
                color: #f44 !important;
                text-shadow: 0 0 6px #f00, 1px 1px 0 #000;
            }

            .mini-hp-text.heal {
                color: #4f8 !important;
                text-shadow: 0 0 6px #0f0, 1px 1px 0 #000;
            }

            /* ===== 피드백 효과 ===== */
            .grid-tile.damage-flash {
                animation: damageFlash 0.25s ease;
            }

            .grid-tile.damage-flash .unit-sprite-wrapper {
                animation: damageShake 0.25s ease;
            }

            @keyframes damageFlash {
                0%, 100% { filter: brightness(1); }
                50% {
                    filter: brightness(1.5);
                    box-shadow: inset 0 0 15px rgba(255, 80, 60, 0.6);
                }
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
            .grid-tile.dead {
                opacity: 0.35;
                filter: grayscale(0.9) brightness(0.7);
            }

            .grid-tile.dead .unit-sprite-wrapper {
                animation: none;
            }

            .grid-tile.dead .unit-sprite {
                animation: none;
                /* death frame: row 0, last frame */
                background-position: -288px 0px;
                transform: none;
                opacity: 0.7;
            }

            .grid-tile.dead .unit-sprite.enemy-sprite {
                transform: scaleX(-1);
            }

            /* ===== 푸터 ===== */
            .panel-footer {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 4px;
                padding: 4px 8px;
                background: linear-gradient(
                    180deg,
                    rgba(50, 40, 32, 0.95) 0%,
                    rgba(40, 32, 25, 0.98) 50%,
                    rgba(55, 45, 35, 0.95) 100%
                );
                border: 2px solid #8b7355;
                border-top: none;
                border-radius: 0 0 6px 6px;
                box-shadow:
                    inset 0 2px 4px rgba(0, 0, 0, 0.3),
                    inset 0 -1px 0 rgba(255, 220, 180, 0.1),
                    0 4px 8px rgba(0, 0, 0, 0.3);
            }

            .total-hp {
                display: flex;
                align-items: center;
                gap: 3px;
                font-family: 'Press Start 2P', monospace;
                font-size: 8px;
            }

            .hp-icon {
                color: #c44;
                text-shadow: 0 0 4px rgba(200, 60, 60, 0.5);
                font-size: 10px;
            }

            .total-current {
                color: #8c8;
                text-shadow: 1px 1px 0 #000;
            }

            .enemy .total-current {
                color: #c88;
            }

            .hp-slash {
                color: #887;
            }

            .total-max {
                color: #998;
                text-shadow: 1px 1px 0 #000;
            }

            /* ===== 모바일 ===== */
            @media (max-width: 768px) {
                .battlefield-panel.ally { left: 1%; bottom: 1%; }
                .battlefield-panel.enemy { right: 1%; bottom: 1%; }

                .panel-header { padding: 2px 6px; }
                .team-label { font-size: 6px; }
                .corner-deco { font-size: 6px; }

                .grid-wrapper {
                    gap: 2px;
                    padding: 4px;
                    transform: perspective(180px) rotateX(10deg);
                }

                .grid-column { gap: 2px; }
                .grid-column.col-0 { transform: translateY(2px); }
                .grid-column.col-2 { transform: translateY(-2px); }

                .grid-tile {
                    width: 38px;
                    height: 36px;
                }

                .unit-sprite-wrapper {
                    width: 24px;
                    height: 24px;
                    bottom: 3px;
                }

                .unit-sprite {
                    width: 32px;
                    height: 32px;
                    transform: scale(0.75);
                    transform-origin: top left;
                }

                .unit-sprite.enemy-sprite {
                    transform: scale(0.75) scaleX(-1);
                    transform-origin: top right;
                }

                .unit-hp-container { top: 2px; }
                .mini-hp-bar { width: 30px; height: 4px; }
                .mini-hp-text { font-size: 6px; }

                .panel-footer { padding: 3px 6px; }
                .total-hp { font-size: 6px; gap: 2px; }
                .hp-icon { font-size: 8px; }
            }
        `;
        document.head.appendChild(style);
    }

    renderUnits() {
        const units = this.isEnemy
            ? this.battleManager.enemies
            : this.battleManager.allies;

        const slotMapping = {
            1: 1,  // 후열 하
            2: 2,  // 중열 상
            4: 4   // 전열 상
        };

        const tiles = this.containerElement.querySelectorAll('.grid-tile');

        units.forEach((unit, unitIndex) => {
            const activeSlotIndex = this.activeSlots[unitIndex];
            const gridIndex = slotMapping[activeSlotIndex];
            const tile = tiles[gridIndex];

            if (!tile) return;

            tile.classList.add('occupied');
            if (this.isEnemy) {
                tile.classList.add('enemy-tile');
            }

            // HP 컨테이너
            const hpContainer = document.createElement('div');
            hpContainer.className = 'unit-hp-container';
            hpContainer.innerHTML = `
                <div class="mini-hp-bar">
                    <div class="mini-hp-fill ${this.isEnemy ? 'enemy-hp' : ''}"
                         style="width: ${(unit.currentHp / unit.maxHp) * 100}%"></div>
                </div>
                <span class="mini-hp-text ${this.isEnemy ? 'enemy-text' : ''}">${unit.currentHp}</span>
            `;

            // 유닛 스프라이트 (실제 게임 캐릭터)
            const spriteWrapper = document.createElement('div');
            spriteWrapper.className = 'unit-sprite-wrapper';
            spriteWrapper.innerHTML = `
                <div class="unit-sprite ${this.isEnemy ? 'enemy-sprite' : ''}"></div>
            `;

            tile.appendChild(hpContainer);
            tile.appendChild(spriteWrapper);

            this.unitElements.set(unit.id, {
                tile: tile,
                hpBar: hpContainer.querySelector('.mini-hp-fill'),
                hpText: hpContainer.querySelector('.mini-hp-text'),
                sprite: spriteWrapper.querySelector('.unit-sprite'),
                unit: unit
            });

            this.previousHp.set(unit.id, unit.currentHp);
        });

        this.updateTotalHp();
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

                elements.hpText.textContent = currentHp;
                elements.hpBar.style.width = `${hpRatio * 100}%`;

                elements.hpText.classList.add('hp-changed');

                if (isDamage) {
                    elements.hpText.classList.add('damage');
                    elements.tile.classList.add('damage-flash');
                    setTimeout(() => elements.tile.classList.remove('damage-flash'), 250);
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
                elements.tile.classList.add('dead');
            }
        });

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
