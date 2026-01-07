/**
 * Skyline Blue Navigation Scene
 *
 * Babylon.js를 이용한 항로 설정 화면 구성
 * 2.5D 세로 뷰 모바일 최적화
 *
 * @module view/scene/NavigationScene
 */

import {
    Engine,
    Scene,
    ArcRotateCamera,
    HemisphericLight,
    Vector3,
    Color3,
    Color4,
    MeshBuilder,
    StandardMaterial,
    Mesh,
    PointerEventTypes,
    AbstractMesh,
} from '@babylonjs/core';
import { DijkstraEngine, PathNode, PathEdge } from '../../logic/path/DijkstraEngine';
import { PathEffects } from '../effects/PathEffects';
import { GRADE_DEFINITIONS } from '../../config/NavigationTerms';

// ============================================
// 타입 정의
// ============================================

export interface NavigationSceneConfig {
    canvas: HTMLCanvasElement;
    engine: DijkstraEngine;
    onNodeSelected?: (nodeId: string) => void;
    onRouteComplete?: () => void;
}

interface NodeMesh {
    id: string;
    mesh: Mesh;
    glowMesh: Mesh;
    type: 'start' | 'waypoint' | 'end';
}

// ============================================
// Navigation Scene 클래스
// ============================================

export class NavigationScene {
    private babylonEngine: Engine;
    private scene: Scene;
    private _camera: ArcRotateCamera; // Stored for future animation use
    private dijkstraEngine: DijkstraEngine;
    private pathEffects: PathEffects;

    private nodeMeshes: Map<string, NodeMesh> = new Map();
    private guideLinesGroup: Mesh[] = [];
    private selectedLinesGroup: Mesh[] = [];

    private config: NavigationSceneConfig;

    // 색상 테마 (블루 아카이브 / 스타레일 참조)
    private readonly COLORS = {
        background: new Color4(0.04, 0.04, 0.08, 1),
        nodeStart: Color3.FromHexString('#4a9eff'),
        nodeWaypoint: Color3.FromHexString('#888899'),
        nodeEnd: Color3.FromHexString('#ff6b6b'),
        nodeSelected: Color3.FromHexString('#66ff99'),
        nodeHover: Color3.FromHexString('#ffffff'),
        guideLine: new Color4(1, 1, 1, 0.15),
        selectedLine: Color3.FromHexString('#66ff99'),
    };

    // 노드 크기 (정규화 좌표 기준)
    private readonly NODE_RADIUS = 0.04;
    private readonly SCENE_WIDTH = 2;    // -1 to 1
    private readonly SCENE_HEIGHT = 3.5; // 세로 모바일 비율

    constructor(config: NavigationSceneConfig) {
        this.config = config;
        this.dijkstraEngine = config.engine;

        // Babylon.js 초기화
        this.babylonEngine = new Engine(config.canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true,
        });

        this.scene = this.createScene();
        this._camera = this.createCamera();
        this.pathEffects = new PathEffects(this.scene);

        this.setupLights();
        this.setupPointerEvents();

        // 렌더 루프
        this.babylonEngine.runRenderLoop(() => {
            this.scene.render();
        });

