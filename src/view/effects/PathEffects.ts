/**
 * Skyline Blue Path Effects
 *
 * TrailMesh/LineMesh를 이용한 방향성 있는 선택 항로 애니메이션
 * 최적 경로(Top) 달성 시 노드 공명 효과
 *
 * @module view/effects/PathEffects
 */

import {
    Scene,
    Vector3,
    Color3,
    Color4,
    Mesh,
    MeshBuilder,
    StandardMaterial,
    ParticleSystem,
    Texture,
    Animation,
    CubicEase,
    EasingFunction,
} from '@babylonjs/core';

// ============================================
// Path Effects 클래스
// ============================================

export class PathEffects {
    private scene: Scene;
    private animationIndex: number = 0;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    // ============================================
    // 방향성 있는 선택 항로 라인
    // ============================================

    /**
     * 방향성 있는 빛 흐름 라인 생성
     */
    createDirectionalLine(from: Vector3, to: Vector3, color: Color3): Mesh {
        // 메인 라인
        const line = MeshBuilder.CreateTube(
            `selectedLine_${this.animationIndex++}`,
            {
                path: [from, to],
                radius: 0.015,
                tessellation: 8,
                cap: Mesh.CAP_ALL,
            },
            this.scene
        );

        // 발광 머티리얼
        const material = new StandardMaterial(`lineMat_${this.animationIndex}`, this.scene);
        material.diffuseColor = color;
        material.emissiveColor = color.scale(0.7);
        material.specularColor = new Color3(0.5, 0.5, 0.5);
        material.alpha = 0.9;

        line.material = material;

        // 빛 흐름 애니메이션 추가
        this.addFlowAnimation(line, from, to, color);

        return line;
    }

    /**
     * 라인 위의 빛 흐름 애니메이션
     */
    private addFlowAnimation(line: Mesh, from: Vector3, to: Vector3, color: Color3): void {
        // 빛 입자 생성
        const flowParticle = MeshBuilder.CreateSphere(
            `flowParticle_${this.animationIndex}`,
            { diameter: 0.04, segments: 8 },
            this.scene
        );

        const particleMat = new StandardMaterial(`flowMat_${this.animationIndex}`, this.scene);
        particleMat.emissiveColor = color;
        particleMat.diffuseColor = color;
        particleMat.alpha = 0.8;
        flowParticle.material = particleMat;

        // 위치 애니메이션 (from → to 반복)
        const positionAnimation = new Animation(
            `flowAnim_${this.animationIndex}`,
            'position',
            30, // fps
            Animation.ANIMATIONTYPE_VECTOR3,
            Animation.ANIMATIONLOOPMODE_CYCLE
        );

        const easing = new CubicEase();
        easing.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);

        positionAnimation.setKeys([
            { frame: 0, value: from },
            { frame: 30, value: to },
            { frame: 60, value: from },
        ]);
        positionAnimation.setEasingFunction(easing);

        flowParticle.animations.push(positionAnimation);
        this.scene.beginAnimation(flowParticle, 0, 60, true);

