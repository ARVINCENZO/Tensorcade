import { describe, it, expect } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LEVEL_1_1_MANIFEST } from '@tensorcade/levels';
import { ResultModalPanel } from './ResultModal.js';

describe('ResultModal', () => {
  it('renders 3-star breakdown, Sensor Crest, PRD Graduation Prompt, and Next Level in explorer mode', () => {
    const html = renderToStaticMarkup(
      <ResultModalPanel
        onClose={() => {}}
        levelTitle={LEVEL_1_1_MANIFEST.title}
        scoringRubric={LEVEL_1_1_MANIFEST.scoringRubric}
        supportedModes={LEVEL_1_1_MANIFEST.supportedModes}
        nextLevelId="w1-robot-farm-1.2"
        onGraduateToHacker={() => {}}
        onNextLevel={() => {}}
        result={{
          passed: true,
          starsEarned: 2,
          star1Earned: true,
          star2Earned: true,
          star3Earned: false,
          ticks: 2,
          energyRemaining: 98,
          mode: 'explorer',
          seedsPassed: 5,
          totalSeeds: 5,
        }}
      />,
    );

    expect(html).toContain('SIMULATION PASSED');
    expect(html).toContain('Sensor Crest');
    expect(html).toContain('2 / 3 Stars');
    expect(html).toContain('Star 1: Correctness');
    expect(html).toContain('Star 2: Efficiency');
    expect(html).toContain('Star 3: Master Terminal');
    expect(html).toContain('98%');
    expect(html).toContain('5/5');
    expect(html).toContain(
      'You solved the logic. Now prove you can write production Python in Hacker Mode to earn the Command Crest (Hacker Mastery).',
    );
    expect(html).toContain('[Graduate to Hacker Mode -&gt;]');
    expect(html).toContain('[Next Level -&gt;]');
  });

  it('renders Assembly Crest in builder mode and Command Crest without graduation prompt in hacker mode', () => {
    const builderHtml = renderToStaticMarkup(
      <ResultModalPanel
        onClose={() => {}}
        levelTitle={LEVEL_1_1_MANIFEST.title}
        scoringRubric={LEVEL_1_1_MANIFEST.scoringRubric}
        onGraduateToHacker={() => {}}
        result={{
          passed: true,
          starsEarned: 2,
          star1Earned: true,
          star2Earned: true,
          star3Earned: false,
          ticks: 2,
          energyRemaining: 98,
          mode: 'builder',
          seedsPassed: 5,
          totalSeeds: 5,
        }}
      />,
    );
    expect(builderHtml).toContain('Assembly Crest');
    expect(builderHtml).toContain('[Graduate to Hacker Mode -&gt;]');

    const hackerHtml = renderToStaticMarkup(
      <ResultModalPanel
        onClose={() => {}}
        levelTitle={LEVEL_1_1_MANIFEST.title}
        scoringRubric={LEVEL_1_1_MANIFEST.scoringRubric}
        onGraduateToHacker={() => {}}
        result={{
          passed: true,
          starsEarned: 3,
          star1Earned: true,
          star2Earned: true,
          star3Earned: true,
          ticks: 2,
          energyRemaining: 98,
          mode: 'hacker',
          seedsPassed: 5,
          totalSeeds: 5,
        }}
      />,
    );
    expect(hackerHtml).toContain('Command Crest');
    expect(hackerHtml).toContain('3 / 3 Stars');
    expect(hackerHtml).not.toContain('[Graduate to Hacker Mode -&gt;]');
  });

  it('renders failure state with Retry option', () => {
    const html = renderToStaticMarkup(
      <ResultModalPanel
        onClose={() => {}}
        levelTitle={LEVEL_1_1_MANIFEST.title}
        scoringRubric={LEVEL_1_1_MANIFEST.scoringRubric}
        onRetry={() => {}}
        result={{
          passed: false,
          starsEarned: 0,
          star1Earned: false,
          star2Earned: false,
          star3Earned: false,
          ticks: 5,
          energyRemaining: 0,
          mode: 'hacker',
          seedsPassed: 0,
          totalSeeds: 5,
        }}
      />,
    );
    expect(html).toContain('SIMULATION FAILED');
    expect(html).toContain('0 / 3 Stars');
    expect(html).toContain('Retry');
  });
});
