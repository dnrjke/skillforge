import Phaser from 'phaser';

/**
 * FieldStatusUI - 필드 캐릭터용 상태 UI
 *
 * 특징:
 * - HP바: 캐릭터 중심 아래, 평소 숨김, 변동시만 표시
 * - 행동 게이지: 기존과 유사
 * - AP: 알갱이 방식 (5개 = 1 대형)
 * - PP: 알갱이 방식 (압축 없음)
 * - AP 반딧불: Lissajous 궤도, 원근감, 관성 이동
 * - AP 비산: damping 음수로 전환하여 기존 물리로 흩어짐
 */
export default class FieldStatusUI {
    constructor(scene, character, config = {}) {
        this.scene = scene;
        this.character = character;

        // 기본 설정
        this.maxHp = config.maxHp || 100;
        this.currentHp = config.currentHp || this.maxHp;
        this.maxAp = config.maxAp || 15;  // 기본 15 AP
        this.currentAp = config.currentAp ?? this.maxAp;
        this.maxPp = config.maxPp || 3;
        this.currentPp = config.currentPp ?? this.maxPp;
        this.speed = config.speed || 10;
        this.parentContainer = config.parentContainer || null;
        this.isEnemy = config.isEnemy || false;

        // 행동 게이지
        this.maxAction = 100;
        this.currentAction = 0;
        this.wasReady = false;

        // UI 크기 설정
        this.barWidth = config.barWidth || 80;
        this.barHeight = config.barHeight || 6;
        this.offsetY = config.offsetY || 20;  // 캐릭터 중심 아래

        // 그래픽 요소
        this.container = null;
        this.hpContainer = null;
        this.hpBarBg = null;
        this.hpBarFill = null;
        this.hpVisible = false;
        this.hpHideTimer = null;

        // 행동 게이지
        this.actionBarBg = null;
        this.actionBarFill = null;
        this.glowEffect = null;
        this.shineEffect = null;

        // AP/PP 알갱이
        this.apPellets = [];
        this.ppPellets = [];

        // AP 반딧불 시스템
        this.fireflies = [];
        this.fireflyContainer = null;

        // 에너지 잔류 시스템: 앵커 포인트
        this.anchorPos = { x: character.x, y: character.y };
        this.anchorLerpSpeed = 0.03;  // 앵커가 캐릭터를 따라가는 속도 (낮을수록 잔류 효과)

        // 비산 설정
        this.scatterDuration = 3000;    // 3초 후 소멸
        this.fadeStartTime = 2000;      // 2초 후 페이드 시작
        this.boundaryMargin = 100;      // 화면 바깥 마진

        this.create();
        this.createFireflies();
    }

    create() {
        // 메인 컨테이너
        this.container = this.scene.add.container(
            this.character.x,
            this.character.y + this.offsetY
        );

        if (this.parentContainer) {
            this.parentContainer.add(this.container);
        }

        this.createHpBar();
        this.createActionBar();
        this.createApPellets();
        this.createPpPellets();

        this.container.setDepth(1000);

        // HP바 초기 숨김
        this.hideHpBar(false);
    }

    // ===== HP 바 (평소 숨김, 변동시 표시) =====
    createHpBar() {
        this.hpContainer = this.scene.add.container(0, 0);

        // HP 바 배경
        this.hpBarBg = this.scene.add.rectangle(
            0, 0,
            this.barWidth + 2, this.barHeight + 2,
            0x000000, 0.8
        ).setOrigin(0.5);

        // HP 바 채움
        this.hpBarFill = this.scene.add.rectangle(
            -this.barWidth / 2, 0,
            this.barWidth, this.barHeight,
            this.isEnemy ? 0xff4444 : 0x44ff44
        ).setOrigin(0, 0.5);

        this.hpContainer.add([this.hpBarBg, this.hpBarFill]);
        this.container.add(this.hpContainer);
    }

    showHpBar(duration = 2000) {
        if (this.hpHideTimer) {
            this.hpHideTimer.remove();
        }

        this.hpVisible = true;
        this.scene.tweens.add({
            targets: this.hpContainer,
            alpha: 1,
            duration: 150,
            ease: 'Power2'
        });

        // 일정 시간 후 숨김
        this.hpHideTimer = this.scene.time.delayedCall(duration, () => {
            this.hideHpBar(true);
        });
    }

