/**
 * 音轨声波与音调呼吸驱动器 (Audio Breath Driver)
 * 
 * 基于 Web Audio API 实时解析音频的：
 * 1. 声波振幅 (RMS Amplitude / Volume Envelope)
 * 2. 音调/频谱质心 (Pitch / Spectral Centroid & Fundamental Frequency)
 * 
 * 动态映射规则：
 * - 聆听中 (Listening)：向内收缩呼吸 (Inward Breathing)
 *   随说话声波能量越大，光球向内收缩幅度越深 (1.0 -> 0.88 ~ 0.84)；
 *   音调高低调节收缩边缘微颤频率。声音停顿间歇平滑归位至 1.0。
 * 
 * - 播报中 (Speaking)：向外放大呼吸 (Outward Breathing)
 *   随播报声波能量越大，光球向外扩张幅度越大 (1.0 -> 1.12 ~ 1.18)；
 *   音调上扬赋予扩张轻盈通透的共鸣感。停顿间歇平滑回归 1.0。
 * 
 * - 待命 (Idle) & 思考中 (Thinking)：
 *   基础尺寸严格恒为 1.0，忽略音频振幅形变。
 */

export interface AudioMetrics {
  /** 归一化声波能量 0.0 ~ 1.0 (带平滑攻击衰减) */
  amplitude: number;
  /** 归一化音调高低 0.0 ~ 1.0 (0 为低沉基频，1 为高亢明亮) */
  pitch: number;
  /** 实时原始 RMS */
  rawRms: number;
}

export class AudioBreathDriver {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: AudioBufferSourceNode | MediaElementAudioSourceNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private audioBuffer: AudioBuffer | null = null;

  private timeData: Uint8Array<ArrayBuffer> | null = null;
  private freqData: Uint8Array<ArrayBuffer> | null = null;

  private smoothAmplitude = 0;
  private smoothPitch = 0.5;
  private isPlaying = false;
  private isListeningMode = false;

  constructor() {
    // 延迟初始化 AudioContext，以适配移动端及现代浏览器用户交互策略
  }

  private ensureAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * 加载音频 URL（例如 demo-speech.wav）
   */
  async load(url: string): Promise<void> {
    const ctx = this.ensureAudioContext();
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    this.audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  }

