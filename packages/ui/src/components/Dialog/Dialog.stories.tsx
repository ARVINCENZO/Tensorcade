import type { Meta, StoryObj } from '@storybook/react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from './Dialog.js';
import { Button } from '../Button/Button.js';

const meta: Meta<typeof Dialog> = {
  title: 'Primitives/Dialog',
  component: Dialog,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Dialog>;

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="primary">Inspect Convergence Diagnostics</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Telemetry Diagnostics: Loss Diverged</DialogTitle>
          <DialogDescription>
            The optimizer encountered a NaN loss value at Tick 42. Learning rate α = 0.5 may exceed
            the Lipschitz gradient smoothness threshold.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 text-xs font-mono text-[var(--tc-accent-amber)] bg-[var(--tc-bg-base)] p-3 rounded-[var(--tc-radius-sm)] border border-[var(--tc-border-subtle)]">
          &gt; Error: GradientNormExceeded [||g|| = 1.48e+05]
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Dismiss</Button>
          </DialogClose>
          <Button variant="primary">Adjust Learning Rate</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
