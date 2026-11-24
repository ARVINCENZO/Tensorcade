import { describe, it, expect } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LEVEL_1_1_BUNDLE } from '@tensorcade/levels';
import { LessonDrawer } from './LessonDrawer.js';

describe('LessonDrawer', () => {
  it('renders null when closed', () => {
    const html = renderToStaticMarkup(
      <LessonDrawer
        isOpen={false}
        title={LEVEL_1_1_BUNDLE.manifest.title}
        conceptTag={LEVEL_1_1_BUNDLE.manifest.conceptTag}
        bloomLevel={LEVEL_1_1_BUNDLE.manifest.bloomLevel}
        estimatedMinutes={LEVEL_1_1_BUNDLE.manifest.estimatedMinutes}
        lessonContentMarkdown={LEVEL_1_1_BUNDLE.lessonContentMarkdown}
        simplificationLabel={LEVEL_1_1_BUNDLE.manifest.simplificationLabel}
      />,
    );
    expect(html).toBe('');
  });

  it('renders conceptTag, bloomLevel, estimatedMinutes, simplificationLabel, and markdown content', () => {
    const { manifest, lessonContentMarkdown } = LEVEL_1_1_BUNDLE;
    const html = renderToStaticMarkup(
      <LessonDrawer
        isOpen={true}
        title={manifest.title}
        conceptTag={manifest.conceptTag}
        bloomLevel={manifest.bloomLevel}
        estimatedMinutes={manifest.estimatedMinutes}
        lessonContentMarkdown={lessonContentMarkdown}
        simplificationLabel={manifest.simplificationLabel}
        learningObjective={manifest.learningObjective}
        onClose={() => {}}
      />,
    );

    expect(html).toContain('<aside');
    expect(html).toContain(manifest.conceptTag);
    expect(html).toContain(`Bloom: ${manifest.bloomLevel}`);
    expect(html).toContain(`${manifest.estimatedMinutes} min`);
    expect(html).toContain(manifest.simplificationLabel!);
    expect(html).toContain(manifest.learningObjective);
    expect(html).toContain('First Furrow: Sequential Execution');
    expect(html).toContain('<code');
    expect(html).toContain('step()');
    expect(html).toContain('Close Lesson Drawer');
  });
});
