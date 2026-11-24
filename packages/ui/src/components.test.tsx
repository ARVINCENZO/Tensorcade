import { describe, it, expect } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button } from './components/Button/Button.js';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from './components/Dialog/Dialog.js';
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from './components/Tooltip/Tooltip.js';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/Tabs/Tabs.js';

describe('Radix-based Accessible Primitives', () => {
  describe('Button', () => {
    it('renders with default primary variant and focus-visible attributes', () => {
      const html = renderToStaticMarkup(<Button>Execute</Button>);
      expect(html).toContain('Execute');
      expect(html).toContain('focus-visible:outline-');
      expect(html).toContain('bg-[var(--tc-accent-cyan)]');
    });

    it('renders secondary variant', () => {
      const html = renderToStaticMarkup(<Button variant="secondary">Cancel</Button>);
      expect(html).toContain('Cancel');
      expect(html).toContain('bg-[var(--tc-bg-surface)]');
      expect(html).toContain('border-[var(--tc-border-subtle)]');
    });

    it('renders danger variant', () => {
      const html = renderToStaticMarkup(<Button variant="danger">Delete</Button>);
      expect(html).toContain('Delete');
      expect(html).toContain('bg-[var(--tc-accent-crimson)]');
    });

    it('renders disabled state with aria-disabled', () => {
      const html = renderToStaticMarkup(<Button disabled>Disabled</Button>);
      expect(html).toContain('aria-disabled="true"');
      expect(html).toContain('disabled=""');
    });
  });

  describe('Dialog', () => {
    it('renders trigger with accessible attributes', () => {
      const html = renderToStaticMarkup(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open Modal</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Modal Title</DialogTitle>
            <DialogDescription>Modal Description</DialogDescription>
          </DialogContent>
        </Dialog>,
      );
      expect(html).toContain('Open Modal');
      expect(html).toContain('aria-haspopup="dialog"');
    });
  });

  describe('Tooltip', () => {
    it('renders tooltip trigger within provider', () => {
      const html = renderToStaticMarkup(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button>Inspect</Button>
            </TooltipTrigger>
            <TooltipContent>Metric Details</TooltipContent>
          </Tooltip>
        </TooltipProvider>,
      );
      expect(html).toContain('Inspect');
    });
  });

  describe('Tabs', () => {
    it('renders accessible tab list and triggers with proper roles', () => {
      const html = renderToStaticMarkup(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Explorer</TabsTrigger>
            <TabsTrigger value="tab2">Hacker</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Explorer Content</TabsContent>
          <TabsContent value="tab2">Hacker Content</TabsContent>
        </Tabs>,
      );
      expect(html).toContain('role="tablist"');
      expect(html).toContain('role="tab"');
      expect(html).toContain('Explorer');
      expect(html).toContain('Hacker');
    });
  });
});
