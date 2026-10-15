import Phaser from 'phaser';
import { GameController } from '../../game/GameController';
import type { GameEvent, RenderAdult, RenderChick, RenderEgg, RenderState, MudPuddle, Pig, PigName } from '../../game/simulation/types';
import { worldScaleFor } from '../../game/simulation/viewport';
import { assetUrl, skinTextureKey, skinVectorAssets } from '../../game/assets/manifest';
import { skinStyles, type Skin } from '../../game/assets/skins';

const STEP = 1 / 60;
const MAX_STEPS_PER_FRAME = 5;

type EntityView = {
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  seenAt: number;
};

export class GameScene extends Phaser.Scene {
  private accumulator = 0;
  private field!: Phaser.GameObjects.Image;
  private mud!: Phaser.GameObjects.Image;
  private mudRipples: Phaser.GameObjects.Ellipse[] = [];
  private mudDrops: Phaser.GameObjects.Ellipse[] = [];
  private visualScale = 1;
  private readonly adults = new Map<number, EntityView>();
  private readonly eggs = new Map<number, EntityView>();
  private readonly chicks = new Map<number, EntityView>();
  private readonly pigs = new Map<PigName, EntityView>();
  private readonly effects = new Set<Phaser.GameObjects.GameObject>();
  private celebrating = false;
  private paused = false;
  private pausedAt = 0;
  private skin: Skin = 'reference';
  private lastRenderedRevision = -1;
  private viewRevision = 0;

  constructor(private readonly controller: GameController) {
    super('GameScene');
  }

