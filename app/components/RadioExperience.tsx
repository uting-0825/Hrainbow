'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RADIO_CHANNELS,
  RADIO_LOCK_DELAY,
  RADIO_LOCK_RANGE,
  RADIO_MAX,
  RADIO_MIN,
  RadioChannel,
  nearestRadioChannel,
  radioSignalStrength,
} from '../lib/radioChannels';

type RadioExperienceProps = {
  isOpen: boolean;
  onClose: () => void;
};

type ChannelNodes = {
  audio: HTMLAudioElement;
  gain: GainNode;
  filter?: BiquadFilterNode;
  monitorGain?: GainNode;
};

const clampFrequency = (value: number) => Math.min(RADIO_MAX, Math.max(RADIO_MIN, value));
const formatFrequency = (value: number) => value.toFixed(1);

class RadioAudioEngine {
  context: AudioContext | null = null;
  signalAnalyser: AnalyserNode | null = null;
  private preview = new Map<number, ChannelNodes>();
  private bgm = new Map<number, ChannelNodes>();
  private voice: ChannelNodes | null = null;
  private noiseGain: GainNode | null = null;
  private noiseSource: AudioBufferSourceNode | null = null;
  private master: GainNode | null = null;
  private activeBgm: number | null = null;
  private bgmPlaying = false;
  private bgmDucked = false;
  private voiceEndHandler: (() => void) | null = null;
  private initialized = false;

  setVoiceEndHandler(handler: () => void) {
    this.voiceEndHandler = handler;
  }

  async ensureReady() {
    if (this.initialized && this.context) {
      if (this.context.state === 'suspended') await this.context.resume();
      return;
    }

    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const context = new AudioContextClass();
    this.context = context;
    this.master = context.createGain();
    this.master.gain.value = 0.82;
    this.master.connect(context.destination);

    this.signalAnalyser = context.createAnalyser();
    this.signalAnalyser.fftSize = 256;
    this.signalAnalyser.smoothingTimeConstant = 0.72;
    const signalSink = context.createGain();
    signalSink.gain.value = 0;
    this.signalAnalyser.connect(signalSink).connect(context.destination);

    const noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    let last = 0;
    for (let index = 0; index < noiseData.length; index += 1) {
      const white = Math.random() * 2 - 1;
      last = last * 0.82 + white * 0.18;
      noiseData[index] = last;
    }
    this.noiseSource = context.createBufferSource();
    this.noiseSource.buffer = noiseBuffer;
    this.noiseSource.loop = true;
    const noiseFilter = context.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 2600;
    noiseFilter.Q.value = 0.38;
    this.noiseGain = context.createGain();
    this.noiseGain.gain.value = 0;
    this.noiseSource.connect(noiseFilter).connect(this.noiseGain);
    this.noiseGain.connect(this.master);
    this.noiseGain.connect(this.signalAnalyser);
    this.noiseSource.start();

    RADIO_CHANNELS.forEach((channel) => {
      const audio = new Audio(channel.src);
      audio.preload = 'auto';
      audio.loop = true;
      const source = context.createMediaElementSource(audio);
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 650;
      filter.Q.value = 1.15;
      const gain = context.createGain();
      gain.gain.value = 0;
      source.connect(filter).connect(gain);
      gain.connect(this.master!);
      gain.connect(this.signalAnalyser!);
      this.preview.set(channel.frequency, { audio, gain, filter });
    });

    RADIO_CHANNELS.filter((channel) => channel.type === 'bgm').forEach((channel) => {
      const audio = new Audio(channel.src);
      audio.preload = 'auto';
      audio.loop = true;
      const source = context.createMediaElementSource(audio);
      const gain = context.createGain();
      const monitorGain = context.createGain();
      gain.gain.value = 0;
      monitorGain.gain.value = 0;
      source.connect(gain).connect(this.master!);
      gain.connect(monitorGain).connect(this.signalAnalyser!);
      this.bgm.set(channel.frequency, { audio, gain, monitorGain });
    });

    const voiceChannel = RADIO_CHANNELS.find((channel) => channel.type === 'voice')!;
    const voiceAudio = new Audio(voiceChannel.src);
    voiceAudio.preload = 'auto';
    voiceAudio.loop = true;
    const voiceSource = context.createMediaElementSource(voiceAudio);
    const voiceGain = context.createGain();
    voiceGain.gain.value = 0;
    voiceSource.connect(voiceGain);
    voiceGain.connect(this.master);
    voiceGain.connect(this.signalAnalyser);
    voiceAudio.addEventListener('ended', () => {
      if (voiceAudio.loop) return;
      voiceGain.gain.setTargetAtTime(0, context.currentTime, 0.03);
      voiceAudio.loop = true;
      this.setBgmDucked(false);
      this.voiceEndHandler?.();
    });
    const voiceNodes = { audio: voiceAudio, gain: voiceGain };
    this.voice = voiceNodes;

    this.initialized = true;
    await context.resume();
    const players = [
      ...Array.from(this.preview.values()),
      ...Array.from(this.bgm.values()),
      voiceNodes,
    ];
    await Promise.allSettled(players.map((player) => player.audio.play()));
  }

