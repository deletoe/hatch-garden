export const skinIds = ['reference', 'classic'] as const;
export type Skin = typeof skinIds[number];
export const isSkin = (value: unknown): value is Skin => value === 'reference' || value === 'classic';

export const skinStyles = {
  reference: { label: '动画造型', peppaScale: 0.9, georgeScale: 0.63, adultShadowOffset: 3 },
  classic: { label: '圆润造型', peppaScale: 0.8, georgeScale: 0.72, adultShadowOffset: 16 },
} as const;