  /**
   * 绑定已有的 HTMLAudioElement
   */
  bindAudioElement(el: HTMLAudioElement): void {
    const ctx = this.ensureAudioContext();
    this.audioElement = el;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.65;

    const source = ctx.createMediaElementSource(el);
    source.connect(this.analyser);
    this.analyser.connect(ctx.destination);

    this.timeData = new Uint8Array(new ArrayBuffer(this.analyser.fftSize)) as Uint8Array<ArrayBuffer>;
    this.freqData = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount)) as Uint8Array<ArrayBuffer>;
  }

  /**
   * 播放音轨并驱动呼吸 (无需朗读字幕台词，纯驱动声学动效)
   * @param mode 'listening' | 'speaking'
   * @param loop 是否循环播放
   */
  play(mode: 'listening' | 'speaking' = 'speaking', loop = false): void {
    const ctx = this.ensureAudioContext();
    this.isListeningMode = mode === 'listening';

    if (this.audioElement) {
      this.audioElement.loop = loop;
      this.audioElement.currentTime = 0;
      void this.audioElement.play();
      this.isPlaying = true;
      return;
    }

    if (!this.audioBuffer) return;

    this.stop();

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.65;
    this.timeData = new Uint8Array(new ArrayBuffer(this.analyser.fftSize)) as Uint8Array<ArrayBuffer>;
    this.freqData = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount)) as Uint8Array<ArrayBuffer>;

    const bufferSource = ctx.createBufferSource();
    bufferSource.buffer = this.audioBuffer;
    bufferSource.loop = loop;
    bufferSource.connect(this.analyser);
    this.analyser.connect(ctx.destination);

    bufferSource.onended = () => {
      this.isPlaying = false;
    };

    bufferSource.start(0);
    this.sourceNode = bufferSource;
    this.isPlaying = true;
  }

  /**
   * 暂停/停止当前播放
   */
  stop(): void {
    if (this.sourceNode && 'stop' in this.sourceNode) {
      try {
        (this.sourceNode as AudioBufferSourceNode).stop();
      } catch {}
      this.sourceNode = null;
    }
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    this.isPlaying = false;
    this.smoothAmplitude = 0;
  }

  /**
   * 逐帧采样计算音频特征并获取呼吸缩放值
   * @param dt 帧间隔 (秒)
   */
  sample(dt = 0.016): AudioMetrics {
    if (!this.analyser || !this.isPlaying || !this.timeData || !this.freqData) {
      this.smoothAmplitude = Math.max(0, this.smoothAmplitude - dt * 4);
      return {
        amplitude: this.smoothAmplitude,
        pitch: this.smoothPitch,
        rawRms: 0
      };
    }

    // 1. 时域分析获取 RMS 声波振幅
    this.analyser.getByteTimeDomainData(this.timeData);
    let sumSquares = 0;
    for (let i = 0; i < this.timeData.length; i++) {
      const normalized = (this.timeData[i] - 128) / 128;
      sumSquares += normalized * normalized;
    }
    const rawRms = Math.sqrt(sumSquares / this.timeData.length);
    // 动态增益映射，突出语音起伏
    const targetAmp = Math.min(1, Math.max(0, (rawRms - 0.02) * 3.8));

    // 2. 频域分析获取音调/频谱质心 (Spectral Centroid)
    this.analyser.getByteFrequencyData(this.freqData);
    let weightedFreqSum = 0;
    let totalMagnitude = 0;
    for (let i = 0; i < this.freqData.length; i++) {
      const mag = this.freqData[i];
      totalMagnitude += mag;
      weightedFreqSum += mag * i;
    }
    const centroidBin = totalMagnitude > 0 ? weightedFreqSum / totalMagnitude : 20;
    // 人声基频范围通常落在低频到中高频 (bin 5 ~ 80)
    const targetPitch = Math.min(1, Math.max(0, (centroidBin - 8) / 72));

    // 平滑插值 (快升慢降，符合听觉声学包络)
    const attack = targetAmp > this.smoothAmplitude ? 18 : 6;
    this.smoothAmplitude += (targetAmp - this.smoothAmplitude) * Math.min(1, dt * attack);
    this.smoothPitch += (targetPitch - this.smoothPitch) * Math.min(1, dt * 5);

    return {
      amplitude: this.smoothAmplitude,
      pitch: this.smoothPitch,
      rawRms
    };
  }

  /**
   * 根据当前采样计算光球缩放比
   * - listening: 向内缩小 (1.0 -> 0.88)
   * - speaking: 向外放大 (1.0 -> 1.16)
   */
  computeScale(state: 'idle' | 'listening' | 'thinking' | 'speaking', metrics: AudioMetrics): number {
    if (state === 'idle' || state === 'thinking') {
      return 1.0;
    }

    const { amplitude, pitch } = metrics;
    const pitchFactor = 0.85 + pitch * 0.3; // 音调给呼吸幅度附加 15% 微动态

    if (state === 'listening') {
      // 聆听中：收缩呼吸（随音量增大往内深吸，最高收缩 12%~15%）
      const inwardDelta = amplitude * 0.13 * pitchFactor;
      return 1.0 - inwardDelta;
    }

    if (state === 'speaking') {
      // 播报中：放大呼吸（随音量与音调膨胀外扩，最高扩张 14%~17%）
      const outwardDelta = amplitude * 0.15 * pitchFactor;
      return 1.0 + outwardDelta;
    }

    return 1.0;
  }
}

/** 单例辅助驱动器 */
export const globalBreathDriver = new AudioBreathDriver();
