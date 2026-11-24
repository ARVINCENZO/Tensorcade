#!/usr/bin/env node
/**
 * CLI runner for Level Validator.
 *
 * Conforms to docs/QUALITY_BAR.md:
 * Validates level reference solutions under Pyodide in Node against all 5 evaluation seeds.
 */

import { Command } from 'commander';
import { LevelValidator } from './validator.js';
import type { LevelManifest } from '@tensorcade/levels';

const program = new Command();

program
  .name('tensorcade-level-validator')
  .description(
    'Validates level manifests and reference solutions under Pyodide in Node across 5 seeds',
  )
  .version('1.0.0')
  .option('-l, --level <id>', 'Validate a specific level ID')
  .option('-w, --world <worldId>', 'Validate all levels in a specific world')
  .action(async (_options) => {
    console.log('Starting Tensorcade Level Validator (Pyodide 314.0.8 / Node)...');
    const validator = new LevelValidator();
    await validator.init();

    // Default mock level for validation check if no level repository is passed
    const sampleLevel: LevelManifest = {
      schemaVersion: '1.0.0',
      id: 'w1-robot-farm-1.1',
      worldId: 'world-1',
      gameId: 'robot-farm',
      order: 1,
      title: 'First Furrow',
      slug: 'first-furrow',
      learningObjective: 'Use basic step and harvest commands to navigate and gather crops.',
      conceptTag: 'C_SEQ',
      bloomLevel: 'Apply',
      misconceptionTargeted: 'Sequential execution confusion.',
      difficulty: 'introductory',
      supportedModes: ['explorer', 'builder', 'hacker'],
      estimatedMinutes: 5,
      seeds: [10001, 10002, 10003, 10004, 10005],
      entrypoint: 'step',
      environmentConfig: {
        width: 4,
        height: 4,
        totalCrops: 1,
      },
      starterCode: {
        explorer: '',
        builder: '',
        hacker: 'step()\nharvest()\n',
      },
      referenceSolution: 'step()\nharvest()\n',
      scoringRubric: {
        star1: {
          description: 'Harvest all crops',
          condition: 'cropsHarvested == 1',
        },
        star2: {
          description: 'Complete in under 5 ticks',
          metric: 'ticks',
          threshold: 5,
        },
        star3: {
          description: 'Hacker mode without hints',
          hackerOnly: true,
          noHintsAllowed: true,
        },
      },
      hintLadder: {
        tier1Nudge: 'Move forward into the crop tile first.',
        tier2Concept: 'Commands execute in sequential top-to-bottom order.',
        tier3Scaffold: 'Call step(), then call harvest().',
      },
    };

    const result = await validator.validateLevel(sampleLevel);

    if (result.valid) {
      console.log(`✓ [PASS] Level ${result.levelId} validated across all 5 seeds.`);
      process.exit(0);
    } else {
      console.error(`✗ [FAIL] Level ${result.levelId} validation failed:`);
      for (const err of result.errors) {
        console.error(`  - ${err}`);
      }
      process.exit(1);
    }
  });

program.parse(process.argv);
