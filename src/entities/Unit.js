// 키워드 기반 전투 시스템 - 유닛 클래스
// Unit: HP, AP, Speed, Position, Skills[] 보유
// Phase 4.5: 파티클 효과 연동

import { SkillSets, SkillPresets } from '../data/Skills.js';
import { PassiveSets } from '../data/PassiveSkills.js';
import Phaser from 'phaser';

export default class Unit {
    constructor(config) {
        // 기본 정보
        this.id = config.id;
        this.name = config.name;
        this.isEnemy = config.isEnemy || false;

        // 스탯
        this.maxHp = config.maxHp || 100;
        this.currentHp = config.currentHp ?? this.maxHp;
        this.maxAp = config.maxAp || 10;
        this.currentAp = config.currentAp ?? 0;
        this.speed = config.speed || 10;  // 행동 순서 결정
        this.defense = config.defense || 0;

        // 위치 정보
        this.position = config.position || 0;  // 0~5 인덱스
        this.row = config.row || 'front';      // 'front' or 'back'

        // 스킬 (우선순위 순으로 정렬됨)
        this.skills = this.initializeSkills(config.skills || config.skillSet);

        // 패시브 스킬
        this.passives = this.initializePassives(config.passives || config.skillSet);

        // PP(Passive Point) 시스템
        this.maxPp = config.maxPp || 2;
        this.currentPp = config.currentPp ?? this.maxPp;

        // AP 회복량 (대기 시)
        this.apRecovery = config.apRecovery || 6;

        // 상태
        this.isAlive = true;
        this.isDefending = false;
        this.passiveCooldowns = {};  // 패시브 쿨다운 추적

        // 시각적 연결 (Phaser 스프라이트)
        this.sprite = null;
        this.statusBar = null;

        // 지속 이펙트 (방어 태세 등)
        this.defenseShield = null;
        this.defenseParticles = null;
        this.defenseTimer = null;

        // 원래 위치 저장 (돌진 후 복귀용)
        this.originalX = 0;
        this.originalY = 0;
        this.originalDepth = 0;
    }

    initializeSkills(skillsOrSet) {
        if (Array.isArray(skillsOrSet)) {
            // 이미 스킬 배열인 경우
            return [...skillsOrSet].sort((a, b) => a.priority - b.priority);
        } else if (typeof skillsOrSet === 'string' && SkillSets[skillsOrSet]) {
            // 스킬셋 이름인 경우
            return [...SkillSets[skillsOrSet]].sort((a, b) => a.priority - b.priority);
        }
        // 기본 스킬셋
        return [...SkillSets.WARRIOR].sort((a, b) => a.priority - b.priority);
    }

    initializePassives(passivesOrSet) {
        if (Array.isArray(passivesOrSet)) {
            return [...passivesOrSet];
        } else if (typeof passivesOrSet === 'string' && PassiveSets[passivesOrSet]) {
            return [...PassiveSets[passivesOrSet]];
        }
        // 기본 패시브셋
        return PassiveSets.WARRIOR ? [...PassiveSets.WARRIOR] : [];
    }

    // PP 소모
    consumePp(amount) {
        this.currentPp = Math.max(0, this.currentPp - amount);
        if (this.statusBar) {
            this.statusBar.setPp(this.currentPp);
        }
    }

    // PP 회복
    recoverPp(amount = 1) {
        const oldPp = this.currentPp;
        this.currentPp = Math.min(this.maxPp, this.currentPp + amount);
        if (this.statusBar) {
            this.statusBar.setPp(this.currentPp);
        }
        return this.currentPp - oldPp;
    }

    // 특정 트리거에 해당하는 패시브 스킬 목록 반환
    getPassivesForTrigger(trigger) {
        return this.passives.filter(p => p.trigger === trigger);
    }

    // 패시브 발동 시도 (BattleManager에서 호출)
    tryActivatePassive(trigger, context) {
        const matchingPassives = this.getPassivesForTrigger(trigger);

        for (const passive of matchingPassives) {
            if (passive.canActivate(this)) {
                const result = passive.activate(this, context);
                return { passive, result };
            }
        }
        return null;
    }