        // 리사이즈 대응
        window.addEventListener('resize', () => {
            this.babylonEngine.resize();
        });
    }

    // ============================================
    // 접근자
    // ============================================

    /**
     * 카메라 접근 (애니메이션/줌 용도)
     */
    getCamera(): ArcRotateCamera {
        return this._camera;
    }

    // ============================================
    // 씬 초기화
    // ============================================

    private createScene(): Scene {
        const scene = new Scene(this.babylonEngine);
        scene.clearColor = this.COLORS.background;
        return scene;
    }

    private createCamera(): ArcRotateCamera {
        // 2.5D 세로 뷰: 위에서 약간 기울어진 시점
        const camera = new ArcRotateCamera(
            'camera',
            Math.PI / 2,       // alpha: 정면
            Math.PI / 4,       // beta: 45도 기울기
            5,                 // radius: 거리
            new Vector3(0, 0, 0),
            this.scene
        );

        // 터치 조작 비활성화 (노드 선택만 허용)
        camera.inputs.clear();

        return camera;
    }

    private setupLights(): void {
        // 환경광
        const hemisphericLight = new HemisphericLight(
            'hemisphericLight',
            new Vector3(0, 1, 0.3),
            this.scene
        );
        hemisphericLight.intensity = 0.8;
        hemisphericLight.groundColor = new Color3(0.1, 0.1, 0.2);
    }

    // ============================================
    // 노드 생성
    // ============================================

    /**
     * 노드들을 씬에 배치
     */
    buildNodes(): void {
        const nodes = this.dijkstraEngine.getNodes();

        for (const node of nodes) {
            this.createNodeMesh(node);
        }
    }

    private createNodeMesh(node: PathNode): void {
        // 정규화 좌표를 씬 좌표로 변환
        const x = (node.x - 0.5) * this.SCENE_WIDTH;
        const z = (node.y - 0.5) * this.SCENE_HEIGHT; // y를 z로 (세로 방향)
        const y = 0; // 평면 위

        // 노드 메시 (원형)
        const mesh = MeshBuilder.CreateCylinder(
            `node_${node.id}`,
            {
                diameter: this.NODE_RADIUS * this.SCENE_WIDTH * 2,
                height: 0.05,
                tessellation: 32,
            },
            this.scene
        );
        mesh.position = new Vector3(x, y, z);

        // 글로우 메시 (약간 큰 반투명 원)
        const glowMesh = MeshBuilder.CreateCylinder(
            `glow_${node.id}`,
            {
                diameter: this.NODE_RADIUS * this.SCENE_WIDTH * 3,
                height: 0.02,
                tessellation: 32,
            },
            this.scene
        );
        glowMesh.position = new Vector3(x, -0.01, z);

        // 머티리얼 설정
        const material = new StandardMaterial(`mat_${node.id}`, this.scene);
        const glowMaterial = new StandardMaterial(`glowMat_${node.id}`, this.scene);

        // 노드 타입별 색상
        let baseColor: Color3;
        switch (node.type) {
            case 'start':
                baseColor = this.COLORS.nodeStart;
                break;
            case 'end':
                baseColor = this.COLORS.nodeEnd;
                break;
            default:
                baseColor = this.COLORS.nodeWaypoint;
        }

        material.diffuseColor = baseColor;
        material.emissiveColor = baseColor.scale(0.3);
        material.specularColor = new Color3(0.3, 0.3, 0.3);

        glowMaterial.diffuseColor = baseColor;
        glowMaterial.alpha = 0.2;
        glowMaterial.emissiveColor = baseColor.scale(0.5);

        mesh.material = material;
        glowMesh.material = glowMaterial;

        // 메타데이터 설정 (피킹용)
        mesh.metadata = { nodeId: node.id, type: node.type };

        this.nodeMeshes.set(node.id, {
            id: node.id,
            mesh,
            glowMesh,
            type: node.type,
        });

        // 선택된 노드면 하이라이트
        if (node.isSelected) {
            this.highlightNode(node.id, true);
        }
    }

    // ============================================
    // 가이드 라인 (무지향성)
    // ============================================

    /**
     * 인접 노드간 가이드 라인 렌더링
     */
    buildGuideLines(): void {
        const edges = this.dijkstraEngine.getEdges();

        for (const edge of edges) {
            this.createGuideLine(edge);
        }
    }

    private createGuideLine(edge: PathEdge): void {
        const fromNode = this.dijkstraEngine.getNode(edge.fromId);
        const toNode = this.dijkstraEngine.getNode(edge.toId);

        if (!fromNode || !toNode) return;

        const fromPos = this.nodeToScenePosition(fromNode);
        const toPos = this.nodeToScenePosition(toNode);

        const line = MeshBuilder.CreateLines(
            `guide_${edge.fromId}_${edge.toId}`,
            {
                points: [fromPos, toPos],
            },
            this.scene
        );

        line.color = new Color3(1, 1, 1);
        line.alpha = 0.15;

        this.guideLinesGroup.push(line);
    }

    private nodeToScenePosition(node: PathNode): Vector3 {
        const x = (node.x - 0.5) * this.SCENE_WIDTH;
        const z = (node.y - 0.5) * this.SCENE_HEIGHT;
        return new Vector3(x, 0.03, z);
    }

    // ============================================
    // 선택 항로 (방향성)
    // ============================================

    /**
     * 선택된 경로 시각화 업데이트
     */
    updateSelectedPath(): void {
        // 기존 선택 라인 제거
        for (const line of this.selectedLinesGroup) {
            line.dispose();
        }
        this.selectedLinesGroup = [];

        const selectedPath = this.dijkstraEngine.getSelectedPath();

        // 노드 하이라이트 업데이트
        for (const [nodeId] of this.nodeMeshes) {
            const node = this.dijkstraEngine.getNode(nodeId);
            this.highlightNode(nodeId, node?.isSelected ?? false);
        }

        // 선택 경로 라인 생성
        for (let i = 0; i < selectedPath.length - 1; i++) {
            const fromNode = this.dijkstraEngine.getNode(selectedPath[i]);
            const toNode = this.dijkstraEngine.getNode(selectedPath[i + 1]);

            if (fromNode && toNode) {
                this.createSelectedLine(fromNode, toNode);
            }
        }
    }

    private createSelectedLine(fromNode: PathNode, toNode: PathNode): void {
        const fromPos = this.nodeToScenePosition(fromNode);
        const toPos = this.nodeToScenePosition(toNode);

        // PathEffects를 사용한 방향성 있는 라인
        const line = this.pathEffects.createDirectionalLine(
            fromPos,
            toPos,
            this.COLORS.selectedLine
        );

        this.selectedLinesGroup.push(line);
    }

    // ============================================
    // 노드 하이라이트
    // ============================================

    private highlightNode(nodeId: string, selected: boolean): void {
        const nodeMesh = this.nodeMeshes.get(nodeId);
        if (!nodeMesh) return;

        const material = nodeMesh.mesh.material as StandardMaterial;
        const glowMaterial = nodeMesh.glowMesh.material as StandardMaterial;

        if (selected) {
            material.diffuseColor = this.COLORS.nodeSelected;
            material.emissiveColor = this.COLORS.nodeSelected.scale(0.5);
            glowMaterial.diffuseColor = this.COLORS.nodeSelected;
            glowMaterial.alpha = 0.4;
            glowMaterial.emissiveColor = this.COLORS.nodeSelected.scale(0.7);

            // 글로우 크기 증가
            nodeMesh.glowMesh.scaling = new Vector3(1.3, 1, 1.3);
        } else {
            // 원래 색상으로 복구
            let baseColor: Color3;
            switch (nodeMesh.type) {
                case 'start':
                    baseColor = this.COLORS.nodeStart;
                    break;
                case 'end':
                    baseColor = this.COLORS.nodeEnd;
                    break;
                default:
                    baseColor = this.COLORS.nodeWaypoint;
            }

            material.diffuseColor = baseColor;
            material.emissiveColor = baseColor.scale(0.3);
            glowMaterial.diffuseColor = baseColor;
            glowMaterial.alpha = 0.2;
            glowMaterial.emissiveColor = baseColor.scale(0.5);
            nodeMesh.glowMesh.scaling = new Vector3(1, 1, 1);
        }
    }

    /**
     * Top 등급 달성 시 금빛 공명 효과
     */
    showTopGradeEffect(): void {
        const grade = this.dijkstraEngine.evaluateGrade();
        if (grade !== 'top') return;

        const goldColor = Color3.FromHexString(GRADE_DEFINITIONS.top.color);

        // 모든 선택된 노드에 금빛 효과
        for (const nodeId of this.dijkstraEngine.getSelectedPath()) {
            const nodeMesh = this.nodeMeshes.get(nodeId);
            if (!nodeMesh) continue;

            const material = nodeMesh.mesh.material as StandardMaterial;
            material.emissiveColor = goldColor;

            // 파티클 효과
            this.pathEffects.createNodeResonance(nodeMesh.mesh.position, goldColor);
        }
    }

    // ============================================
    // 포인터 이벤트
    // ============================================

    private setupPointerEvents(): void {
        this.scene.onPointerObservable.add((pointerInfo) => {
            switch (pointerInfo.type) {
                case PointerEventTypes.POINTERPICK:
                    this.handleNodePick(pointerInfo.pickInfo?.pickedMesh);
                    break;
            }
        });
    }

    private handleNodePick(pickedMesh: AbstractMesh | null | undefined): void {
        if (!pickedMesh?.metadata?.nodeId) return;

        const nodeId = pickedMesh.metadata.nodeId;

        // 노드 선택 시도
        if (this.dijkstraEngine.canSelectNode(nodeId)) {
            const success = this.dijkstraEngine.selectNode(nodeId);

            if (success) {
                this.updateSelectedPath();
                this.config.onNodeSelected?.(nodeId);

                // 항로 완성 체크
                if (this.dijkstraEngine.isRouteComplete()) {
                    this.config.onRouteComplete?.();
                }
            }
        }
    }

    // ============================================
    // 공개 메서드
    // ============================================

    /**
     * 씬 초기 빌드
     */
    build(): void {
        this.buildNodes();
        this.buildGuideLines();
        this.updateSelectedPath();
    }

    /**
     * 선택 초기화
     */
    reset(): void {
        this.dijkstraEngine.resetSelection();
        this.updateSelectedPath();
    }

    /**
     * Undo
     */
    undo(): void {
        this.dijkstraEngine.undoLastSelection();
        this.updateSelectedPath();
    }

    /**
     * 리소스 정리
     */
    dispose(): void {
        this.scene.dispose();
        this.babylonEngine.dispose();
    }

    /**
     * Scene 접근자
     */
    getScene(): Scene {
        return this.scene;
    }

    /**
     * Engine 접근자
     */
    getEngine(): Engine {
        return this.babylonEngine;
    }
}
