// 파티 현황판 UI (유니콘 오버로드 스타일)
// 미니어처 전장 그리드 + 유닛 스프라이트 + 체력바
// HTML/CSS 기반, z-index: 20

export default class PartyStatusUI {
    constructor(scene, battleManager, options = {}) {
        this.scene = scene;
        this.battleManager = battleManager;

        // 설정
        this.isEnemy = options.isEnemy || false;
        this.maxSlots = options.maxSlots || 6;
        this.activeSlots = options.activeSlots || [1, 2, 4];

        // DOM 요소
        this.containerElement = null;
        this.unitElements = new Map();

        // 상태 추적
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
        this.injectStyles();

        // 메인 컨테이너 (금속 프레임)
        this.containerElement = document.createElement('div');
        this.containerElement.className = `battlefield-panel ${this.isEnemy ? 'enemy' : 'ally'}`;

        // 헤더 (팀 레이블)
        const header = document.createElement('div');
        header.className = 'panel-header';
        header.innerHTML = `
            <div class="header-deco left"></div>
            <span class="team-label">${this.isEnemy ? 'ENEMY' : 'ALLY'}</span>
            <div class="header-deco right"></div>
        `;
        this.containerElement.appendChild(header);

        // 전장 그리드 (사선 투영)
        const battlefield = document.createElement('div');
        battlefield.className = 'mini-battlefield';

        // 3열 x 2행 그리드 생성 (후열/중열/전열 x 상/하)
        const gridWrapper = document.createElement('div');
        gridWrapper.className = 'grid-wrapper';

        for (let col = 0; col < 3; col++) {
            const column = document.createElement('div');
            column.className = `grid-column col-${col}`;
            column.dataset.row = ['back', 'middle', 'front'][col];

            for (let row = 0; row < 2; row++) {
                const slotIndex = row * 3 + col;
                const tile = document.createElement('div');
                tile.className = 'grid-tile';
                tile.dataset.slotIndex = slotIndex;

                // 타일 표면
                const surface = document.createElement('div');
                surface.className = 'tile-surface';
                tile.appendChild(surface);

                column.appendChild(tile);
            }

            gridWrapper.appendChild(column);
        }

        battlefield.appendChild(gridWrapper);
        this.containerElement.appendChild(battlefield);

        // 총 HP 표시
        const footer = document.createElement('div');
        footer.className = 'panel-footer';
        footer.innerHTML = `
            <div class="total-hp">
                <span class="hp-icon">♥</span>
                <span class="total-current">0</span>
                <span class="hp-divider">/</span>
                <span class="total-max">0</span>
            </div>
        `;
        this.containerElement.appendChild(footer);

        // ui-overlay에 추가
        const uiOverlay = document.getElementById('ui-overlay');
        uiOverlay.appendChild(this.containerElement);

        // 유닛 렌더링
        this.renderUnits();
    }

