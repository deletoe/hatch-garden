import Phaser from 'phaser';
import { assetUrl, sharedVectorAssets, skinVectorAssets } from '../../game/assets/manifest';
import type { Skin } from '../../game/assets/skins';

export class BootScene extends Phaser.Scene {
  constructor(private readonly skin: Skin) {
    super('BootScene');
  }

  preload(): void {
    for (const asset of [...sharedVectorAssets, ...skinVectorAssets(this.skin)]) {
      this.load.svg(asset.key, assetUrl(asset.path), { width: asset.width, height: asset.height });
    }
  }

  create(): void {
    this.scene.start('GameScene');
  }
}
