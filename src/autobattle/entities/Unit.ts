/**
 * 키워드 기반 전투 시스템 - 유닛 클래스
 * Unit: HP, AP, Speed, Position, Skills[] 보유
 */

import { SkillSets, SkillPresets, Skill, SkillSetId } from '../data/Skills';
import { PassiveSets, PassiveSkill, PassiveSetId } from '../data/PassiveSkills';
import type { PassiveTrigger, PassiveContext, DamageResult } from '../../shared/types/game.types';
import Phaser from 'phaser';

// 타입 정의
type RowType = 'front' | 'middle' | 'back';

interface StatusBar {
    unit?: Unit;
    maxAp: number;
    currentAp: number;
    maxPp: number;
    currentPp: number;
    container: Phaser.GameObjects.Container;
    setAp: (value: number, animate?: boolean) => void;
    setPp: (value: number, animate?: boolean) => void;
    damage: (amount: number) => void;
    heal: (amount: number) => void;
}

interface UnitSprite extends Phaser.GameObjects.Sprite {
    statusBar?: StatusBar;
}

interface DefenseParticle {
    obj: Phaser.GameObjects.Rectangle;
    angle: number;
    radius: number;
}

interface UnitConfig {
    id: string;
    name: string;
    isEnemy?: boolean;
    maxHp?: number;
    currentHp?: number;
    maxAp?: number;
    currentAp?: number;
    speed?: number;
    defense?: number;
    position?: number;
    row?: RowType;
    skills?: Skill[];
    skillSet?: SkillSetId;
    passives?: PassiveSkill[];
    maxPp?: number;
    currentPp?: number;
    apRecovery?: number;
}

interface PassiveActivationResult {
    passive: PassiveSkill;
    result: any;
}

export default class Unit {
    // 기본 정보
    id: string;
    name: string;
    isEnemy: boolean;

    // 스탯
    maxHp: number;
    currentHp: number;
    maxAp: number;
    currentAp: number;
    speed: number;
    defense: number;

    // 위치 정보
    position: number;
    row: RowType;

    // 스킬
    skills: Skill[];
    passives: PassiveSkill[];

    // PP 시스템
    maxPp: number;
    currentPp: number;
    apRecovery: number;

    // 상태
    isAlive: boolean;
    isDefending: boolean;
    passiveCooldowns: Record<string, number>;

    // 시각적 연결
    sprite: UnitSprite | null;
    statusBar: StatusBar | null;

    // 지속 이펙트
    defenseShield: Phaser.GameObjects.Graphics | null;
    defenseParticles: DefenseParticle[] | null;
    defenseTimer: Phaser.Time.TimerEvent | null;

    // 원래 위치
    originalX: number;
    originalY: number;
    originalDepth: number;

    constructor(config: UnitConfig) {
        // 기본 정보
        this.id = config.id;
        this.name = config.name;
        this.isEnemy = config.isEnemy || false;

        // 스탯
        this.maxHp = config.maxHp || 100;
        this.currentHp = config.currentHp ?? this.maxHp;
        this.maxAp = config.maxAp || 10;
        this.currentAp = config.currentAp ?? 0;
        this.speed = config.speed || 10;
        this.defense = config.defense || 0;

        // 위치 정보
        this.position = config.position || 0;
        this.row = config.row || 'front';

        // 스킬 (우선순위 순으로 정렬됨)
        this.skills = this.initializeSkills(config.skills || config.skillSet);

        // 패시브 스킬
        this.passives = this.initializePassives(config.passives || config.skillSet);

        // PP 시스템
        this.maxPp = config.maxPp || 2;
        this.currentPp = config.currentPp ?? this.maxPp;
        this.apRecovery = config.apRecovery || 6;

        // 상태
        this.isAlive = true;
        this.isDefending = false;
        this.passiveCooldowns = {};

        // 시각적 연결
        this.sprite = null;
        this.statusBar = null;

        // 지속 이펙트
        this.defenseShield = null;
        this.defenseParticles = null;
        this.defenseTimer = null;

        // 원래 위치
        this.originalX = 0;
        this.originalY = 0;
        this.originalDepth = 0;
    }

