/**
 * Skyline Blue: Arcana Vector - Scenario Manager
 *
 * 헌법 준수:
 * - ScenarioManager는 상태 머신이 아니다 (§7)
 * - 시나리오는 데이터 기반(sequence)으로 구성
 * - 분기와 선택지는 튜토리얼 이후에만 도입
 * - 텍스트는 스킵 가능해야 하며, 연출이 본체
 */

import { ScenarioStep, ScenarioSequence } from './types';
import { AudioManager } from './AudioManager';
import { getCharacter, getSpeakerColor } from './data/characters';

export interface ScenarioCallbacks {
    onStepStart?: (step: ScenarioStep, index: number) => void;
    onStepEnd?: (step: ScenarioStep, index: number) => void;
    onSequenceEnd?: () => void;
    onEvent?: (eventName: string) => void;
}

export class ScenarioManager {
    private currentSequence: ScenarioSequence | null = null;
    private currentIndex: number = 0;
    private isPlaying: boolean = false;
    private _isPaused: boolean = false;

    // DOM 요소
    private scenarioUi: HTMLElement | null = null;
    private scenarioBg: HTMLElement | null = null;
    private speakerName: HTMLElement | null = null;
    private dialogueText: HTMLElement | null = null;
    private cutsceneLayer: HTMLElement | null = null;
    private fadeOverlay: HTMLElement | null = null;

    // 콜백
    private callbacks: ScenarioCallbacks = {};

    // 오디오 참조
    private audioManager: AudioManager | null = null;

    // 타이핑 효과
    private typingTimeout: number | null = null;
    private isTyping: boolean = false;

    constructor(audioManager?: AudioManager) {
        this.audioManager = audioManager ?? null;
        this.initializeDOM();
    }

    /**
     * DOM 요소 초기화
     */
    private initializeDOM(): void {
        this.scenarioUi = document.getElementById('scenario-ui');
        this.scenarioBg = document.getElementById('scenario-bg');
        this.speakerName = document.getElementById('speaker-name');
        this.dialogueText = document.getElementById('dialogue-text');
        this.cutsceneLayer = document.getElementById('cutscene-layer');
        this.fadeOverlay = document.getElementById('fade-overlay');
    }

    /**
     * 콜백 설정
     */
    setCallbacks(callbacks: ScenarioCallbacks): void {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    /**
     * 시퀀스 시작
     */
    startSequence(sequence: ScenarioSequence): void {
        this.currentSequence = sequence;
        this.currentIndex = 0;
        this.isPlaying = true;
        this._isPaused = false;

        console.log(`[ScenarioManager] Starting: ${sequence.name}`);

        this.showScenarioUI();
        this.playCurrentStep();
    }

    /**
     * 현재 스텝 재생
     */
    private playCurrentStep(): void {
        if (!this.currentSequence || !this.isPlaying) return;

        const step = this.currentSequence.steps[this.currentIndex];
        if (!step) {
            this.endSequence();
            return;
        }

        this.callbacks.onStepStart?.(step, this.currentIndex);

        switch (step.type) {
            case 'text':
                this.handleTextStep(step);
                break;
            case 'cutscene':
                this.handleCutsceneStep(step);
                break;
            case 'event':
                this.handleEventStep(step);
                break;
            default:
                this.advanceStep();
        }
    }

    /**
     * 텍스트 스텝 처리
     */
    private handleTextStep(step: ScenarioStep): void {
        // 배경 변경
        if (step.bg && this.scenarioBg) {
            this.scenarioBg.style.backgroundImage = `url(${step.bg})`;
        }

        // BGM 변경
        if (step.bgm && this.audioManager) {
            this.audioManager.playBgm(step.bgm);
        }

        // SFX 재생
        if (step.sfx && this.audioManager) {
            this.audioManager.playSfx(step.sfx);
        }

        // 화자 이름 표시
        if (this.speakerName) {
            if (step.speaker) {
                const character = getCharacter(step.speaker);
                const displayName = character?.nameKo ?? step.speaker;
                const color = getSpeakerColor(step.speaker);

                this.speakerName.textContent = displayName;
                this.speakerName.style.color = color;
                this.speakerName.classList.remove('hidden');
            } else {
                this.speakerName.classList.add('hidden');
            }
        }

        // 대사 표시 (타이핑 효과)
        if (step.text && this.dialogueText) {
            this.typeText(step.text);
        }
    }

    /**
     * 페이드 투 블랙
     */
    fadeToBlack(): Promise<void> {
        return new Promise((resolve) => {
            if (this.fadeOverlay) {
                this.fadeOverlay.classList.remove('hidden');
                this.fadeOverlay.classList.add('fade-to-black');
                setTimeout(resolve, 500);
            } else {
                resolve();
            }
        });
    }

    /**
     * 페이드 아웃 (블랙 → 투명)
     */
    fadeFromBlack(): Promise<void> {
        return new Promise((resolve) => {
            if (this.fadeOverlay) {
                this.fadeOverlay.classList.remove('fade-to-black');
                setTimeout(() => {
                    this.fadeOverlay?.classList.add('hidden');
                    resolve();
                }, 500);
            } else {
                resolve();
            }
        });
    }

    /**
     * 타이핑 효과
     */
    private typeText(text: string): void {
        if (!this.dialogueText) return;

        this.isTyping = true;
        this.dialogueText.textContent = '';

        let index = 0;
        const speed = 30; // ms per character

        const type = () => {
            if (index < text.length) {
                this.dialogueText!.textContent += text[index];
                index++;
                this.typingTimeout = window.setTimeout(type, speed);
            } else {
                this.isTyping = false;
            }
        };

        type();
    }

    /**
     * 타이핑 스킵
     */
    skipTyping(): void {
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
            this.typingTimeout = null;
        }

        if (this.currentSequence && this.dialogueText) {
            const step = this.currentSequence.steps[this.currentIndex];
            if (step?.text) {
                this.dialogueText.textContent = step.text;
            }
        }

        this.isTyping = false;
    }