    hideHpBar(animate = true) {
        this.hpVisible = false;
        if (animate) {
            this.scene.tweens.add({
                targets: this.hpContainer,
                alpha: 0,
                duration: 300,
                ease: 'Power2'
            });
        } else {
            this.hpContainer.alpha = 0;
        }
    }

    // ===== 행동 게이지 =====
    createActionBar() {
        const actionBarY = this.barHeight + 8;

        this.actionBarBg = this.scene.add.rectangle(
            0, actionBarY,
            this.barWidth + 2, 4,
            0x000000, 0.8
        ).setOrigin(0.5);

        this.actionBarFill = this.scene.add.rectangle(
            -this.barWidth / 2, actionBarY,
            0, 3,
            0x44ccff
        ).setOrigin(0, 0.5);

        // Glow 효과
        this.glowEffect = this.scene.add.rectangle(
            0, actionBarY,
            this.barWidth + 6, 6,
            0xffff88, 0
        ).setOrigin(0.5).setBlendMode(Phaser.BlendModes.ADD);

        // Shine 효과
        this.shineEffect = this.scene.add.rectangle(
            -this.barWidth / 2, actionBarY,
            20, 4,
            0xffffff, 1
        ).setOrigin(0, 0.5).setVisible(false).setBlendMode(Phaser.BlendModes.ADD);

        this.container.add([
            this.actionBarBg,
            this.actionBarFill,
            this.glowEffect,
            this.shineEffect
        ]);
    }

    // ===== AP 알갱이 (5개 = 1 대형) =====
    createApPellets() {
        this.updateApPellets();
    }

    updateApPellets() {
        // 기존 알갱이 제거
        this.apPellets.forEach(p => p.destroy());
        this.apPellets = [];

        const pelletY = this.barHeight + 18;
        const bigCount = Math.floor(this.currentAp / 5);
        const smallCount = this.currentAp % 5;

        let xOffset = -this.barWidth / 2;
        const bigSize = 6;
        const smallSize = 4;
        const gap = 2;

        // 대형 알갱이 (5AP 단위)
        for (let i = 0; i < bigCount; i++) {
            const pellet = this.scene.add.circle(
                xOffset + bigSize / 2, pelletY,
                bigSize / 2,
                0xffcc00
            );
            pellet.setStrokeStyle(1.5, 0xffee88);

            // 발광 효과
            const glow = this.scene.add.circle(
                xOffset + bigSize / 2, pelletY,
                bigSize / 2 + 2,
                0xffcc00, 0.3
            ).setBlendMode(Phaser.BlendModes.ADD);

            this.container.add([glow, pellet]);
            this.apPellets.push(pellet, glow);
            xOffset += bigSize + gap + 2;
        }

        // 소형 알갱이 (나머지)
        for (let i = 0; i < smallCount; i++) {
            const pellet = this.scene.add.circle(
                xOffset + smallSize / 2, pelletY,
                smallSize / 2,
                0xffaa00
            );
            pellet.setStrokeStyle(1, 0xffcc00);

            this.container.add(pellet);
            this.apPellets.push(pellet);
            xOffset += smallSize + gap;
        }
    }

    // ===== PP 알갱이 (압축 없음) =====
    createPpPellets() {
        this.updatePpPellets();
    }

    updatePpPellets() {
        // 기존 알갱이 제거
        this.ppPellets.forEach(p => p.destroy());
        this.ppPellets = [];

        const pelletY = this.barHeight + 28;
        const size = 5;
        const gap = 3;

        for (let i = 0; i < this.maxPp; i++) {
            const isFilled = i < this.currentPp;
            const pellet = this.scene.add.polygon(
                -this.barWidth / 2 + (size + gap) * i + size / 2, pelletY,
                [0, -size / 2, size / 2, 0, 0, size / 2, -size / 2, 0],  // 다이아몬드
                isFilled ? 0xaa66ff : 0x333333
            );
            pellet.setStrokeStyle(1, isFilled ? 0xcc88ff : 0x222222);

            this.container.add(pellet);
            this.ppPellets.push(pellet);
        }
    }

