// 전투 연출 시스템 - 카메라, 히트스탑, 스포트라이트, 데미지 숫자 등
// 전투 로직과 분리된 순수 연출 담당

export default class BattlePresentation {
    constructor(scene) {
        this.scene = scene;

        // 카메라 상태
        this.originalZoom = 1;
        this.defaultCenterX = 640;
        this.defaultCenterY = 360;
    }

    // ==========================================
    // 카메라 연출
    // ==========================================

    /**
     * 전투 포커스 카메라 (공격자-피격자 중앙으로 줌인)
     * @param {Unit} attacker - 공격자
     * @param {Unit} target - 피격자
     * @param {number} apCost - AP 소모량 (줌 강도 결정)
     */
    async cameraFocusOnCombat(attacker, target, apCost = 3) {
        return new Promise((resolve) => {
            if (!attacker.sprite || !target.sprite) {
                resolve();
                return;
            }

            const centerX = (attacker.sprite.x + target.sprite.x) / 2;
            const centerY = (attacker.sprite.y + target.sprite.y) / 2;

            // 현재 줌 저장
            this.originalZoom = this.scene.cameras.main.zoom || 1;

            // AP에 따른 줌 강도 (1-3 AP: 1.1x, 4-5 AP: 1.2x, 6+ AP: 1.3x)
            const zoomLevel = apCost >= 6 ? 1.3 : (apCost >= 4 ? 1.2 : 1.1);
            const duration = apCost >= 5 ? 200 : 150;

            // 동시에 pan과 zoom
            this.scene.cameras.main.pan(centerX, centerY, duration, 'Power2');
            this.scene.cameras.main.zoomTo(zoomLevel, duration, 'Power2', false, (camera, progress) => {
                if (progress === 1) resolve();
            });
        });
    }

    /**
     * 카메라 원위치 복귀
     */
    async cameraReset() {
        return new Promise((resolve) => {
            const targetZoom = this.originalZoom || 1;
            this.scene.cameras.main.pan(this.defaultCenterX, this.defaultCenterY, 250, 'Power2');
            this.scene.cameras.main.zoomTo(targetZoom, 250, 'Power2', false, (camera, progress) => {
                if (progress === 1) {
                    this.originalZoom = 1;
                    resolve();
                }
            });
        });
    }

    // ==========================================
    // 히트스탑 & 화면 흔들림
    // ==========================================

    /**
     * 히트스탑 효과 (타격 시 일시 정지)
     * @param {number} apCost - AP 소모량
     * @param {boolean} isCritical - 크리티컬 여부
     */
    playHitStop(apCost, isCritical = false) {
        // AP 소모량에 따른 히트스탑 강도
        const baseStopTime = 30;
        const stopTime = baseStopTime + (apCost * 5) + (isCritical ? 30 : 0);

        // 시간 스케일 멈춤
        const originalTimeScale = this.scene.time.timeScale;
        this.scene.time.timeScale = 0;

        // 화면 흔들림 (AP에 비례)
        const shakeIntensity = 0.005 + (apCost * 0.002) + (isCritical ? 0.01 : 0);
        this.scene.cameras.main.shake(100, shakeIntensity);

        // 히트스탑 후 복귀
        setTimeout(() => {
            if (this.scene && this.scene.time) {
                this.scene.time.timeScale = originalTimeScale;
            }
        }, stopTime);

        // 안전장치: 최대 200ms 후 강제 복구
        setTimeout(() => {
            if (this.scene && this.scene.time && this.scene.time.timeScale === 0) {
                console.warn('[Presentation] HitStop safety restore triggered');
                this.scene.time.timeScale = 1;
            }
        }, 200);
    }

    // ==========================================
    // 스포트라이트 효과
    // ==========================================