    /**
     * 컷신 스텝 처리
     */
    private handleCutsceneStep(step: ScenarioStep): void {
        if (!this.cutsceneLayer || !step.gif) return;

        this.cutsceneLayer.classList.remove('hidden');
        this.cutsceneLayer.innerHTML = `<img src="${step.gif}" alt="cutscene">`;

        // BGM/SFX 처리
        if (step.bgm && this.audioManager) {
            this.audioManager.playBgm(step.bgm);
        }
        if (step.sfx && this.audioManager) {
            this.audioManager.playSfx(step.sfx);
        }

        // 지정된 시간 후 자동 진행
        if (step.duration) {
            setTimeout(() => {
                this.hideCutscene();
                this.advanceStep();
            }, step.duration);
        }
    }

    /**
     * 이벤트 스텝 처리
     */
    private handleEventStep(step: ScenarioStep): void {
        if (step.event) {
            console.log(`[ScenarioManager] Event: ${step.event}`);
            this.callbacks.onEvent?.(step.event);
        }
        this.advanceStep();
    }

    /**
     * 다음 스텝으로 진행
     */
    advanceStep(): void {
        // 타이핑 중이면 먼저 스킵
        if (this.isTyping) {
            this.skipTyping();
            return;
        }

        if (!this.currentSequence || !this.isPlaying) return;

        const currentStep = this.currentSequence.steps[this.currentIndex];
        this.callbacks.onStepEnd?.(currentStep, this.currentIndex);

        this.currentIndex++;

        if (this.currentIndex >= this.currentSequence.steps.length) {
            this.endSequence();
        } else {
            this.playCurrentStep();
        }
    }

    /**
     * 시퀀스 종료
     */
    private endSequence(): void {
        this.isPlaying = false;
        this.hideScenarioUI();
        this.hideCutscene();

        console.log(`[ScenarioManager] Sequence ended: ${this.currentSequence?.name}`);
        this.callbacks.onSequenceEnd?.();

        this.currentSequence = null;
        this.currentIndex = 0;
    }

    /**
     * 시나리오 UI 표시
     */
    private showScenarioUI(): void {
        if (this.scenarioUi) {
            this.scenarioUi.classList.remove('hidden');
        }
    }

    /**
     * 시나리오 UI 숨김
     */
    private hideScenarioUI(): void {
        if (this.scenarioUi) {
            this.scenarioUi.classList.add('hidden');
        }
    }

    /**
     * 컷신 숨김
     */
    private hideCutscene(): void {
        if (this.cutsceneLayer) {
            this.cutsceneLayer.classList.add('hidden');
            this.cutsceneLayer.innerHTML = '';
        }
    }

    /**
     * 일시 정지
     */
    pause(): void {
        this._isPaused = true;
    }

    /**
     * 재개
     */
    resume(): void {
        this._isPaused = false;
    }

    /**
     * 일시 정지 상태 확인
     */
    get paused(): boolean {
        return this._isPaused;
    }

    /**
     * 현재 재생 중인지 확인
     */
    get playing(): boolean {
        return this.isPlaying;
    }

    /**
     * 스킵 (현재 시퀀스 전체)
     */
    skipSequence(): void {
        this.endSequence();
    }
}

// ============================================
// 샘플 시나리오 데이터
// ============================================

export const OPENING_SEQUENCE: ScenarioSequence = {
    id: 'opening',
    name: 'Beach Opening',
    steps: [
        {
            type: 'text',
            text: '(끼룩끼룩... 파도 소리가 들린다.)',
            bg: 'assets/bg/beach_sunset.jpg',
            sfx: 'seagull',
        },
        {
            type: 'text',
            text: '과거엔 이 하늘이 나의 전부였지.',
        },
        {
            type: 'text',
            text: '높이 날고, 더 높이... 그게 전부인 줄 알았다.',
        },
        {
            type: 'event',
            event: 'FADE_TO_CLUBROOM',
        },
        {
            type: 'text',
            text: '부장: 야! 정신 안 차려? 코치가 졸면 어떡해!',
            bg: 'assets/bg/club_room.jpg',
            speaker: '부장',
        },
        {
            type: 'text',
            text: '...어, 미안.',
            speaker: '코치',
        },
    ],
};