  updateTuning(frequency: number, radioOpen: boolean, lockedFrequency: number | null, now: number) {
    if (!this.context || !this.noiseGain) return;
    const contextNow = this.context.currentTime;
    const nearest = nearestRadioChannel(frequency);
    const strength = radioSignalStrength(frequency);
    const locked = lockedFrequency !== null;
    const noiseLevel = !radioOpen ? 0 : locked ? 0.0015 : 0.115 * Math.pow(1 - strength, 1.25) + 0.008;
    this.noiseGain.gain.setTargetAtTime(noiseLevel, contextNow, locked ? 0.045 : 0.08);

    this.preview.forEach((nodes, channelFrequency) => {
      const isNearest = channelFrequency === nearest.frequency;
      const isGlobalDuplicate = channelFrequency === this.activeBgm && this.bgmPlaying;
      let previewLevel = 0;
      if (radioOpen && !locked && isNearest && !isGlobalDuplicate && strength > 0) {
        const flutterDepth = Math.max(0, 1 - strength * 1.5);
        const flutter = 1 - flutterDepth * (0.42 + Math.sin(now * 0.0087 + channelFrequency) * 0.26);
        previewLevel = Math.pow(strength, 1.45) * Math.max(0.18, flutter) * 0.72;
      }
      nodes.gain.gain.setTargetAtTime(previewLevel, contextNow, 0.055);
      if (nodes.filter) {
        nodes.filter.frequency.setTargetAtTime(620 + Math.pow(strength, 1.7) * 10300, contextNow, 0.07);
      }
    });
    this.bgm.forEach((nodes, channelFrequency) => {
      nodes.monitorGain?.gain.setTargetAtTime(
        radioOpen && lockedFrequency === channelFrequency ? 1 : 0,
        contextNow,
        0.06,
      );
    });
  }

  setBgm(frequency: number | null, playing: boolean) {
    this.activeBgm = frequency;
    this.bgmPlaying = playing;
    if (!this.context) return;
    const now = this.context.currentTime;
    this.bgm.forEach((nodes, channelFrequency) => {
      const shouldPlay = playing && frequency === channelFrequency && !this.bgmDucked;
      nodes.gain.gain.cancelScheduledValues(now);
      nodes.gain.gain.setTargetAtTime(shouldPlay ? 0.42 : 0.0001, now, shouldPlay ? 0.38 : 0.28);
    });
  }

  private setBgmDucked(ducked: boolean) {
    this.bgmDucked = ducked;
    this.setBgm(this.activeBgm, this.bgmPlaying);
  }

  playVoice(restart = true) {
    if (!this.context || !this.voice) return;
    const now = this.context.currentTime;
    this.setBgmDucked(true);
    this.voice.audio.loop = false;
    if (restart || this.voice.audio.ended) this.voice.audio.currentTime = 0;
    void this.voice.audio.play();
    this.voice.gain.gain.cancelScheduledValues(now);
    this.voice.gain.gain.setTargetAtTime(0.82, now, 0.18);
  }