    // ===== AP 반딧불 시스템 =====
    createFireflies() {
        // 반딧불 컨테이너 (캐릭터 위치 + 아래 오프셋)
        this.fireflyOffsetY = 30;  // 아래로 이동
        this.fireflyContainer = this.scene.add.container(
            this.character.x,
            this.character.y + this.fireflyOffsetY
        );

        if (this.parentContainer) {
            this.parentContainer.add(this.fireflyContainer);
        }

        this.updateFireflies();
    }

    updateFireflies() {
        // 기존 반딧불 제거
        this.fireflies.forEach(f => {
            if (f.sprite) f.sprite.destroy();
            if (f.trail) f.trail.destroy();
            if (f.glow) f.glow.destroy();
        });
        this.fireflies = [];

        const bigCount = Math.floor(this.currentAp / 5);
        const smallCount = this.currentAp % 5;
        const totalFireflies = bigCount + smallCount;

        for (let i = 0; i < totalFireflies; i++) {
            const isBig = i < bigCount;
            const firefly = this.createSingleFirefly(i, totalFireflies, isBig);
            this.fireflies.push(firefly);
        }
    }

    createSingleFirefly(index, total, isBig, options = {}) {
        // 대형 AP: 주황색, 크기 14 / 소형 AP: 노란색, 크기 5
        const size = isBig ? 14 : 5;
        const color = isBig ? 0xff6600 : 0xffdd44;  // 대형: 진한 주황 / 소형: 밝은 노랑

        // 대형 AP는 2px 아래에서 출현
        const spawnOffsetY = isBig ? 2 : 0;

        // 분열로 생성된 경우 초기 위치 지정
        const initialPos = options.initialPos || null;

        // 대형: 느린 속도 (Heavy) / 소형: 빠른 속도 (Light)
        const orbitParams = isBig ? {
            a: 35 + Math.random() * 20,       // X 반경
            b: 15 + Math.random() * 8,       // Y 반경
            freqX: 0.6 + Math.random() * 0.2, // 느린 주파수
            freqY: 0.9 + Math.random() * 0.2,
            phase: (index / total) * Math.PI * 2 + Math.random() * 0.5,
            speed: 0.5 + Math.random() * 0.15, // 더 느린 속도
            noiseOffset: Math.random() * 1000,
            baseDamping: 0.01,                // 기본 감쇠 (idle용)
            damping: 0.01,                    // 현재 감쇠 (비산 시 변경됨)
            inertia: 0.97                     // 높은 관성 (무거움)
        } : {
            a: 40 + Math.random() * 20,       // X 반경
            b: 25 + Math.random() * 15,        // Y 반경
            freqX: 1.5 + Math.random() * 0.6, // 빠른 주파수
            freqY: 2.0 + Math.random() * 0.6,
            phase: (index / total) * Math.PI * 2 + Math.random() * 0.8,
            speed: 1.2 + Math.random() * 0.6, // 빠른 속도
            noiseOffset: Math.random() * 1000,
            baseDamping: 0.12,                // 기본 감쇠 (idle용)
            damping: 0.12,                    // 현재 감쇠 (비산 시 변경됨)
            inertia: 0.88                     // 낮은 관성 (가벼움)
        };

        // 반딧불 스프라이트 (원형) - 대형은 주황색 코어
        const coreColor = isBig ? 0xff8800 : color;  // 대형: 밝은 주황 코어
        const sprite = this.scene.add.circle(0, 0, size / 2, coreColor);
        sprite.setBlendMode(Phaser.BlendModes.NORMAL);  // 노말 블렌드로 색상 유지

        // 발광 효과 (대형 글로우)
        const glowSize = isBig ? size * 0.67 : size;
        const glowAlpha = isBig ? 0.5 : 0.35;
        const glow = this.scene.add.circle(0, 0, glowSize, color, glowAlpha);
        glow.setBlendMode(Phaser.BlendModes.ADD);

        // 빛 꼬리 (Motion Trail)
        const trail = this.scene.add.graphics();
        trail.setBlendMode(Phaser.BlendModes.ADD);

        this.fireflyContainer.add([trail, glow, sprite]);

        // 초기 위치 설정 (분열 시 또는 기본)
        const startX = initialPos ? initialPos.x : 0;
        const startY = initialPos ? initialPos.y : spawnOffsetY;

        return {
            sprite,
            glow,
            trail,
            isBig,
            size,
            color,
            orbitParams,
            angle: orbitParams.phase,
            currentPos: { x: startX, y: startY },
            targetPos: { x: 0, y: 0 },
            velocity: { x: 0, y: 0 },
            acceleration: { x: 0, y: 0 },
            trailPositions: [],
            pulsePhase: Math.random() * Math.PI * 2,
            isScattering: false,     // 비산 중 여부
            scatterStartTime: 0,     // 비산 시작 시간
            spawnOffsetY: spawnOffsetY
        };
    }

