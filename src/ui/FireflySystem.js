import Phaser from 'phaser';

/**
 * FireflySystem - AP 반딧불 시스템
 *
 * 특징:
 * - 월드 좌표 기반: 캐릭터와 독립적으로 유영
 * - 대형/소형 AP: 대형 1개 = 소형 5개
 * - 비산 연출: damping 음수로 전환하여 기존 물리로 흩어짐
 * - Lissajous 곡선 기반 궤도 운동
 */
export default class FireflySystem {
    constructor(scene, character, config = {}) {
        this.scene = scene;
        this.character = character;
        this.parentContainer = config.parentContainer || null;

        // AP 상태
        this.maxAp = config.maxAp || 15;
        this.currentAp = config.currentAp ?? this.maxAp;

        // 반딧불 배열
        this.fireflies = [];
        this.fireflyOffsetY = config.fireflyOffsetY || 30;

        // 비산 설정
        this.scatterDuration = config.scatterDuration || 3000;
        this.fadeStartTime = config.fadeStartTime || 2000;
        this.boundaryMargin = config.boundaryMargin || 100;

        // 콜백 (AP 변경 시 외부 알림)
        this.onApChanged = config.onApChanged || null;

        this.createFireflies();
    }

    // ===== 반딧불 생성 =====

    createFireflies() {
        this.syncFireflies();
    }

    /**
     * 반딧불을 currentAp에 맞게 동기화
     */
    syncFireflies() {
        // 비산 중이 아닌 반딧불만 제거
        const scattering = this.fireflies.filter(f => f.isScattering);
        const notScattering = this.fireflies.filter(f => !f.isScattering);

        notScattering.forEach(f => {
            if (f.sprite) f.sprite.destroy();
            if (f.trail) f.trail.destroy();
            if (f.glow) f.glow.destroy();
        });

        this.fireflies = [...scattering];

        // 현재 AP에 맞게 새 반딧불 생성
        const bigCount = Math.floor(this.currentAp / 5);
        const smallCount = this.currentAp % 5;
        const totalFireflies = bigCount + smallCount;

        // 현재 캐릭터 위치를 월드 앵커로 사용
        const anchorX = this.character.x;
        const anchorY = this.character.y + this.fireflyOffsetY;

        for (let i = 0; i < totalFireflies; i++) {
            const isBig = i < bigCount;
            const firefly = this.createSingleFirefly(i, totalFireflies, isBig, {
                worldAnchor: { x: anchorX, y: anchorY }
            });
            this.fireflies.push(firefly);
        }
    }