        // 라인에 입자 연결 (dispose 시 함께 제거)
        line.metadata = { ...line.metadata, flowParticle };
    }

    // ============================================
    // 노드 공명 효과 (Top 등급)
    // ============================================

    /**
     * 금빛 공명 파티클 시스템
     */
    createNodeResonance(position: Vector3, color: Color3): ParticleSystem {
        const particleSystem = new ParticleSystem(
            `resonance_${this.animationIndex++}`,
            100,
            this.scene
        );

        // 기본 텍스처 (원형 그라데이션)
        particleSystem.particleTexture = this.createCircleTexture();

        // 방출 위치
        particleSystem.emitter = position;
        particleSystem.minEmitBox = new Vector3(-0.05, 0, -0.05);
        particleSystem.maxEmitBox = new Vector3(0.05, 0.1, 0.05);

        // 색상 (금빛)
        particleSystem.color1 = new Color4(color.r, color.g, color.b, 1);
        particleSystem.color2 = new Color4(color.r * 0.8, color.g * 0.8, color.b * 0.5, 0.8);
        particleSystem.colorDead = new Color4(color.r * 0.5, color.g * 0.5, color.b * 0.3, 0);

        // 크기
        particleSystem.minSize = 0.02;
        particleSystem.maxSize = 0.06;

        // 수명
        particleSystem.minLifeTime = 0.5;
        particleSystem.maxLifeTime = 1.5;

        // 방출
        particleSystem.emitRate = 30;
        particleSystem.gravity = new Vector3(0, 0.5, 0); // 위로 상승

        // 속도
        particleSystem.minEmitPower = 0.1;
        particleSystem.maxEmitPower = 0.3;
        particleSystem.updateSpeed = 0.01;

        // 블렌딩
        particleSystem.blendMode = ParticleSystem.BLENDMODE_ADD;

        particleSystem.start();

        // 3초 후 자동 정지
        setTimeout(() => {
            particleSystem.stop();
            setTimeout(() => particleSystem.dispose(), 2000);
        }, 3000);

        return particleSystem;
    }

    /**
     * 원형 그라데이션 텍스처 생성
     */
    private createCircleTexture(): Texture {
        const size = 64;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext('2d')!;
        const gradient = ctx.createRadialGradient(
            size / 2, size / 2, 0,
            size / 2, size / 2, size / 2
        );

        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        const texture = new Texture(
            canvas.toDataURL(),
            this.scene,
            false,
            true
        );

        return texture;
    }

    // ============================================
    // 노드 선택 펄스 효과
    // ============================================

    /**
     * 노드 선택 시 펄스 효과
     */
    createSelectionPulse(position: Vector3, color: Color3): void {
        // 확장되는 링
        const ring = MeshBuilder.CreateTorus(
            `pulse_${this.animationIndex++}`,
            {
                diameter: 0.1,
                thickness: 0.01,
                tessellation: 32,
            },
            this.scene
        );

        ring.position = position.add(new Vector3(0, 0.01, 0));
        ring.rotation.x = Math.PI / 2;

        const material = new StandardMaterial(`pulseMat_${this.animationIndex}`, this.scene);
        material.emissiveColor = color;
        material.alpha = 0.8;
        ring.material = material;

        // 스케일 애니메이션
        const scaleAnimation = new Animation(
            `pulseScale_${this.animationIndex}`,
            'scaling',
            30,
            Animation.ANIMATIONTYPE_VECTOR3,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        scaleAnimation.setKeys([
            { frame: 0, value: new Vector3(1, 1, 1) },
            { frame: 20, value: new Vector3(3, 1, 3) },
        ]);

        // 알파 애니메이션
        const alphaAnimation = new Animation(
            `pulseAlpha_${this.animationIndex}`,
            'material.alpha',
            30,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        alphaAnimation.setKeys([
            { frame: 0, value: 0.8 },
            { frame: 20, value: 0 },
        ]);

        ring.animations.push(scaleAnimation, alphaAnimation);

        this.scene.beginAnimation(ring, 0, 20, false, 1, () => {
            ring.dispose();
        });
    }

    // ============================================
    // 경로 완성 효과
    // ============================================

    /**
     * 경로 완성 시 전체 라인 발광
     */
    flashCompletePath(lines: Mesh[], color: Color3): void {
        for (const line of lines) {
            const material = line.material as StandardMaterial;
            if (!material) continue;

            const originalEmissive = material.emissiveColor.clone();

            // 발광 증가 애니메이션
            const glowAnimation = new Animation(
                'flashGlow',
                'material.emissiveColor',
                30,
                Animation.ANIMATIONTYPE_COLOR3,
                Animation.ANIMATIONLOOPMODE_CONSTANT
            );

            const brightColor = color.scale(1.5);

            glowAnimation.setKeys([
                { frame: 0, value: originalEmissive },
                { frame: 10, value: brightColor },
                { frame: 20, value: originalEmissive },
            ]);

            line.animations.push(glowAnimation);
            this.scene.beginAnimation(line, 0, 20, false);
        }
    }
}
