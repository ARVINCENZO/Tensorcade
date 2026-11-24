#!/usr/bin/env node
/**
 * CLI runner for Level Validator.
 *
 * Conforms to docs/QUALITY_BAR.md:
 * Validates all registered level manifests and reference solutions under Pyodide in Node
 * across all 5 evaluation seeds per level.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Command } from 'commander';
import { getAllLevelManifests } from '@tensorcade/levels';
import { LevelValidator } from './validator.js';

interface CliOptions {
  level?: string;
  world?: string;
  writeGolden?: string;
}

const program = new Command();

program
  .name('tensorcade-level-validator')
  .description(
    'Validates registered level manifests and reference solutions under Pyodide in Node across 5 seeds',
  )
  .version('1.0.0')
  .option('-l, --level <id>', 'Validate a specific level ID')
  .option('-w, --world <worldId>', 'Validate all levels in a specific world')
  .option('--write-golden <path>', 'Write deterministic golden parity JSON fixture to path')
  .action(async (options: CliOptions) => {
    const startMs = Date.now();
    console.log('Starting Tensorcade Level Validator (Pyodide 314.0.8 / Node)...');

    let manifests = getAllLevelManifests();
    if (options.level) {
      manifests = manifests.filter((m) => m.id === options.level);
    }
    if (options.world) {
      manifests = manifests.filter((m) => m.worldId === options.world);
    }

    if (manifests.length === 0) {
      console.error('✗ No matching levels found in @tensorcade/levels registry.');
      process.exit(1);
    }

    const validator = new LevelValidator();
    await validator.init();

    let passedLevels = 0;
    let totalSeedRuns = 0;
    const goldenEntries: Array<{
      levelId: string;
      seed: number;
      totalTicks: number;
      terminalHash: string;
      cropsHarvested: number;
      totalCrops: number;
    }> = [];

    for (const manifest of manifests) {
      const result = await validator.validateLevel(manifest);
      totalSeedRuns += result.seedResults.length;

      if (result.valid) {
        passedLevels += 1;
        const maxTicks = Math.max(...result.seedResults.map((s) => s.totalTicks));
        console.log(
          `✓ [PASS] ${result.levelId} (${manifest.title}) — 5/5 seeds passed (maxTicks: ${maxTicks}/${manifest.scoringRubric.star2.threshold})`,
        );
        for (const sr of result.seedResults) {
          if (sr.terminalHash !== undefined) {
            goldenEntries.push({
              levelId: result.levelId,
              seed: sr.seed,
              totalTicks: sr.totalTicks,
              terminalHash: sr.terminalHash,
              cropsHarvested: sr.cropsHarvested ?? 0,
              totalCrops: sr.totalCrops ?? 0,
            });
          }
        }
      } else {
        console.error(`✗ [FAIL] ${result.levelId} (${manifest.title}) validation failed:`);
        for (const err of result.errors) {
          console.error(`  - ${err}`);
        }
      }
    }

    const elapsedMs = Date.now() - startMs;
    console.log(
      `\nSummary: ${passedLevels}/${manifests.length} levels passed (${totalSeedRuns} seed runs) in ${elapsedMs}ms.`,
    );

    if (passedLevels !== manifests.length) {
      process.exit(1);
    }

    if (options.writeGolden) {
      const outPath = resolve(options.writeGolden);
      mkdirSync(dirname(outPath), { recursive: true });
      const payload = {
        schemaVersion: '1.0.0',
        worldId: options.world ?? 'world-1',
        gameId: 'robot-farm',
        pyodideVersion: '314.0.8',
        entries: goldenEntries,
      };
      writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
      console.log(`✓ Wrote ${goldenEntries.length} golden parity entries to ${outPath}`);
    }

    process.exit(0);
  });

program.parse(process.argv);
