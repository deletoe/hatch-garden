import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocalSettings } from './LocalSettings';

afterEach(() => vi.unstubAllGlobals());

const storage = (record: object) => {
  const setItem = vi.fn();
  vi.stubGlobal('window', { localStorage: { getItem: () => JSON.stringify(record), setItem } });
  return setItem;
};

describe('skin settings compatibility', () => {
  it('keeps existing scores and audio preferences when older settings have no skin', () => {
    storage({ schemaVersion: 1, bestSessionEggs: 1234, soundEnabled: false, volume: 0.4 });
    const settings = new LocalSettings();
    expect(settings.snapshot()).toEqual({ schemaVersion: 1, bestSessionEggs: 1234, soundEnabled: false, volume: 0.4, skin: 'reference' });
  });

  it('persists a skin choice and restores it in a fresh settings instance', () => {
    let saved: string | null = null;
    vi.stubGlobal('window', { localStorage: { getItem: () => saved, setItem: (_key: string, value: string) => { saved = value; } } });
    const settings = new LocalSettings();
    settings.set({ skin: 'classic', bestSessionEggs: 25 });
    settings.set({ soundEnabled: false });
    expect(new LocalSettings().snapshot()).toMatchObject({ skin: 'classic', bestSessionEggs: 25, soundEnabled: false });
  });

  it('falls back from an unknown saved skin and still switches when storage is unavailable', () => {
    const setItem = storage({ schemaVersion: 1, skin: 'unknown', bestSessionEggs: 42 });
    const settings = new LocalSettings();
    expect(settings.snapshot().skin).toBe('reference');
    setItem.mockImplementation(() => { throw new Error('storage unavailable'); });
    settings.set({ skin: 'classic' });
    expect(settings.snapshot()).toMatchObject({ skin: 'classic', bestSessionEggs: 42 });
    expect(settings.isPersistent).toBe(false);
  });
});
