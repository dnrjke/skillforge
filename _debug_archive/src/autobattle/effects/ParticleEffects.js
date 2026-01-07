import Phaser from 'phaser';

/**
 * Phase 4.5: 스킬 타입별 파티클 및 시각 효과
 * Phaser 기본 도형을 활용한 파티클 시스템
 */
export default class ParticleEffects {
    constructor(scene) {
        this.scene = scene;
    }

    // ==========================================
    // 1. 공격 스킬 연출 (Attack Effect)
    // ==========================================

    /**
     * 타격 이펙트 - 폭발 느낌의 파티클
     * @param {number} x - 타격 위치 X
     * @param {number} y - 타격 위치 Y
     * @param {number} apCost - AP 소모량 (높을수록 강한 효과)
     */
    playAttackHitEffect(x, y, apCost = 3) {
        const intensity = Math.min(apCost / 3, 3);  // 1~3 배율
        const particleCount = Math.floor(8 + intensity * 4);

        // 폭발 파티클 생성
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 / particleCount) * i + Math.random() * 0.5;
            const speed = 100 + Math.random() * 100 * intensity;
            const size = 4 + Math.random() * 4;

            // 사각형 또는 원형 파티클
            const isSquare = Math.random() > 0.5;
            const particle = isSquare
                ? this.scene.add.rectangle(x, y, size, size, this.getAttackColor())
                : this.scene.add.circle(x, y, size / 2, this.getAttackColor());

            particle.setDepth(1500);
            particle.setBlendMode(Phaser.BlendModes.ADD);
            particle.setAlpha(0.9);

            // 방사형으로 퍼져나가는 애니메이션
            const targetX = x + Math.cos(angle) * speed;
            const targetY = y + Math.sin(angle) * speed;

