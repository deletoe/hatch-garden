import { writeFile } from 'node:fs/promises';

// Hand-drawn SVG poses share a 256 px canvas and a 228 px foot anchor.
for (const [name, label, outfit] of [['peppa', '佩奇', '#EF6873'], ['george', '乔治', '#66B9DF']]) {
  for (const pose of ['idle', 'walk-a', 'walk-b', 'jump']) {
    const jump = pose === 'jump';
    const step = pose === 'walk-a' ? 10 : pose === 'walk-b' ? -10 : 0;
    const leftFoot = 84 + step, rightFoot = 142 - step;
    const arms = jump ? 'M73 155 L43 132 M43 132 L34 130 M43 132 L41 121 M151 157 L181 133 M181 133 L190 132 M181 133 L185 122'
      : `M72 161 L${44 - step} 177 M${44 - step} 177 l-10 -2 M${44 - step} 177 l-3 8 M153 162 L${183 + step} 174 M${183 + step} 174 l10 -2 M${183 + step} 174 l3 8`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" fill="none"><title>${label} · ${pose}</title>
<g stroke="#493954" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
<path d="M68 174 C39 167 25 157 28 148 C31 141 44 144 43 152 C42 160 31 161 27 156" stroke="#E981A6"/>
<path d="M85 205 L${leftFoot} ${jump ? 219 : 224} M140 205 L${rightFoot} ${jump ? 219 : 224}" stroke="#E981A6"/>
<ellipse cx="${leftFoot - 6}" cy="225" rx="16" ry="6" fill="#493954"/><ellipse cx="${rightFoot + 6}" cy="225" rx="16" ry="6" fill="#493954"/>
<path d="${arms}" stroke="#E981A6"/>
${name === 'peppa' ? '<path d="M82 140 L142 140 L173 207 Q112 224 51 207Z"' : '<path d="M81 142 L144 142 Q170 165 164 207 Q112 220 59 207 Q53 168 81 142Z"'} fill="${outfit}"/>
<ellipse cx="94" cy="42" rx="10" ry="19" fill="#F8B0CA" stroke="#E981A6" transform="rotate(-15 94 42)"/>
<ellipse cx="129" cy="41" rx="10" ry="19" fill="#F8B0CA" stroke="#E981A6" transform="rotate(12 129 41)"/>
<path d="M82 58 C111 40 151 48 170 68 L204 67 C227 66 240 77 237 95 C235 112 219 121 197 116 L171 113 C165 140 140 156 103 153 C62 151 40 130 42 100 C42 81 58 67 82 58Z" fill="#F8B0CA" stroke="#E981A6"/>
<ellipse cx="215" cy="89" rx="21" ry="22" fill="#FFC4D8" stroke="#E981A6"/>
<circle cx="209" cy="86" r="3.5" fill="#D86996" stroke="none"/><circle cx="223" cy="91" r="3.5" fill="#D86996" stroke="none"/>
<ellipse cx="92" cy="121" rx="15" ry="13" fill="#EF8CB3" stroke="none"/>
${jump ? '<path d="M126 79 Q133 69 139 79 M156 80 Q163 71 170 80" stroke="#493954" stroke-width="4.5"/><path d="M122 116 Q141 145 164 115Z" fill="#CB6989" stroke="#D86996" stroke-width="4.5"/>'
  : '<circle cx="133" cy="79" r="8" fill="#FFF9EC" stroke="#E981A6" stroke-width="4"/><circle cx="164" cy="80" r="8" fill="#FFF9EC" stroke="#E981A6" stroke-width="4"/><circle cx="135" cy="79" r="3" fill="#493954" stroke="none"/><circle cx="166" cy="80" r="3" fill="#493954" stroke="none"/><path d="M123 117 Q141 135 160 117" stroke="#D86996" stroke-width="4.5"/>'}
</g></svg>\n`;
    await writeFile(new URL(`../art/characters/${name}-${pose}.svg`, import.meta.url), svg);
  }
}