    createSingleFirefly(index, total, isBig, options = {}) {
        const size = isBig ? 14 : 5;
        const color = isBig ? 0xff6600 : 0xffdd44;
        const spawnOffsetY = isBig ? 2 : 0;

        // 월드 앵커 (궤도 중심점)
        const worldAnchor = options.worldAnchor || {
            x: this.character.x,
            y: this.character.y + this.fireflyOffsetY
        };

        // 분열로 생성된 경우 상대 위치
        const relativePos = options.relativePos || { x: 0, y: spawnOffsetY };

        const orbitParams = isBig ? {
            a: 35 + Math.random() * 20,
            b: 15 + Math.random() * 8,
            freqX: 0.6 + Math.random() * 0.2,
            freqY: 0.9 + Math.random() * 0.2,
            phase: (index / total) * Math.PI * 2 + Math.random() * 0.5,
            speed: 0.5 + Math.random() * 0.15,
            noiseOffset: Math.random() * 1000,
            damping: 0.01,
            inertia: 0.97
        } : {
            a: 40 + Math.random() * 20,
            b: 25 + Math.random() * 15,
            freqX: 1.5 + Math.random() * 0.6,
            freqY: 2.0 + Math.random() * 0.6,
            phase: (index / total) * Math.PI * 2 + Math.random() * 0.8,
            speed: 1.2 + Math.random() * 0.6,
            noiseOffset: Math.random() * 1000,
            damping: 0.12,
            inertia: 0.88
        };

        const coreColor = isBig ? 0xff8800 : color;
        const sprite = this.scene.add.circle(0, 0, size / 2, coreColor);
        sprite.setBlendMode(Phaser.BlendModes.NORMAL);

        const glowSize = isBig ? size * 0.67 : size;
        const glowAlpha = isBig ? 0.5 : 0.35;
        const glow = this.scene.add.circle(0, 0, glowSize, color, glowAlpha);
        glow.setBlendMode(Phaser.BlendModes.ADD);

        const trail = this.scene.add.graphics();
        trail.setBlendMode(Phaser.BlendModes.ADD);

        // 월드 컨테이너에 직접 추가
        if (this.parentContainer) {
            this.parentContainer.add(trail);
            this.parentContainer.add(glow);
            this.parentContainer.add(sprite);
        }

        // 초기 월드 위치
        const worldX = worldAnchor.x + relativePos.x;
        const worldY = worldAnchor.y + relativePos.y;

        sprite.setPosition(worldX, worldY);
        glow.setPosition(worldX, worldY);

        return {
            sprite,
            glow,
            trail,
            isBig,
            size,
            color,
            orbitParams,
            angle: orbitParams.phase,
            // 월드 좌표 기반
            worldAnchor: { ...worldAnchor },
            worldPos: { x: worldX, y: worldY },
            relativePos: { ...relativePos },
            targetPos: { x: relativePos.x, y: relativePos.y },
            velocity: { x: 0, y: 0 },
            acceleration: { x: 0, y: 0 },
            trailPositions: [],
            pulsePhase: Math.random() * Math.PI * 2,
            isScattering: false,
            scatterStartTime: 0
        };
    }

    // ===== 물리 업데이트 =====

    noise(x) {
        const n = Math.sin(x * 12.9898) * 43758.5453;
        return n - Math.floor(n);
    }

