import { assetUrl } from '../game/assets/manifest';
import { GameController, type ControllerState } from '../game/GameController';

const get = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing UI element #${id}`);
  }
  return element as T;
};

const canUseKeyboard = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return true;
  }
  return !target.matches('input, textarea, select, [contenteditable="true"]');
};

export class GameUi {
  private readonly sessionScore = get<HTMLElement>('session-score');
  private readonly soundButton = get<HTMLButtonElement>('sound-button');
  private readonly soundIcon = get<HTMLImageElement>('sound-icon');
  private readonly gameShell = get<HTMLElement>('game-shell');
  private readonly fullscreenButton = get<HTMLButtonElement>('fullscreen-button');
  private readonly fullscreenIcon = get<HTMLImageElement>('fullscreen-icon');
  private readonly pauseButton = get<HTMLButtonElement>('pause-button');
  private readonly pauseIcon = get<HTMLImageElement>('pause-icon');
  private readonly pausePanel = get<HTMLElement>('pause-panel');
  private readonly pauseMessage = get<HTMLElement>('pause-message');
  private readonly resumeButton = get<HTMLButtonElement>('resume-button');
  private readonly restartButton = get<HTMLButtonElement>('restart-button');
  private readonly status = get<HTMLElement>('status-message');
  private readonly fullscreenSupported = document.fullscreenEnabled === true && typeof this.gameShell.requestFullscreen === 'function';
  private wasPaused = false;

  constructor(private readonly controller: GameController) {
    this.bind();
    controller.subscribe((state) => this.render(state));
  }

  announce(text: string): void {
    this.status.textContent = text;
  }

  private bind(): void {
    this.soundButton.addEventListener('click', () => this.controller.toggleSound());
    if (this.fullscreenSupported) {
      this.fullscreenButton.hidden = false;
      this.fullscreenButton.addEventListener('click', () => void this.toggleFullscreen());
      document.addEventListener('fullscreenchange', () => this.renderFullscreenControl());
      document.addEventListener('fullscreenerror', () => {
        this.renderFullscreenControl();
        this.announce('浏览器当前无法进入全屏模式。');
      });
    }
    this.pauseButton.addEventListener('click', () => this.controller.setManualPause(!this.controller.state().paused));
    this.resumeButton.addEventListener('click', () => this.controller.setManualPause(false));
    this.restartButton.addEventListener('click', () => {
      this.controller.restart();
      this.controller.setManualPause(false);
      this.announce('新的一局开始了。');
    });

    window.addEventListener('keydown', (event) => {
      if (!canUseKeyboard(event.target)) {
        return;
      }
      if (event.code === 'Space' && !event.repeat) {
        event.preventDefault();
        this.lay();
      }
      if (event.code === 'Escape' && !event.repeat) {
        if (document.fullscreenElement) {
          return;
        }
        this.controller.setManualPause(!this.controller.state().paused);
      }
    });

    document.addEventListener('visibilitychange', () => this.controller.setDocumentHidden(document.hidden));
  }

  private lay(): void {
    const result = this.controller.layEgg();
    if (!result.accepted && result.reason === 'no-space') {
      this.announce('场地里的蛋太多了，等一等小鸡破壳。');
    }
  }

  private async toggleFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await this.gameShell.requestFullscreen();
      }
    } catch {
      this.announce('浏览器当前无法进入全屏模式。');
      this.renderFullscreenControl();
    }
  }

  private renderFullscreenControl(): void {
    if (!this.fullscreenSupported) {
      return;
    }
    const active = document.fullscreenElement === this.gameShell;
    this.fullscreenIcon.src = assetUrl(`ui/fullscreen${active ? '-exit' : ''}.svg`);
    this.fullscreenButton.setAttribute('aria-label', active ? '退出全屏模式' : '进入全屏模式');
  }

  private render(state: ControllerState): void {
    this.sessionScore.textContent = String(state.snapshot.score).padStart(3, '0');
    this.soundIcon.src = assetUrl(`ui/sound-${state.settings.soundEnabled ? 'on' : 'off'}.svg`);
    this.soundButton.setAttribute('aria-label', state.settings.soundEnabled ? '关闭声音' : '开启声音');
    this.renderFullscreenControl();
    this.pauseIcon.src = assetUrl(`ui/${state.paused ? 'play' : 'pause'}.svg`);
    this.pauseButton.setAttribute('aria-label', state.paused ? '继续游戏' : '暂停游戏');

    this.pausePanel.hidden = !state.paused || state.pauseReason === 'hidden';
    if (state.pauseReason === 'returning') {
      this.pauseMessage.textContent = '刚刚暂停了。点继续后，小鸡才会重新破壳。';
    } else {
      this.pauseMessage.textContent = '回来后继续看小鸡破壳。';
    }

    if (state.paused && !this.wasPaused && state.pauseReason !== 'hidden') {
      requestAnimationFrame(() => this.resumeButton.focus());
    }
    this.wasPaused = state.paused;

    if (!state.storageAvailable) {
      this.announce('浏览器无法保存纪录，本次仍可正常游玩。');
    }
  }
}
