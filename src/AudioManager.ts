/**
 * Skillforge: Air-Sport - Audio Manager
 *
 * 헌법 준수:
 * - Web Audio API 기반 (§8)
 * - 채널 분리: BGM / SFX / Ambient / UI
 * - 동시 발음 제한 (Limiter)
 * - AudioContext는 사용자 입력 후 resume()
 * - BGM은 항상 새 AudioBufferSourceNode로 교체
 */

import { AudioChannel, AudioConfig, DEFAULT_AUDIO_CONFIG } from './types';

interface ActiveSound {
    source: AudioBufferSourceNode;
    gainNode: GainNode;
    channel: AudioChannel;
    startTime: number;
}

export class AudioManager {
    private context: AudioContext | null = null;
    private config: AudioConfig;

    // 채널별 GainNode
    private masterGain: GainNode | null = null;
    private channelGains: Map<AudioChannel, GainNode> = new Map();

    // 버퍼 캐시
    private bufferCache: Map<string, AudioBuffer> = new Map();

    // 활성 사운드 추적
    private activeSfx: Set<ActiveSound> = new Set();
    private currentBgm: AudioBufferSourceNode | null = null;
    private currentAmbient: AudioBufferSourceNode | null = null;

    // 상태
    private _isResumed: boolean = false;

    constructor(config: Partial<AudioConfig> = {}) {
        this.config = { ...DEFAULT_AUDIO_CONFIG, ...config };
    }

    /**
     * 오디오 시스템 초기화
     */
    async initialize(): Promise<void> {
        if (this.context) return;

        try {
            this.context = new AudioContext();

            // 마스터 게인
            this.masterGain = this.context.createGain();
            this.masterGain.gain.value = this.config.masterVolume;
            this.masterGain.connect(this.context.destination);

            // 채널별 게인
            const channels: AudioChannel[] = ['bgm', 'sfx', 'ambient', 'ui'];
            for (const channel of channels) {
                const gain = this.context.createGain();
                gain.gain.value = this.config.channelVolumes[channel];
                gain.connect(this.masterGain);
                this.channelGains.set(channel, gain);
            }

            console.log('[AudioManager] Initialized, state:', this.context.state);
        } catch (error) {
            console.error('[AudioManager] Failed to initialize:', error);
        }
    }

    /**
     * AudioContext resume (사용자 상호작용 후 호출 필수)
     *
     * 헌법 §8: AudioContext는 반드시 사용자 입력 후 resume()한다.
     */
    async resume(): Promise<void> {
        if (!this.context) {
            await this.initialize();
        }

        if (this.context && this.context.state === 'suspended') {
            await this.context.resume();
            this._isResumed = true;
            console.log('[AudioManager] Resumed');
        }
    }

    get isResumed(): boolean {
        return this._isResumed;
    }