    /**
     * 유닛에 스포트라이트 표시
     * @param {Unit} unit - 스포트라이트를 받을 유닛
     */
    showSpotlight(unit) {
        if (!unit.sprite) return;

        // 기존 스포트라이트 제거
        if (unit.sprite.spotlight) {
            unit.sprite.spotlight.destroy();
        }

        // 연한 원형 스포트라이트 생성 (캐릭터 발 밑)
        const spotlight = this.scene.add.ellipse(
            unit.sprite.x,
            unit.sprite.y + 80,
            140, 50,
            0xffff88,
            0.35
        );
        spotlight.setDepth(unit.sprite.depth - 0.5);

        // 펄스 애니메이션
        this.scene.tweens.add({
            targets: spotlight,
            scaleX: 1.1,
            scaleY: 1.1,
            alpha: 0.6,
            duration: 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        unit.sprite.spotlight = spotlight;
    }

    /**
     * 유닛 스포트라이트 제거
     * @param {Unit} unit - 스포트라이트를 제거할 유닛
     */
    hideSpotlight(unit) {
        if (unit.sprite && unit.sprite.spotlight) {
            this.scene.tweens.add({
                targets: unit.sprite.spotlight,
                alpha: 0,
                duration: 200,
                onComplete: () => {
                    if (unit.sprite.spotlight) {
                        unit.sprite.spotlight.destroy();
                        unit.sprite.spotlight = null;
                    }
                }
            });
        }
    }

    // ==========================================
    // 데미지/힐 숫자 표시
    // ==========================================

    /**
     * 데미지 숫자 표시
     * @param {Unit} target - 피격 대상
     * @param {number} damage - 데미지량
     * @param {boolean} isCritical - 크리티컬 여부
     * @param {string|null} customText - 커스텀 텍스트 (예: 'MISS')
     */
    showDamageNumber(target, damage, isCritical = false, customText = null) {
        if (!target.sprite) return;

        // MISS나 커스텀 텍스트 처리
        if (customText === 'MISS') {
            const missText = this.scene.add.text(
                target.sprite.x,
                target.sprite.y - 80,
                'MISS!',
                {
                    fontSize: '28px',
                    fill: '#aaaaaa',
                    fontFamily: 'Arial',
                    fontStyle: 'italic',
                    stroke: '#000000',
                    strokeThickness: 3
                }
            ).setOrigin(0.5).setDepth(2000);

            this.scene.tweens.add({
                targets: missText,
                y: missText.y - 40,
                alpha: 0,
                duration: 600,
                ease: 'Power2.easeOut',
                onComplete: () => missText.destroy()
            });
            return;
        }

        const fontSize = isCritical ? '42px' : '28px';
        const color = isCritical ? '#ffff00' : '#ff4444';
        const yOffset = -80;

        const text = this.scene.add.text(
            target.sprite.x,
            target.sprite.y + yOffset,
            `-${damage}`,
            {
                fontSize: fontSize,
                fill: color,
                fontFamily: 'Arial',
                fontStyle: 'bold',
                stroke: isCritical ? '#ff6600' : '#000000',
                strokeThickness: isCritical ? 6 : 4
            }
        ).setOrigin(0.5).setDepth(2000);

        // 크리티컬 시 추가 텍스트
        if (isCritical) {
            const critLabel = this.scene.add.text(
                target.sprite.x,
                target.sprite.y + yOffset - 35,
                'CRITICAL!',
                {
                    fontSize: '18px',
                    fill: '#ffcc00',
                    fontFamily: 'Arial',
                    fontStyle: 'bold',
                    stroke: '#ff6600',
                    strokeThickness: 3
                }
            ).setOrigin(0.5).setDepth(2000);

            this.scene.tweens.add({
                targets: critLabel,
                y: critLabel.y - 30,
                alpha: 0,
                scaleX: 1.3,
                scaleY: 1.3,
                duration: 800,
                ease: 'Power2.easeOut',
                onComplete: () => critLabel.destroy()
            });
        }

        // 위로 솟구치며 사라지는 연출
        this.scene.tweens.add({
            targets: text,
            y: text.y - 50,
            alpha: 0,
            scaleX: isCritical ? 1.3 : 1.2,
            scaleY: isCritical ? 1.3 : 1.2,
            duration: 800,
            ease: 'Power2.easeOut',
            onComplete: () => text.destroy()
        });
    }

    /**
     * 힐 숫자 표시
     * @param {Unit} target - 힐 대상
     * @param {number} healAmount - 회복량
     */
    showHealNumber(target, healAmount) {
        if (!target.sprite) return;

        const text = this.scene.add.text(
            target.sprite.x,
            target.sprite.y - 80,
            `+${healAmount}`,
            {
                fontSize: '28px',
                fill: '#44ff88',
                fontFamily: 'Arial',
                fontStyle: 'bold',
                stroke: '#006622',
                strokeThickness: 4
            }
        ).setOrigin(0.5).setDepth(2000);

        this.scene.tweens.add({
            targets: text,
            y: text.y - 50,
            alpha: 0,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 800,
            ease: 'Power2.easeOut',
            onComplete: () => text.destroy()
        });
    }

    // ==========================================
    // 사망 연출
    // ==========================================

    /**
     * 사망 애니메이션 재생
     * @param {Unit} unit - 사망한 유닛
     */
    playDeathAnimation(unit) {
        if (!unit.sprite) return;
        unit.sprite.play('knight_death');
    }
}
