import * as React from 'react';
import { createRoute, useNavigate } from '@tanstack/react-router';
import { loadLevelBundle } from '@tensorcade/levels/loader';
import type { LevelBundle } from '@tensorcade/levels/schema';
import { Button } from '@tensorcade/ui';
import { rootRoute } from './root.js';

const LazyLevelPlayer = React.lazy(() =>
  import('../components/LevelPlayer/LevelPlayer.js').then((mod) => ({
    default: mod.LevelPlayer,
  })),
);

export function LevelRouteComponent(): React.JSX.Element {
  const { levelId } = levelRoute.useParams();
  const navigate = useNavigate();
  const [bundle, setBundle] = React.useState<LevelBundle | null | undefined>(undefined);

  React.useEffect(() => {
    let cancelled = false;
    setBundle(undefined);
    void loadLevelBundle(levelId).then((loaded) => {
      if (!cancelled) {
        setBundle(loaded ?? null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [levelId]);

  if (bundle === undefined) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-[50vh] items-center justify-center p-6 font-mono text-xs text-[var(--tc-text-muted)]"
      >
        Loading level module…
      </div>
    );
  }

  if (bundle === null) {
    return (
      <section
        role="status"
        aria-label="Level Not Found"
        className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center"
      >
        <h1 className="text-xl font-bold text-[var(--tc-text-primary)]">Level Not Found</h1>
        <p className="mt-2 text-sm text-[var(--tc-text-muted)]">
          No registered level bundle was found for{' '}
          <code className="font-mono text-[var(--tc-accent-cyan)]">{levelId}</code>.
        </p>
        <Button
          type="button"
          variant="primary"
          size="sm"
          className="mt-4"
          onClick={() => void navigate({ to: '/' })}
        >
          Back to World Map
        </Button>
      </section>
    );
  }

  return (
    <React.Suspense
      fallback={
        <div
          role="status"
          aria-live="polite"
          className="flex min-h-[50vh] items-center justify-center p-6 font-mono text-xs text-[var(--tc-text-muted)]"
        >
          Initializing level player…
        </div>
      }
    >
      <LazyLevelPlayer
        key={bundle.manifest.id}
        bundle={bundle}
        onBackToMap={() => void navigate({ to: '/' })}
        onNextLevel={(nextId) =>
          void navigate({ to: '/level/$levelId', params: { levelId: nextId } })
        }
      />
    </React.Suspense>
  );
}

export const levelRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/level/$levelId',
  component: LevelRouteComponent,
});