  create(): void {
    this.skin = this.controller.state().settings.skin;
    this.field = this.add.image(0, 0, 'field').setOrigin(0).setDepth(0);
    this.mud = this.add.image(0, 0, 'mud').setDepth(1).setVisible(false);
    this.mudRipples = Array.from({ length: 2 }, () => this.add.ellipse(0, 0, 200, 100).setSmoothness(40).setStrokeStyle(2, 0xe0ad86).setDepth(2).setVisible(false));
    this.mudDrops = Array.from({ length: 8 }, () => this.add.ellipse(0, 0, 9, 13, 0x95644f).setVisible(false));
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
    const unsubscribe = this.controller.subscribe(({ paused }) => this.setPaused(paused));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe);
  }

  async selectSkin(skin: Skin): Promise<void> {
    if (!this.sys.isActive()) throw new Error('Game scene is not ready');
    if (skin === this.skin) return;
    const missing = skinVectorAssets(skin).filter((asset) => !this.textures.exists(asset.key));
    if (missing.length) {
      await new Promise<void>((resolve, reject) => {
        // Refill downloads from file events while the paused game loop is asleep.
        const refill = (): void => { this.load.update(); };
        this.load.on(Phaser.Loader.Events.FILE_LOAD, refill);
        this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, refill);
        this.load.once(Phaser.Loader.Events.COMPLETE, () => {
          this.load.off(Phaser.Loader.Events.FILE_LOAD, refill);
          this.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, refill);
          if (missing.every((asset) => this.textures.exists(asset.key))) resolve();
          else reject(new Error('Skin assets failed to load'));
        });
        for (const asset of missing) this.load.svg(asset.key, assetUrl(asset.path), { width: asset.width, height: asset.height });
        this.load.start();
      });
    }
    this.skin = skin;
    // Frozen hatching shell effects should change together with the living flock.
    for (const effect of this.effects) {
      if (effect instanceof Phaser.GameObjects.Image) {
        const key = effect.texture.key.replace(/^classic\./, '');
        if (key.startsWith('egg.')) effect.setTexture(skinTextureKey(skin, key));
      }
    }
    this.controller.setSkin(skin);
    this.sync(this.controller.renderState(), true);
    this.redrawPaused();
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

    this.sync(this.controller.renderState());
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
    this.visualScale = worldScaleFor(width, height);
    this.field.setDisplaySize(width, height);
    this.controller.resizeWorld(width, height);
    this.sync(this.controller.renderState(), true);
    this.redrawPaused();
  }

  private redrawPaused(): void {
    if (!this.paused) return;
    // Redraw once on resize or a skin change, keeping simulation and tweens frozen.
    this.game.resume();
    this.game.step(performance.now(), 0);
    this.game.pause();
  }

  private sync(snapshot: RenderState, force = false): void {
    // Rendering can outpace the 60 Hz simulation. Tweens still update independently.
    // The render buffer is reused, so cache the revision number rather than its identity.
    if (!force && snapshot.revision === this.lastRenderedRevision) return;
    this.lastRenderedRevision = snapshot.revision;
    this.viewRevision++;
    this.syncMud(snapshot.puddle, snapshot.time);
    this.syncAdults(snapshot.adults, snapshot.time);
    this.syncEggs(snapshot.eggs);
    this.syncChicks(snapshot.chicks, snapshot.time);
    this.syncPigs(snapshot.pigs, snapshot.time);
  }

  private jumpHeight(time: number, phase: number, height: number): number {
    return Math.max(0, Math.sin(time * Math.PI * 3.2 + phase * 1.7)) * height * this.visualScale;
  }

  private syncMud(puddle: MudPuddle | null, time: number): void {
    this.mud.setVisible(puddle !== null);
    const active = puddle !== null && puddle.activatedAt !== null;
    for (const effect of [...this.mudRipples, ...this.mudDrops]) effect.setVisible(active);
    if (!puddle) return;
    this.mud.setPosition(puddle.x, puddle.y).setDisplaySize(puddle.radiusX * 2, puddle.radiusY * 2);
    if (!active) return;
    for (const [index, ripple] of this.mudRipples.entries()) {
      const progress = ((time - puddle.activatedAt!) * 1.6 + index * 0.5) % 1;
      ripple.setPosition(puddle.x, puddle.y).setDisplaySize(puddle.radiusX * (0.5 + progress), puddle.radiusY * (0.4 + progress)).setAlpha((1 - progress) * 0.6);
    }
    for (const [index, drop] of this.mudDrops.entries()) {
      const progress = ((time - puddle.activatedAt!) * 1.6 + index / this.mudDrops.length) % 1;
      const side = index % 2 === 0 ? -1 : 1;
      drop.setPosition(puddle.x + side * puddle.radiusX * (0.12 + progress * 0.65), puddle.y + (index % 3 - 1) * puddle.radiusY * 0.3 - Math.sin(progress * Math.PI) * 42 * this.visualScale)
        .setScale(this.visualScale * (1 - progress * 0.5)).setAlpha(1 - progress).setDepth(puddle.y + 3).setAngle(side * progress * 70);
    }
  }

  private syncAdults(adults: readonly RenderAdult[], time: number): void {
    for (const adult of adults) {
      const view = this.adults.get(adult.id) ?? this.createAdultView(adult);
      view.seenAt = this.viewRevision;
      const texture = skinTextureKey(this.skin, `hen.${adult.pose}`);
      const jump = adult.jumping ? this.jumpHeight(time, adult.id, 30) : 0;
      if (view.sprite.texture.key !== texture) view.sprite.setTexture(texture);
      view.sprite
        .setPosition(adult.x, adult.y - jump)
        .setScale(0.63 * this.visualScale)
        .setFlipX(adult.direction < 0)
        .setDepth(adult.y + 10);
      view.shadow
        .setPosition(adult.x, adult.y + skinStyles[this.skin].adultShadowOffset * this.visualScale)
        .setDisplaySize((118 - jump * 0.8) * this.visualScale, 24 * this.visualScale)
        .setAlpha(adult.jumping ? 0.72 : 1)
        .setDepth(adult.y + 8);
    }
    this.removeMissing(this.adults);
  }

  private syncEggs(eggs: readonly RenderEgg[]): void {
    for (const egg of eggs) {
      const view = this.eggs.get(egg.id) ?? this.createEggView(egg);
      view.seenAt = this.viewRevision;
      const texture = skinTextureKey(this.skin, `egg.${egg.state}`);
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
    this.removeMissing(this.eggs);
  }

  private syncChicks(chicks: readonly RenderChick[], time: number): void {
    for (const chick of chicks) {
      const view = this.chicks.get(chick.id) ?? this.createChickView(chick);
      view.seenAt = this.viewRevision;
      const texture = skinTextureKey(this.skin, `chick.${chick.pose}`);
      const jump = chick.jumping ? this.jumpHeight(time, chick.id, 23) : 0;
      if (view.sprite.texture.key !== texture) view.sprite.setTexture(texture);
      view.sprite
        .setPosition(chick.x, chick.y - jump)
        .setScale(0.76 * this.visualScale)
        .setFlipX(chick.direction < 0)
        .setDepth(chick.y + 7);
      view.shadow
        .setPosition(chick.x, chick.y + 3 * this.visualScale)
        .setDisplaySize((48 - jump * 0.4) * this.visualScale, 10 * this.visualScale)
        .setAlpha(chick.jumping ? 0.72 : 1)
        .setDepth(chick.y + 5);
    }
    this.removeMissing(this.chicks);
  }

  private syncPigs(pigs: readonly Pig[], time: number): void {
    for (const [index, pig] of pigs.entries()) {
      let view = this.pigs.get(pig.name);
      if (!view) {
        view = {
          sprite: this.add.image(pig.x, pig.y, skinTextureKey(this.skin, `${pig.name}.idle`)).setOrigin(0.5, 228 / 256),
          shadow: this.add.image(pig.x, pig.y, 'shadow'),
          seenAt: this.viewRevision,
        };
        this.pigs.set(pig.name, view);
      }
      const texture = skinTextureKey(this.skin, `${pig.name}.${pig.pose}`);
      if (view.sprite.texture.key !== texture) view.sprite.setTexture(texture);
      const size = pig.name === 'peppa' ? skinStyles[this.skin].peppaScale : skinStyles[this.skin].georgeScale;
      const shadowSize = size / 0.72;
      const jump = pig.state === 'jumping' ? this.jumpHeight(time, index, 36) : 0;
      view.sprite.setPosition(pig.x, pig.y - jump).setScale(size * this.visualScale).setFlipX(pig.direction < 0).setDepth(pig.y + 12);
      view.shadow.setPosition(pig.x, pig.y + 3 * this.visualScale).setDisplaySize((122 - jump * 0.9) * this.visualScale * shadowSize, 22 * this.visualScale * shadowSize).setAlpha(pig.state === 'jumping' ? 0.72 : 1).setDepth(pig.y + 8);
    }
  }

  private removeMissing(views: Map<number, EntityView>): void {
    for (const [id, view] of views) {
      if (view.seenAt !== this.viewRevision) {
        view.sprite.destroy();
        view.shadow.destroy();
        views.delete(id);
      }
    }
  }

  private createAdultView(adult: RenderAdult): EntityView {
    const shadow = this.add.image(adult.x, adult.y, 'shadow').setOrigin(0.5);
    const sprite = this.add.image(adult.x, adult.y, skinTextureKey(this.skin, 'hen.idle')).setOrigin(0.5, 0.89);
    const view = { sprite, shadow, seenAt: this.viewRevision };
    this.adults.set(adult.id, view);
    return view;
  }

  private createEggView(egg: RenderEgg): EntityView {
    const shadow = this.add.image(egg.x, egg.y + 5, 'shadow').setOrigin(0.5);
    const sprite = this.add.image(egg.x, egg.y, skinTextureKey(this.skin, 'egg.whole')).setOrigin(0.5, 0.87);
    const view = { sprite, shadow, seenAt: this.viewRevision };
    this.eggs.set(egg.id, view);
    return view;
  }

  private createChickView(chick: RenderChick): EntityView {
    const shadow = this.add.image(chick.x, chick.y + 3, 'shadow').setOrigin(0.5);
    const sprite = this.add.image(chick.x, chick.y, skinTextureKey(this.skin, 'chick.hatch')).setOrigin(0.5, 0.875);
    const view = { sprite, shadow, seenAt: this.viewRevision };
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
    const shellTop = this.add.image(event.x, event.y, skinTextureKey(this.skin, 'egg.shell-top')).setOrigin(0.5, 0.87).setScale(0.55 * scale).setDepth(event.y + 20);
    const shellBottom = this.add.image(event.x, event.y, skinTextureKey(this.skin, 'egg.shell-bottom')).setOrigin(0.5, 0.87).setScale(0.55 * scale).setDepth(event.y + 19);
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
