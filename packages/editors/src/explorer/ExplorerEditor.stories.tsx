import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ExplorerEditor } from './ExplorerEditor.js';
import { CodePreviewPane } from './CodePreviewPane.js';

const meta: Meta<typeof ExplorerEditor> = {
  title: 'Editors/ExplorerEditor',
  component: ExplorerEditor,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#0B0F17' }],
    },
  },
};

export default meta;
type Story = StoryObj<typeof ExplorerEditor>;

/**
 * Story 1: Empty canvas waiting for learner blocks.
 */
export const EmptyCanvas: Story = {
  args: {
    className: 'h-[600px] w-full',
    onRun: () => {
      console.log('Execute program clicked');
    },
  },
};

/**
 * Story 2: Assembled blocks program (loop + game actions).
 */
const ASSEMBLED_XML = `
<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="algo_repeat" x="40" y="40">
    <field name="TIMES">4</field>
    <statement name="DO">
      <block type="robot_step">
        <next>
          <block type="robot_harvest">
            <next>
              <block type="robot_turn_right"></block>
            </next>
          </block>
        </next>
      </block>
    </statement>
  </block>
</xml>
`.trim();

export const AssembledBlocks: Story = {
  args: {
    className: 'h-[600px] w-full',
    initialXml: ASSEMBLED_XML,
    onRun: () => {
      console.log('Execute assembled program');
    },
  },
};

/**
 * Story 3: Split-Screen Code Preview standalone.
 */
export const SplitScreenCodePreview: StoryObj<typeof CodePreviewPane> = {
  render: () => (
    <div className="h-[400px] w-[450px] border border-[#232E42]">
      <CodePreviewPane
        code={`# Transpiled from Explorer blocks
for _ in range(4):
    step()
    if can_harvest():
        harvest()
    turn_right()
`}
        onRun={() => console.log('Run code')}
      />
    </div>
  ),
};
