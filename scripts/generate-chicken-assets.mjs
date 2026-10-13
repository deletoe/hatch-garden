import { writeFile } from 'node:fs/promises';

// Happy Mrs Chicken's flat circular silhouette, single eye and three-lobed wing.
// Reference: P2 Games' Happy Mrs Chicken support art and game screenshots.
const ink = '#292600';
const yellow = '#FFFF11';
const cream = '#FFFFCD';
const gold = '#DCC642';

function chicken(pose) {
  const step = pose === 'walk-a' ? 9 : pose === 'walk-b' ? -9 : 0;
  const happy = pose === 'happy' || pose === 'hatch';
  const left = 102 + step, right = 154 - step;
  const feet = happy
    ? 'M102 209 L89 221 M89 221 L76 217 M89 221 L88 230 M154 209 L169 219 M169 219 L181 214 M169 219 L173 227'
    : `M102 209 L${left} 227 M${left} 217 l-14 10 M${left} 217 l12 10 M154 209 L${right} 227 M${right} 217 l-12 10 M${right} 217 l14 10`;
  const eye = pose === 'blink' || happy
    ? '<path d="M157 115 Q166 106 175 115" fill="none"/>'
    : '<circle cx="166" cy="114" r="9" fill="'+ink+'" stroke="none"/>';
  return `<g stroke="${ink}" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round">
<path d="${feet}" fill="none"/>
<g${pose === 'lay' ? ' transform="translate(0 14) scale(1 .92)"' : ''}>
<path d="M59 150 C44 146 30 150 31 158 C30 163 37 165 42 163 C27 167 30 180 41 178 C27 187 43 195 50 185 L66 177Z" fill="${yellow}"${happy ? ' transform="rotate(24 60 162)"' : ''}/>
<path d="M105 76 C97 61 94 43 103 41 C111 39 112 50 118 53 C122 39 130 37 135 45 C138 49 135 54 139 56 C144 43 153 43 156 51 C160 59 153 73 150 78Z" fill="#ED1635"/>
<path d="M194 111 L236 131 L194 153Z" fill="${cream}"/><path d="M197 132 L234 131" fill="none"/>
<circle cx="128" cy="140" r="72" fill="${yellow}"/>
${eye}
</g></g>`;
}
for (const pose of ['idle', 'blink', 'walk-a', 'walk-b', 'lay', 'happy']) {
  await writeFile(new URL(`../art/characters/hen-${pose}.svg`, import.meta.url), `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" fill="none"><title>快乐母鸡 · ${pose}</title>${chicken(pose)}</svg>\n`);
}
for (const pose of ['idle', 'walk-a', 'walk-b', 'hatch']) {
  await writeFile(new URL(`../art/characters/chick-${pose}.svg`, import.meta.url), `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" fill="none"><title>小鸡 · ${pose}</title><g transform="translate(0 -2) scale(.5)">${chicken(pose)}</g></svg>\n`);
}
const egg = 'M48 12 C31 12 19 42 19 66 C19 89 31 104 48 104 C65 104 77 89 77 66 C77 42 65 12 48 12Z';
const crack = 'M21 61 L31 54 L41 65 L50 56 L59 66 L75 59';
for (const state of ['whole', 'crack-1', 'crack-2']) {
  const cracks = state === 'whole' ? '' : `<path d="${crack}" fill="none" stroke="${gold}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${state === 'crack-2' ? `<path d="M50 56 L45 41 L52 30 M59 66 L54 79 L61 90" fill="none" stroke="${gold}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>` : ''}`;
  await writeFile(new URL(`../art/eggs/egg-${state}.svg`, import.meta.url), `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="120" viewBox="0 0 96 120" fill="none"><title>蛋 · ${state}</title><path d="${egg}" fill="${cream}" stroke="${gold}" stroke-width="4.5"/>${cracks}</svg>\n`);
}
const shells = {
  top: 'M21 61 C22 39 33 12 48 12 C63 12 73 37 75 59 L59 66 L50 56 L41 65 L31 54Z',
  bottom: 'M21 61 L31 54 L41 65 L50 56 L59 66 L75 59 C80 82 66 104 48 104 C31 104 17 86 21 61Z',
};
for (const [part, path] of Object.entries(shells)) await writeFile(new URL(`../art/eggs/shell-${part}.svg`, import.meta.url), `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="120" viewBox="0 0 96 120" fill="none"><title>蛋壳 · ${part}</title><path d="${path}" fill="${cream}" stroke="${gold}" stroke-width="4.5" stroke-linejoin="round"/></svg>\n`);