  stopVoice() {
    if (!this.context || !this.voice) return;
    const voice = this.voice;
    voice.gain.gain.setTargetAtTime(0.0001, this.context.currentTime, 0.12);
    window.setTimeout(() => {
      voice.audio.loop = true;
      this.setBgmDucked(false);
    }, 520);
  }

  click() {
    if (!this.context || !this.master) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const clickGain = this.context.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(170, now);
    oscillator.frequency.exponentialRampToValueAtTime(72, now + 0.055);
    clickGain.gain.setValueAtTime(0.0001, now);
    clickGain.gain.exponentialRampToValueAtTime(0.18, now + 0.004);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);
    oscillator.connect(clickGain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + 0.08);
  }

  destroy() {
    this.noiseSource?.stop();
    [...this.preview.values(), ...this.bgm.values(), ...(this.voice ? [this.voice] : [])].forEach(({ audio }) => audio.pause());
    void this.context?.close();
  }
}

function SignalCanvas({ analyser, strength, locked }: { analyser: AnalyserNode | null; strength: number; locked: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef(analyser);
  const strengthRef = useRef(strength);
  const lockedRef = useRef(locked);

  useEffect(() => {
    analyserRef.current = analyser;
    strengthRef.current = strength;
    lockedRef.current = locked;
  }, [analyser, locked, strength]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    let frame = 0;
    let animationFrame = 0;
    let data = new Uint8Array(128);

    const draw = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width * ratio));
      const height = Math.max(1, Math.floor(rect.height * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      context.clearRect(0, 0, width, height);
      context.fillStyle = '#23392d';
      context.fillRect(0, 0, width, height);
      context.strokeStyle = 'rgba(161, 206, 139, .08)';
      context.lineWidth = ratio;
      for (let x = 0; x < width; x += 18 * ratio) {
        context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke();
      }
      context.beginPath(); context.moveTo(0, height / 2); context.lineTo(width, height / 2); context.stroke();

      const node = analyserRef.current;
      if (node) {
        if (data.length !== node.frequencyBinCount) data = new Uint8Array(node.frequencyBinCount);
        node.getByteTimeDomainData(data);
      }
      const signal = strengthRef.current;
      const amplitude = lockedRef.current ? 0.92 : 0.2 + signal * 0.72;
      context.beginPath();
      for (let index = 0; index < data.length; index += 1) {
        const x = (index / (data.length - 1)) * width;
        const raw = node ? (data[index] - 128) / 128 : Math.sin(index * 0.66 + frame * 0.12) * 0.08 + (Math.random() - 0.5) * 0.11;
        const organized = Math.sin(index * 0.23 + frame * 0.1) * signal * 0.12;
        const y = height / 2 + (raw + organized) * height * amplitude;
        if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.strokeStyle = lockedRef.current ? '#e6d578' : `rgba(164, 207, 137, ${0.42 + signal * 0.52})`;
      context.lineWidth = ratio * (1.15 + signal * 0.7);
      context.shadowColor = lockedRef.current ? '#f3d96d' : '#8dbb7d';
      context.shadowBlur = ratio * (2 + signal * 5);
      context.stroke();
      context.shadowBlur = 0;
      frame += 1;
      animationFrame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  return <canvas ref={canvasRef} className="radio-signal-canvas" aria-label="实时调频信号波形" />;
}

const majorFrequencies = Array.from({ length: 12 }, (_, index) => 80 + index * 5);

export default function RadioExperience({ isOpen, onClose }: RadioExperienceProps) {
  const engineRef = useRef<RadioAudioEngine | null>(null);
  const [currentFrequency, setCurrentFrequency] = useState(87.3);
  const [foundChannels, setFoundChannels] = useState<number[]>([]);
  const [activeBgm, setActiveBgm] = useState<number | null>(null);
  const [isBgmPlaying, setIsBgmPlaying] = useState(false);
  const [lockingChannel, setLockingChannel] = useState<number | null>(null);
  const [lockProgress, setLockProgress] = useState(0);
  const [lockedChannel, setLockedChannel] = useState<number | null>(null);
  const [foundNotice, setFoundNotice] = useState<{ frequency: number; isNew: boolean } | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const [signalAnalyser, setSignalAnalyser] = useState<AnalyserNode | null>(null);
  const dragRef = useRef<{ pointerId: number; x: number; frequency: number } | null>(null);
  const currentFrequencyRef = useRef(currentFrequency);
  const openRef = useRef(isOpen);
  const lockedRef = useRef(lockedChannel);
  const activeBgmRef = useRef(activeBgm);
  const playingRef = useRef(isBgmPlaying);

  useEffect(() => {
    currentFrequencyRef.current = currentFrequency;
    openRef.current = isOpen;
    lockedRef.current = lockedChannel;
    activeBgmRef.current = activeBgm;
    playingRef.current = isBgmPlaying;
  }, [activeBgm, currentFrequency, isBgmPlaying, isOpen, lockedChannel]);

  const nearest = useMemo(() => nearestRadioChannel(currentFrequency), [currentFrequency]);
  const signalStrength = radioSignalStrength(currentFrequency);
  const foundBgm = RADIO_CHANNELS.filter((channel) => channel.type === 'bgm' && foundChannels.includes(channel.frequency));

  useEffect(() => {
    const engine = new RadioAudioEngine();
    engineRef.current = engine;
    try {
      const storedFound = JSON.parse(localStorage.getItem('radioFoundChannels') ?? '[]');
      const validFound = Array.isArray(storedFound)
        ? storedFound.filter((frequency): frequency is number => RADIO_CHANNELS.some((channel) => channel.frequency === frequency))
        : [];
      setFoundChannels(validFound);
      const storedBgm = Number(localStorage.getItem('radioSelectedBgm'));
      if (validFound.includes(storedBgm) && RADIO_CHANNELS.some((channel) => channel.frequency === storedBgm && channel.type === 'bgm')) {
        setActiveBgm(storedBgm);
      }
    } catch {
      setFoundChannels([]);
    }
    return () => engine.destroy();
  }, []);

  const ensureAudio = useCallback(async () => {
    await engineRef.current?.ensureReady();
    setAudioReady(Boolean(engineRef.current?.context));
    setSignalAnalyser(engineRef.current?.signalAnalyser ?? null);
    engineRef.current?.setBgm(activeBgmRef.current, playingRef.current);
  }, []);

  useEffect(() => {
    let animationFrame = 0;
    const update = (now: number) => {
      engineRef.current?.updateTuning(currentFrequencyRef.current, openRef.current, lockedRef.current, now);
      animationFrame = requestAnimationFrame(update);
    };
    animationFrame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  useEffect(() => {
    if (activeBgm !== null) localStorage.setItem('radioSelectedBgm', String(activeBgm));
    engineRef.current?.setBgm(activeBgm, isBgmPlaying);
  }, [activeBgm, isBgmPlaying]);

  useEffect(() => {
    if (isOpen) return;
    setLockingChannel(null);
    setLockProgress(0);
    setFoundNotice(null);
    if (lockedChannel === 90.5) engineRef.current?.stopVoice();
    setLockedChannel(null);
  }, [isOpen, lockedChannel]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const lockChannel = useCallback((channel: RadioChannel) => {
    const isNew = !foundChannels.includes(channel.frequency);
    const nextFound = isNew ? [...foundChannels, channel.frequency].sort((a, b) => a - b) : foundChannels;
    if (isNew) {
      setFoundChannels(nextFound);
      localStorage.setItem('radioFoundChannels', JSON.stringify(nextFound));
    }
    setCurrentFrequency(channel.frequency);
    setLockedChannel(channel.frequency);
    setLockingChannel(null);
    setLockProgress(1);
    setFoundNotice({ frequency: channel.frequency, isNew });
    engineRef.current?.click();
    if (channel.type === 'bgm') {
      setActiveBgm(channel.frequency);
      setIsBgmPlaying(true);
    } else {
      engineRef.current?.playVoice(true);
    }
  }, [foundChannels]);

  useEffect(() => {
    if (!isOpen || lockedChannel !== null) return;
    const distance = Math.abs(currentFrequency - nearest.frequency);
    if (distance > RADIO_LOCK_RANGE) {
      setLockingChannel(null);
      setLockProgress(0);
      return;
    }

    const startedAt = performance.now();
    setLockingChannel(nearest.frequency);
    const interval = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - startedAt) / RADIO_LOCK_DELAY);
      setLockProgress(progress);
      if (progress >= 1) {
        window.clearInterval(interval);
        lockChannel(nearest);
      }
    }, 32);
    return () => window.clearInterval(interval);
  }, [currentFrequency, isOpen, lockChannel, lockedChannel, nearest]);

  useEffect(() => {
    if (lockedChannel === null) return;
    if (Math.abs(currentFrequency - lockedChannel) <= 0.22) return;
    if (lockedChannel === 90.5) engineRef.current?.stopVoice();
    setLockedChannel(null);
    setFoundNotice(null);
    setLockProgress(0);
  }, [currentFrequency, lockedChannel]);

  const tuneTo = useCallback((rawFrequency: number) => {
    setCurrentFrequency(() => {
      let next = clampFrequency(rawFrequency);
      const magnetic = foundChannels.find((frequency) => Math.abs(next - frequency) < 0.18);
      if (magnetic !== undefined) {
        const distance = magnetic - next;
        next += distance * (Math.abs(distance) < 0.045 ? 0.72 : 0.12);
      }
      return next;
    });
  }, [foundChannels]);

  const adjustFrequency = useCallback((delta: number) => {
    tuneTo(currentFrequencyRef.current + delta);
  }, [tuneTo]);

  const onPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    void ensureAudio();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, frequency: currentFrequencyRef.current };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    tuneTo(drag.frequency - (event.clientX - drag.x) * 0.035);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const onWheel = (event: React.WheelEvent<HTMLElement>) => {
    event.preventDefault();
    void ensureAudio();
    adjustFrequency(event.deltaY * 0.0035 + event.deltaX * 0.002);
  };

  const onTuneKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    void ensureAudio();
    if (event.key === 'Home') tuneTo(RADIO_MIN);
    else if (event.key === 'End') tuneTo(RADIO_MAX);
    else {
      const direction = event.key === 'ArrowRight' || event.key === 'PageUp' ? 1 : -1;
      adjustFrequency(direction * (event.key.startsWith('Page') ? 1 : 0.1));
    }
  };

  const switchBgm = async () => {
    await ensureAudio();
    if (foundBgm.length < 2) return;
    const currentIndex = foundBgm.findIndex((channel) => channel.frequency === activeBgm);
    const next = foundBgm[(currentIndex + 1) % foundBgm.length];
    setActiveBgm(next.frequency);
    setIsBgmPlaying(true);
  };

  const toggleBgm = async () => {
    await ensureAudio();
    if (activeBgm === null && foundBgm[0]) setActiveBgm(foundBgm[0].frequency);
    setIsBgmPlaying((playing) => !playing);
  };

  const tapeOffset = (currentFrequency - RADIO_MIN) * 70;
  const knobRotation = ((currentFrequency - RADIO_MIN) / (RADIO_MAX - RADIO_MIN)) * 1440 - 35;
  const complete = foundChannels.length === RADIO_CHANNELS.length;

  return (
    <>
      {foundBgm.length > 0 && (
        <aside className="radio-bgm-control" aria-label="已解锁的背景音乐控制">
          <button type="button" onClick={toggleBgm} aria-label={isBgmPlaying ? '暂停背景音乐' : '播放背景音乐'}>
            <span aria-hidden="true">♫</span>
            <b>{activeBgm ? formatFrequency(activeBgm) : formatFrequency(foundBgm[0].frequency)}</b>
            <i>{isBgmPlaying ? 'Ⅱ' : '▶'}</i>
          </button>
          {foundBgm.length > 1 && <button type="button" className="radio-bgm-switch" onClick={switchBgm} aria-label="切换已解锁背景音乐">↔</button>}
        </aside>
      )}

      {isOpen && (
        <section className="radio-modal" role="dialog" aria-modal="true" aria-label="复古调频收音机">
          <button className="radio-backdrop" type="button" aria-label="关闭收音机" onClick={onClose} />
          <div className="radio-shell">
            <header className="radio-header">
              <div><small>MEMORY RADIO · 寻找藏在杂音里的声音</small><h2>小润调频台</h2></div>
              <button className="radio-close" type="button" aria-label="关闭" onClick={onClose}>×</button>
            </header>

            <div className="radio-face">
              <div className="radio-frequency-readout"><small>FM</small><strong>{formatFrequency(currentFrequency)}</strong><span>MHz</span></div>

              <div
                className="radio-tuner"
                role="slider"
                tabIndex={0}
                aria-label="调频刻度"
                aria-valuemin={RADIO_MIN}
                aria-valuemax={RADIO_MAX}
                aria-valuenow={Number(currentFrequency.toFixed(1))}
                aria-valuetext={`${formatFrequency(currentFrequency)} MHz`}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onWheel={onWheel}
                onKeyDown={onTuneKeyDown}
              >
                <div className="radio-scale-track" style={{ '--radio-tape-offset': `${tapeOffset}px` } as React.CSSProperties}>
                  <div className="radio-fine-ticks" />
                  {majorFrequencies.map((frequency) => <span key={frequency} className="radio-major-label" style={{ left: `${(frequency - RADIO_MIN) * 70}px` }}>{frequency}</span>)}
                  {foundChannels.map((frequency) => <i key={frequency} className="radio-found-mark" style={{ left: `${(frequency - RADIO_MIN) * 70}px` }} aria-label={`已发现 ${formatFrequency(frequency)} MHz`} />)}
                </div>
                <div className="radio-fixed-needle" aria-hidden="true"><i /></div>
              </div>

              <div className="radio-console-grid">
                <div className="radio-signal-screen">
                  <div className="radio-screen-label"><span>SIGNAL MONITOR</span><i>{audioReady ? 'AUDIO LINK' : 'TOUCH TO START'}</i></div>
                  <SignalCanvas analyser={signalAnalyser} strength={signalStrength} locked={lockedChannel !== null} />
                </div>

                <div className="radio-meter" style={{ '--signal': signalStrength } as React.CSSProperties}>
                  <span>SIGNAL</span><i className={lockedChannel !== null ? 'is-locked' : ''} />
                  <div>{RADIO_CHANNELS.map((channel) => <b key={channel.frequency} className={foundChannels.includes(channel.frequency) ? 'is-found' : ''} />)}</div>
                </div>

                <div className="radio-knob-panel">
                  <button
                    type="button"
                    className="radio-knob"
                    style={{ '--knob-rotation': `${knobRotation}deg` } as React.CSSProperties}
                    aria-label="调频旋钮，左右拖动"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    onWheel={onWheel}
                    onKeyDown={onTuneKeyDown}
                  ><i /></button>
                  <small>左右拖动 · 滚轮微调</small>
                </div>

                <div className={`radio-lock-panel ${lockedChannel !== null ? 'is-locked' : ''}`}>
                  <small>{complete ? 'CHANNELS FOUND' : lockedChannel !== null ? 'CHANNEL LOCKED' : lockingChannel !== null ? 'HOLD FREQUENCY' : 'CHANNEL FOUND'}</small>
                  <strong>{String(foundChannels.length).padStart(2, '0')} / 03</strong>
                  <div className="radio-lock-track"><i style={{ width: `${lockProgress * 100}%` }} /></div>
                  <p>{foundNotice
                    ? `${formatFrequency(foundNotice.frequency)} MHz · ${foundNotice.isNew ? (foundNotice.frequency === 90.5 ? '生日频道已找到' : 'BGM UNLOCKED') : '再次锁定'}`
                    : signalStrength > 0.62 ? '信号越来越清晰，再停留一会儿' : signalStrength > 0 ? '声音藏在附近的杂音里' : '慢慢转动旋钮，听听它在哪里'}</p>
                  {foundNotice && foundNotice.frequency !== 90.5 && <em>CONTINUES WHILE EXPLORING</em>}
                </div>
              </div>
            </div>

            <footer className="radio-footer">
              <span>80.0 — 135.0 MHz</span>
              <p>拖动刻度或旋钮，在红针下寻找逐渐清晰的声音</p>
              <span>{nearest && signalStrength > 0 ? 'RECEIVING…' : 'SEARCHING…'}</span>
            </footer>
          </div>
        </section>
      )}
    </>
  );
}
