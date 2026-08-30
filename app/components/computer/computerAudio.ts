export type ComputerSound = 'click' | 'open' | 'close' | 'success' | 'error' | 'message' | 'drop' | 'chaos';

const soundPaths: Record<ComputerSound, string> = {
  click: '/assets/computer/audio/click.ogg',
  open: '/assets/computer/audio/open.ogg',
  close: '/assets/computer/audio/close.ogg',
  success: '/assets/computer/audio/success.ogg',
  error: '/assets/computer/audio/error.ogg',
  message: '/assets/computer/audio/message.ogg',
  drop: '/assets/computer/audio/drop.ogg',
  chaos: '/assets/computer/audio/chaos.ogg',
};

const soundVolumes: Record<ComputerSound, number> = {
  click: 0.24,
  open: 0.28,
  close: 0.24,
  success: 0.34,
  error: 0.3,
  message: 0.2,
  drop: 0.24,
  chaos: 0.26,
};

export function playComputerSound(sound: ComputerSound) {
  if (typeof window === 'undefined') return;
  const audio = new Audio(soundPaths[sound]);
  audio.volume = soundVolumes[sound];
  void audio.play().catch(() => {
    // Browsers may block sound before the first user gesture; the UI remains fully usable.
  });
}