    // Perlin-like noise 함수
    noise(x) {
        const n = Math.sin(x * 12.9898) * 43758.5453;
        return n - Math.floor(n);
    }

    // 반딧불 업데이트 (매 프레임)
    updateFireflyPositions(delta) {
        const deltaSeconds = delta / 1000;
        const time = this.scene.time.now / 1000;
        const currentTime = this.scene.time.now;

        // 에너지 잔류: 앵커가 캐릭터를 천천히 따라감 (Lerp)
        this.anchorPos.x += (this.character.x - this.anchorPos.x) * this.anchorLerpSpeed;
        this.anchorPos.y += (this.character.y - this.anchorPos.y) * this.anchorLerpSpeed;

        // 소멸 대상 수집
        const toRemove = [];

        this.fireflies.forEach((firefly, index) => {
            const params = firefly.orbitParams;

            // 비산 중인 경우: 월드 좌표 기준으로 처리
            if (firefly.isScattering) {
                const elapsed = currentTime - firefly.scatterStartTime;

                // 3초 경과 또는 화면 경계 이탈 시 소멸
                if (elapsed >= this.scatterDuration || this.isOutOfBoundsWorld(firefly)) {
                    toRemove.push(index);
                    return;
                }

                // 페이드 아웃 계산
                let fadeAlpha = 1.0;
                if (elapsed >= this.fadeStartTime) {
                    fadeAlpha = 1.0 - (elapsed - this.fadeStartTime) / (this.scatterDuration - this.fadeStartTime);
                }

                // 비산 물리: 월드 좌표 기준 (damping 음수로 확산)
                // targetPos는 고정 (비산 시작 시점 기준), 현재 위치와 차이로 반발력 생성
                const dx = firefly.targetPos.x - firefly.worldPos.x;
                const dy = firefly.targetPos.y - firefly.worldPos.y;
                firefly.acceleration.x = dx * params.damping;
                firefly.acceleration.y = dy * params.damping;
                firefly.velocity.x = firefly.velocity.x * params.inertia + firefly.acceleration.x;
                firefly.velocity.y = firefly.velocity.y * params.inertia + firefly.acceleration.y;
                firefly.worldPos.x += firefly.velocity.x;
                firefly.worldPos.y += firefly.velocity.y;

                // 맥동 효과
                firefly.pulsePhase += deltaSeconds * 2;
                const pulse = 1 + Math.sin(firefly.pulsePhase) * 0.1;

                // 스프라이트 업데이트 (월드 좌표, 페이드 적용)
                firefly.sprite.setPosition(firefly.worldPos.x, firefly.worldPos.y);
                firefly.sprite.setScale(pulse);
                firefly.sprite.setAlpha(fadeAlpha);
                firefly.glow.setPosition(firefly.worldPos.x, firefly.worldPos.y);
                firefly.glow.setScale(pulse * 1.5);
                firefly.glow.setAlpha(fadeAlpha * 0.4);

                this.updateScatterTrail(firefly, fadeAlpha);
                return;
            }

            // 일반 궤도 업데이트
            firefly.angle += params.speed * deltaSeconds;
            const noiseX = this.noise(time * 0.5 + params.noiseOffset) * 9;
            const noiseY = this.noise(time * 0.7 + params.noiseOffset + 100) * 7;

            const targetX = Math.sin(firefly.angle * params.freqX) * params.a + noiseX;
            const targetY = Math.cos(firefly.angle * params.freqY) * params.b + noiseY;

            firefly.targetPos.x = targetX;
            firefly.targetPos.y = targetY;

            // 가속도 기반 물리 (앵커 주변 궤도)
            const dx = firefly.targetPos.x - firefly.currentPos.x;
            const dy = firefly.targetPos.y - firefly.currentPos.y;
            firefly.acceleration.x = dx * params.damping;
            firefly.acceleration.y = dy * params.damping;
            firefly.velocity.x = firefly.velocity.x * params.inertia + firefly.acceleration.x;
            firefly.velocity.y = firefly.velocity.y * params.inertia + firefly.acceleration.y;

            // 위치 업데이트
            firefly.currentPos.x += firefly.velocity.x;
            firefly.currentPos.y += firefly.velocity.y;

            // Y 좌표 기반 원근감
            const normalizedY = (firefly.currentPos.y + params.b) / (params.b * 2);
            const depthScale = 0.85 + normalizedY * 0.3;
            const depthAlpha = 0.6 + normalizedY * 0.4;

            // 맥동 효과
            firefly.pulsePhase += deltaSeconds * 3;
            const pulse = 1 + Math.sin(firefly.pulsePhase) * 0.15;

            // 스프라이트 업데이트
            firefly.sprite.setPosition(firefly.currentPos.x, firefly.currentPos.y);
            firefly.sprite.setScale(depthScale * pulse);
            firefly.sprite.setAlpha(depthAlpha);
            firefly.glow.setPosition(firefly.currentPos.x, firefly.currentPos.y);
            firefly.glow.setScale(depthScale * pulse * 1.5);
            firefly.glow.setAlpha(depthAlpha * 0.4);

            // Z-index
            const isInFront = firefly.currentPos.y > 0;
            firefly.sprite.setDepth(isInFront ? 1001 : 999);
            firefly.glow.setDepth(isInFront ? 1000 : 998);

            this.updateFireflyTrail(firefly);
        });

        // 소멸된 반딧불 제거 (역순)
        toRemove.reverse().forEach(index => {
            this.destroyFirefly(index);
        });

        // 컨테이너가 앵커를 따라감 (에너지 잔류 효과)
        this.fireflyContainer.setPosition(this.anchorPos.x, this.anchorPos.y + this.fireflyOffsetY);
    }

