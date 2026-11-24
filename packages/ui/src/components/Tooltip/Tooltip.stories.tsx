import type { Meta, StoryObj } from '@storybook/react';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from './Tooltip.js';
import { Button } from '../Button/Button.js';

const meta: Meta<typeof Tooltip> = {
  title: 'Primitives/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Default: Story = {
  render: () => (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="secondary">Hover or Focus for Metric Info</Button>
        </TooltipTrigger>
        <TooltipContent>
          <span>Loss gradient norm ||∇L|| threshold: &lt; 1e-4</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};
