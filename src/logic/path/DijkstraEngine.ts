/**
 * Skyline Blue Dijkstra Engine
 *
 * 노드 데이터 관리, 인접 노드 판정, 최적 경로 계산
 *
 * @module logic/path/DijkstraEngine
 */

import { SuccessGrade, calculateEfficiency } from '../../config/NavigationTerms';

// ============================================
// 타입 정의
// ============================================

/**
 * 노드 타입
 */
export type NodeType = 'start' | 'waypoint' | 'end';

/**
 * 노드 데이터
 */
export interface PathNode {
    id: string;
    type: NodeType;
    x: number;          // 0-1 정규화 좌표 (화면 비율)
    y: number;          // 0-1 정규화 좌표 (0=하단, 1=상단)
    row: number;        // 행 인덱스 (0=시작, max=도착)
    adjacentIds: string[];
    isSelected: boolean;
}

/**
 * 엣지(연결선) 데이터
 */
export interface PathEdge {
    fromId: string;
    toId: string;
    distance: number;
    isSelected: boolean;
}

/**
 * 경로 결과
 */
export interface PathResult {
    path: string[];
    totalDistance: number;
    isComplete: boolean;
}

// ============================================
// Dijkstra Engine 클래스
// ============================================

export class DijkstraEngine {
    private nodes: Map<string, PathNode> = new Map();
    private edges: Map<string, PathEdge> = new Map();
    private selectedPath: string[] = [];
    private startNodeId: string = '';
    private endNodeId: string = '';

    // ============================================
    // 노드 관리
    // ============================================

    /**
     * 노드 추가
     */
    addNode(node: PathNode): void {
        this.nodes.set(node.id, node);

        if (node.type === 'start') {
            this.startNodeId = node.id;
            node.isSelected = true; // 시작점은 자동 선택
            this.selectedPath = [node.id];
        } else if (node.type === 'end') {
            this.endNodeId = node.id;
        }
    }

    /**
     * 엣지(연결선) 추가
     * 양방향으로 추가됨
     */
    addEdge(fromId: string, toId: string): void {
        const fromNode = this.nodes.get(fromId);
        const toNode = this.nodes.get(toId);

        if (!fromNode || !toNode) return;

        const distance = this.calculateDistance(fromNode, toNode);
        const edgeId = this.getEdgeId(fromId, toId);

        this.edges.set(edgeId, {
            fromId,
            toId,
            distance,
            isSelected: false,
        });

        // 인접 노드 목록 업데이트
        if (!fromNode.adjacentIds.includes(toId)) {
            fromNode.adjacentIds.push(toId);
        }
        if (!toNode.adjacentIds.includes(fromId)) {
            toNode.adjacentIds.push(fromId);
        }
    }