    // 화면 경계 체크 - 월드 좌표 (비산용)
    isOutOfBoundsWorld(firefly) {
        const camera = this.scene.cameras.main;
        const margin = this.boundaryMargin;

        return firefly.worldPos.x < camera.scrollX - margin ||
               firefly.worldPos.x > camera.scrollX + camera.width + margin ||
               firefly.worldPos.y < camera.scrollY - margin ||
               firefly.worldPos.y > camera.scrollY + camera.height + margin;
    }

    // 반딧불 소멸
    destroyFirefly(index) {
        const firefly = this.fireflies[index];
        if (firefly) {
            if (firefly.sprite) { firefly.sprite.destroy(); firefly.sprite = null; }
            if (firefly.glow) { firefly.glow.destroy(); firefly.glow = null; }
            if (firefly.trail) { firefly.trail.destroy(); firefly.trail = null; }
            this.fireflies.splice(index, 1);
        }
    }

    updateFireflyTrail(firefly, fadeAlpha = 1.0) {
        // 트레일 위치 기록 (로컬 좌표)
        firefly.trailPositions.unshift({
            x: firefly.currentPos.x,
            y: firefly.currentPos.y
        });

        if (firefly.trailPositions.length > 8) {
            firefly.trailPositions.pop();
        }

        firefly.trail.clear();
        if (firefly.trailPositions.length > 1) {
            for (let i = 1; i < firefly.trailPositions.length; i++) {
                const alpha = 0.3 * (1 - i / firefly.trailPositions.length) * fadeAlpha;
                const width = firefly.size * 0.5 * (1 - i / firefly.trailPositions.length);

                firefly.trail.lineStyle(width, firefly.color, alpha);
                firefly.trail.beginPath();
                firefly.trail.moveTo(
                    firefly.trailPositions[i - 1].x,
                    firefly.trailPositions[i - 1].y
                );
                firefly.trail.lineTo(
                    firefly.trailPositions[i].x,
                    firefly.trailPositions[i].y
                );
                firefly.trail.strokePath();
            }
        }
    }