            this.scene.tweens.add({
                targets: particle,
                x: targetX,
                y: targetY,
                alpha: 0,
                scaleX: 0.3,
                scaleY: 0.3,
                rotation: Math.random() * Math.PI * 2,
                duration: 200 + Math.random() * 100,
                ease: 'Power2.easeOut',
                onComplete: () => particle.destroy()
            });
        }

        // 중심 플래시 효과
        const flash = this.scene.add.circle(x, y, 20 + intensity * 10, 0xffff88, 0.8);
        flash.setDepth(1499);
        flash.setBlendMode(Phaser.BlendModes.ADD);

        this.scene.tweens.add({
            targets: flash,
            scaleX: 2,
            scaleY: 2,
            alpha: 0,
            duration: 150,
            ease: 'Power2.easeOut',
            onComplete: () => flash.destroy()
        });

        // 강력한 공격 시 추가 화면 효과
        if (apCost >= 5) {
            this.scene.cameras.main.shake(120, 0.012);
        }
    }

    /**
     * 공격 색상 (주황/노랑)
     */
    getAttackColor() {
        const colors = [0xff8800, 0xffaa00, 0xffcc00, 0xff6600, 0xffff44];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    /**
     * 슬래시 이펙트 (베기 궤적)
     */
    playSlashEffect(startX, startY, endX, endY) {
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        const angle = Math.atan2(endY - startY, endX - startX);

        // 슬래시 선
        const slash = this.scene.add.rectangle(
            midX, midY,
            80, 6,
            0xffffff
        );
        slash.setRotation(angle);
        slash.setDepth(1500);
        slash.setBlendMode(Phaser.BlendModes.ADD);
        slash.setAlpha(0.9);

        this.scene.tweens.add({
            targets: slash,
            scaleX: 1.5,
            scaleY: 0.2,
            alpha: 0,
            duration: 150,
            ease: 'Power2.easeOut',
            onComplete: () => slash.destroy()
        });
    }

    // ==========================================
    // 2. 힐 스킬 연출 (Heal Effect)
    // ==========================================

    /**
     * 힐 파티클 - 위로 솟구치는 부드러운 파티클
     * @param {number} x - 대상 X
     * @param {number} y - 대상 Y (발치 기준)
     * @param {number} healAmount - 회복량
     */
    playHealEffect(x, y, healAmount = 20) {
        const intensity = Math.min(healAmount / 20, 2);
        const particleCount = Math.floor(10 + intensity * 5);

        // 발치에서 위로 올라가는 파티클
        for (let i = 0; i < particleCount; i++) {
            const offsetX = (Math.random() - 0.5) * 60;
            const startY = y + 40;  // 발치에서 시작
            const delay = Math.random() * 200;

            const particle = this.scene.add.circle(
                x + offsetX,
                startY,
                3 + Math.random() * 3,
                this.getHealColor()
            );
            particle.setDepth(1500);
            particle.setBlendMode(Phaser.BlendModes.ADD);
            particle.setAlpha(0.8);

            // 위로 올라가며 사라짐
            this.scene.tweens.add({
                targets: particle,
                y: startY - 80 - Math.random() * 40,
                x: x + offsetX + (Math.random() - 0.5) * 30,
                alpha: 0,
                scaleX: 0.5,
                scaleY: 0.5,
                duration: 600 + Math.random() * 200,
                delay: delay,
                ease: 'Power1.easeOut',
                onComplete: () => particle.destroy()
            });
        }

        // 부드러운 녹색 글로우
        const glow = this.scene.add.ellipse(x, y, 80, 100, 0x44ff88, 0.4);
        glow.setDepth(1498);
        glow.setBlendMode(Phaser.BlendModes.ADD);

        this.scene.tweens.add({
            targets: glow,
            scaleX: 1.3,
            scaleY: 1.5,
            alpha: 0,
            duration: 500,
            ease: 'Power1.easeOut',
            onComplete: () => glow.destroy()
        });

        // 십자가 빛 효과
        this.playCrossLight(x, y - 30, 0x88ffaa);
    }

    /**
     * 힐 색상 (연녹색/흰색)
     */
    getHealColor() {
        const colors = [0x88ff88, 0xaaffaa, 0xccffcc, 0xffffff, 0x66ff99];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    /**
     * 십자가 빛 효과 (힐/버프용)
     */
    playCrossLight(x, y, color = 0xffffff) {
        const horizontal = this.scene.add.rectangle(x, y, 60, 4, color);
        const vertical = this.scene.add.rectangle(x, y, 4, 60, color);

        [horizontal, vertical].forEach(bar => {
            bar.setDepth(1500);
            bar.setBlendMode(Phaser.BlendModes.ADD);
            bar.setAlpha(0.9);

            this.scene.tweens.add({
                targets: bar,
                scaleX: bar === horizontal ? 2 : 0.5,
                scaleY: bar === horizontal ? 0.5 : 2,
                alpha: 0,
                duration: 300,
                ease: 'Power2.easeOut',
                onComplete: () => bar.destroy()
            });
        });
    }

    // ==========================================
    // 3. 방어/버프 스킬 연출 (Defense Effect)
    // ==========================================

    /**
     * 방어막 연출 - 회전하는 원형 파티클
     * @param {number} x - 캐릭터 X
     * @param {number} y - 캐릭터 Y
     */
    playDefenseEffect(x, y) {
        const shieldParticles = [];
        const particleCount = 12;

        // 원형으로 배치되는 파티클
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 / particleCount) * i;
            const radius = 50;
            const px = x + Math.cos(angle) * radius;
            const py = y + Math.sin(angle) * radius;

            const particle = this.scene.add.rectangle(
                px, py,
                8, 8,
                this.getDefenseColor()
            );
            particle.setDepth(1500);
            particle.setBlendMode(Phaser.BlendModes.ADD);
            particle.setAlpha(0.8);
            particle.setRotation(angle);

            shieldParticles.push({ particle, angle, radius });
        }

        // 회전 애니메이션
        let elapsed = 0;
        const rotationTimer = this.scene.time.addEvent({
            delay: 16,
            callback: () => {
                elapsed += 16;
                const progress = elapsed / 600;  // 0.6초 동안

                shieldParticles.forEach(({ particle, angle, radius }) => {
                    const currentAngle = angle + progress * Math.PI;
                    const currentRadius = radius * (1 - progress * 0.3);
                    particle.x = x + Math.cos(currentAngle) * currentRadius;
                    particle.y = y + Math.sin(currentAngle) * currentRadius;
                    particle.setRotation(currentAngle);
                    particle.setAlpha(0.8 * (1 - progress));
                    particle.setScale(1 - progress * 0.5);
                });

                if (elapsed >= 600) {
                    rotationTimer.remove();
                    shieldParticles.forEach(({ particle }) => particle.destroy());
                }
            },
            loop: true
        });

        // 중앙 방어막 원형
        const shield = this.scene.add.ellipse(x, y, 100, 120, 0x4488ff, 0.3);
        shield.setDepth(1499);
        shield.setBlendMode(Phaser.BlendModes.ADD);

        this.scene.tweens.add({
            targets: shield,
            scaleX: 1.2,
            scaleY: 1.2,
            alpha: 0,
            duration: 600,
            ease: 'Power1.easeOut',
            onComplete: () => shield.destroy()
        });

        // 육각형 테두리 효과
        this.playHexagonEffect(x, y);
    }

    /**
     * 방어 색상 (파란색/하늘색)
     */
    getDefenseColor() {
        const colors = [0x4488ff, 0x66aaff, 0x88ccff, 0xaaddff, 0x44aaff];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    /**
     * 육각형 보호막 효과
     */
    playHexagonEffect(x, y) {
        const graphics = this.scene.add.graphics();
        graphics.setDepth(1500);
        graphics.setBlendMode(Phaser.BlendModes.ADD);

        const drawHexagon = (alpha, scale) => {
            graphics.clear();
            graphics.lineStyle(2, 0x88ccff, alpha);

            const sides = 6;
            const radius = 55 * scale;

            graphics.beginPath();
            for (let i = 0; i <= sides; i++) {
                const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
                const px = x + Math.cos(angle) * radius;
                const py = y + Math.sin(angle) * radius;
                if (i === 0) graphics.moveTo(px, py);
                else graphics.lineTo(px, py);
            }
            graphics.strokePath();
        };

        let progress = 0;
        const hexTimer = this.scene.time.addEvent({
            delay: 16,
            callback: () => {
                progress += 0.03;
                const alpha = 1 - progress;
                const scale = 1 + progress * 0.3;
                drawHexagon(alpha, scale);

                if (progress >= 1) {
                    hexTimer.remove();
                    graphics.destroy();
                }
            },
            loop: true
        });
    }

    // ==========================================
    // 4. 휴식/AP 회복 연출
    // ==========================================

    /**
     * AP 회복 이펙트
     */
    playRestEffect(x, y) {
        // 부드러운 파란색 물결
        const wave = this.scene.add.ellipse(x, y, 40, 40, 0x44ccff, 0.5);
        wave.setDepth(1498);
        wave.setBlendMode(Phaser.BlendModes.ADD);

        this.scene.tweens.add({
            targets: wave,
            scaleX: 2.5,
            scaleY: 2.5,
            alpha: 0,
            duration: 600,
            ease: 'Power1.easeOut',
            onComplete: () => wave.destroy()
        });

        // 작은 별 파티클
        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 20 + Math.random() * 30;

            const star = this.scene.add.star(
                x + Math.cos(angle) * distance,
                y + Math.sin(angle) * distance,
                4, 2, 5,
                0x88ccff
            );
            star.setDepth(1500);
            star.setBlendMode(Phaser.BlendModes.ADD);
            star.setAlpha(0.8);
            star.setScale(0.5);

            this.scene.tweens.add({
                targets: star,
                y: star.y - 30,
                alpha: 0,
                rotation: Math.PI,
                scaleX: 0.2,
                scaleY: 0.2,
                duration: 500,
                delay: i * 50,
                ease: 'Power1.easeOut',
                onComplete: () => star.destroy()
            });
        }
    }

    // ==========================================
    // 5. 사망 이펙트
    // ==========================================

    /**
     * 사망 이펙트
     */
    playDeathEffect(x, y, isEnemy = false) {
        const baseColor = isEnemy ? 0xff4444 : 0x888888;

        // 파편 파티클
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 100;

            const particle = this.scene.add.rectangle(
                x, y,
                6 + Math.random() * 6,
                6 + Math.random() * 6,
                baseColor
            );
            particle.setDepth(1500);
            particle.setAlpha(0.8);

            this.scene.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed + 50,  // 중력 효과
                alpha: 0,
                rotation: Math.random() * Math.PI * 4,
                duration: 600,
                ease: 'Power1.easeOut',
                onComplete: () => particle.destroy()
            });
        }

        // 어두운 연기 효과
        const smoke = this.scene.add.ellipse(x, y, 60, 60, 0x333333, 0.5);
        smoke.setDepth(1497);

        this.scene.tweens.add({
            targets: smoke,
            scaleX: 2,
            scaleY: 1.5,
            y: y - 30,
            alpha: 0,
            duration: 800,
            ease: 'Power1.easeOut',
            onComplete: () => smoke.destroy()
        });
    }

    // ==========================================
    // 6. 치명타/마지막 일격 연출
    // ==========================================

    /**
     * 치명타 이펙트
     */
    playCriticalHitEffect(x, y) {
        // 큰 폭발
        this.playAttackHitEffect(x, y, 8);

        // "CRITICAL" 텍스트
        const critText = this.scene.add.text(x, y - 50, 'CRITICAL!', {
            fontSize: '24px',
            fill: '#ffff00',
            fontFamily: 'Almendra',
            fontStyle: 'bold',
            stroke: '#ff6600',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(2000);

        this.scene.tweens.add({
            targets: critText,
            y: critText.y - 40,
            scaleX: 1.3,
            scaleY: 1.3,
            alpha: 0,
            duration: 800,
            ease: 'Power2.easeOut',
            onComplete: () => critText.destroy()
        });

        // 강한 화면 흔들림
        this.scene.cameras.main.shake(150, 0.02);

        // 짧은 슬로우 모션 (선택적)
        this.playSlowMotion(100);
    }

    /**
     * 마지막 일격 (KO) 이펙트
     */
    playKOEffect(x, y) {
        // 화면 플래시
        const flash = this.scene.add.rectangle(
            this.scene.cameras.main.centerX,
            this.scene.cameras.main.centerY,
            this.scene.cameras.main.width,
            this.scene.cameras.main.height,
            0xffffff,
            0.5
        );
        flash.setScrollFactor(0);
        flash.setDepth(3000);

        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 300,
            ease: 'Power2.easeOut',
            onComplete: () => flash.destroy()
        });

        // 슬로우 모션
        this.playSlowMotion(200);

        // 사망 이펙트
        this.playDeathEffect(x, y, true);
    }

    /**
     * 슬로우 모션
     */
    playSlowMotion(duration = 100) {
        const originalTimeScale = this.scene.time.timeScale;
        this.scene.time.timeScale = 0.3;

        this.scene.time.addEvent({
            delay: duration * 0.3,  // 슬로우 상태에서의 시간
            callback: () => {
                this.scene.time.timeScale = originalTimeScale;
            }
        });
    }
}
