import { writeFile } from 'node:fs/promises';

// Reference landmarks were measured from the official Peppa character images.
// The head groups mirror their left-facing references; all game poses face right.
// Both pigs retain a 256 px canvas and the common (128, 228) foot anchor.
const palettes = {
  peppa: { skin: '#F4C0D8', outline: '#EB99C1', cheek: '#F4A1C5', outfit: '#F16465', outfitOutline: '#E8414B', mouth: '#EE4F8F' },
  george: { skin: '#FEB8E2', outline: '#E991C6', cheek: '#FF8CD1', outfit: '#6497DA', outfitOutline: '#4283BF', mouth: '#BE659A' },
};

function head(name, jump) {
  const c = palettes[name];
  // Shift Peppa's whole head 12 source pixels back toward the dress center.
  if (name === 'peppa') return `<g transform="matrix(-.42 0 0 .42 409.3 -95.92)" stroke="${c.outline}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">
<path d="M628 333 C618 318 626 290 640 282 C652 275 666 281 666 296 C666 313 656 330 646 340Z" fill="${c.skin}"/>
<path d="M674 348 C669 335 687 310 701 311 C716 307 725 318 720 332 C714 348 704 359 694 369Z" fill="${c.skin}"/>
<path d="M515 311 C551 312 613 324 659 343 C686 356 711 376 723 404 C735 432 736 465 723 493 C704 536 663 555 619 552 C573 550 540 535 529 507 C521 485 523 453 538 429 C511 420 486 408 474 389 C460 370 457 350 466 333 C476 319 492 308 515 311Z" fill="${c.skin}"/>
<path d="M515 311 C482 305 458 327 464 355 C469 378 487 393 508 389 C525 386 538 366 537 345 C537 329 529 316 515 311Z" fill="${c.skin}" stroke-width="8"/>
<circle cx="491" cy="346" r="7" fill="#BE719E" stroke="none"/><circle cx="512" cy="351" r="7" fill="#BE719E" stroke="none"/>
<circle cx="583" cy="350" r="19" fill="#FFF" stroke-width="7"/><circle cx="635" cy="373" r="20" fill="#FFF" stroke-width="7"/>
<circle cx="588" cy="351" r="8" fill="#1D1D1B" stroke="none"/><circle cx="640" cy="374" r="8" fill="#1D1D1B" stroke="none"/>
<ellipse cx="682" cy="448" rx="29" ry="31" fill="${c.cheek}" stroke="none"/>
${jump ? `<path d="M555 457 C576 463 610 466 638 458 C635 489 615 504 594 498 C571 494 557 479 555 457Z" fill="#1D1D1B" stroke="${c.mouth}" stroke-width="5"/><path d="M576 490 Q595 477 619 489 Q607 503 594 498 Q583 497 576 490Z" fill="${c.mouth}" stroke="none"/>`
  : `<path d="M555 457 C555 480 579 497 603 497 C617 497 628 491 637 477" stroke="${c.mouth}" stroke-width="8" fill="none"/>`}
</g>`;
  // Classic George: the modern reference's hearing aid is intentionally omitted.
  return `<g transform="matrix(-.5 0 0 .5 485 -145)" stroke="${c.outline}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
<path d="M706 386 C700 365 704 344 714 336 C725 328 736 337 734 352 C734 369 725 383 718 393Z" fill="${c.skin}"/>
<path d="M757 395 C755 379 771 355 784 355 C799 351 805 366 796 383 L779 405Z" fill="${c.skin}"/>
<path d="M565 348 C596 347 650 357 690 372 C730 384 770 409 792 438 C813 465 820 499 811 530 C801 568 770 589 732 593 C690 599 641 586 616 563 C592 542 588 516 602 490 C572 483 549 470 534 455 C516 440 509 416 513 393 C517 371 536 350 565 348Z" fill="${c.skin}"/>
<path d="M565 348 C532 346 509 379 513 411 C516 439 532 455 552 454 C578 452 598 429 598 400 C598 376 581 354 565 348Z" fill="${c.skin}"/>
<circle cx="540" cy="396" r="9" fill="#C86CA4" stroke="none"/><circle cx="567" cy="405" r="9" fill="#C86CA4" stroke="none"/>
<circle cx="660" cy="400" r="21" fill="#FFF" stroke-width="8"/><circle cx="714" cy="430" r="21" fill="#FFF" stroke-width="8"/>
<circle cx="659" cy="399" r="9" fill="#000" stroke="none"/><circle cx="713" cy="430" r="9" fill="#000" stroke="none"/>
<circle cx="752" cy="510" r="32" fill="${c.cheek}" stroke="none"/>
${jump ? `<path d="M622 512 C635 519 661 522 679 511 C676 545 652 557 636 542 C626 534 622 523 622 512Z" fill="#1D1D1B" stroke="${c.mouth}" stroke-width="5"/><path d="M636 537 Q653 525 670 539 Q658 551 646 546Z" fill="#F47BBA" stroke="none"/>`
  : `<path d="M622 512 C625 535 650 548 676 528" fill="none" stroke="${c.mouth}" stroke-width="10"/>`}
</g>`;
}

for (const [name, label] of [['peppa', '佩奇'], ['george', '乔治']]) {
  const c = palettes[name];
  for (const pose of ['idle', 'walk-a', 'walk-b', 'jump']) {
    const jump = pose === 'jump';
    const step = pose === 'walk-a' ? 10 : pose === 'walk-b' ? -10 : 0;
    const leftFoot = 102 + step, rightFoot = 154 - step;
    const arms = jump
      ? 'M106 146 L74 123 M74 123 L62 120 M74 123 L69 112 M74 123 L61 129 M180 146 L209 120 M209 120 L219 115 M209 120 L206 109 M209 120 L220 123'
      : `M107 149 L${77 - step} 159 M${77 - step} 159 l-12 -2 M${77 - step} 159 l-6 -11 M${77 - step} 159 l-11 6 M179 149 L${209 + step} 159 M${209 + step} 159 l12 -2 M${209 + step} 159 l6 -11 M${209 + step} 159 l11 6`;
    const body = name === 'peppa'
      ? '<path d="M117 122 C104 143 91 173 82 208 Q141 211 202 208 C192 175 179 144 168 122Z"'
      : '<ellipse cx="131" cy="166" rx="58" ry="42"';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" fill="none"><title>${label} · ${pose}</title>
<g stroke-linecap="round" stroke-linejoin="round">
<path d="M86 184 C66 187 59 179 63 170 C67 162 78 170 72 177 C69 181 60 180 59 173" stroke="${c.skin}" stroke-width="5"/>
<path d="M104 205 L${leftFoot} 226 M155 205 L${rightFoot} 226" stroke="${c.skin}" stroke-width="5"/>
<ellipse cx="${leftFoot + 5}" cy="227" rx="13" ry="4.5" fill="#1D1D1B"/><ellipse cx="${rightFoot + 5}" cy="227" rx="13" ry="4.5" fill="#1D1D1B"/>
<path d="${arms}" stroke="${c.skin}" stroke-width="5"/>
${body} fill="${c.outfit}" stroke="${c.outfitOutline}" stroke-width="4"/>
${head(name, jump)}
</g></svg>\n`;
    await writeFile(new URL(`../art/characters/${name}-${pose}.svg`, import.meta.url), svg);
  }
}
