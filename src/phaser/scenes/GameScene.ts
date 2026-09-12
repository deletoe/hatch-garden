import Phaser from 'phaser';
import { GameController } from '../../game/GameController';
import type { Adult, Chick, Egg, GameEvent, GameSnapshot } from '../../game/simulation/types';

const STEP = 1 / 60;
const MAX_STEPS_PER_FRAME = 5;

type EntityView = {
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
};

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export class GameScene extends Phaser.Scene {
  private accumulator = 0;
  private field!: Phaser.GameObjects.Image;
  private visualScale = 1;
  private readonly adults = new Map<number, EntityView>();
  private readonly eggs = new Map<number, EntityView>();
  private readonly chicks = new Map<number, EntityView>();
  private readonly effects = new Set<Phaser.GameObjects.GameObject>();
  private celebrating = false;
  private paused = false;
  private pausedAt = 0;

  constructor(private readonly controller: GameController) {
    super('GameScene');
  }

  create(): void {
    this.field = this.add.image(0, 0, 'field').setOrigin(0).setDepth(0);
    this.input.on('pointerdown', () => this.controller.layEgg());
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this));
    // ScaleManager normally checks the parent on game ticks, which stop on pause.
    const resizeWhilePaused = new ResizeObserver(() => {
      if (this.paused && this.scale.getParentBounds()) this.scale.refresh();
    });
    if (this.game.canvas.parentElement) resizeWhilePaused.observe(this.game.canvas.parentElement);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => resizeWhilePaused.disconnect());
    this.layout();
    this.sync(this.controller.state().snapshot);
    const unsubscribe = this.controller.subscribe(({ paused }) => this.setPaused(paused));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe);
  }

  update(_time: number, delta: number): void {
    if (this.controller.isPaused()) {
      this.accumulator = 0;
      return;
    }
    this.accumulator += Math.min(delta / 1000, STEP * MAX_STEPS_PER_FRAME);
    const events: GameEvent[] = [];
    let steps = 0;
    while (this.accumulator >= STEP && steps < MAX_STEPS_PER_FRAME) {
      events.push(...this.controller.advance(STEP));
      this.accumulator -= STEP;
      steps += 1;
    }
    if (steps === MAX_STEPS_PER_FRAME) {
      this.accumulator = 0;
    }

    this.sync(this.controller.state().snapshot);
    for (const event of events) {
      this.presentEvent(event);
    }
  }

  private setPaused(paused: boolean): void {
    if (paused === this.paused) return;
    this.paused = paused;
    this.accumulator = 0;
    if (paused) {
      this.pausedAt = Date.now();
      this.tweens.pauseAll();
      this.game.pause();
      this.game.loop.sleep();
    } else {
      // TweenManager uses its own wall clock, independently of the game loop.
      const pauseDuration = Date.now() - this.pausedAt;
      this.tweens.startTime += pauseDuration;
      this.tweens.prevTime += pauseDuration;
      this.tweens.resumeAll();
      this.game.loop.resetDelta();
      this.game.resume();
      this.game.loop.wake();
    }
  }

  private layout(): void {
    const width = Math.max(1, this.scale.width);
    const height = Math.max(1, this.scale.height);
    this.visualScale = clamp(Math.min(width, height) / 720, 0.42, 1);
    this.field.setDisplaySize(width, height);
    this.controller.resizeWorld(width, height);
    if (this.paused) {
      // Redraw once on resize, while keeping the simulation and tweens frozen.
      this.sync(this.controller.state().snapshot);
      this.game.resume();
      this.game.step(performance.now(), 0);
      this.game.pause();
    }
  }

  private sync(snapshot: GameSnapshot): void {
    this.syncAdults(snapshot.adults);
    this.syncEggs(snapshot.eggs);
    this.syncChicks(snapshot.chicks);
  }

  private syncAdults(adults: readonly Adult[]): void {
    const active = new Set(adults.map((adult) => adult.id));
    this.removeMissing(this.adults, active);
    for (const adult of adults) {
      const view = this.adults.get(adult.id) ?? this.createAdultView(adult);
      const texture = `hen.${adult.pose}`;
      if (view.sprite.texture.key !== texture) view.sprite.setTexture(texture);
      view.sprite
        .setPosition(adult.x, adult.y)
        .setScale(0.63 * this.visualScale)
        .setFlipX(adult.direction < 0)
        .setDepth(adult.y + 10);
      view.shadow
        .setPosition(adult.x, adult.y + 16 * this.visualScale)
        .setDisplaySize(118 * this.visualScale, 24 * this.visualScale)
        .setDepth(adult.y + 8);
    }
  }

  private syncEggs(eggs: readonly Egg[]): void {
    const active = new Set(eggs.map((egg) => egg.id));
    this.removeMissing(this.eggs, active);
    for (const egg of eggs) {
      const view = this.eggs.get(egg.id) ?? this.createEggView(egg);
      const texture = `egg.${egg.state}`;
      if (view.sprite.texture.key !== texture) view.sprite.setTexture(texture);
      if (view.sprite.x === egg.x && view.sprite.y === egg.y && view.sprite.scaleX === 0.55 * this.visualScale) continue;
      view.sprite
        .setPosition(egg.x, egg.y)
        .setScale(0.55 * this.visualScale)
        .setDepth(egg.y + 4);
      view.shadow
        .setPosition(egg.x, egg.y + 5 * this.visualScale)
        .setDisplaySize(44 * this.visualScale, 10 * this.visualScale)
        .setDepth(egg.y + 2);
    }
  }

  private syncChicks(chicks: readonly Chick[]): void {
    const active = new Set(chicks.map((chick) => chick.id));
    this.removeMissing(this.chicks, active);
    for (const chick of chicks) {
      const view = this.chicks.get(chick.id) ?? this.createChickView(chick);
      const texture = `chick.${chick.pose}`;
      if (view.sprite.texture.key !== texture) view.sprite.setTexture(texture);
      view.sprite
        .setPosition(chick.x, chick.y)
        .setScale(0.76 * this.visualScale)
        .setFlipX(chick.direction < 0)
        .setDepth(chick.y + 7);
      view.shadow
        .setPosition(chick.x, chick.y + 3 * this.visualScale)
        .setDisplaySize(48 * this.visualScale, 10 * this.visualScale)
        .setDepth(chick.y + 5);
    }
  }

  private removeMissing(views: Map<number, EntityView>, active: ReadonlySet<number>): void {
    for (const [id, view] of views) {
      if (!active.has(id)) {
        view.sprite.destroy();
        view.shadow.destroy();
        views.delete(id);
      }
    }
  }

  private createAdultView(adult: Adult): EntityView {
    const shadow = this.add.image(adult.x, adult.y, 'shadow').setOrigin(0.5);
    const sprite = this.add.image(adult.x, adult.y, 'hen.idle').setOrigin(0.5, 0.89);
    const view = { sprite, shadow };
    this.adults.set(adult.id, view);
    return view;
  }

  private createEggView(egg: Egg): EntityView {
    const shadow = this.add.image(egg.x, egg.y + 5, 'shadow').setOrigin(0.5);
    const sprite = this.add.image(egg.x, egg.y, 'egg.whole').setOrigin(0.5, 0.87);
    const view = { sprite, shadow };
    this.eggs.set(egg.id, view);
    return view;
  }

  private createChickView(chick: Chick): EntityView {
    const shadow = this.add.image(chick.x, chick.y + 3, 'shadow').setOrigin(0.5);
    const sprite = this.add.image(chick.x, chick.y, 'chick.hatch').setOrigin(0.5, 0.875);
    const view = { sprite, shadow };
    this.chicks.set(chick.id, view);
    return view;
  }

  private presentEvent(event: GameEvent): void {
    if (event.type === 'session-restarted') {
      this.tweens.killAll();
      for (const effect of this.effects) effect.destroy();
      this.celebrating = false;
    }
    if (event.type === 'egg-hatched') {
      this.showHatch(event);
    }
    if (event.type === 'chick-matured') {
      this.showMaturity(event.x, event.y);
    }
    if (event.type === 'egg-field-filled') {
      this.showFullFieldReward();
    }
  }

  private showHatch(event: Extract<GameEvent, { type: 'egg-hatched' }>): void {
    if (this.effects.size + 4 > 40) return;
    const scale = this.visualScale;
    const puff = this.add.image(event.x, event.y - 20 * scale, 'fx.puff').setScale(0.24 * scale).setDepth(event.y + 21);
    const star = this.add.image(event.x + 28 * scale, event.y - 35 * scale, 'fx.star').setScale(0.2 * scale).setDepth(event.y + 24);
    const shellTop = this.add.image(event.x, event.y, 'egg.shell-top').setOrigin(0.5, 0.87).setScale(0.55 * scale).setDepth(event.y + 20);
    const shellBottom = this.add.image(event.x, event.y, 'egg.shell-bottom').setOrigin(0.5, 0.87).setScale(0.55 * scale).setDepth(event.y + 19);
    for (const effect of [puff, star, shellTop, shellBottom]) this.trackEffect(effect);

    this.tweens.add({ targets: puff, alpha: 0, scale: 0.54 * scale, duration: 420, ease: 'Quad.out', onComplete: () => puff.destroy() });
    this.tweens.add({ targets: star, y: star.y - 28 * scale, alpha: 0, angle: 20, duration: 460, ease: 'Quad.out', onComplete: () => star.destroy() });
    this.tweens.add({ targets: shellTop, x: shellTop.x - 21 * scale, y: shellTop.y - 34 * scale, alpha: 0, angle: -18, duration: 380, ease: 'Quad.out', onComplete: () => shellTop.destroy() });
    this.tweens.add({ targets: shellBottom, x: shellBottom.x + 17 * scale, y: shellBottom.y + 11 * scale, alpha: 0, angle: 16, duration: 380, ease: 'Quad.out', onComplete: () => shellBottom.destroy() });
  }

  private showMaturity(x: number, y: number): void {
    if (this.effects.size >= 40) return;
    const scale = this.visualScale;
    const star = this.add.image(x + 28 * scale, y - 48 * scale, 'fx.star').setScale(0.28 * scale).setDepth(y + 32);
    this.trackEffect(star);
    this.tweens.add({ targets: star, y: star.y - 32 * scale, alpha: 0, angle: 40, duration: 620, ease: 'Quad.out', onComplete: () => star.destroy() });
  }

  private showFullFieldReward(): void {
    if (this.celebrating) return;
    this.celebrating = true;
    let remaining = 51;
    const trackReward = (effect: Phaser.GameObjects.GameObject): void => {
      this.trackEffect(effect);
      effect.once(Phaser.GameObjects.Events.DESTROY, () => {
        if (--remaining === 0) this.celebrating = false;
      });
    };
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    const scale = this.visualScale;
    const banner = this.add.text(centerX, centerY - 30 * scale, '蛋铺满啦！', {
      color: '#493954',
      fontFamily: '"Hiragino Sans GB", "PingFang SC", sans-serif',
      fontSize: `${Math.round(44 * scale)}px`,
      fontStyle: 'bold',
      stroke: '#fff9ec',
      strokeThickness: Math.max(3, 7 * scale),
    }).setOrigin(0.5).setScale(0.35).setDepth(centerY + 320);
    trackReward(banner);
    this.tweens.add({
      targets: banner,
      scale: 1.05,
      y: centerY - 58 * scale,
      duration: 320,
      ease: 'Back.out',
      yoyo: true,
      hold: 520,
      alpha: 0,
      onComplete: () => banner.destroy(),
    });

    const colors = [0xffd369, 0xef796f, 0x8bd3dd, 0xfff9ec, 0x8ccf84];
    for (let index = 0; index < 32; index += 1) {
      const confetti = this.add.rectangle(
        Phaser.Math.Between(0, this.scale.width),
        Phaser.Math.Between(-80, Math.round(this.scale.height * 0.18)),
        Phaser.Math.Between(7, 12) * scale,
        Phaser.Math.Between(14, 24) * scale,
        colors[index % colors.length],
      ).setDepth(centerY + 260);
      trackReward(confetti);
      this.tweens.add({
        targets: confetti,
        x: confetti.x + Phaser.Math.Between(-120, 120) * scale,
        y: this.scale.height + Phaser.Math.Between(20, 120) * scale,
        angle: Phaser.Math.Between(220, 720),
        alpha: 0,
        duration: Phaser.Math.Between(760, 1_240),
        ease: 'Quad.in',
        onComplete: () => confetti.destroy(),
      });
    }

    for (let index = 0; index < 18; index += 1) {
      const angle = (Math.PI * 2 * index) / 18;
      const radius = Phaser.Math.Between(95, 240) * scale;
      const star = this.add.image(centerX, centerY, 'fx.star').setScale(0.12 * scale).setDepth(centerY + 280);
      trackReward(star);
      this.tweens.add({
        targets: star,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius * 0.66,
        alpha: 0,
        angle: Phaser.Math.Between(180, 540),
        scale: 0.34 * scale,
        duration: Phaser.Math.Between(600, 1_000),
        ease: 'Quad.out',
        onComplete: () => star.destroy(),
      });
    }
  }

  private trackEffect(effect: Phaser.GameObjects.GameObject): void {
    this.effects.add(effect);
    effect.once(Phaser.GameObjects.Events.DESTROY, () => this.effects.delete(effect));
  }
}