    private initializeSkills(skillsOrSet?: Skill[] | SkillSetId): Skill[] {
        if (Array.isArray(skillsOrSet)) {
            return [...skillsOrSet].sort((a, b) => a.priority - b.priority);
        } else if (typeof skillsOrSet === 'string' && SkillSets[skillsOrSet]) {
            return [...SkillSets[skillsOrSet]].sort((a, b) => a.priority - b.priority);
        }
        return [...SkillSets.WARRIOR].sort((a, b) => a.priority - b.priority);
    }

    private initializePassives(passivesOrSet?: PassiveSkill[] | SkillSetId): PassiveSkill[] {
        if (Array.isArray(passivesOrSet)) {
            return [...passivesOrSet];
        } else if (typeof passivesOrSet === 'string' && PassiveSets[passivesOrSet as PassiveSetId]) {
            return [...PassiveSets[passivesOrSet as PassiveSetId]];
        }
        return PassiveSets.WARRIOR ? [...PassiveSets.WARRIOR] : [];
    }

    // PP 소모
    consumePp(amount: number): void {
        this.currentPp = Math.max(0, this.currentPp - amount);
        if (this.statusBar) {
            this.statusBar.setPp(this.currentPp);
        }
    }

    // PP 회복
    recoverPp(amount: number = 1): number {
        const oldPp = this.currentPp;
        this.currentPp = Math.min(this.maxPp, this.currentPp + amount);
        if (this.statusBar) {
            this.statusBar.setPp(this.currentPp);
        }
        return this.currentPp - oldPp;
    }

    // 특정 트리거에 해당하는 패시브 스킬 목록 반환
    getPassivesForTrigger(trigger: PassiveTrigger): PassiveSkill[] {
        return this.passives.filter(p => p.trigger === trigger);
    }

