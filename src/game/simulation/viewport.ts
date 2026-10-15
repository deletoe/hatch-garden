/** Keep small screens familiar and bound large-screen density by a 1080p area. */
export const worldScaleFor = (width: number, height: number): number => Math.max(
  Math.max(0.42, Math.min(Math.min(width, height) / 720, 1)),
  Math.sqrt(Math.max(1, width) * Math.max(1, height) / (1920 * 1080)),
);
