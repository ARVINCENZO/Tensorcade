import * as React from 'react';
import { Button } from '@tensorcade/ui';

export interface ErrorFallbackProps {
  error: Error | unknown;
  resetErrorBoundary?: () => void;
}

export function ErrorFallback({
  error,
  resetErrorBoundary,
}: ErrorFallbackProps): React.JSX.Element {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error && error.stack ? error.stack : undefined;

  const handleReload = (): void => {
    if (resetErrorBoundary) {
      resetErrorBoundary();
    } else if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const handleReturnToMap = (): void => {
    if (typeof window !== 'undefined') {
      window.location.assign('/');
    }
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className="flex min-h-[60vh] flex-col items-center justify-center p-6 bg-[var(--tc-bg-base)] text-[var(--tc-text-primary)] font-sans"
    >
      <div className="w-full max-w-xl rounded-[var(--tc-radius-md)] border border-[var(--tc-accent-crimson)] bg-[var(--tc-bg-surface)] p-6 shadow-md">
        <header className="mb-4 flex items-center gap-3">
          <div
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-[var(--tc-radius-sm)] bg-[var(--tc-accent-crimson)] text-[var(--tc-bg-base)] font-mono font-bold text-sm"
          >
            !
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-[var(--tc-text-primary)]">
              Application Error Encountered
            </h1>
            <p className="text-xs text-[var(--tc-text-muted)] font-mono">
              SYSTEM FAULT / EXCEPTION CAUGHT
            </p>
          </div>
        </header>

        <p className="mb-4 text-sm leading-relaxed text-[var(--tc-text-muted)]">
          An unexpected runtime exception interrupted the session. Session telemetry and local state
          remain protected. You may reset the error boundary or return to the curriculum map.
        </p>

        <div className="mb-6 rounded-[var(--tc-radius-sm)] border border-[var(--tc-border-subtle)] bg-[var(--tc-bg-base)] p-3 font-mono text-xs text-[var(--tc-accent-crimson)] overflow-x-auto">
          <p className="font-semibold">{errorMessage || 'Unknown application error'}</p>
          {errorStack ? (
            <pre className="mt-2 text-[var(--tc-text-muted)] whitespace-pre-wrap">{errorStack}</pre>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button variant="secondary" size="md" onClick={handleReturnToMap}>
            Return to World Map
          </Button>
          <Button variant="primary" size="md" onClick={handleReload}>
            Reload Application
          </Button>
        </div>
      </div>
    </div>
  );
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    if (typeof console !== 'undefined') {
      console.error('Tensorcade Global Error Boundary caught an exception:', error, errorInfo);
    }
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  public override render(): React.ReactNode {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback ?? ErrorFallback;
      return <FallbackComponent error={this.state.error} resetErrorBoundary={this.handleReset} />;
    }

    return this.props.children;
  }
}