    /**
     * 오디오 파일 로드
     */
    async loadSound(key: string, url: string): Promise<void> {
        if (!this.context) {
            throw new Error('AudioManager not initialized');
        }

        if (this.bufferCache.has(key)) {
            return;
        }

        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
            this.bufferCache.set(key, audioBuffer);
            console.log(`[AudioManager] Loaded: ${key}`);
        } catch (error) {
            console.error(`[AudioManager] Failed to load: ${key}`, error);
        }
    }

    /**
     * SFX 재생 (동시 발음 제한 적용)
     */
    playSfx(key: string, options: { volume?: number; pitch?: number } = {}): void {
        if (!this.context || !this._isResumed) return;

        // 동시 발음 제한 (Limiter)
        if (this.activeSfx.size >= this.config.maxConcurrentSfx) {
            console.warn('[AudioManager] SFX limit reached, skipping:', key);
            return;
        }

        const buffer = this.bufferCache.get(key);
        if (!buffer) {
            console.warn('[AudioManager] SFX not found:', key);
            return;
        }

        const { volume = 1.0, pitch = 1.0 } = options;

        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = pitch;

        const gainNode = this.context.createGain();
        gainNode.gain.value = volume;

        const channelGain = this.channelGains.get('sfx');
        if (channelGain) {
            source.connect(gainNode);
            gainNode.connect(channelGain);
        }

        const activeSound: ActiveSound = {
            source,
            gainNode,
            channel: 'sfx',
            startTime: this.context.currentTime,
        };

        this.activeSfx.add(activeSound);

        source.onended = () => {
            this.activeSfx.delete(activeSound);
        };

        source.start(0);
    }

    /**
     * BGM 재생
     *
     * 헌법 §8: BGM은 항상 새 AudioBufferSourceNode로 교체한다.
     */
    playBgm(key: string, options: { loop?: boolean; fadeIn?: number } = {}): void {
        if (!this.context || !this._isResumed) return;

        const buffer = this.bufferCache.get(key);
        if (!buffer) {
            console.warn('[AudioManager] BGM not found:', key);
            return;
        }

        // 기존 BGM 정지
        this.stopBgm();

        const { loop = true, fadeIn = 0.5 } = options;

        // 항상 새 SourceNode 생성
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.loop = loop;

        const gainNode = this.context.createGain();
        gainNode.gain.value = 0;

        const channelGain = this.channelGains.get('bgm');
        if (channelGain) {
            source.connect(gainNode);
            gainNode.connect(channelGain);
        }

        // 페이드 인
        gainNode.gain.linearRampToValueAtTime(1, this.context.currentTime + fadeIn);

        this.currentBgm = source;
        source.start(0);
    }

    /**
     * BGM 정지
     */
    stopBgm(fadeOut: number = 0.5): void {
        if (!this.context || !this.currentBgm) return;

        const source = this.currentBgm;
        this.currentBgm = null;

        // 페이드 아웃 후 정지
        try {
            source.stop(this.context.currentTime + fadeOut);
        } catch {
            // 이미 정지된 경우 무시
        }
    }

    /**
     * Ambient 재생
     */
    playAmbient(key: string): void {
        if (!this.context || !this._isResumed) return;

        const buffer = this.bufferCache.get(key);
        if (!buffer) return;

        this.stopAmbient();

        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const channelGain = this.channelGains.get('ambient');
        if (channelGain) {
            source.connect(channelGain);
        }

        this.currentAmbient = source;
        source.start(0);
    }

    /**
     * Ambient 정지
     */
    stopAmbient(): void {
        if (this.currentAmbient) {
            try {
                this.currentAmbient.stop();
            } catch {
                // 무시
            }
            this.currentAmbient = null;
        }
    }

    /**
     * UI 사운드 재생 (빠른 반응)
     */
    playUi(key: string): void {
        if (!this.context || !this._isResumed) return;

        const buffer = this.bufferCache.get(key);
        if (!buffer) return;

        const source = this.context.createBufferSource();
        source.buffer = buffer;

        const channelGain = this.channelGains.get('ui');
        if (channelGain) {
            source.connect(channelGain);
        }

        source.start(0);
    }

    /**
     * 테스트 톤 재생 (디버그용)
     */
    playTestTone(frequency: number = 440, duration: number = 0.2): void {
        if (!this.context || !this._isResumed) return;

        const oscillator = this.context.createOscillator();
        const gainNode = this.context.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;

        gainNode.gain.setValueAtTime(0.3, this.context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(this.context.destination);

        oscillator.start();
        oscillator.stop(this.context.currentTime + duration);

        console.log('[AudioManager] Test tone:', frequency, 'Hz');
    }

    /**
     * 볼륨 설정
     */
    setMasterVolume(volume: number): void {
        if (this.masterGain) {
            this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
            this.config.masterVolume = volume;
        }
    }

    setChannelVolume(channel: AudioChannel, volume: number): void {
        const gain = this.channelGains.get(channel);
        if (gain) {
            gain.gain.value = Math.max(0, Math.min(1, volume));
            this.config.channelVolumes[channel] = volume;
        }
    }

    /**
     * 모든 사운드 정지
     */
    stopAll(): void {
        this.stopBgm(0);
        this.stopAmbient();

        for (const sound of this.activeSfx) {
            try {
                sound.source.stop();
            } catch {
                // 무시
            }
        }
        this.activeSfx.clear();
    }

    /**
     * 정리
     */
    destroy(): void {
        this.stopAll();
        if (this.context) {
            this.context.close();
            this.context = null;
        }
        this.bufferCache.clear();
        this.channelGains.clear();
    }
}
