/**
 * AudioManager - Web Audio API 기반 오디오 시스템
 *
 * MOBILE-FIRST ADAPTIVE LAYOUT
 * (오디오 시스템은 레이아웃과 무관하게 동일하게 동작)
 *
 * 채널 분리:
 * - BGM: 배경 음악 (피치/필터 변조 지원)
 * - SFX: 타격음, 스킬 발동음 (동시 발음 제한)
 * - System: UI 클릭, 메뉴 오픈
 * - Voice: 천사상 울림, 기합 소리
 *
 * 동시 발음 제어 (Voice Limiting):
 * - 동일 사운드가 0.05초 이내 중복 시 볼륨 조절 또는 개수 제한
 */

import { AudioChannel, AudioConfig, DEFAULT_AUDIO_CONFIG } from '../types';

interface SoundInstance {
    source: AudioBufferSourceNode;
    gainNode: GainNode;
    startTime: number;
    channel: AudioChannel;
}

interface RecentSound {
    key: string;
    timestamp: number;
    count: number;
}

export class AudioManager {
    private audioContext: AudioContext | null = null;
    private config: AudioConfig;

    // 채널별 게인 노드
    private masterGain: GainNode | null = null;
    private channelGains: Map<AudioChannel, GainNode> = new Map();

    // 사운드 버퍼 캐시
    private bufferCache: Map<string, AudioBuffer> = new Map();

    // 활성 사운드 인스턴스
    private activeSounds: Set<SoundInstance> = new Set();

    // 동시 발음 제어용 최근 사운드 트래킹
    private recentSounds: Map<string, RecentSound> = new Map();

    // 상태
    private isInitialized: boolean = false;
    private isSuspended: boolean = true;

    constructor(config: Partial<AudioConfig> = {}) {
        this.config = { ...DEFAULT_AUDIO_CONFIG, ...config };
    }