    update(delta) {
        const deltaSeconds = delta / 1000;
        const time = this.scene.time.now / 1000;
        const currentTime = this.scene.time.now;

        const toRemove = [];

        this.fireflies.forEach((firefly, index) => {
            const params = firefly.orbitParams;

            // 비산 중인 경우
            if (firefly.isScattering) {
                const elapsed = currentTime - firefly.scatterStartTime;

                if (elapsed >= this.scatterDuration || this.isOutOfBounds(firefly)) {
                    toRemove.push(index);
                    return;
                }

                let fadeAlpha = 1.0;
                if (elapsed >= this.fadeStartTime) {
                    fadeAlpha = 1.0 - (elapsed - this.fadeStartTime) / (this.scatterDuration - this.fadeStartTime);
                }

                // 비산 물리 (음수 damping으로 확산)
                const dx = firefly.targetPos.x - firefly.worldPos.x;
                const dy = firefly.targetPos.y - firefly.worldPos.y;
                firefly.acceleration.x = dx * params.damping;
                firefly.acceleration.y = dy * params.damping;
                firefly.velocity.x = firefly.velocity.x * params.inertia + firefly.acceleration.x;
                firefly.velocity.y = firefly.velocity.y * params.inertia + firefly.acceleration.y;
                firefly.worldPos.x += firefly.velocity.x;
                firefly.worldPos.y += firefly.velocity.y;

                firefly.pulsePhase += deltaSeconds * 2;
                const pulse = 1 + Math.sin(firefly.pulsePhase) * 0.1;

                firefly.sprite.setPosition(firefly.worldPos.x, firefly.worldPos.y);
                firefly.sprite.setScale(pulse);
                firefly.sprite.setAlpha(fadeAlpha);
                firefly.glow.setPosition(firefly.worldPos.x, firefly.worldPos.y);
                firefly.glow.setScale(pulse * 1.5);
                firefly.glow.setAlpha(fadeAlpha * 0.4);

                this.updateTrail(firefly, fadeAlpha);
                return;
            }

            // 일반 궤도 업데이트 (월드 좌표 기준)
            firefly.angle += params.speed * deltaSeconds;
            const noiseX = this.noise(time * 0.5 + params.noiseOffset) * 9;
            const noiseY = this.noise(time * 0.7 + params.noiseOffset + 100) * 7;

            // 상대 좌표 목표
            const targetRelX = Math.sin(firefly.angle * params.freqX) * params.a + noiseX;
            const targetRelY = Math.cos(firefly.angle * params.freqY) * params.b + noiseY;

            firefly.targetPos.x = targetRelX;
            firefly.targetPos.y = targetRelY;

            // 물리 (상대 좌표 기준)
            const dx = firefly.targetPos.x - firefly.relativePos.x;
            const dy = firefly.targetPos.y - firefly.relativePos.y;
            firefly.acceleration.x = dx * params.damping;
            firefly.acceleration.y = dy * params.damping;
            firefly.velocity.x = firefly.velocity.x * params.inertia + firefly.acceleration.x;
            firefly.velocity.y = firefly.velocity.y * params.inertia + firefly.acceleration.y;

            firefly.relativePos.x += firefly.velocity.x;
            firefly.relativePos.y += firefly.velocity.y;

            // 월드 좌표 계산
            firefly.worldPos.x = firefly.worldAnchor.x + firefly.relativePos.x;
            firefly.worldPos.y = firefly.worldAnchor.y + firefly.relativePos.y;

            // 원근감
            const normalizedY = (firefly.relativePos.y + params.b) / (params.b * 2);
            const depthScale = 0.85 + normalizedY * 0.3;
            const depthAlpha = 0.6 + normalizedY * 0.4;

            firefly.pulsePhase += deltaSeconds * 3;
            const pulse = 1 + Math.sin(firefly.pulsePhase) * 0.15;

            firefly.sprite.setPosition(firefly.worldPos.x, firefly.worldPos.y);
            firefly.sprite.setScale(depthScale * pulse);
            firefly.sprite.setAlpha(depthAlpha);
            firefly.glow.setPosition(firefly.worldPos.x, firefly.worldPos.y);
            firefly.glow.setScale(depthScale * pulse * 1.5);
            firefly.glow.setAlpha(depthAlpha * 0.4);

            const isInFront = firefly.relativePos.y > 0;
            firefly.sprite.setDepth(isInFront ? 1001 : 999);
            firefly.glow.setDepth(isInFront ? 1000 : 998);

            this.updateTrail(firefly);
        });

        // 역순 제거
        toRemove.reverse().forEach(index => {
            this.destroyFirefly(index);
        });
    }

    isOutOfBounds(firefly) {
        const camera = this.scene.cameras.main;
        const margin = this.boundaryMargin;

        return firefly.worldPos.x < camera.scrollX - margin ||
               firefly.worldPos.x > camera.scrollX + camera.width + margin ||
               firefly.worldPos.y < camera.scrollY - margin ||
               firefly.worldPos.y > camera.scrollY + camera.height + margin;
    }

    destroyFirefly(index) {
        const firefly = this.fireflies[index];
        if (firefly) {
            if (firefly.sprite) { firefly.sprite.destroy(); firefly.sprite = null; }
            if (firefly.glow) { firefly.glow.destroy(); firefly.glow = null; }
            if (firefly.trail) { firefly.trail.destroy(); firefly.trail = null; }
            this.fireflies.splice(index, 1);
        }
    }

