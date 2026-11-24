// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeAll } from 'vitest';
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { ParsonsBlock } from '@tensorcade/contracts';
import {
  assemblePythonCode,
  findPlacedDistractors,
  normalizeIndent,
  parseCodeSegments,
  stepIndentDown,
  stepIndentUp,
  substituteBlanks,
} from './assembler.js';
import { BuilderEditor } from './BuilderEditor.js';

beforeAll(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

// Setup React 19 testing helper
function renderComponent(ui: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  let root: Root | null = null;
  act(() => {
    root = createRoot(container);
    root.render(ui);
  });
  return {
    container,
    unmount: () => {
      act(() => {
        root?.unmount();
      });
      container.remove();
    },
  };
}

const sampleBlocks: ParsonsBlock[] = [
  {
    id: 'block-1',
    code: 'for i in range(___):',
    isDistractor: false,
  },
  {
    id: 'block-2',
    code: 'step()',
    isDistractor: false,
  },
  {
    id: 'block-3',
    code: 'harvest()',
    isDistractor: false,
  },
  {
    id: 'distractor-1',
    code: 'while True:',
    isDistractor: true,
    explanationIfChosen: 'Infinite loop: while True without termination exhausts battery.',
  },
  {
    id: 'distractor-2',
    code: 'turn_back()',
    isDistractor: true,
  },
];

describe('Builder Mode: Assembler Logic', () => {
  it('normalizes indentations to 0, 4, 8, or 12 spaces', () => {
    expect(normalizeIndent(0)).toBe(0);
    expect(normalizeIndent(-1)).toBe(0);
    expect(normalizeIndent(1)).toBe(4);
    expect(normalizeIndent(4)).toBe(4);
    expect(normalizeIndent(2)).toBe(8);
    expect(normalizeIndent(6)).toBe(8);
    expect(normalizeIndent(8)).toBe(8);
    expect(normalizeIndent(3)).toBe(12);
    expect(normalizeIndent(12)).toBe(12);
    expect(normalizeIndent(16)).toBe(12);
  });

  it('steps indentation up and down within bounds (0, 4, 8, 12)', () => {
    expect(stepIndentUp(0)).toBe(4);
    expect(stepIndentUp(4)).toBe(8);
    expect(stepIndentUp(8)).toBe(12);
    expect(stepIndentUp(12)).toBe(12);

    expect(stepIndentDown(12)).toBe(8);
    expect(stepIndentDown(8)).toBe(4);
    expect(stepIndentDown(4)).toBe(0);
    expect(stepIndentDown(0)).toBe(0);
  });

  it('parses code segments with static text and blank tokens', () => {
    const segments = parseCodeSegments('x = ___ + ___');
    expect(segments).toEqual([
      { type: 'text', text: 'x = ' },
      { type: 'blank', text: '___', index: 0 },
      { type: 'text', text: ' + ' },
      { type: 'blank', text: '___', index: 1 },
    ]);
  });

  it('substitutes blanks in code strings', () => {
    const raw = 'for i in range(___):';
    expect(substituteBlanks(raw)).toBe('for i in range(___):');
    expect(substituteBlanks(raw, { '0': '10' })).toBe('for i in range(10):');
    expect(substituteBlanks(raw, { blank_0: '5' })).toBe('for i in range(5):');
  });

  it('assembles Python code with indentation and newline formatting', () => {
    const blocksMap = new Map(sampleBlocks.map((b) => [b.id, b]));
    const code = assemblePythonCode(
      [
        { id: 'block-1', indent: 0, blankValues: { '0': '3' } },
        { id: 'block-2', indent: 4 },
        { id: 'block-3', indent: 4 },
      ],
      blocksMap,
    );

    expect(code).toBe('for i in range(3):\n    step()\n    harvest()');
  });

  it('finds distractors placed in solution and attaches explanations', () => {
    const blocksMap = new Map(sampleBlocks.map((b) => [b.id, b]));
    const distractors = findPlacedDistractors(
      [
        { id: 'block-1', indent: 0 },
        { id: 'distractor-1', indent: 4 },
        { id: 'distractor-2', indent: 4 },
      ],
      blocksMap,
    );

    expect(distractors).toHaveLength(2);
    expect(distractors[0]?.id).toBe('distractor-1');
    expect(distractors[0]?.explanation).toContain('Infinite loop');
    expect(distractors[1]?.id).toBe('distractor-2');
    expect(distractors[1]?.explanation).toContain('incorrect distractor');
  });
});

describe('Builder Mode: BuilderEditor Component', () => {
  it('renders available blocks and empty canvas placeholder initially', () => {
    const { container, unmount } = renderComponent(<BuilderEditor blocks={sampleBlocks} />);

    const availableTray = container.querySelector('[data-testid="available-blocks-tray"]');
    expect(availableTray).not.toBeNull();
    expect(container.textContent).toContain('Available Blocks (5)');

    const emptyPlaceholder = container.querySelector('[data-testid="empty-canvas-placeholder"]');
    expect(emptyPlaceholder).not.toBeNull();
    expect(emptyPlaceholder?.textContent).toContain('Add blocks from the left tray');

    unmount();
  });

  it('renders initialOrder blocks in solution canvas with correct indentation badge', () => {
    const { container, unmount } = renderComponent(
      <BuilderEditor
        blocks={sampleBlocks}
        initialOrder={[
          { id: 'block-1', indent: 0, blankValues: { '0': '4' } },
          { id: 'block-2', indent: 4 },
        ]}
      />,
    );

    const slot0 = container.querySelector('[data-testid="solution-slot-0"]');
    const slot1 = container.querySelector('[data-testid="solution-slot-1"]');
    expect(slot0).not.toBeNull();
    expect(slot1).not.toBeNull();

    const badge0 = container.querySelector('[data-testid="slot-0-indent-badge"]');
    const badge1 = container.querySelector('[data-testid="slot-1-indent-badge"]');
    expect(badge0?.textContent).toBe('Indent: 0 sp');
    expect(badge1?.textContent).toBe('Indent: 4 sp');

    // Available blocks count should be reduced to 3
    expect(container.textContent).toContain('Available Blocks (3)');

    unmount();
  });

  it('adds a block from available tray to solution canvas on click', () => {
    const onChange = vi.fn();
    const { container, unmount } = renderComponent(
      <BuilderEditor blocks={sampleBlocks} onChange={onChange} />,
    );

    const addBtn = container.querySelector(
      '[data-testid="add-block-btn-block-2"]',
    ) as HTMLButtonElement;
    expect(addBtn).not.toBeNull();

    act(() => {
      addBtn.click();
    });

    const slot0 = container.querySelector('[data-testid="solution-slot-0"]');
    expect(slot0).not.toBeNull();
    expect(slot0?.textContent).toContain('step()');

    // Available tray no longer shows block-2
    expect(container.querySelector('[data-testid="add-block-btn-block-2"]')).toBeNull();

    // onChange was called with step()
    expect(onChange).toHaveBeenCalledWith('step()');

    unmount();
  });

  it('removes a block from solution canvas back to available tray', () => {
    const onChange = vi.fn();
    const { container, unmount } = renderComponent(
      <BuilderEditor
        blocks={sampleBlocks}
        initialOrder={[{ id: 'block-2', indent: 0 }]}
        onChange={onChange}
      />,
    );

    const removeBtn = container.querySelector('[data-testid="remove-btn-0"]') as HTMLButtonElement;
    expect(removeBtn).not.toBeNull();

    act(() => {
      removeBtn.click();
    });

    // Canvas should now be empty
    expect(container.querySelector('[data-testid="solution-slot-0"]')).toBeNull();
    // block-2 is back in available tray
    expect(container.querySelector('[data-testid="add-block-btn-block-2"]')).not.toBeNull();
    // onChange called with empty code
    expect(onChange).toHaveBeenLastCalledWith('');

    unmount();
  });

  it('reorders blocks up and down in solution canvas', () => {
    const onChange = vi.fn();
    const { container, unmount } = renderComponent(
      <BuilderEditor
        blocks={sampleBlocks}
        initialOrder={[
          { id: 'block-2', indent: 0 },
          { id: 'block-3', indent: 0 },
        ]}
        onChange={onChange}
      />,
    );

    // Initial output: step()\nharvest()
    expect(onChange).toHaveBeenLastCalledWith('step()\nharvest()');

    // Move slot 0 down
    const moveDownBtn = container.querySelector(
      '[data-testid="move-down-btn-0"]',
    ) as HTMLButtonElement;
    expect(moveDownBtn).not.toBeNull();

    act(() => {
      moveDownBtn.click();
    });

    // Output should now be: harvest()\nstep()
    expect(onChange).toHaveBeenLastCalledWith('harvest()\nstep()');

    // Move slot 1 up
    const moveUpBtn = container.querySelector('[data-testid="move-up-btn-1"]') as HTMLButtonElement;
    expect(moveUpBtn).not.toBeNull();

    act(() => {
      moveUpBtn.click();
    });

    // Output is back to step()\nharvest()
    expect(onChange).toHaveBeenLastCalledWith('step()\nharvest()');

    unmount();
  });

  it('adjusts indentation via buttons and keyboard navigation', () => {
    const onChange = vi.fn();
    const { container, unmount } = renderComponent(
      <BuilderEditor
        blocks={sampleBlocks}
        initialOrder={[{ id: 'block-2', indent: 0 }]}
        onChange={onChange}
      />,
    );

    const indentBtn = container.querySelector('[data-testid="indent-btn-0"]') as HTMLButtonElement;
    const unindentBtn = container.querySelector(
      '[data-testid="unindent-btn-0"]',
    ) as HTMLButtonElement;

    // Indent: 0 -> 4
    act(() => {
      indentBtn.click();
    });
    expect(container.querySelector('[data-testid="slot-0-indent-badge"]')?.textContent).toBe(
      'Indent: 4 sp',
    );
    expect(onChange).toHaveBeenLastCalledWith('    step()');

    // Indent: 4 -> 8
    act(() => {
      indentBtn.click();
    });
    expect(container.querySelector('[data-testid="slot-0-indent-badge"]')?.textContent).toBe(
      'Indent: 8 sp',
    );
    expect(onChange).toHaveBeenLastCalledWith('        step()');

    // Indent: 8 -> 12
    act(() => {
      indentBtn.click();
    });
    expect(container.querySelector('[data-testid="slot-0-indent-badge"]')?.textContent).toBe(
      'Indent: 12 sp',
    );
    expect(onChange).toHaveBeenLastCalledWith('            step()');

    // Indent max is 12, button should be disabled
    expect(indentBtn.disabled).toBe(true);

    // Unindent: 12 -> 8 -> 4
    act(() => {
      unindentBtn.click();
    });
    expect(container.querySelector('[data-testid="slot-0-indent-badge"]')?.textContent).toBe(
      'Indent: 8 sp',
    );
    act(() => {
      unindentBtn.click();
    });
    expect(container.querySelector('[data-testid="slot-0-indent-badge"]')?.textContent).toBe(
      'Indent: 4 sp',
    );
    expect(onChange).toHaveBeenLastCalledWith('    step()');

    // Keyboard Tab and Shift+Tab navigation
    const slot0 = container.querySelector('[data-testid="solution-slot-0"]') as HTMLElement;

    // Shift+Tab unindents 4 -> 0
    act(() => {
      slot0.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }),
      );
    });
    expect(container.querySelector('[data-testid="slot-0-indent-badge"]')?.textContent).toBe(
      'Indent: 0 sp',
    );
    expect(onChange).toHaveBeenLastCalledWith('step()');

    // Tab indents 0 -> 4
    act(() => {
      slot0.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', shiftKey: false, bubbles: true }),
      );
    });
    expect(container.querySelector('[data-testid="slot-0-indent-badge"]')?.textContent).toBe(
      'Indent: 4 sp',
    );
    expect(onChange).toHaveBeenLastCalledWith('    step()');

    unmount();
  });

  it('renders inline input for fill-in-the-blank and updates assembled Python code', () => {
    const onChange = vi.fn();
    const { container, unmount } = renderComponent(
      <BuilderEditor
        blocks={sampleBlocks}
        initialOrder={[{ id: 'block-1', indent: 0 }]}
        onChange={onChange}
      />,
    );

    const blankInput = container.querySelector(
      '[data-testid="blank-input-0-0"]',
    ) as HTMLInputElement;
    expect(blankInput).not.toBeNull();
    expect(blankInput.placeholder).toBe('___');

    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      if (setter) {
        setter.call(blankInput, '7');
      } else {
        blankInput.value = '7';
      }
      blankInput.dispatchEvent(new Event('input', { bubbles: true }));
      blankInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(onChange).toHaveBeenLastCalledWith('for i in range(7):');

    unmount();
  });

  it('triggers anti-brute-force educational pause after 3 consecutive invalid submissions with distractors', () => {
    const onRun = vi.fn();
    const { container, unmount } = renderComponent(
      <BuilderEditor
        blocks={sampleBlocks}
        initialOrder={[
          { id: 'distractor-1', indent: 0 },
          { id: 'block-2', indent: 4 },
        ]}
        onRun={onRun}
      />,
    );

    const runBtn = container.querySelector('[data-testid="builder-run-btn"]') as HTMLButtonElement;
    expect(runBtn).not.toBeNull();

    // 1st submission: warning status (1/3)
    act(() => {
      runBtn.click();
    });
    expect(container.querySelector('[data-testid="consecutive-warning"]')?.textContent).toContain(
      '(1/3',
    );
    expect(container.querySelector('[data-testid="educational-pause-banner"]')).toBeNull();
    expect(onRun).toHaveBeenCalledTimes(1);

    // 2nd submission: warning status (2/3)
    act(() => {
      runBtn.click();
    });
    expect(container.querySelector('[data-testid="consecutive-warning"]')?.textContent).toContain(
      '(2/3',
    );
    expect(container.querySelector('[data-testid="educational-pause-banner"]')).toBeNull();
    expect(onRun).toHaveBeenCalledTimes(2);

    // 3rd submission: triggers anti-brute-force educational pause!
    act(() => {
      runBtn.click();
    });
    const pauseBanner = container.querySelector('[data-testid="educational-pause-banner"]');
    expect(pauseBanner).not.toBeNull();
    expect(pauseBanner?.textContent).toContain('Educational Pause: Think Before Guessing');
    expect(pauseBanner?.textContent).toContain('Infinite loop');

    // onRun is NOT called on the 3rd attempt because educational pause is triggered
    expect(onRun).toHaveBeenCalledTimes(2);

    // Dismiss pause
    const dismissBtn = container.querySelector(
      '[data-testid="dismiss-pause-btn"]',
    ) as HTMLButtonElement;
    expect(dismissBtn).not.toBeNull();
    act(() => {
      dismissBtn.click();
    });
    expect(container.querySelector('[data-testid="educational-pause-banner"]')).toBeNull();

    unmount();
  });

  it('resets invalid counter and allows execution on clean submission without distractors', () => {
    const onRun = vi.fn();
    const { container, unmount } = renderComponent(
      <BuilderEditor
        blocks={sampleBlocks}
        initialOrder={[{ id: 'block-2', indent: 0 }]}
        onRun={onRun}
      />,
    );

    const runBtn = container.querySelector('[data-testid="builder-run-btn"]') as HTMLButtonElement;

    act(() => {
      runBtn.click();
    });

    expect(onRun).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-testid="consecutive-warning"]')).toBeNull();
    expect(container.querySelector('[data-testid="educational-pause-banner"]')).toBeNull();

    unmount();
  });

  it('handles multiline blocks with empty lines in assembler', () => {
    const multilineBlock: ParsonsBlock = {
      id: 'multi-1',
      code: 'def process():\n\n    return True',
      isDistractor: false,
    };
    const blocksMap = new Map([['multi-1', multilineBlock]]);
    const code = assemblePythonCode([{ id: 'multi-1', indent: 4 }], blocksMap);
    expect(code).toBe('    def process():\n\n        return True');
  });

  it('renders message when all available blocks have been placed on canvas', () => {
    const singleBlock: ParsonsBlock = {
      id: 'only-1',
      code: 'x = 1',
      isDistractor: false,
    };
    const { container, unmount } = renderComponent(
      <BuilderEditor blocks={[singleBlock]} initialOrder={[{ id: 'only-1', indent: 0 }]} />,
    );

    const availableTray = container.querySelector('[data-testid="available-blocks-tray"]');
    expect(availableTray?.textContent).toContain('All available blocks have been placed');

    unmount();
  });

  it('respects readOnly mode by not modifying state on interaction', () => {
    const onChange = vi.fn();
    const { container, unmount } = renderComponent(
      <BuilderEditor
        blocks={sampleBlocks}
        initialOrder={[{ id: 'block-2', indent: 0 }]}
        onChange={onChange}
        readOnly={true}
      />,
    );

    const removeBtn = container.querySelector('[data-testid="remove-btn-0"]') as HTMLButtonElement;
    expect(removeBtn.disabled).toBe(true);
    act(() => {
      removeBtn.click();
    });

    // Should still have slot 0
    expect(container.querySelector('[data-testid="solution-slot-0"]')).not.toBeNull();

    unmount();
  });
});
