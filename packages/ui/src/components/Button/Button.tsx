import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../../lib/cn.js';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-[var(--tc-accent-cyan)] text-[var(--tc-bg-base)] font-semibold hover:opacity-90 active:opacity-100 shadow-sm',
  secondary:
    'bg-[var(--tc-bg-surface)] text-[var(--tc-text-primary)] border border-[var(--tc-border-subtle)] hover:border-[var(--tc-text-muted)] hover:text-[var(--tc-text-primary)]',
  danger:
    'bg-[var(--tc-accent-crimson)] text-[var(--tc-bg-base)] font-semibold hover:opacity-90 active:opacity-100',
  ghost:
    'bg-transparent text-[var(--tc-text-muted)] hover:text-[var(--tc-text-primary)] hover:bg-[var(--tc-bg-surface)]',
};

const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', asChild = false, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        ref={ref}
        disabled={disabled}
        aria-disabled={disabled ? true : undefined}
        className={cn(
          // Base layout & typography
          'inline-flex items-center justify-center whitespace-nowrap rounded-[var(--tc-radius-sm)] font-sans',
          'transition-colors duration-150 select-none cursor-pointer',
          // Accessible visible focus per WCAG 2.2 AA (docs/03-art-direction.md §7.1)
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--tc-accent-cyan)] focus-visible:outline-offset-[var(--tc-focus-outline-offset)]',
          // Disabled state
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';
