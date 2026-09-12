import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// No browser or production instrumentation. GAME_SOURCE_ROOT can select an old checkout.
const sourceRoot = resolve(process.env.GAME_SOURCE_ROOT || '.');
const seconds = Number(process.argv[2] || 180);
if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('Duration must be a positive number of seconds');
const temporary = await mkdtemp(join(tmpdir(), 'hatch-benchmark-'));
try {
  for (const name of ['GameSimulation', 'EggPlacement']) {
    let source;
    try { source = await readFile(join(sourceRoot, 'src/game/simulation', `${name}.ts`), 'utf8'); }
    catch (error) {
      if (name === 'EggPlacement' && error.code === 'ENOENT') continue;
      throw error;
    }
    const output = ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
    }).outputText.replace("'./EggPlacement'", "'./EggPlacement.mjs'");
    await writeFile(join(temporary, `${name}.mjs`), output);
  }
  const { GameSimulation } = await import(pathToFileURL(join(temporary, 'GameSimulation.mjs')));
  for (const [width, height] of [[1280, 720], [1920, 1080]]) {
    const simulation = new GameSimulation(123);
    simulation.setViewport(width, height);
    const samples = [];
    let maxEntities = 0, maxEggs = 0, maxAdults = 0;
    const start = performance.now();
    for (let tick = 0; tick < 60 * seconds; tick++) {
      if (tick % 13 === 0) {
        const begin = performance.now();
        simulation.dispatch({ type: 'LAY_EGG' });
        samples.push(performance.now() - begin);
      }
      simulation.update(1 / 60);
      simulation.drainEvents();
      if (tick % 60 === 0) {
        const state = simulation.snapshot();
        maxEntities = Math.max(maxEntities, state.adults.length + state.chicks.length + state.eggs.length);
        maxEggs = Math.max(maxEggs, state.eggs.length);
        maxAdults = Math.max(maxAdults, state.adults.length);
      }
    }
    const wallMs = performance.now() - start;
    samples.sort((a, b) => a - b);
    console.log(JSON.stringify({ width, height, simulatedSeconds: seconds, wallMs,
      layP50: samples[Math.floor(samples.length * 0.5)], layP95: samples[Math.floor(samples.length * 0.95)],
      layMax: samples.at(-1), maxEntities, maxAdults, maxEggs, score: simulation.getScore?.() ?? simulation.snapshot().score,
    }));
  }
} finally {
  await rm(temporary, { recursive: true, force: true });
}