    updateTrail(firefly, fadeAlpha = 1.0) {
        firefly.trailPositions.unshift({
            x: firefly.worldPos.x,
            y: firefly.worldPos.y
        });

        const maxTrail = firefly.isScattering ? 6 : 8;
        if (firefly.trailPositions.length > maxTrail) {
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

    // ===== AP 소모 시스템 =====

    consumeAp(amount) {
        const toConsume = Math.min(amount, this.currentAp);
        if (toConsume <= 0) return 0;

        // 필요시 대형 AP 분열
        this.ensureSmallAPs(toConsume);

        // 소모할 작은 AP 선택 (뒤에서부터)
        const toScatter = [];
        for (let i = this.fireflies.length - 1; i >= 0 && toScatter.length < toConsume; i--) {
            const f = this.fireflies[i];
            if (!f.isBig && !f.isScattering) {
                toScatter.push(f);
            }
        }

        // 먼저 모두 마킹 (중복 방지)
        toScatter.forEach(f => {
            f.isScattering = true;
            f.scatterStartTime = this.scene.time.now;
            f.orbitParams.damping = -0.02;
            // 비산 기준점 고정
            f.targetPos = { x: f.worldPos.x, y: f.worldPos.y };
            // 속도 초기화
            const speed = Math.sqrt(f.velocity.x * f.velocity.x + f.velocity.y * f.velocity.y);
            if (speed > 0.1) {
                const initSpeed = 0.5 + Math.random() * 0.5;
                f.velocity.x = (f.velocity.x / speed) * initSpeed;
                f.velocity.y = (f.velocity.y / speed) * initSpeed;
            } else {
                const angle = Math.random() * Math.PI * 2;
                f.velocity.x = Math.cos(angle) * 0.5;
                f.velocity.y = Math.sin(angle) * 0.5;
            }
        });

        // AP 값 업데이트
        this.currentAp -= toConsume;

        // 콜백 호출
        if (this.onApChanged) {
            this.onApChanged(this.currentAp);
        }

        return toConsume;
    }

    ensureSmallAPs(requiredCount) {
        const availableSmall = this.fireflies.filter(f => !f.isBig && !f.isScattering).length;
        if (availableSmall >= requiredCount) return;

        let needed = requiredCount - availableSmall;
        const bigFireflies = this.fireflies.filter(f => f.isBig && !f.isScattering);

        for (const big of bigFireflies) {
            if (needed <= 0) break;

            const splitAnchor = { x: big.worldAnchor.x, y: big.worldAnchor.y };
            const splitPos = { x: big.worldPos.x, y: big.worldPos.y };

            // 대형 제거
            const idx = this.fireflies.indexOf(big);
            if (idx !== -1) this.fireflies.splice(idx, 1);

            if (big.sprite) big.sprite.destroy();
            if (big.glow) big.glow.destroy();
            if (big.trail) big.trail.destroy();

            // 5개 작은 AP 생성
            const angles = [0, 72, 144, 216, 288];
            const radius = 8;

            for (let i = 0; i < 5; i++) {
                const angle = (angles[i] * Math.PI) / 180;
                const offX = Math.cos(angle) * radius;
                const offY = Math.sin(angle) * radius;

                const relX = splitPos.x - splitAnchor.x + offX;
                const relY = splitPos.y - splitAnchor.y + offY;

                const newFirefly = this.createSingleFirefly(
                    this.fireflies.length,
                    this.fireflies.length + 5,
                    false,
                    {
                        worldAnchor: splitAnchor,
                        relativePos: { x: relX, y: relY }
                    }
                );

                newFirefly.velocity.x = offX * 0.15;
                newFirefly.velocity.y = offY * 0.15;

                this.fireflies.push(newFirefly);
            }

            needed -= 5;
        }
    }

    // ===== 공개 메서드 =====

    setAp(value, animate = true) {
        const oldAp = this.currentAp;
        const newAp = Math.max(0, Math.min(this.maxAp, value));

        if (newAp < oldAp) {
            if (animate) {
                this.consumeAp(oldAp - newAp);
            } else {
                // 비산 없이 즉시 동기화
                this.currentAp = newAp;
                this.syncFireflies();
            }
        } else if (newAp > oldAp) {
            this.currentAp = newAp;
            this.syncFireflies();
        }

        return this.currentAp;
    }

    addAp(amount) {
        return this.setAp(this.currentAp + amount);
    }

    getAp() {
        return this.currentAp;
    }

    getMaxAp() {
        return this.maxAp;
    }

    destroy() {
        this.fireflies.forEach(f => {
            if (f.sprite) f.sprite.destroy();
            if (f.trail) f.trail.destroy();
            if (f.glow) f.glow.destroy();
        });
        this.fireflies = [];
    }
}
