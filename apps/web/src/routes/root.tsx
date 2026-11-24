import * as React from 'react';
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { AppShell } from '../components/Layout/AppShell.js';
import { ErrorFallback } from '../components/ErrorBoundary/ErrorBoundary.js';

export const rootRoute = createRootRoute({
  component: function RootComponent(): React.JSX.Element {
    return (
      <AppShell>
        <Outlet />
      </AppShell>
    );
  },
  errorComponent: function RootErrorComponent({ error, reset }): React.JSX.Element {
    return <ErrorFallback error={error} resetErrorBoundary={reset} />;
  },
  notFoundComponent: function RootNotFoundComponent(): React.JSX.Element {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center font-sans">
        <h2 className="text-xl font-semibold text-[var(--tc-text-primary)]">Route Not Found</h2>
        <p className="mt-2 text-sm text-[var(--tc-text-muted)]">
          The requested sector or level was not found in the curriculum index.
        </p>
      </div>
    );
  },
});