    injectStyles() {
        if (document.getElementById('battlefield-panel-style')) return;

        const style = document.createElement('style');
        style.id = 'battlefield-panel-style';
        style.textContent = `
            /* ===== 픽셀 폰트 정의 ===== */
            @font-face {
                font-family: 'PixelFont';
                src: local('Consolas'), local('Monaco'), local('monospace');
            }

            /* ===== 메인 패널 (금속 프레임) ===== */
            .battlefield-panel {
                position: absolute;
                z-index: 20;
                pointer-events: none;
                display: flex;
                flex-direction: column;
                padding: 6px;
                background: linear-gradient(
                    145deg,
                    rgba(45, 50, 65, 0.95),
                    rgba(30, 35, 45, 0.98)
                );
                border: 3px solid transparent;
                border-image: linear-gradient(
                    145deg,
                    #8090a0 0%,
                    #4a5568 25%,
                    #6b7a8a 50%,
                    #4a5568 75%,
                    #8090a0 100%
                ) 1;
                box-shadow:
                    0 4px 20px rgba(0, 0, 0, 0.6),
                    inset 0 1px 0 rgba(255, 255, 255, 0.1),
                    inset 0 -1px 0 rgba(0, 0, 0, 0.3);
            }

            /* 아군 - 좌하단 */
            .battlefield-panel.ally {
                left: 1.5%;
                bottom: 2%;
            }

            /* 적군 - 우하단 */
            .battlefield-panel.enemy {
                right: 1.5%;
                bottom: 2%;
            }

            /* ===== 헤더 ===== */
            .panel-header {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                padding: 4px 0;
                margin-bottom: 4px;
                border-bottom: 1px solid rgba(100, 120, 150, 0.3);
            }

            .team-label {
                font-family: 'PixelFont', monospace;
                font-size: 11px;
                font-weight: bold;
                letter-spacing: 2px;
                color: #9ab;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
            }

            .enemy .team-label {
                color: #c99;
            }

            .header-deco {
                width: 20px;
                height: 2px;
                background: linear-gradient(90deg, transparent, #667, transparent);
            }

            .enemy .header-deco {
                background: linear-gradient(90deg, transparent, #966, transparent);
            }

            /* ===== 미니 전장 ===== */
            .mini-battlefield {
                padding: 8px;
                background: linear-gradient(
                    180deg,
                    rgba(20, 25, 35, 0.9),
                    rgba(15, 20, 28, 0.95)
                );
                border: 1px solid rgba(80, 90, 110, 0.4);
                border-radius: 4px;
            }

            /* ===== 그리드 래퍼 (사선 투영) ===== */
            .grid-wrapper {
                display: flex;
                gap: 6px;
                transform: perspective(200px) rotateX(15deg);
                transform-origin: center bottom;
            }

            .enemy .grid-wrapper {
                flex-direction: row-reverse;
            }

            /* ===== 그리드 열 ===== */
            .grid-column {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            /* 열 높이 차이로 원근감 */
            .grid-column.col-0 { transform: translateY(4px); }
            .grid-column.col-1 { transform: translateY(0px); }
            .grid-column.col-2 { transform: translateY(-4px); }

            /* ===== 그리드 타일 ===== */
            .grid-tile {
                width: 58px;
                height: 52px;
                position: relative;
                transition: all 0.2s ease;
            }

            .tile-surface {
                width: 100%;
                height: 100%;
                background: linear-gradient(
                    135deg,
                    rgba(40, 50, 70, 0.7),
                    rgba(30, 38, 55, 0.8)
                );
                border: 1px solid rgba(70, 85, 110, 0.5);
                border-radius: 3px;
                box-shadow:
                    inset 0 2px 4px rgba(255, 255, 255, 0.05),
                    inset 0 -2px 4px rgba(0, 0, 0, 0.2);
            }

            /* 빈 타일 패턴 */
            .grid-tile:not(.occupied) .tile-surface {
                background:
                    repeating-linear-gradient(
                        45deg,
                        transparent,
                        transparent 4px,
                        rgba(50, 60, 80, 0.3) 4px,
                        rgba(50, 60, 80, 0.3) 8px
                    ),
                    linear-gradient(135deg, rgba(30, 38, 55, 0.6), rgba(25, 32, 48, 0.7));
            }

            /* 유닛이 있는 타일 */
            .grid-tile.occupied .tile-surface {
                background: linear-gradient(
                    135deg,
                    rgba(50, 65, 90, 0.85),
                    rgba(35, 45, 65, 0.9)
                );
                border-color: rgba(100, 130, 170, 0.6);
            }

            .grid-tile.occupied.enemy-tile .tile-surface {
                background: linear-gradient(
                    135deg,
                    rgba(75, 50, 55, 0.85),
                    rgba(55, 35, 40, 0.9)
                );
                border-color: rgba(170, 100, 110, 0.6);
            }

            /* ===== 유닛 스프라이트 컨테이너 ===== */
            .unit-sprite-wrapper {
                position: absolute;
                bottom: 10px;
                left: 50%;
                transform: translateX(-50%);
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            /* 유닛 스프라이트 (CSS로 idle 애니메이션) */
            .unit-sprite {
                width: 32px;
                height: 32px;
                image-rendering: pixelated;
                background-size: contain;
                background-repeat: no-repeat;
                background-position: center;
                filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.5));
                animation: spriteIdle 1.2s ease-in-out infinite;
            }

            .unit-sprite.ally-sprite {
                background-image: url('assets/sprites/knight.png');
            }

            .unit-sprite.enemy-sprite {
                background-image: url('assets/sprites/knight.png');
                filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.5))
                        sepia(1) saturate(3) hue-rotate(-50deg) brightness(0.9);
                transform: scaleX(-1);
            }

            /* Idle 애니메이션 */
            @keyframes spriteIdle {
                0%, 100% { transform: translateY(0) translateX(-50%); }
                50% { transform: translateY(-3px) translateX(-50%); }
            }

            .enemy-sprite {
                animation: spriteIdleEnemy 1.2s ease-in-out infinite;
            }

            @keyframes spriteIdleEnemy {
                0%, 100% { transform: translateY(0) translateX(-50%) scaleX(-1); }
                50% { transform: translateY(-3px) translateX(-50%) scaleX(-1); }
            }

            /* ===== HP 바 (스프라이트 위) ===== */
            .unit-hp-container {
                position: absolute;
                top: 2px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1px;
            }

            .mini-hp-bar {
                width: 42px;
                height: 5px;
                background: rgba(0, 0, 0, 0.7);
                border: 1px solid rgba(60, 70, 90, 0.6);
                border-radius: 2px;
                overflow: hidden;
            }

            .mini-hp-fill {
                height: 100%;
                background: linear-gradient(180deg, #6f6, #4a4);
                transition: width 0.3s ease;
                box-shadow: 0 0 4px rgba(100, 255, 100, 0.3);
            }

            .mini-hp-fill.enemy-hp {
                background: linear-gradient(180deg, #f66, #a44);
                box-shadow: 0 0 4px rgba(255, 100, 100, 0.3);
            }

            .mini-hp-fill.low { background: linear-gradient(180deg, #fa4, #a74); }
            .mini-hp-fill.critical {
                background: linear-gradient(180deg, #f44, #a22);
                animation: hpPulse 0.5s ease-in-out infinite;
            }

            /* HP 텍스트 */
            .mini-hp-text {
                font-family: 'PixelFont', monospace;
                font-size: 9px;
                font-weight: bold;
                color: #afc;
                text-shadow:
                    -1px -1px 0 #000,
                    1px -1px 0 #000,
                    -1px 1px 0 #000,
                    1px 1px 0 #000;
                transition: all 0.2s ease;
            }

            .mini-hp-text.enemy-text { color: #faa; }
            .mini-hp-text.low { color: #fa8; }
            .mini-hp-text.critical { color: #f66; }

            /* HP 변동 효과 */
            .mini-hp-text.hp-changed {
                transform: scale(1.4);
                color: #fff !important;
            }

            .mini-hp-text.damage {
                color: #f44 !important;
                text-shadow: 0 0 8px #f00;
            }

            .mini-hp-text.heal {
                color: #4f8 !important;
                text-shadow: 0 0 8px #0f0;
            }

            /* ===== 피드백 효과 ===== */
            .grid-tile.damage-flash .tile-surface {
                animation: damageFlash 0.3s ease;
            }

            .grid-tile.damage-flash .unit-sprite {
                animation: damageShake 0.3s ease;
            }

            @keyframes damageFlash {
                0%, 100% {
                    box-shadow: inset 0 0 0 rgba(255, 0, 0, 0);
                    filter: brightness(1);
                }
                50% {
                    box-shadow: inset 0 0 20px rgba(255, 0, 0, 0.6);
                    filter: brightness(1.3);
                }
            }

            @keyframes damageShake {
                0%, 100% { transform: translateX(-50%) translateY(0); }
                25% { transform: translateX(calc(-50% + 3px)) translateY(-1px); }
                75% { transform: translateX(calc(-50% - 3px)) translateY(1px); }
            }

            @keyframes hpPulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }

            /* 사망 상태 */
            .grid-tile.dead {
                opacity: 0.4;
                filter: grayscale(0.8);
            }

            .grid-tile.dead .unit-sprite {
                animation: none;
                transform: translateX(-50%) rotate(90deg);
                opacity: 0.6;
            }

            /* ===== 푸터 (총 HP) ===== */
            .panel-footer {
                display: flex;
                justify-content: center;
                padding: 4px 0 2px;
                margin-top: 4px;
                border-top: 1px solid rgba(100, 120, 150, 0.3);
            }

            .total-hp {
                display: flex;
                align-items: center;
                gap: 4px;
                font-family: 'PixelFont', monospace;
                font-size: 11px;
            }

            .hp-icon {
                color: #f66;
                text-shadow: 0 0 4px rgba(255, 100, 100, 0.5);
            }

            .total-current {
                color: #6f6;
                font-weight: bold;
            }

            .enemy .total-current {
                color: #f88;
            }

            .hp-divider {
                color: #889;
            }

            .total-max {
                color: #9ab;
            }

            /* ===== 모바일 대응 ===== */
            @media (max-width: 768px) {
                .battlefield-panel {
                    padding: 4px;
                }

                .battlefield-panel.ally { left: 1%; bottom: 1.5%; }
                .battlefield-panel.enemy { right: 1%; bottom: 1.5%; }

                .panel-header { padding: 2px 0; margin-bottom: 2px; }
                .team-label { font-size: 9px; letter-spacing: 1px; }
                .header-deco { width: 12px; }

                .mini-battlefield { padding: 4px; }

                .grid-wrapper {
                    gap: 3px;
                    transform: perspective(180px) rotateX(12deg);
                }

                .grid-column { gap: 2px; }
                .grid-column.col-0 { transform: translateY(2px); }
                .grid-column.col-2 { transform: translateY(-2px); }

                .grid-tile {
                    width: 42px;
                    height: 38px;
                }

                .unit-sprite-wrapper {
                    width: 28px;
                    height: 28px;
                    bottom: 6px;
                }

                .unit-sprite {
                    width: 24px;
                    height: 24px;
                }

                .unit-hp-container { top: 1px; }

                .mini-hp-bar {
                    width: 32px;
                    height: 4px;
                }

                .mini-hp-text { font-size: 8px; }

                .panel-footer { padding: 2px 0 1px; margin-top: 2px; }
                .total-hp { font-size: 9px; gap: 2px; }
            }
        `;
        document.head.appendChild(style);
    }