    // 비산용 트레일 (월드 좌표)
    updateScatterTrail(firefly, fadeAlpha) {
        firefly.trailPositions.unshift({
            x: firefly.worldPos.x,
            y: firefly.worldPos.y
        });

        if (firefly.trailPositions.length > 6) {
            firefly.trailPositions.pop();
        }

        firefly.trail.clear();
        if (firefly.trailPositions.length > 1) {
            for (let i = 1; i < firefly.trailPositions.length; i++) {
                const alpha = 0.2 * (1 - i / firefly.trailPositions.length) * fadeAlpha;
                const width = firefly.size * 0.4 * (1 - i / firefly.trailPositions.length);

                firefly.trail.lineStyle(width, firefly.color, alpha);
                firefly.trail.beginPath();
                firefly.trail.moveTo(
                    firefly.trailPositions[i - 1].x,
                    firefly.trailPositions[i - 1].y
                );
                firefly.trail.lineTo(
                    firefly.trailPositions[i].x,
                    firefly.trailPositions[i].y
                );
                firefly.trail.strokePath();
            }
        }
    }

    // ===== AP 소모 및 비산 시스템 =====

    /**
     * AP 소모 - 선분열 후 비산 연출
     * @param {number} amount - 소모할 AP 양
     */
    consumeAp(amount) {
        const toConsume = Math.min(amount, this.currentAp);
        if (toConsume <= 0) return 0;

        // 1. 선-분열: 큰 AP를 작은 AP로 분열 (필요 시)
        this.preSplitForConsume(toConsume);

        // 2. 소모할 반딧불 선택 (작은 AP만, 뒤에서부터)
        const toScatter = [];
        for (let i = this.fireflies.length - 1; i >= 0 && toScatter.length < toConsume; i--) {
            const firefly = this.fireflies[i];
            if (!firefly.isBig && !firefly.isScattering) {
                toScatter.push(firefly);
            }
        }

        // 3. 먼저 모두 isScattering 표시 (중복 선택 방지)
        toScatter.forEach(f => { f.isScattering = true; });

        // 4. 비산 연출 시작
        toScatter.forEach(f => this.startScatterAnimation(f));

        // 5. AP 값 업데이트
        this.currentAp -= toConsume;
        this.updateApPellets();

        return toConsume;
    }

    /**
     * 선-분열: 큰 AP를 작은 AP 5개로 분열 (짧은 스프레드 후 idle 편입)
     * @param {number} requiredAmount - 필요한 AP 양
     */
    preSplitForConsume(requiredAmount) {
        // 사용 가능한 작은 AP 개수
        const availableSmall = this.fireflies.filter(f => !f.isBig && !f.isScattering).length;

        if (availableSmall >= requiredAmount) return;  // 충분함

        // 부족한 만큼 큰 AP 분열
        let needed = requiredAmount - availableSmall;
        const bigFireflies = this.fireflies.filter(f => f.isBig && !f.isScattering);

        for (const bigFirefly of bigFireflies) {
            if (needed <= 0) break;

            const splitX = bigFirefly.currentPos.x;
            const splitY = bigFirefly.currentPos.y;

            // 큰 AP를 배열에서 먼저 제거
            const idx = this.fireflies.indexOf(bigFirefly);
            if (idx !== -1) this.fireflies.splice(idx, 1);

            // 스프라이트 제거
            if (bigFirefly.sprite) bigFirefly.sprite.destroy();
            if (bigFirefly.glow) bigFirefly.glow.destroy();
            if (bigFirefly.trail) bigFirefly.trail.destroy();

            // 작은 AP 5개 생성 (짧은 스프레드)
            const splitAngles = [0, 72, 144, 216, 288];
            const splitRadius = 8;

            for (let i = 0; i < 5; i++) {
                const angle = (splitAngles[i] * Math.PI) / 180;
                const offsetX = Math.cos(angle) * splitRadius;
                const offsetY = Math.sin(angle) * splitRadius;

                const newFirefly = this.createSingleFirefly(
                    this.fireflies.length,
                    this.fireflies.length + 5,
                    false,
                    { initialPos: { x: splitX + offsetX, y: splitY + offsetY } }
                );

                // 짧은 초기 속도만 부여 (탁! 퍼짐 후 idle 편입)
                newFirefly.velocity.x = offsetX * 0.15;
                newFirefly.velocity.y = offsetY * 0.15;

                this.fireflies.push(newFirefly);
            }

            needed -= 5;
        }
    }

