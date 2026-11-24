import type { Meta, StoryObj } from '@storybook/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './Tabs.js';

const meta: Meta<typeof Tabs> = {
  title: 'Primitives/Tabs',
  component: Tabs,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="explorer" className="w-96 max-w-md">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="explorer">Explorer Mode</TabsTrigger>
        <TabsTrigger value="builder">Builder Mode</TabsTrigger>
        <TabsTrigger value="hacker">Hacker Mode</TabsTrigger>
      </TabsList>
      <TabsContent
        value="explorer"
        className="p-4 bg-[var(--tc-bg-surface)] border border-[var(--tc-border-subtle)] rounded-[var(--tc-radius-sm)] text-xs text-[var(--tc-text-muted)]"
      >
        Google Blockly visual drag-and-drop workspace transpiling to Python.
      </TabsContent>
      <TabsContent
        value="builder"
        className="p-4 bg-[var(--tc-bg-surface)] border border-[var(--tc-border-subtle)] rounded-[var(--tc-radius-sm)] text-xs text-[var(--tc-text-muted)]"
      >
        Fill-in-the-blank code templates with guided parameter slots.
      </TabsContent>
      <TabsContent
        value="hacker"
        className="p-4 bg-[var(--tc-bg-surface)] border border-[var(--tc-border-subtle)] rounded-[var(--tc-radius-sm)] text-xs text-[var(--tc-text-muted)]"
      >
        Monaco code editor with raw Python scripting, NumPy, and AST constraints.
      </TabsContent>
    </Tabs>
  ),
};
