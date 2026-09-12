import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioController } from './AudioController';

class FakeAudio extends EventTarget {
  static created: FakeAudio[] = [];
  paused = true;
  currentTime = 0;
  volume = 1;
  loop = false;
  preload = '';
  play = vi.fn(() => { this.paused = false; return Promise.resolve(); });
  pause = vi.fn(() => { this.paused = true; });
  constructor(readonly src: string) { super(); FakeAudio.created.push(this); }
}

beforeEach(() => { FakeAudio.created = []; vi.stubGlobal('Audio', FakeAudio); });
afterEach(() => vi.unstubAllGlobals());

describe('AudioController', () => {
  it('reuses a bounded number of media elements over thousands of sounds and pauses', () => {
    const audio = new AudioController(true, 0.7);
    audio.unlock();
    for (let index = 0; index < 2000; index++) {
      for (const name of ['chicken', 'lay', 'hatch', 'ui', 'reward'] as const) audio.play(name);
      if (index % 20 === 0) { audio.pause(); audio.resume(); }
      if (index % 5 === 0) for (const clip of FakeAudio.created) clip.dispatchEvent(new Event('ended'));
    }
    expect(FakeAudio.created).toHaveLength(9); // 8 short voices, 1 looped track.
    expect(FakeAudio.created.filter((clip) => clip.loop)).toHaveLength(1);
    audio.pause();
    expect(FakeAudio.created.every((clip) => clip.paused)).toBe(true);
  });

  it('keeps mute and pause independent and resumes the same music position', () => {
    const audio = new AudioController(true, 0.7);
    audio.unlock();
    const music = FakeAudio.created[0];
    music.currentTime = 8;
    audio.pause();
    audio.setEnabled(false);
    audio.setEnabled(true);
    audio.play('hatch');
    expect(FakeAudio.created).toHaveLength(1);
    expect(music.play).toHaveBeenCalledTimes(1);
    audio.resume();
    expect(music.currentTime).toBe(8);
    expect(music.play).toHaveBeenCalledTimes(2);
    audio.unlock();
    expect(music.play).toHaveBeenCalledTimes(2);
  });

  it('does not release a reused voice when an old play promise rejects after pausing', async () => {
    const audio = new AudioController(true, 0.7);
    audio.unlock();
    audio.play('chicken');
    const chicken = FakeAudio.created[1];
    chicken.dispatchEvent(new Event('ended'));
    let reject!: (error: Error) => void;
    chicken.play.mockImplementationOnce(() => new Promise<void>((_resolve, onReject) => { reject = onReject; }));
    audio.play('chicken');
    audio.pause();
    audio.resume();
    audio.play('chicken');
    reject(new Error('interrupted by pause'));
    await Promise.resolve();
    audio.play('chicken');
    expect(chicken.play).toHaveBeenCalledTimes(3);
  });
});