    /**
     * 비산 연출 시작 - 컨테이너에서 분리 후 damping 변경
     * @param {Object} firefly - 비산할 반딧불
     */
    startScatterAnimation(firefly) {
        // isScattering은 이미 consumeAp에서 설정됨

        // 1. 월드 좌표 계산 (앵커 위치 + 상대 위치)
        const worldX = this.anchorPos.x + firefly.currentPos.x;
        const worldY = this.anchorPos.y + this.fireflyOffsetY + firefly.currentPos.y;

        // 2. 스프라이트를 fireflyContainer에서 제거 → parentContainer(월드)로 이동
        if (this.parentContainer) {
            if (firefly.sprite.parentContainer) {
                firefly.sprite.parentContainer.remove(firefly.sprite);
            }
            if (firefly.glow.parentContainer) {
                firefly.glow.parentContainer.remove(firefly.glow);
            }
            if (firefly.trail.parentContainer) {
                firefly.trail.parentContainer.remove(firefly.trail);
            }

            this.parentContainer.add(firefly.trail);
            this.parentContainer.add(firefly.glow);
            this.parentContainer.add(firefly.sprite);
        }

        // 3. 월드 좌표로 위치 설정
        firefly.worldPos = { x: worldX, y: worldY };
        firefly.targetPos = { x: worldX, y: worldY };  // 비산 기준점
        firefly.sprite.setPosition(worldX, worldY);
        firefly.glow.setPosition(worldX, worldY);

        // 4. 비산 damping 적용 (소형만 비산, -0.02)
        firefly.orbitParams.damping = -0.02;

        // 5. 비산 시작 시간 기록
        firefly.scatterStartTime = this.scene.time.now;

        // 6. 속도 크기만 초기화, 방향은 유지 (자연스러운 비산)
        const speed = Math.sqrt(
            firefly.velocity.x * firefly.velocity.x +
            firefly.velocity.y * firefly.velocity.y
        );
        if (speed > 0.1) {
            const initialSpeed = 0.5 + Math.random() * 0.5;
            firefly.velocity.x = (firefly.velocity.x / speed) * initialSpeed;
            firefly.velocity.y = (firefly.velocity.y / speed) * initialSpeed;
        } else {
            const randomAngle = Math.random() * Math.PI * 2;
            firefly.velocity.x = Math.cos(randomAngle) * 0.5;
            firefly.velocity.y = Math.sin(randomAngle) * 0.5;
        }
    }

    // ===== 공개 메서드 =====

    update(delta) {
        // 컨테이너 위치 업데이트
        this.container.setPosition(
            this.character.x,
            this.character.y + this.offsetY
        );

        // 반딧불 위치 업데이트 (궤도 + 비산 모두 처리)
        this.updateFireflyPositions(delta || 16);
    }

    setHp(value, animate = true) {
        const oldHp = this.currentHp;
        this.currentHp = Math.max(0, Math.min(this.maxHp, value));
        const targetWidth = (this.currentHp / this.maxHp) * this.barWidth;

        // HP 변동 시 표시
        if (oldHp !== this.currentHp) {
            this.showHpBar();
        }

        // 색상 결정
        const ratio = this.currentHp / this.maxHp;
        let color;
        if (this.isEnemy) {
            color = ratio > 0.3 ? 0xff4444 : 0xff2222;
        } else {
            color = ratio > 0.6 ? 0x44ff44 : (ratio > 0.3 ? 0xffaa00 : 0xff4444);
        }

        if (animate) {
            // 피격/회복 플래시
            const flashColor = value < oldHp ? 0xff0000 : 0x00ff00;
            this.hpBarFill.setFillStyle(flashColor);

            this.scene.tweens.add({
                targets: this.hpBarFill,
                width: targetWidth,
                duration: 300,
                ease: 'Power2',
                onComplete: () => {
                    this.hpBarFill.setFillStyle(color);
                }
            });
        } else {
            this.hpBarFill.width = targetWidth;
            this.hpBarFill.setFillStyle(color);
        }
    }