    renderUnits() {
        const units = this.isEnemy
            ? this.battleManager.enemies
            : this.battleManager.allies;

        // activeSlots: [1, 2, 4] -> 후열하, 중열상, 전열상
        // 그리드 인덱스: 0(후열상), 1(후열하), 2(중열상), 3(중열하), 4(전열상), 5(전열하)
        const slotMapping = {
            1: 1,  // 후열 하 -> col0, row1 (인덱스 1)
            2: 2,  // 중열 상 -> col1, row0 (인덱스 2)
            4: 4   // 전열 상 -> col2, row0 (인덱스 4)
        };

        const tiles = this.containerElement.querySelectorAll('.grid-tile');

        units.forEach((unit, unitIndex) => {
            const activeSlotIndex = this.activeSlots[unitIndex];
            const gridIndex = slotMapping[activeSlotIndex];
            const tile = tiles[gridIndex];

            if (!tile) return;

            // 타일 상태 업데이트
            tile.classList.add('occupied');
            if (this.isEnemy) {
                tile.classList.add('enemy-tile');
            }

            // 유닛 컨텐츠 생성
            const surface = tile.querySelector('.tile-surface');

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

            // 스프라이트 래퍼
            const spriteWrapper = document.createElement('div');
            spriteWrapper.className = 'unit-sprite-wrapper';
            spriteWrapper.innerHTML = `
                <div class="unit-sprite ${this.isEnemy ? 'enemy-sprite' : 'ally-sprite'}"></div>
            `;

            surface.appendChild(hpContainer);
            surface.appendChild(spriteWrapper);

            // 요소 저장
            this.unitElements.set(unit.id, {
                tile: tile,
                hpBar: hpContainer.querySelector('.mini-hp-fill'),
                hpText: hpContainer.querySelector('.mini-hp-text'),
                sprite: spriteWrapper.querySelector('.unit-sprite'),
                unit: unit
            });

            // 초기 HP 저장
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

            // HP 변동 감지
            if (prevHp !== currentHp) {
                const isDamage = currentHp < prevHp;
                const isHeal = currentHp > prevHp;

                // HP 업데이트
                elements.hpText.textContent = currentHp;
                elements.hpBar.style.width = `${hpRatio * 100}%`;

                // 피드백 효과
                elements.hpText.classList.add('hp-changed');

                if (isDamage) {
                    elements.hpText.classList.add('damage');
                    elements.tile.classList.add('damage-flash');

                    setTimeout(() => {
                        elements.tile.classList.remove('damage-flash');
                    }, 300);
                } else if (isHeal) {
                    elements.hpText.classList.add('heal');
                }

                setTimeout(() => {
                    elements.hpText.classList.remove('hp-changed', 'damage', 'heal');
                }, 300);

                this.previousHp.set(unit.id, currentHp);
            }

            // HP 상태 스타일
            elements.hpText.classList.remove('low', 'critical');
            elements.hpBar.classList.remove('low', 'critical');

            if (hpRatio <= 0.25) {
                elements.hpText.classList.add('critical');
                elements.hpBar.classList.add('critical');
            } else if (hpRatio <= 0.5) {
                elements.hpText.classList.add('low');
                elements.hpBar.classList.add('low');
            }

            // 사망 처리
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