    /**
     * 오디오 시스템 초기화
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            // AudioContext 생성
            this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

            // 마스터 게인 노드
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.config.masterVolume;
            this.masterGain.connect(this.audioContext.destination);

            // 채널별 게인 노드 생성
            const channels: AudioChannel[] = ['bgm', 'sfx', 'system', 'voice'];
            for (const channel of channels) {
                const gain = this.audioContext.createGain();
                gain.gain.value = this.config.channelVolumes[channel];
                gain.connect(this.masterGain);
                this.channelGains.set(channel, gain);
            }

            this.isInitialized = true;
            this.isSuspended = this.audioContext.state === 'suspended';

            console.log('[AudioManager] Initialized, state:', this.audioContext.state);
        } catch (error) {
            console.error('[AudioManager] Failed to initialize:', error);
            throw error;
        }
    }

    /**
     * AudioContext 재개 (사용자 상호작용 후 호출)
     */
    public async resume(): Promise<void> {
        if (!this.audioContext) return;

        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
            this.isSuspended = false;
            console.log('[AudioManager] Resumed');
        }
    }

    /**
     * 사운드 로드
     */
    public async loadSound(key: string, url: string): Promise<void> {
        if (!this.audioContext) {
            throw new Error('AudioManager not initialized');
        }

        if (this.bufferCache.has(key)) {
            return; // 이미 로드됨
        }

        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            this.bufferCache.set(key, audioBuffer);
            console.log(`[AudioManager] Loaded sound: ${key}`);
        } catch (error) {
            console.error(`[AudioManager] Failed to load sound: ${key}`, error);
            throw error;
        }
    }

    /**
     * 사운드 재생
     */
    public playSound(
        key: string,
        channel: AudioChannel = 'sfx',
        options: {
            volume?: number;
            pitch?: number;
            loop?: boolean;
        } = {}
    ): SoundInstance | null {
        if (!this.audioContext || !this.masterGain || this.isSuspended) {
            return null;
        }

        const buffer = this.bufferCache.get(key);
        if (!buffer) {
            console.warn(`[AudioManager] Sound not found: ${key}`);
            return null;
        }

        // 동시 발음 제어 체크
        if (!this.canPlaySound(key, channel)) {
            return null;
        }

        const { volume = 1.0, pitch = 1.0, loop = false } = options;

        // Source 노드 생성
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = pitch;
        source.loop = loop;

        // Gain 노드 생성 (개별 볼륨 조절)
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = volume;

        // 연결: Source → Gain → Channel Gain → Master → Destination
        const channelGain = this.channelGains.get(channel);
        if (channelGain) {
            source.connect(gainNode);
            gainNode.connect(channelGain);
        }

        // 재생
        const startTime = this.audioContext.currentTime;
        source.start(0);

        // 인스턴스 추적
        const instance: SoundInstance = {
            source,
            gainNode,
            startTime,
            channel,
        };
        this.activeSounds.add(instance);

        // 재생 완료 시 정리
        source.onended = () => {
            this.activeSounds.delete(instance);
        };

        // 최근 사운드 기록
        this.recordRecentSound(key);

        return instance;
    }

    /**
     * 동시 발음 제어 체크
     */
    private canPlaySound(key: string, channel: AudioChannel): boolean {
        // System 채널은 항상 재생
        if (channel === 'system') return true;

        const now = Date.now();
        const recent = this.recentSounds.get(key);

        if (!recent) return true;

        // 윈도우 내 재생 횟수 체크
        const timeSinceLastPlay = now - recent.timestamp;
        if (timeSinceLastPlay < this.config.voiceLimitWindow) {
            // 최대 동시 발음 수 초과 시 거부
            if (recent.count >= this.config.maxConcurrentSounds) {
                return false;
            }
        }

        return true;
    }

    /**
     * 최근 사운드 기록
     */
    private recordRecentSound(key: string): void {
        const now = Date.now();
        const existing = this.recentSounds.get(key);

        if (existing && now - existing.timestamp < this.config.voiceLimitWindow) {
            existing.count++;
            existing.timestamp = now;
        } else {
            this.recentSounds.set(key, { key, timestamp: now, count: 1 });
        }

        // 오래된 기록 정리
        this.cleanupRecentSounds();
    }

    /**
     * 오래된 최근 사운드 기록 정리
     */
    private cleanupRecentSounds(): void {
        const now = Date.now();
        const threshold = this.config.voiceLimitWindow * 2;

        for (const [key, record] of this.recentSounds) {
            if (now - record.timestamp > threshold) {
                this.recentSounds.delete(key);
            }
        }
    }

    /**
     * 테스트용 톤 재생
     */
    public playTestTone(
        channel: AudioChannel = 'sfx',
        frequency: number = 440,
        duration: number = 0.2
    ): void {
        if (!this.audioContext || !this.masterGain || this.isSuspended) {
            console.warn('[AudioManager] Cannot play: context not ready');
            return;
        }

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;

        // 채널에 연결
        const channelGain = this.channelGains.get(channel);
        if (channelGain) {
            oscillator.connect(gainNode);
            gainNode.connect(channelGain);
        }

        // 페이드 아웃
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
            0.001,
            this.audioContext.currentTime + duration
        );

        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration);

        console.log(`[AudioManager] Test tone: ${frequency}Hz on ${channel}`);
    }

    /**
     * 사운드 정지
     */
    public stopSound(instance: SoundInstance): void {
        try {
            instance.source.stop();
            this.activeSounds.delete(instance);
        } catch {
            // 이미 정지된 경우 무시
        }
    }

    /**
     * 채널 음소거
     */
    public muteChannel(channel: AudioChannel): void {
        const gain = this.channelGains.get(channel);
        if (gain) {
            gain.gain.value = 0;
        }
    }

    /**
     * 채널 음소거 해제
     */
    public unmuteChannel(channel: AudioChannel): void {
        const gain = this.channelGains.get(channel);
        if (gain) {
            gain.gain.value = this.config.channelVolumes[channel];
        }
    }

    /**
     * 채널 볼륨 설정
     */
    public setChannelVolume(channel: AudioChannel, volume: number): void {
        const gain = this.channelGains.get(channel);
        if (gain) {
            const clampedVolume = Math.max(0, Math.min(1, volume));
            gain.gain.value = clampedVolume;
            this.config.channelVolumes[channel] = clampedVolume;
        }
    }

    /**
     * 마스터 볼륨 설정
     */
    public setMasterVolume(volume: number): void {
        if (this.masterGain) {
            const clampedVolume = Math.max(0, Math.min(1, volume));
            this.masterGain.gain.value = clampedVolume;
            this.config.masterVolume = clampedVolume;
        }
    }

    /**
     * 모든 사운드 정지
     */
    public stopAll(): void {
        for (const instance of this.activeSounds) {
            try {
                instance.source.stop();
            } catch {
                // 무시
            }
        }
        this.activeSounds.clear();
    }

    /**
     * 특정 채널의 모든 사운드 정지
     */
    public stopChannel(channel: AudioChannel): void {
        for (const instance of this.activeSounds) {
            if (instance.channel === channel) {
                try {
                    instance.source.stop();
                    this.activeSounds.delete(instance);
                } catch {
                    // 무시
                }
            }
        }
    }

    /**
     * 상태 확인
     */
    public get initialized(): boolean {
        return this.isInitialized;
    }

    public get suspended(): boolean {
        return this.isSuspended;
    }

    /**
     * 정리
     */
    public destroy(): void {
        this.stopAll();

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        this.masterGain = null;
        this.channelGains.clear();
        this.bufferCache.clear();
        this.recentSounds.clear();
        this.isInitialized = false;

        console.log('[AudioManager] Destroyed');
    }
}
