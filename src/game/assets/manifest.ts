export type VectorAsset = {
  key: string;
  path: string;
  width: number;
  height: number;
};

const baseUrl = import.meta.env.BASE_URL;

export const assetUrl = (path: string): string => `${baseUrl}${path}`;

export const vectorAssets: readonly VectorAsset[] = [
  { key: 'field', path: 'environment/lilac-field.svg', width: 1600, height: 1000 },
  { key: 'shadow', path: 'environment/shadow.svg', width: 128, height: 32 },
  { key: 'hen.idle', path: 'characters/hen-idle.svg', width: 256, height: 256 },
  { key: 'hen.blink', path: 'characters/hen-blink.svg', width: 256, height: 256 },
  { key: 'hen.walk-a', path: 'characters/hen-walk-a.svg', width: 256, height: 256 },
  { key: 'hen.walk-b', path: 'characters/hen-walk-b.svg', width: 256, height: 256 },
  { key: 'hen.lay', path: 'characters/hen-lay.svg', width: 256, height: 256 },
  { key: 'hen.happy', path: 'characters/hen-happy.svg', width: 256, height: 256 },
  { key: 'chick.idle', path: 'characters/chick-idle.svg', width: 128, height: 128 },
  { key: 'chick.walk-a', path: 'characters/chick-walk-a.svg', width: 128, height: 128 },
  { key: 'chick.walk-b', path: 'characters/chick-walk-b.svg', width: 128, height: 128 },
  { key: 'chick.hatch', path: 'characters/chick-hatch.svg', width: 128, height: 128 },
  { key: 'egg.whole', path: 'eggs/egg-whole.svg', width: 96, height: 120 },
  { key: 'egg.crack-1', path: 'eggs/egg-crack-1.svg', width: 96, height: 120 },
  { key: 'egg.crack-2', path: 'eggs/egg-crack-2.svg', width: 96, height: 120 },
  { key: 'egg.shell-top', path: 'eggs/shell-top.svg', width: 96, height: 120 },
  { key: 'egg.shell-bottom', path: 'eggs/shell-bottom.svg', width: 96, height: 120 },
  { key: 'fx.star', path: 'fx/star.svg', width: 96, height: 96 },
  { key: 'fx.puff', path: 'fx/puff.svg', width: 96, height: 96 },
  { key: 'fx.heart', path: 'fx/heart.svg', width: 96, height: 96 },
];

export const audioAssets = {
  background: assetUrl('audio/happy-garden.mp3'),
  chicken: assetUrl('audio/hen-cluck.mp3'),
  lay: assetUrl('audio/egg-lay.mp3'),
  hatch: assetUrl('audio/egg-hatch.mp3'),
  ui: assetUrl('audio/ui-button.mp3'),
  reward: assetUrl('audio/full-egg-fanfare.mp3'),
} as const;