    // 패시브 발동 시도
    tryActivatePassive(trigger: PassiveTrigger, context: PassiveContext): PassiveActivationResult | null {
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
    linkSprite(sprite: UnitSprite): void {
        this.sprite = sprite;
        this.statusBar = sprite.statusBar || null;

        this.originalX = sprite.x;
        this.originalY = sprite.y;
        this.originalDepth = sprite.depth;

        if (this.statusBar) {
            this.statusBar.unit = this;
            this.statusBar.maxAp = this.maxAp;
            this.statusBar.currentAp = this.currentAp;
            this.statusBar.setAp(this.currentAp, false);
            this.statusBar.maxPp = this.maxPp;
            this.statusBar.currentPp = this.currentPp;
            this.statusBar.setPp(this.currentPp, false);
        }
    }

    // 패시브 발동 연출
    showPassiveActivation(scene: Phaser.Scene, passive: PassiveSkill): void {
        if (!this.sprite) return;

        const text = scene.add.text(
            this.sprite.x,
            this.sprite.y - 120,
            passive.displayName,
            {
                fontSize: '22px',
                color: passive.color,
                fontFamily: 'Almendra',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5).setDepth(2500);

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

        const colorValue = parseInt(passive.color.replace('#', ''), 16);
        const glow = scene.add.ellipse(
            this.sprite.x,
            this.sprite.y,
            80, 100,
            colorValue,
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
    selectSkill(): Skill {
        for (const skill of this.skills) {
            if (skill.canUse(this.currentAp)) {
                return skill;
            }
        }
        return SkillPresets.WAIT;
    }

    // AP 소모
    consumeAp(amount: number): void {
        this.currentAp = Math.max(0, this.currentAp - amount);
        if (this.statusBar) {
            this.statusBar.setAp(this.currentAp);
        }
    }

    // AP 회복
    recoverAp(amount: number | null = null): number {
        const recovery = amount ?? this.apRecovery;
        this.currentAp = Math.min(this.maxAp, this.currentAp + recovery);
        if (this.statusBar) {
            this.statusBar.setAp(this.currentAp);
        }
        return recovery;
    }

    // 데미지 받기
    takeDamage(damage: number, scene: Phaser.Scene | null = null): DamageResult {
        let finalDamage = damage;
        let wasDefending = false;

        if (this.isDefending) {
            finalDamage = Math.max(1, Math.floor(damage * 0.5));
            this.isDefending = false;
            wasDefending = true;
            this.removeDefenseEffect(scene);
        }

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
            wasDefending
        };
    }

    // 방어 이펙트 제거
    removeDefenseEffect(scene: Phaser.Scene | null): void {
        if (this.defenseShield) {
            if (scene) {
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
    heal(amount: number): number {
        const actualHeal = Math.min(amount, this.maxHp - this.currentHp);
        this.currentHp += actualHeal;

        if (this.statusBar) {
            this.statusBar.heal(actualHeal);
        }

        return actualHeal;
    }

    // 방어 태세
    defend(): void {
        this.isDefending = true;
    }

    // 상태 문자열
    getStatus(): string {
        return `${this.name} [HP: ${this.currentHp}/${this.maxHp}, AP: ${this.currentAp}/${this.maxAp}]`;
    }

    // 사망 여부
    get isDead(): boolean {
        return !this.isAlive;
    }

    // ==========================================
    // 시각적 연출
    // ==========================================

    playReadyMotion(scene: Phaser.Scene): Promise<void> {
        return new Promise((resolve) => {
            if (!this.sprite) {
                resolve();
                return;
            }

            scene.tweens.add({
                targets: this.sprite,
                y: this.sprite.y - 25,
                scaleX: this.sprite.scaleX * 1.1,
                scaleY: this.sprite.scaleY * 1.1,
                duration: 120,
                ease: 'Power2.easeOut',
                yoyo: true,
                onComplete: () => resolve()
            });

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

    async performAttack(
        target: Unit,
        skill: Skill,
        scene: Phaser.Scene,
        damageCallback: () => void,
        particleEffects: any = null
    ): Promise<void> {
        if (!this.sprite || !target.sprite) {
            damageCallback();
            return;
        }

        const startX = this.sprite.x;
        const startY = this.sprite.y;
        const startDepth = this.sprite.depth;

        this.sprite.setDepth(1000);
        if (this.sprite.statusBar) {
            this.sprite.statusBar.container.setDepth(1001);
        }

        const dashOffset = this.isEnemy ? 100 : -100;
        const targetX = target.sprite.x + dashOffset;
        const targetY = target.sprite.y;

        await this.dashTo(scene, targetX, targetY);
        await this.playAttackAnimation(scene, target, damageCallback, skill, particleEffects);
        await this.dashTo(scene, startX, startY, true);

        this.sprite.setDepth(startDepth);
        if (this.sprite.statusBar) {
            this.sprite.statusBar.container.setDepth(1000);
        }
    }

    private dashTo(
        scene: Phaser.Scene,
        targetX: number,
        targetY: number,
        isReturn: boolean = false
    ): Promise<void> {
        return new Promise((resolve) => {
            if (!this.sprite) {
                resolve();
                return;
            }

            const duration = isReturn ? 200 : 150;
            const ease = isReturn ? 'Power2.easeOut' : 'Power2.easeIn';

            scene.tweens.add({
                targets: this.sprite,
                x: targetX,
                y: targetY,
                duration,
                ease,
                onComplete: () => resolve()
            });
        });
    }

    private playAttackAnimation(
        scene: Phaser.Scene,
        target: Unit,
        damageCallback: () => void,
        skill: Skill | null = null,
        particleEffects: any = null
    ): Promise<void> {
        return new Promise((resolve) => {
            if (!this.sprite) {
                damageCallback();
                resolve();
                return;
            }

            const hasAttackAnim = scene.anims.exists('knight_attack');

            if (hasAttackAnim) {
                this.sprite.play('knight_attack');
            }

            const hitDelay = hasAttackAnim ? 150 : 100;

            setTimeout(() => {
                damageCallback();
                this.applyHitFeedback(scene, target, skill, particleEffects);
            }, hitDelay);

            const animDuration = hasAttackAnim ? 400 : 200;
            setTimeout(() => {
                if (this.isAlive && this.sprite && this.sprite.active) {
                    this.sprite.play('knight_idle');
                }
                resolve();
            }, animDuration);
        });
    }

    private applyHitFeedback(
        scene: Phaser.Scene,
        target: Unit,
        skill: Skill | null = null,
        particleEffects: any = null
    ): void {
        if (!target.sprite) return;

        const originalTint = target.isEnemy ? 0xff8888 : 0xffffff;
        target.sprite.setTint(0xff0000);
        setTimeout(() => {
            if (target.sprite && target.sprite.active) {
                target.sprite.setTint(originalTint);
            }
        }, 100);

        if (particleEffects) {
            const apCost = skill ? skill.apCost : 3;
            particleEffects.playAttackHitEffect(target.sprite.x, target.sprite.y, apCost);
        }

        const apCost = skill ? skill.apCost : 3;
        const shakeIntensity = 0.003 + (apCost / 100);
        const shakeDuration = 60 + apCost * 10;
        scene.cameras.main.shake(shakeDuration, shakeIntensity);

        if (target.isAlive && target.sprite && target.sprite.active) {
            target.sprite.play('knight_hit');
            target.sprite.once('animationcomplete', () => {
                if (target.isAlive && target.sprite && target.sprite.active) {
                    target.sprite.play('knight_idle');
                }
            });
        }
    }

    showFloatingDamage(scene: Phaser.Scene, damage: number, isHeal: boolean = false): void {
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
                color,
                fontFamily: 'Almendra',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5).setDepth(2000);

        scene.tweens.add({
            targets: text,
            y: text.y - 50,
            alpha: 0,
            scaleX: isHeal ? 1 : 1.2,
            scaleY: isHeal ? 1 : 1.2,
            duration: 800,
            ease: 'Power2.easeOut',
            onComplete: () => text.destroy()
        });
    }

    showFloatingAp(scene: Phaser.Scene, amount: number, isRecovery: boolean = false): void {
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
                color,
                fontFamily: 'Almendra',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3
            }
        ).setOrigin(0.5).setDepth(2000);

        scene.tweens.add({
            targets: text,
            y: text.y - 30,
            alpha: 0,
            duration: 600,
            ease: 'Power2.easeOut',
            onComplete: () => text.destroy()
        });
    }

    showFloatingPp(scene: Phaser.Scene, amount: number): void {
        if (!this.sprite) return;

        const text = scene.add.text(
            this.sprite.x - 40,
            this.sprite.y - 60,
            `PP +${amount}`,
            {
                fontSize: '16px',
                color: '#aa66ff',
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

    async performRest(scene: Phaser.Scene, recoveredAp: number, particleEffects: any = null): Promise<void> {
        if (!this.sprite) return;

        const exhaustedText = scene.add.text(
            this.sprite.x,
            this.sprite.y - 100,
            '기력 부족...',
            {
                fontSize: '16px',
                color: '#aaaaaa',
                fontFamily: 'Almendra',
                fontStyle: 'italic',
                stroke: '#000000',
                strokeThickness: 2
            }
        ).setOrigin(0.5).setDepth(2000);

        scene.tweens.add({
            targets: exhaustedText,
            alpha: 0,
            duration: 800,
            delay: 500,
            onComplete: () => exhaustedText.destroy()
        });

        if (particleEffects) {
            particleEffects.playRestEffect(this.sprite.x, this.sprite.y);
        }

        await this.playRecoveryEffect(scene);
        this.showFloatingAp(scene, recoveredAp, true);
    }

    private playRecoveryEffect(scene: Phaser.Scene): Promise<void> {
        return new Promise((resolve) => {
            if (!this.sprite) {
                resolve();
                return;
            }

            const glow = scene.add.ellipse(
                this.sprite.x,
                this.sprite.y,
                80, 80,
                0x44ccff,
                0.5
            ).setDepth(this.sprite.depth - 0.5);
            glow.setBlendMode(Phaser.BlendModes.ADD);

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

            const originalTint = this.isEnemy ? 0xff8888 : 0xffffff;
            this.sprite.setTint(0x88ccff);
            scene.time.delayedCall(300, () => {
                if (this.sprite && this.sprite.active) {
                    this.sprite.setTint(originalTint);
                }
            });
        });
    }

    async performHeal(
        target: Unit,
        healAmount: number,
        scene: Phaser.Scene,
        particleEffects: any = null
    ): Promise<void> {
        if (!this.sprite || !target.sprite) return;

        if (particleEffects) {
            particleEffects.playHealEffect(target.sprite.x, target.sprite.y, healAmount);
        }

        const healGlow = scene.add.ellipse(
            target.sprite.x,
            target.sprite.y,
            60, 60,
            0x44ff44,
            0.6
        ).setDepth(target.sprite.depth - 0.5);
        healGlow.setBlendMode(Phaser.BlendModes.ADD);

        scene.tweens.add({
            targets: healGlow,
            scaleX: 1.5,
            scaleY: 1.5,
            alpha: 0,
            duration: 400,
            ease: 'Power2.easeOut',
            onComplete: () => healGlow.destroy()
        });

        const originalTint = target.isEnemy ? 0xff8888 : 0xffffff;
        target.sprite.setTint(0x88ff88);
        scene.time.delayedCall(300, () => {
            if (target.sprite && target.sprite.active) {
                target.sprite.setTint(originalTint);
            }
        });

        target.showFloatingDamage(scene, healAmount, true);
    }

    async performDefend(scene: Phaser.Scene, particleEffects: any = null): Promise<void> {
        if (!this.sprite) return;

        this.removeDefenseEffect(scene);

        if (particleEffects) {
            particleEffects.playDefenseEffect(this.sprite.x, this.sprite.y);
        }

        const burstShield = scene.add.ellipse(
            this.sprite.x,
            this.sprite.y,
            100, 120,
            0x4488ff,
            0.6
        ).setDepth(this.sprite.depth + 0.5);
        burstShield.setBlendMode(Phaser.BlendModes.ADD);

        scene.tweens.add({
            targets: burstShield,
            scaleX: 1.3,
            scaleY: 1.3,
            alpha: 0,
            duration: 400,
            ease: 'Power2.easeOut',
            onComplete: () => burstShield.destroy()
        });

        this.createPersistentDefenseEffect(scene);

        const originalTint = this.isEnemy ? 0xff8888 : 0xffffff;
        this.sprite.setTint(0x88aaff);
        scene.time.delayedCall(400, () => {
            if (this.sprite && this.sprite.active) {
                this.sprite.setTint(originalTint);
            }
        });
    }

    private createPersistentDefenseEffect(scene: Phaser.Scene): void {
        if (!this.sprite) return;

        const graphics = scene.add.graphics();
        graphics.setDepth(this.sprite.depth + 0.3);
        graphics.setBlendMode(Phaser.BlendModes.ADD);

        const drawHexagon = (): void => {
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

                if (this.defenseParticles) {
                    this.defenseParticles.forEach((p, idx) => {
                        const angle = p.angle + elapsed * 0.002;
                        const radius = p.radius * pulse;
                        p.obj.x = this.sprite!.x + Math.cos(angle) * radius;
                        p.obj.y = this.sprite!.y + Math.sin(angle) * radius;
                        p.obj.setRotation(angle);
                        p.obj.setAlpha(0.5 + Math.sin(elapsed * 0.01 + idx) * 0.3);
                    });
                }
            },
            loop: true
        });
    }
}