    setAp(value, animate = true) {
        const oldAp = this.currentAp;
        const newAp = Math.max(0, Math.min(this.maxAp, value));

        if (newAp < oldAp) {
            // AP 소모
            this.consumeAp(oldAp - newAp);
        } else if (newAp > oldAp) {
            // AP 회복
            this.currentAp = newAp;
            this.updateApPellets();
            this.updateFireflies();
        }
    }

    addAp(amount) {
        this.setAp(this.currentAp + amount);
    }

    setPp(value, animate = true) {
        const oldPp = this.currentPp;
        this.currentPp = Math.max(0, Math.min(this.maxPp, value));

        this.ppPellets.forEach((pellet, i) => {
            const isFilled = i < this.currentPp;
            pellet.setFillStyle(isFilled ? 0xaa66ff : 0x333333);
            pellet.setStrokeStyle(1, isFilled ? 0xcc88ff : 0x222222);

            if (animate && isFilled && i >= oldPp) {
                // PP 회복 시 반짝임
                this.scene.tweens.add({
                    targets: pellet,
                    scaleX: 1.4,
                    scaleY: 1.4,
                    duration: 150,
                    yoyo: true,
                    ease: 'Power2'
                });
            }
        });
    }

    setAction(value, animate = true) {
        const wasFullBefore = this.currentAction >= this.maxAction;
        this.currentAction = Math.max(0, Math.min(this.maxAction, value));
        const targetWidth = (this.currentAction / this.maxAction) * this.barWidth;
        const isFullNow = this.currentAction >= this.maxAction;

        if (animate) {
            this.scene.tweens.add({
                targets: this.actionBarFill,
                width: targetWidth,
                duration: 150,
                ease: 'Power2'
            });
        } else {
            this.actionBarFill.width = targetWidth;
        }

        if (isFullNow) {
            this.actionBarFill.setFillStyle(0xffff44);
            if (!wasFullBefore) {
                this.playShineEffect();
                this.startGlowPulse();
            }
        } else {
            this.actionBarFill.setFillStyle(0x44ccff);
            this.wasReady = false;
            this.stopGlowPulse();
        }
    }

    addAction(amount) {
        this.setAction(this.currentAction + amount);
        return this.currentAction >= this.maxAction;
    }

    resetAction() {
        this.wasReady = false;
        this.stopGlowPulse();
        this.setAction(0, false);
    }

    playShineEffect() {
        if (!this.shineEffect) return;

        this.shineEffect.setVisible(true);
        this.shineEffect.x = -this.barWidth / 2 - 20;
        this.shineEffect.alpha = 1;

        this.scene.tweens.add({
            targets: this.shineEffect,
            x: this.barWidth / 2 + 10,
            duration: 350,
            ease: 'Power1.easeOut',
            onComplete: () => {
                this.shineEffect.setVisible(false);
            }
        });
    }

    startGlowPulse() {
        if (this.glowTween) this.glowTween.stop();

        this.glowEffect.alpha = 0.3;
        this.glowTween = this.scene.tweens.add({
            targets: this.glowEffect,
            alpha: 0.6,
            scaleX: 1.1,
            scaleY: 1.2,
            duration: 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    stopGlowPulse() {
        if (this.glowTween) {
            this.glowTween.stop();
            this.glowTween = null;
        }
        this.glowEffect.alpha = 0;
        this.glowEffect.setScale(1);
    }

    damage(amount) {
        this.setHp(this.currentHp - amount);
        return this.currentHp;
    }

    heal(amount) {
        this.setHp(this.currentHp + amount);
        return this.currentHp;
    }

    destroy() {
        this.stopGlowPulse();
        if (this.hpHideTimer) this.hpHideTimer.remove();

        // 반딧불 정리
        this.fireflies.forEach(f => {
            if (f.sprite) f.sprite.destroy();
            if (f.trail) f.trail.destroy();
            if (f.glow) f.glow.destroy();
        });
        this.fireflies = [];

        if (this.fireflyContainer) this.fireflyContainer.destroy();
        if (this.container) this.container.destroy();
    }
}