    /**
     * 두 노드 간 거리 계산
     */
    private calculateDistance(a: PathNode, b: PathNode): number {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * 엣지 ID 생성 (정렬된 순서로)
     */
    private getEdgeId(id1: string, id2: string): string {
        return id1 < id2 ? `${id1}-${id2}` : `${id2}-${id1}`;
    }

    // ============================================
    // 노드 선택 (게임 플레이)
    // ============================================

    /**
     * 노드 선택 가능 여부 확인
     */
    canSelectNode(nodeId: string): boolean {
        if (this.selectedPath.length === 0) return false;

        const lastSelectedId = this.selectedPath[this.selectedPath.length - 1];
        const lastNode = this.nodes.get(lastSelectedId);

        if (!lastNode) return false;

        // 인접한 노드만 선택 가능
        return lastNode.adjacentIds.includes(nodeId);
    }

    /**
     * 노드 선택
     * @returns 선택 성공 여부
     */
    selectNode(nodeId: string): boolean {
        if (!this.canSelectNode(nodeId)) return false;

        const node = this.nodes.get(nodeId);
        if (!node || node.isSelected) return false;

        // 노드 선택
        node.isSelected = true;
        this.selectedPath.push(nodeId);

        // 엣지 선택
        const lastId = this.selectedPath[this.selectedPath.length - 2];
        const edgeId = this.getEdgeId(lastId, nodeId);
        const edge = this.edges.get(edgeId);
        if (edge) {
            edge.isSelected = true;
        }

        return true;
    }

    /**
     * 마지막 선택 취소 (Undo)
     */
    undoLastSelection(): boolean {
        if (this.selectedPath.length <= 1) return false; // 시작점은 취소 불가

        const removedId = this.selectedPath.pop()!;
        const node = this.nodes.get(removedId);
        if (node) {
            node.isSelected = false;
        }

        // 엣지 선택 해제
        const lastId = this.selectedPath[this.selectedPath.length - 1];
        const edgeId = this.getEdgeId(lastId, removedId);
        const edge = this.edges.get(edgeId);
        if (edge) {
            edge.isSelected = false;
        }

        return true;
    }

    /**
     * 선택 초기화
     */
    resetSelection(): void {
        // 모든 노드 선택 해제
        for (const node of this.nodes.values()) {
            node.isSelected = node.type === 'start';
        }

        // 모든 엣지 선택 해제
        for (const edge of this.edges.values()) {
            edge.isSelected = false;
        }

        // 시작점만 선택된 상태로
        this.selectedPath = this.startNodeId ? [this.startNodeId] : [];
    }

    // ============================================
    // 다익스트라 최적 경로 계산
    // ============================================

    /**
     * 다익스트라 알고리즘으로 최적 경로 계산
     */
    calculateOptimalPath(): PathResult {
        if (!this.startNodeId || !this.endNodeId) {
            return { path: [], totalDistance: Infinity, isComplete: false };
        }

        const distances = new Map<string, number>();
        const previous = new Map<string, string | null>();
        const unvisited = new Set<string>();

        // 초기화
        for (const nodeId of this.nodes.keys()) {
            distances.set(nodeId, Infinity);
            previous.set(nodeId, null);
            unvisited.add(nodeId);
        }
        distances.set(this.startNodeId, 0);

        while (unvisited.size > 0) {
            // 최소 거리 노드 찾기
            let minNode: string | null = null;
            let minDist = Infinity;

            for (const nodeId of unvisited) {
                const dist = distances.get(nodeId)!;
                if (dist < minDist) {
                    minDist = dist;
                    minNode = nodeId;
                }
            }

            if (!minNode || minDist === Infinity) break;

            unvisited.delete(minNode);

            // 도착점 도달 시 종료
            if (minNode === this.endNodeId) break;

            // 인접 노드 거리 업데이트
            const currentNode = this.nodes.get(minNode)!;
            for (const neighborId of currentNode.adjacentIds) {
                if (!unvisited.has(neighborId)) continue;

                const edgeId = this.getEdgeId(minNode, neighborId);
                const edge = this.edges.get(edgeId);
                if (!edge) continue;

                const newDist = minDist + edge.distance;
                if (newDist < distances.get(neighborId)!) {
                    distances.set(neighborId, newDist);
                    previous.set(neighborId, minNode);
                }
            }
        }

        // 경로 역추적
        const path: string[] = [];
        let current: string | null = this.endNodeId;

        while (current) {
            path.unshift(current);
            current = previous.get(current) ?? null;
        }

        const totalDistance = distances.get(this.endNodeId) ?? Infinity;
        const isComplete = path.length > 0 && path[0] === this.startNodeId;

        return { path, totalDistance, isComplete };
    }

    // ============================================
    // 상태 평가
    // ============================================

    /**
     * 현재 선택된 경로 총 거리 계산
     */
    getSelectedPathDistance(): number {
        let total = 0;

        for (let i = 0; i < this.selectedPath.length - 1; i++) {
            const edgeId = this.getEdgeId(this.selectedPath[i], this.selectedPath[i + 1]);
            const edge = this.edges.get(edgeId);
            if (edge) {
                total += edge.distance;
            }
        }

        return total;
    }

    /**
     * 항로 완성 여부
     */
    isRouteComplete(): boolean {
        return this.selectedPath.includes(this.endNodeId);
    }

    /**
     * 모든 경유지 방문 여부
     */
    areAllWaypointsVisited(): boolean {
        for (const node of this.nodes.values()) {
            if (node.type === 'waypoint' && !node.isSelected) {
                return false;
            }
        }
        return true;
    }

    /**
     * 최적 경로와 일치 여부
     */
    isOptimalPath(): boolean {
        const optimal = this.calculateOptimalPath();
        if (!optimal.isComplete || optimal.path.length !== this.selectedPath.length) {
            return false;
        }

        for (let i = 0; i < this.selectedPath.length; i++) {
            if (this.selectedPath[i] !== optimal.path[i]) {
                return false;
            }
        }
        return true;
    }

    /**
     * 현재 등급 계산
     */
    evaluateGrade(): SuccessGrade {
        if (!this.isRouteComplete()) return 'none';

        if (this.isOptimalPath()) return 'top';

        if (this.areAllWaypointsVisited()) return 'high';

        return 'normal';
    }

    /**
     * 효율성 계산
     */
    getEfficiency(): number {
        const optimal = this.calculateOptimalPath();
        const userDistance = this.getSelectedPathDistance();

        return calculateEfficiency(userDistance, optimal.totalDistance);
    }

    // ============================================
    // 데이터 접근
    // ============================================

    getNodes(): PathNode[] {
        return Array.from(this.nodes.values());
    }

    getEdges(): PathEdge[] {
        return Array.from(this.edges.values());
    }

    getSelectedPath(): string[] {
        return [...this.selectedPath];
    }

    getNode(id: string): PathNode | undefined {
        return this.nodes.get(id);
    }

    getWaypointCount(): { visited: number; total: number } {
        let visited = 0;
        let total = 0;

        for (const node of this.nodes.values()) {
            if (node.type === 'waypoint') {
                total++;
                if (node.isSelected) visited++;
            }
        }

        return { visited, total };
    }

    getStartNodeId(): string {
        return this.startNodeId;
    }

    getEndNodeId(): string {
        return this.endNodeId;
    }
}
