import Phaser from 'phaser';
import type {
    Vector2,
    VisibilityMode,
    OrbitParams,
    Firefly,
    FireflySystemConfig,
    FireflyCreateOptions,
    CharacterSprite
} from '../types/ui.types';

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
    private scene: Phaser.Scene;
    private character: CharacterSprite;
    private parentContainer: Phaser.GameObjects.Container | null;

    // AP 상태
    private maxAp: number;
    private currentAp: number;

    // 반딧불 배열
    private fireflies: Firefly[];
    private fireflyOffsetY: number;

    // 비산 설정
    private scatterDuration: number;
    private fadeStartTime: number;
    private boundaryMargin: number;

    // 콜백
    private onApChanged: ((newAp: number) => void) | null;

    // 가시성 모드
    private visibilityMode: VisibilityMode;

    // 잔류 모드 (사망 시)
    private isLingering: boolean;
    private lingeringAlpha: number;
    private lingeringSpeedMultiplier: number;

    constructor(scene: Phaser.Scene, character: CharacterSprite, config: FireflySystemConfig = {}) {
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

        // 콜백
        this.onApChanged = config.onApChanged || null;

        // 가시성 모드
        this.visibilityMode = 'all';

        // 잔류 모드
        this.isLingering = false;
        this.lingeringAlpha = 0.3;
        this.lingeringSpeedMultiplier = 0.2;

        this.createFireflies();
    }

    /**
     * 가시성 모드 설정
     */
    public setVisibilityMode(mode: VisibilityMode): void {
        this.visibilityMode = mode;
        this.applyVisibility();
    }

    /**
     * 현재 모드에 따라 모든 반딧불 가시성 적용
     */
    private applyVisibility(): void {
        this.fireflies.forEach(f => {
            this.applyFireflyVisibility(f);
        });
    }

    /**
     * 개별 반딧불에 가시성 적용
     */
    private applyFireflyVisibility(firefly: Firefly): void {
        let visible = false;

        switch (this.visibilityMode) {
            case 'hidden':
                visible = false;
                break;
            case 'scatter':
                visible = firefly.isScattering;
                break;
            case 'all':
            default:
                visible = true;
                break;
        }

        if (firefly.sprite) firefly.sprite.setVisible(visible);
        if (firefly.glow) firefly.glow.setVisible(visible);
        if (firefly.trail) firefly.trail.setVisible(visible);
    }

    // ===== 반딧불 생성 =====

    private createFireflies(): void {
        this.syncFireflies();
    }

    /**
     * 반딧불을 currentAp에 맞게 동기화
     */
    private syncFireflies(): void {
        const scattering = this.fireflies.filter(f => f.isScattering);
        const notScattering = this.fireflies.filter(f => !f.isScattering);

        notScattering.forEach(f => {
            if (f.sprite) f.sprite.destroy();
            if (f.trail) f.trail.destroy();
            if (f.glow) f.glow.destroy();
        });

        this.fireflies = [...scattering];

        const bigCount = Math.floor(this.currentAp / 5);
        const smallCount = this.currentAp % 5;
        const totalFireflies = bigCount + smallCount;

        const anchorX = this.character.x;
        const anchorY = this.character.y + this.fireflyOffsetY;

        for (let i = 0; i < totalFireflies; i++) {
            const isBig = i < bigCount;
            const firefly = this.createSingleFirefly(i, totalFireflies, isBig, {
                worldAnchor: { x: anchorX, y: anchorY }
            });
            this.fireflies.push(firefly);
            this.applyFireflyVisibility(firefly);
        }
    }

    private createSingleFirefly(
        index: number,
        total: number,
        isBig: boolean,
        options: FireflyCreateOptions = {}
    ): Firefly {
        const size = isBig ? 14 : 5;
        const color = isBig ? 0xff6600 : 0xffdd44;
        const spawnOffsetY = isBig ? 2 : 0;

        const worldAnchor: Vector2 = options.worldAnchor || {
            x: this.character.x,
            y: this.character.y + this.fireflyOffsetY
        };

        const relativePos: Vector2 = options.relativePos || { x: 0, y: spawnOffsetY };

        const orbitParams: OrbitParams = isBig ? {
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

        if (this.parentContainer) {
            this.parentContainer.add(trail);
            this.parentContainer.add(glow);
            this.parentContainer.add(sprite);
        }

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

    private noise(x: number): number {
        const n = Math.sin(x * 12.9898) * 43758.5453;
        return n - Math.floor(n);
    }

    public update(delta: number): void {
        const deltaSeconds = delta / 1000;
        const time = this.scene.time.now / 1000;
        const currentTime = this.scene.time.now;

        const toRemove: number[] = [];

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

                firefly.sprite?.setPosition(firefly.worldPos.x, firefly.worldPos.y);
                firefly.sprite?.setScale(pulse);
                firefly.sprite?.setAlpha(fadeAlpha);
                firefly.glow?.setPosition(firefly.worldPos.x, firefly.worldPos.y);
                firefly.glow?.setScale(pulse * 1.5);
                firefly.glow?.setAlpha(fadeAlpha * 0.4);

                this.updateTrail(firefly, fadeAlpha);
                return;
            }

            // 일반 궤도 업데이트
            const speedMult = this.isLingering ? this.lingeringSpeedMultiplier : 1.0;
            firefly.angle += params.speed * deltaSeconds * speedMult;
            const noiseX = this.noise(time * 0.5 + params.noiseOffset) * 9 * speedMult;
            const noiseY = this.noise(time * 0.7 + params.noiseOffset + 100) * 7 * speedMult;

            const targetRelX = Math.sin(firefly.angle * params.freqX) * params.a + noiseX;
            const targetRelY = Math.cos(firefly.angle * params.freqY) * params.b + noiseY;

            firefly.targetPos.x = targetRelX;
            firefly.targetPos.y = targetRelY;

            const dx = firefly.targetPos.x - firefly.relativePos.x;
            const dy = firefly.targetPos.y - firefly.relativePos.y;
            firefly.acceleration.x = dx * params.damping;
            firefly.acceleration.y = dy * params.damping;
            firefly.velocity.x = firefly.velocity.x * params.inertia + firefly.acceleration.x;
            firefly.velocity.y = firefly.velocity.y * params.inertia + firefly.acceleration.y;

            firefly.relativePos.x += firefly.velocity.x;
            firefly.relativePos.y += firefly.velocity.y;

            firefly.worldPos.x = firefly.worldAnchor.x + firefly.relativePos.x;
            firefly.worldPos.y = firefly.worldAnchor.y + firefly.relativePos.y;

            const normalizedY = (firefly.relativePos.y + params.b) / (params.b * 2);
            const depthScale = 0.85 + normalizedY * 0.3;
            let depthAlpha = 0.6 + normalizedY * 0.4;

            if (this.isLingering) {
                depthAlpha = this.lingeringAlpha;
            }

            firefly.pulsePhase += deltaSeconds * 3 * speedMult;
            const pulse = 1 + Math.sin(firefly.pulsePhase) * 0.15;

            firefly.sprite?.setPosition(firefly.worldPos.x, firefly.worldPos.y);
            firefly.sprite?.setScale(depthScale * pulse);
            firefly.sprite?.setAlpha(depthAlpha);
            firefly.glow?.setPosition(firefly.worldPos.x, firefly.worldPos.y);
            firefly.glow?.setScale(depthScale * pulse * 1.5);
            firefly.glow?.setAlpha(depthAlpha * 0.4);

            const isInFront = firefly.relativePos.y > 0;
            firefly.sprite?.setDepth(isInFront ? 1001 : 999);
            firefly.glow?.setDepth(isInFront ? 1000 : 998);

            const trailAlpha = this.isLingering ? this.lingeringAlpha : 1.0;
            this.updateTrail(firefly, trailAlpha);
        });

        toRemove.reverse().forEach(index => {
            this.destroyFirefly(index);
        });
    }

    private isOutOfBounds(firefly: Firefly): boolean {
        const camera = this.scene.cameras.main;
        const margin = this.boundaryMargin;

        return firefly.worldPos.x < camera.scrollX - margin ||
               firefly.worldPos.x > camera.scrollX + camera.width + margin ||
               firefly.worldPos.y < camera.scrollY - margin ||
               firefly.worldPos.y > camera.scrollY + camera.height + margin;
    }

    private destroyFirefly(index: number): void {
        const firefly = this.fireflies[index];
        if (firefly) {
            if (firefly.sprite) { firefly.sprite.destroy(); firefly.sprite = null; }
            if (firefly.glow) { firefly.glow.destroy(); firefly.glow = null; }
            if (firefly.trail) { firefly.trail.destroy(); firefly.trail = null; }
            this.fireflies.splice(index, 1);
        }
    }

    private updateTrail(firefly: Firefly, fadeAlpha: number = 1.0): void {
        firefly.trailPositions.unshift({
            x: firefly.worldPos.x,
            y: firefly.worldPos.y
        });

        const maxTrail = firefly.isScattering ? 6 : 8;
        if (firefly.trailPositions.length > maxTrail) {
            firefly.trailPositions.pop();
        }

        firefly.trail?.clear();
        if (firefly.trail && firefly.trailPositions.length > 1) {
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

    private consumeAp(amount: number): number {
        const toConsume = Math.min(amount, this.currentAp);
        if (toConsume <= 0) return 0;

        this.ensureSmallAPs(toConsume);

        const toScatter: Firefly[] = [];
        for (let i = this.fireflies.length - 1; i >= 0 && toScatter.length < toConsume; i--) {
            const f = this.fireflies[i];
            if (!f.isBig && !f.isScattering) {
                toScatter.push(f);
            }
        }

        toScatter.forEach(f => {
            f.isScattering = true;
            f.scatterStartTime = this.scene.time.now;
            f.orbitParams.damping = -0.02;
            f.targetPos = { x: f.worldPos.x, y: f.worldPos.y };

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
            this.applyFireflyVisibility(f);
        });

        this.currentAp -= toConsume;

        if (this.onApChanged) {
            this.onApChanged(this.currentAp);
        }

        return toConsume;
    }

    private ensureSmallAPs(requiredCount: number): void {
        const availableSmall = this.fireflies.filter(f => !f.isBig && !f.isScattering).length;
        if (availableSmall >= requiredCount) return;

        let needed = requiredCount - availableSmall;
        const bigFireflies = this.fireflies.filter(f => f.isBig && !f.isScattering);

        for (const big of bigFireflies) {
            if (needed <= 0) break;

            const splitAnchor: Vector2 = { x: big.worldAnchor.x, y: big.worldAnchor.y };
            const splitPos: Vector2 = { x: big.worldPos.x, y: big.worldPos.y };

            const idx = this.fireflies.indexOf(big);
            if (idx !== -1) this.fireflies.splice(idx, 1);

            if (big.sprite) big.sprite.destroy();
            if (big.glow) big.glow.destroy();
            if (big.trail) big.trail.destroy();

            const angles = [0, 72, 144, 216, 288];
            const radius = 2;

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

                newFirefly.velocity.x = offX * 0.3;
                newFirefly.velocity.y = offY * 0.3;

                this.fireflies.push(newFirefly);
                this.applyFireflyVisibility(newFirefly);
            }

            needed -= 5;
        }
    }

    // ===== 공개 메서드 =====

    public setAp(value: number, animate: boolean = true): number {
        const oldAp = this.currentAp;
        const newAp = Math.max(0, Math.min(this.maxAp, value));

        if (newAp < oldAp) {
            if (animate) {
                this.consumeAp(oldAp - newAp);
            } else {
                this.currentAp = newAp;
                this.syncFireflies();
            }
        } else if (newAp > oldAp) {
            this.currentAp = newAp;
            this.syncFireflies();
        }

        return this.currentAp;
    }

    public addAp(amount: number): number {
        return this.setAp(this.currentAp + amount);
    }

    public getAp(): number {
        return this.currentAp;
    }

    public getMaxAp(): number {
        return this.maxAp;
    }

    /**
     * 잔류 모드 설정 (사망 시 호출)
     */
    public setLingeringMode(): void {
        this.isLingering = true;

        this.fireflies.forEach(f => {
            if (f.sprite) {
                this.scene.tweens.add({
                    targets: f.sprite,
                    alpha: this.lingeringAlpha,
                    duration: 500,
                    ease: 'Power2'
                });
            }
            if (f.glow) {
                this.scene.tweens.add({
                    targets: f.glow,
                    alpha: this.lingeringAlpha * 0.4,
                    duration: 500,
                    ease: 'Power2'
                });
            }
        });
    }

    public destroy(): void {
        this.fireflies.forEach(f => {
            if (f.sprite) f.sprite.destroy();
            if (f.trail) f.trail.destroy();
            if (f.glow) f.glow.destroy();
        });
        this.fireflies = [];
    }
}
