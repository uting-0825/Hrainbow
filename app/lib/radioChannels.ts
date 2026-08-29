export type RadioChannel = {
  frequency: number;
  src: string;
  type: 'bgm' | 'voice';
  label: string;
};

export const RADIO_MIN = 80;
export const RADIO_MAX = 135;
export const RADIO_LOCK_RANGE = 0.15;
export const RADIO_LOCK_DELAY = 800;

export const RADIO_CHANNELS: RadioChannel[] = [
  { frequency: 82.5, src: '/radio/audio/channel-825.mp3', type: 'bgm', label: 'MORNING MUSIC' },
  { frequency: 90.5, src: '/radio/audio/channel-905.mp3', type: 'voice', label: 'BIRTHDAY VOICE' },
  { frequency: 131.4, src: '/radio/audio/channel-1314.mp3', type: 'bgm', label: 'NIGHT MUSIC' },
];

export function nearestRadioChannel(frequency: number) {
  return RADIO_CHANNELS.reduce((nearest, channel) =>
    Math.abs(channel.frequency - frequency) < Math.abs(nearest.frequency - frequency) ? channel : nearest,
  );
}

export function radioSignalStrength(frequency: number) {
  const distance = Math.abs(nearestRadioChannel(frequency).frequency - frequency);
  if (distance >= 1.8) return 0;
  const linear = 1 - (distance - RADIO_LOCK_RANGE) / (1.8 - RADIO_LOCK_RANGE);
  const clamped = Math.min(1, Math.max(0, linear));
  return clamped * clamped * (3 - 2 * clamped);
}
