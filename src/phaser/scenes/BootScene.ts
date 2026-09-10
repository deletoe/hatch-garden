import Phaser from 'phaser';
import { assetUrl, vectorAssets } from '../../game/assets/manifest';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    for (const asset of vectorAssets) {
      this.load.svg(asset.key, assetUrl(asset.path), { width: asset.width, height: asset.height });
    }
  }

  create(): void {
    this.scene.start('GameScene');
  }
}