    // Phaser 스프라이트 연결
    linkSprite(sprite) {
        this.sprite = sprite;
        this.statusBar = sprite.statusBar;

        // 원래 위치 저장
        this.originalX = sprite.x;
        this.originalY = sprite.y;
        this.originalDepth = sprite.depth;

        // StatusBar에 Unit 연결
        if (this.statusBar) {
            this.statusBar.unit = this;
            this.statusBar.maxAp = this.maxAp;
            this.statusBar.currentAp = this.currentAp;
            this.statusBar.setAp(this.currentAp, false);
            // PP 연결
            this.statusBar.maxPp = this.maxPp;
            this.statusBar.currentPp = this.currentPp;
            this.statusBar.setPp(this.currentPp, false);
        }
    }

    // 패시브 발동 연출 (머리 위에 텍스트)
    showPassiveActivation(scene, passive) {
        if (!this.sprite) return;

        const text = scene.add.text(
            this.sprite.x,
            this.sprite.y - 120,
            passive.displayName,
            {
                fontSize: '22px',
                fill: passive.color,
                fontFamily: 'Almendra',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5).setDepth(2500);

        // 반짝이는 효과
        scene.tweens.add({
            targets: text,
            y: text.y - 40,
            alpha: { from: 1, to: 0 },
            scaleX: { from: 0.8, to: 1.2 },
            scaleY: { from: 0.8, to: 1.2 },
            duration: 800,
            ease: 'Power2.easeOut',
            onComplete: () => text.destroy()
        });

        // 캐릭터 주위에 빛 효과
        const glow = scene.add.ellipse(
            this.sprite.x,
            this.sprite.y,
            80, 100,
            parseInt(passive.color.replace('#', '0x')),
            0.4
        ).setDepth(this.sprite.depth - 0.5);
        glow.setBlendMode(Phaser.BlendModes.ADD);

        scene.tweens.add({
            targets: glow,
            scaleX: 1.5,
            scaleY: 1.5,
            alpha: 0,
            duration: 400,
            ease: 'Power2.easeOut',
            onComplete: () => glow.destroy()
        });
    }

    // 현재 AP로 사용 가능한 최우선순위 스킬 선택
    selectSkill() {
        // 우선순위 순으로 정렬된 스킬 중 사용 가능한 첫 번째 스킬
        for (const skill of this.skills) {
            if (skill.canUse(this.currentAp)) {
                return skill;
            }
        }
        // 모든 스킬 사용 불가 시 대기
        return SkillPresets.WAIT;
    }

    // AP 소모
    consumeAp(amount) {
        this.currentAp = Math.max(0, this.currentAp - amount);
        if (this.statusBar) {
            this.statusBar.setAp(this.currentAp);
        }
    }

    // AP 회복
    recoverAp(amount = null) {
        const recovery = amount ?? this.apRecovery;
        this.currentAp = Math.min(this.maxAp, this.currentAp + recovery);
        if (this.statusBar) {
            this.statusBar.setAp(this.currentAp);
        }
        return recovery;
    }

    // 데미지 받기
    takeDamage(damage, scene = null) {
        // 방어 중이면 데미지 감소
        let finalDamage = damage;
        let wasDefending = false;
        if (this.isDefending) {
            finalDamage = Math.max(1, Math.floor(damage * 0.5));
            this.isDefending = false;  // 방어 해제
            wasDefending = true;
            // 방어 이펙트 제거
            this.removeDefenseEffect(scene);
        }

        // 방어력 적용
        finalDamage = Math.max(1, finalDamage - this.defense);

        this.currentHp = Math.max(0, this.currentHp - finalDamage);

        if (this.statusBar) {
            this.statusBar.damage(finalDamage);
        }

        if (this.currentHp <= 0) {
            this.isAlive = false;
        }

        return {
            damage: finalDamage,
            remainingHp: this.currentHp,
            isDead: !this.isAlive,
            wasDefending: wasDefending
        };
    }

    // 방어 이펙트 제거
    removeDefenseEffect(scene) {
        if (this.defenseShield) {
            if (scene) {
                // 깨지는 애니메이션
                scene.tweens.add({
                    targets: this.defenseShield,
                    alpha: 0,
                    scaleX: 1.5,
                    scaleY: 1.5,
                    duration: 200,
                    ease: 'Power2.easeOut',
                    onComplete: () => {
                        if (this.defenseShield) {
                            this.defenseShield.destroy();
                            this.defenseShield = null;
                        }
                    }
                });
            } else {
                this.defenseShield.destroy();
                this.defenseShield = null;
            }
        }
        if (this.defenseTimer) {
            this.defenseTimer.remove();
            this.defenseTimer = null;
        }
        if (this.defenseParticles) {
            this.defenseParticles.forEach(p => {
                if (p.obj) p.obj.destroy();
            });
            this.defenseParticles = null;
        }
    }

    // 회복
    heal(amount) {
        const actualHeal = Math.min(amount, this.maxHp - this.currentHp);
        this.currentHp += actualHeal;

        if (this.statusBar) {
            this.statusBar.heal(actualHeal);
        }

        return actualHeal;
    }

    // 방어 태세
    defend() {
        this.isDefending = true;
    }

    // 상태 문자열
    getStatus() {
        return `${this.name} [HP: ${this.currentHp}/${this.maxHp}, AP: ${this.currentAp}/${this.maxAp}]`;
    }

    // 사망 여부
    get isDead() {
        return !this.isAlive;
    }

    // ==========================================
    // Phase 4: 시각적 연출 (Juice)
    // ==========================================

    // 턴 획득 시 Ready Motion (더 눈에 띄게)
    playReadyMotion(scene) {
        return new Promise((resolve) => {
            if (!this.sprite) {
                resolve();
                return;
            }

            // 더 눈에 띄는 점프 + 스케일 효과
            scene.tweens.add({
                targets: this.sprite,
                y: this.sprite.y - 25,
                scaleX: this.sprite.scaleX * 1.1,
                scaleY: this.sprite.scaleY * 1.1,
                duration: 120,
                ease: 'Power2.easeOut',
                yoyo: true,
                onComplete: () => {
                    resolve();
                }
            });

            // 발밑에 작은 이펙트
            const readyRing = scene.add.ellipse(
                this.sprite.x,
                this.sprite.y + 60,
                60, 20,
                0xffff88, 0.6
            );
            readyRing.setDepth(this.sprite.depth - 0.5);
            readyRing.setBlendMode(Phaser.BlendModes.ADD);

            scene.tweens.add({
                targets: readyRing,
                scaleX: 1.5,
                scaleY: 1.5,
                alpha: 0,
                duration: 300,
                ease: 'Power1.easeOut',
                onComplete: () => readyRing.destroy()
            });
        });
    }

    // 공격 시퀀스: Dash -> Attack -> 피격 판정 -> 복귀
    async performAttack(target, skill, scene, damageCallback, particleEffects = null) {
        if (!this.sprite || !target.sprite) {
            damageCallback();
            return;
        }

        // 1. 원래 위치 저장
        const startX = this.sprite.x;
        const startY = this.sprite.y;
        const startDepth = this.sprite.depth;

        // 2. Depth 높이기 (다른 유닛 위로)
        this.sprite.setDepth(1000);
        if (this.sprite.statusBar) {
            this.sprite.statusBar.container.setDepth(1001);
        }

        // 3. 타겟 앞까지 Dash
        const dashOffset = this.isEnemy ? 100 : -100;  // 적이면 왼쪽, 아군이면 오른쪽으로
        const targetX = target.sprite.x + dashOffset;
        const targetY = target.sprite.y;

        await this.dashTo(scene, targetX, targetY);

        // 4. Attack 애니메이션 재생 + 타격 프레임에서 데미지
        await this.playAttackAnimation(scene, target, damageCallback, skill, particleEffects);

        // 5. 원래 자리로 복귀
        await this.dashTo(scene, startX, startY, true);

        // 6. Depth 복원
        this.sprite.setDepth(startDepth);
        if (this.sprite.statusBar) {
            this.sprite.statusBar.container.setDepth(1000);
        }
    }

    // Dash 이동 (Tween)
    dashTo(scene, targetX, targetY, isReturn = false) {
        return new Promise((resolve) => {
            const duration = isReturn ? 200 : 150;
            const ease = isReturn ? 'Power2.easeOut' : 'Power2.easeIn';

            scene.tweens.add({
                targets: this.sprite,
                x: targetX,
                y: targetY,
                duration: duration,
                ease: ease,
                onComplete: () => {
                    resolve();
                }
            });
        });
    }

    // Attack 애니메이션 + 타격 프레임에서 데미지 판정
    playAttackAnimation(scene, target, damageCallback, skill = null, particleEffects = null) {
        return new Promise((resolve) => {
            // attack 애니메이션 재생 (없으면 idle 사용)
            const hasAttackAnim = scene.anims.exists('knight_attack');

            if (hasAttackAnim) {
                this.sprite.play('knight_attack');
            }

            // 타격 타이밍 (애니메이션 중간 지점)
            const hitDelay = hasAttackAnim ? 150 : 100;

            // 히트스탑 영향 안 받도록 setTimeout 사용
            setTimeout(() => {
                // 데미지 판정 콜백
                damageCallback();

                // 피격 효과
                this.applyHitFeedback(scene, target, skill, particleEffects);
            }, hitDelay);

            // 애니메이션 완료 대기 - 히트스탑 영향 안 받도록 setTimeout 사용
            const animDuration = hasAttackAnim ? 400 : 200;
            setTimeout(() => {
                if (this.isAlive && this.sprite && this.sprite.active) {
                    this.sprite.play('knight_idle');
                }
                resolve();
            }, animDuration);
        });
    }

    // 피격 피드백 (타격감 극대화) + 파티클 효과
    applyHitFeedback(scene, target, skill = null, particleEffects = null) {
        if (!target.sprite) return;

        // 1. 붉은색 깜빡임 (0.1초) - setTimeout 사용 (히트스탑 영향 안받음)
        const originalTint = target.isEnemy ? 0xff8888 : 0xffffff;
        target.sprite.setTint(0xff0000);
        setTimeout(() => {
            if (target.sprite && target.sprite.active) {
                target.sprite.setTint(originalTint);
            }
        }, 100);

        // 2. 파티클 효과 (Phase 4.5)
        if (particleEffects) {
            const apCost = skill ? skill.apCost : 3;
            particleEffects.playAttackHitEffect(target.sprite.x, target.sprite.y, apCost);
        }

        // 3. 화면 흔들림 (AP 소모에 따라 강도 조절)
        const apCost = skill ? skill.apCost : 3;
        const shakeIntensity = 0.003 + (apCost / 100);
        const shakeDuration = 60 + apCost * 10;
        scene.cameras.main.shake(shakeDuration, shakeIntensity);

        // 4. 피격 애니메이션 (사망하지 않은 경우에만)
        if (target.isAlive && target.sprite && target.sprite.active) {
            target.sprite.play('knight_hit');
            target.sprite.once('animationcomplete', () => {
                // 애니메이션 완료 시점에 다시 생존 및 스프라이트 유효성 확인
                if (target.isAlive && target.sprite && target.sprite.active) {
                    target.sprite.play('knight_idle');
                }
            });
        }
    }

    // 플로팅 데미지 텍스트
    showFloatingDamage(scene, damage, isHeal = false) {
        if (!this.sprite) return;

        const color = isHeal ? '#44ff44' : '#ff4444';
        const prefix = isHeal ? '+' : '-';
        const yOffset = -80;

        const text = scene.add.text(
            this.sprite.x,
            this.sprite.y + yOffset,
            `${prefix}${damage}`,
            {
                fontSize: isHeal ? '26px' : '28px',
                fill: color,
                fontFamily: 'Almendra',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5).setDepth(2000);

        // 위로 솟구치며 사라지는 연출
        scene.tweens.add({
            targets: text,
            y: text.y - 50,
            alpha: 0,
            scaleX: isHeal ? 1 : 1.2,
            scaleY: isHeal ? 1 : 1.2,
            duration: 800,
            ease: 'Power2.easeOut',
            onComplete: () => {
                text.destroy();
            }
        });
    }

    // AP 변화 플로팅 텍스트
    showFloatingAp(scene, amount, isRecovery = false) {
        if (!this.sprite) return;

        const color = isRecovery ? '#44ccff' : '#ffcc00';
        const prefix = isRecovery ? '+' : '-';
        const yOffset = -60;

        const text = scene.add.text(
            this.sprite.x + 40,
            this.sprite.y + yOffset,
            `AP ${prefix}${Math.abs(amount)}`,
            {
                fontSize: '18px',
                fill: color,
                fontFamily: 'Almendra',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3
            }
        ).setOrigin(0.5).setDepth(2000);

        // 위로 솟구치며 사라지는 연출
        scene.tweens.add({
            targets: text,
            y: text.y - 30,
            alpha: 0,
            duration: 600,
            ease: 'Power2.easeOut',
            onComplete: () => {
                text.destroy();
            }
        });
    }

    // PP 변화 플로팅 텍스트
    showFloatingPp(scene, amount) {
        if (!this.sprite) return;

        const text = scene.add.text(
            this.sprite.x - 40,
            this.sprite.y - 60,
            `PP +${amount}`,
            {
                fontSize: '16px',
                fill: '#aa66ff',
                fontFamily: 'Almendra',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3
            }
        ).setOrigin(0.5).setDepth(2000);

        scene.tweens.add({
            targets: text,
            y: text.y - 25,
            alpha: 0,
            duration: 500,
            ease: 'Power2.easeOut',
            onComplete: () => text.destroy()
        });
    }

    // AP 부족 시 휴식 연출
    async performRest(scene, recoveredAp, particleEffects = null) {
        if (!this.sprite) return;

        // 1. "기력 부족" 또는 "..." 텍스트
        const exhaustedText = scene.add.text(
            this.sprite.x,
            this.sprite.y - 100,
            '기력 부족...',
            {
                fontSize: '16px',
                fill: '#aaaaaa',
                fontFamily: 'Almendra',
                fontStyle: 'italic',
                stroke: '#000000',
                strokeThickness: 2
            }
        ).setOrigin(0.5).setDepth(2000);

        // 잠시 후 사라짐
        scene.tweens.add({
            targets: exhaustedText,
            alpha: 0,
            duration: 800,
            delay: 500,
            onComplete: () => {
                exhaustedText.destroy();
            }
        });

        // 2. 파티클 효과 (Phase 4.5)
        if (particleEffects) {
            particleEffects.playRestEffect(this.sprite.x, this.sprite.y);
        }

        // 3. 반짝이는 회복 이펙트
        await this.playRecoveryEffect(scene);

        // 4. 파란색 AP 회복 숫자
        this.showFloatingAp(scene, recoveredAp, true);
    }

    // 회복 이펙트 (반짝임)
    playRecoveryEffect(scene) {
        return new Promise((resolve) => {
            if (!this.sprite) {
                resolve();
                return;
            }

            // 파란색 빛 효과
            const glow = scene.add.ellipse(
                this.sprite.x,
                this.sprite.y,
                80, 80,
                0x44ccff,
                0.5
            ).setDepth(this.sprite.depth - 0.5);
            glow.setBlendMode(Phaser.BlendModes.ADD);

            // 확장되며 사라지는 연출
            scene.tweens.add({
                targets: glow,
                scaleX: 2,
                scaleY: 2,
                alpha: 0,
                duration: 500,
                ease: 'Power2.easeOut',
                onComplete: () => {
                    glow.destroy();
                    resolve();
                }
            });

            // 캐릭터 살짝 빛남
            const originalTint = this.isEnemy ? 0xff8888 : 0xffffff;
            this.sprite.setTint(0x88ccff);
            scene.time.delayedCall(300, () => {
                if (this.sprite && this.sprite.active) {
                    this.sprite.setTint(originalTint);
                }
            });
        });
    }

    // 치유 스킬 연출 (파티클 연동)
    async performHeal(target, healAmount, scene, particleEffects = null) {
        if (!this.sprite || !target.sprite) return;

        // 파티클 효과 (Phase 4.5)
        if (particleEffects) {
            particleEffects.playHealEffect(target.sprite.x, target.sprite.y, healAmount);
        }

        // 기존 치유 이펙트
        const healGlow = scene.add.ellipse(
            target.sprite.x,
            target.sprite.y,
            60, 60,
            0x44ff44,
            0.6
        ).setDepth(target.sprite.depth - 0.5);
        healGlow.setBlendMode(Phaser.BlendModes.ADD);

        // 확장되며 사라지는 연출
        scene.tweens.add({
            targets: healGlow,
            scaleX: 1.5,
            scaleY: 1.5,
            alpha: 0,
            duration: 400,
            ease: 'Power2.easeOut',
            onComplete: () => {
                healGlow.destroy();
            }
        });

        // 대상 캐릭터 녹색 빛남
        const originalTint = target.isEnemy ? 0xff8888 : 0xffffff;
        target.sprite.setTint(0x88ff88);
        scene.time.delayedCall(300, () => {
            if (target.sprite && target.sprite.active) {
                target.sprite.setTint(originalTint);
            }
        });

        // 회복 숫자 표시 (초록색)
        target.showFloatingDamage(scene, healAmount, true);
    }

    // 방어 스킬 연출 (파티클 연동) + 지속 이펙트
    async performDefend(scene, particleEffects = null) {
        if (!this.sprite) return;

        // 기존 방어 이펙트 제거
        this.removeDefenseEffect(scene);

        // 파티클 효과 (Phase 4.5)
        if (particleEffects) {
            particleEffects.playDefenseEffect(this.sprite.x, this.sprite.y);
        }

        // 초기 폭발 이펙트 (파란 방패 느낌)
        const burstShield = scene.add.ellipse(
            this.sprite.x,
            this.sprite.y,
            100, 120,
            0x4488ff,
            0.6
        ).setDepth(this.sprite.depth + 0.5);
        burstShield.setBlendMode(Phaser.BlendModes.ADD);

        // 펄스 후 사라짐
        scene.tweens.add({
            targets: burstShield,
            scaleX: 1.3,
            scaleY: 1.3,
            alpha: 0,
            duration: 400,
            ease: 'Power2.easeOut',
            onComplete: () => burstShield.destroy()
        });

        // 지속 방어막 이펙트 생성
        this.createPersistentDefenseEffect(scene);

        // 캐릭터 파란색 빛남
        const originalTint = this.isEnemy ? 0xff8888 : 0xffffff;
        this.sprite.setTint(0x88aaff);
        scene.time.delayedCall(400, () => {
            if (this.sprite && this.sprite.active) {
                this.sprite.setTint(originalTint);
            }
        });
    }

    // 지속 방어막 이펙트 생성
    createPersistentDefenseEffect(scene) {
        if (!this.sprite) return;

        // 육각형 방어막 (지속)
        const graphics = scene.add.graphics();
        graphics.setDepth(this.sprite.depth + 0.3);
        graphics.setBlendMode(Phaser.BlendModes.ADD);

        const drawHexagon = () => {
            if (!this.sprite || !this.isDefending) {
                graphics.destroy();
                return;
            }

            graphics.clear();
            graphics.lineStyle(2, 0x66aaff, 0.6);

            const x = this.sprite.x;
            const y = this.sprite.y;
            const sides = 6;
            const radius = 55;

            graphics.beginPath();
            for (let i = 0; i <= sides; i++) {
                const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
                const px = x + Math.cos(angle) * radius;
                const py = y + Math.sin(angle) * radius;
                if (i === 0) graphics.moveTo(px, py);
                else graphics.lineTo(px, py);
            }
            graphics.strokePath();

            // 내부 글로우
            graphics.fillStyle(0x4488ff, 0.15);
            graphics.beginPath();
            for (let i = 0; i <= sides; i++) {
                const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
                const px = x + Math.cos(angle) * radius;
                const py = y + Math.sin(angle) * radius;
                if (i === 0) graphics.moveTo(px, py);
                else graphics.lineTo(px, py);
            }
            graphics.closePath();
            graphics.fill();
        };

        this.defenseShield = graphics;

        // 회전하는 작은 파티클들
        this.defenseParticles = [];
        const particleCount = 6;
        for (let i = 0; i < particleCount; i++) {
            const particle = scene.add.rectangle(
                this.sprite.x,
                this.sprite.y,
                6, 6,
                0x88ccff
            );
            particle.setDepth(this.sprite.depth + 0.4);
            particle.setBlendMode(Phaser.BlendModes.ADD);
            particle.setAlpha(0.7);
            this.defenseParticles.push({
                obj: particle,
                angle: (Math.PI * 2 / particleCount) * i,
                radius: 50
            });
        }

        // 지속적인 업데이트
        let elapsed = 0;
        this.defenseTimer = scene.time.addEvent({
            delay: 16,
            callback: () => {
                if (!this.isDefending || !this.sprite) {
                    this.removeDefenseEffect(scene);
                    return;
                }

                elapsed += 16;
                const pulse = 0.9 + Math.sin(elapsed * 0.005) * 0.1;

                drawHexagon();

                // 파티클 회전
                this.defenseParticles.forEach((p, idx) => {
                    const angle = p.angle + elapsed * 0.002;
                    const radius = p.radius * pulse;
                    p.obj.x = this.sprite.x + Math.cos(angle) * radius;
                    p.obj.y = this.sprite.y + Math.sin(angle) * radius;
                    p.obj.setRotation(angle);
                    p.obj.setAlpha(0.5 + Math.sin(elapsed * 0.01 + idx) * 0.3);
                });
            },
            loop: true
        });
    }
}
