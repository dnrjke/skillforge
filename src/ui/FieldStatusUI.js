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
        this.lastCharacterPos = { x: character.x, y: character.y };

        // 캐릭터 중심점 (반딧불 레이어링용)
        this.characterCenterY = 0;

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

    createSingleFirefly(index, total, isBig) {
        // 대형 AP: 주황색, 크기 14 / 소형 AP: 노란색, 크기 5
        const size = isBig ? 14 : 5;
        const color = isBig ? 0xff6600 : 0xffdd44;  // 대형: 진한 주황 / 소형: 밝은 노랑

        // 대형: 느린 속도 (Heavy) / 소형: 빠른 속도 (Light)
        const orbitParams = isBig ? {
            a: 35 + Math.random() * 20,       // X 반경
            b: 15 + Math.random() * 8,       // Y 반경
            freqX: 0.6 + Math.random() * 0.2, // 느린 주파수
            freqY: 0.9 + Math.random() * 0.2,
            phase: (index / total) * Math.PI * 2 + Math.random() * 0.5,
            speed: 0.5 + Math.random() * 0.15, // 더 느린 속도
            noiseOffset: Math.random() * 1000,
            damping: 0.01,                    // 낮은 감쇠 (더 부드럽게)
            inertia: 0.97                     // 높은 관성 (무거움)
        } : {
            a: 40 + Math.random() * 20,       // X 반경
            b: 25 + Math.random() * 15,        // Y 반경
            freqX: 1.5 + Math.random() * 0.6, // 빠른 주파수
            freqY: 2.0 + Math.random() * 0.6,
            phase: (index / total) * Math.PI * 2 + Math.random() * 0.8,
            speed: 1.2 + Math.random() * 0.6, // 빠른 속도
            noiseOffset: Math.random() * 1000,
            damping: 0.12,                    // 높은 감쇠 (민첩하게)
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

        return {
            sprite,
            glow,
            trail,
            isBig,
            size,
            color,
            orbitParams,
            angle: orbitParams.phase,
            currentPos: { x: 0, y: 0 },
            targetPos: { x: 0, y: 0 },
            velocity: { x: 0, y: 0 },
            acceleration: { x: 0, y: 0 },  // 가속도 추가
            trailPositions: [],
            pulsePhase: Math.random() * Math.PI * 2,
            isConsuming: false
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

        // 캐릭터 이동 감지
        const charDeltaX = this.character.x - this.lastCharacterPos.x;
        const charDeltaY = this.character.y - this.lastCharacterPos.y;

        this.fireflies.forEach((firefly, index) => {
            if (firefly.isConsuming) return;

            const params = firefly.orbitParams;

            // Lissajous 궤도 계산 + Perlin noise 변조
            firefly.angle += params.speed * deltaSeconds;
            const noiseX = this.noise(time * 0.5 + params.noiseOffset) * 9;
            const noiseY = this.noise(time * 0.7 + params.noiseOffset + 100) * 7;

            const targetX = Math.sin(firefly.angle * params.freqX) * params.a + noiseX;
            const targetY = Math.cos(firefly.angle * params.freqY) * params.b + noiseY;

            firefly.targetPos.x = targetX;
            firefly.targetPos.y = targetY;

            // 가속도 기반 물리 (부드러운 곡선 유영)
            // 목표 지점으로의 방향 벡터
            const dx = firefly.targetPos.x - firefly.currentPos.x;
            const dy = firefly.targetPos.y - firefly.currentPos.y;

            // 가속도 = 목표 방향 * damping (스프링 힘처럼 작용)
            firefly.acceleration.x = dx * params.damping;
            firefly.acceleration.y = dy * params.damping;

            // 속도 = 이전 속도 * 관성 + 가속도
            firefly.velocity.x = firefly.velocity.x * params.inertia + firefly.acceleration.x;
            firefly.velocity.y = firefly.velocity.y * params.inertia + firefly.acceleration.y;

            // 캐릭터 이동에 대한 지연 반응
            firefly.velocity.x -= charDeltaX * 0.25;
            firefly.velocity.y -= charDeltaY * 0.25;

            // 위치 업데이트
            firefly.currentPos.x += firefly.velocity.x;
            firefly.currentPos.y += firefly.velocity.y;

            // Y 좌표 기반 원근감 (크기 변화 폭 축소)
            const normalizedY = (firefly.currentPos.y + params.b) / (params.b * 2);
            const depthScale = 0.85 + normalizedY * 0.3;  // 0.85 ~ 1.15 (변화 폭 축소)
            const depthAlpha = 0.6 + normalizedY * 0.4;   // 0.6 ~ 1.0 (흐림 축소)
            const depthBlur = (1 - normalizedY) * 1;      // 블러 축소

            // 맥동(Pulse) 효과
            firefly.pulsePhase += deltaSeconds * 3;
            const pulse = 1 + Math.sin(firefly.pulsePhase) * 0.15;

            // 스프라이트 업데이트
            firefly.sprite.setPosition(firefly.currentPos.x, firefly.currentPos.y);
            firefly.sprite.setScale(depthScale * pulse);
            firefly.sprite.setAlpha(depthAlpha);

            // Glow 업데이트
            firefly.glow.setPosition(firefly.currentPos.x, firefly.currentPos.y);
            firefly.glow.setScale(depthScale * pulse * 1.5);
            firefly.glow.setAlpha(depthAlpha * 0.4);

            // Z-index (캐릭터 앞/뒤)
            const isInFront = firefly.currentPos.y > 0;
            firefly.sprite.setDepth(isInFront ? 1001 : 999);
            firefly.glow.setDepth(isInFront ? 1000 : 998);

            // Motion Trail 업데이트
            this.updateFireflyTrail(firefly);
        });

        // 캐릭터 위치 저장
        this.lastCharacterPos.x = this.character.x;
        this.lastCharacterPos.y = this.character.y;

        // 컨테이너 위치 업데이트
        this.fireflyContainer.setPosition(this.character.x, this.character.y + this.fireflyOffsetY);
    }

    updateFireflyTrail(firefly) {
        // 트레일 위치 기록
        firefly.trailPositions.unshift({
            x: firefly.currentPos.x,
            y: firefly.currentPos.y
        });

        // 최대 8개 포인트
        if (firefly.trailPositions.length > 8) {
            firefly.trailPositions.pop();
        }

        // 트레일 그리기
        firefly.trail.clear();
        if (firefly.trailPositions.length > 1) {
            for (let i = 1; i < firefly.trailPositions.length; i++) {
                const alpha = 0.3 * (1 - i / firefly.trailPositions.length);
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

    // AP 소모 연출 (회오리 상승 + 소멸)
    consumeAp(amount) {
        const toConsume = Math.min(amount, this.currentAp);
        if (toConsume <= 0) return;

        // 소모할 반딧불 선택 (뒤에서부터)
        const consumeFireflies = [];
        let remaining = toConsume;

        for (let i = this.fireflies.length - 1; i >= 0 && remaining > 0; i--) {
            const firefly = this.fireflies[i];
            if (!firefly.isConsuming) {
                const value = firefly.isBig ? 5 : 1;
                if (value <= remaining) {
                    consumeFireflies.push(firefly);
                    firefly.isConsuming = true;
                    remaining -= value;
                }
            }
        }

        // 소모 애니메이션
        consumeFireflies.forEach((firefly, index) => {
            this.playConsumeAnimation(firefly, index * 50);
        });

        // AP 값 업데이트
        this.currentAp -= toConsume;
        this.updateApPellets();

        // 일정 시간 후 반딧불 재구성
        this.scene.time.delayedCall(600, () => {
            this.updateFireflies();
        });

        return toConsume;
    }

    playConsumeAnimation(firefly, delay) {
        this.scene.time.delayedCall(delay, () => {
            const startX = firefly.currentPos.x;
            const startY = firefly.currentPos.y;

            // 회오리 상승 애니메이션
            this.scene.tweens.add({
                targets: firefly.sprite,
                x: startX,
                y: startY - 80,
                scale: 0,
                alpha: 0,
                duration: 500,
                ease: 'Power2.easeIn',
                onUpdate: (tween) => {
                    const progress = tween.progress;
                    // 회전하며 상승
                    const spiralX = startX + Math.sin(progress * Math.PI * 4) * 20 * (1 - progress);
                    firefly.sprite.x = spiralX;
                    firefly.glow.x = spiralX;
                    firefly.glow.y = firefly.sprite.y;
                    firefly.glow.alpha = (1 - progress) * 0.4;
                    firefly.glow.scale = firefly.sprite.scale * 1.5;
                },
                onComplete: () => {
                    firefly.sprite.destroy();
                    firefly.glow.destroy();
                    firefly.trail.destroy();
                }
            });
        });
    }

    // ===== 공개 메서드 =====

    update(delta) {
        // 컨테이너 위치 업데이트
        this.container.setPosition(
            this.character.x,
            this.character.y + this.offsetY
        );

        // 반딧불 위치 업데이트
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

        this.fireflies.forEach(f => {
            if (f.sprite) f.sprite.destroy();
            if (f.trail) f.trail.destroy();
            if (f.glow) f.glow.destroy();
        });

        if (this.fireflyContainer) this.fireflyContainer.destroy();
        if (this.container) this.container.destroy();
    }
}
