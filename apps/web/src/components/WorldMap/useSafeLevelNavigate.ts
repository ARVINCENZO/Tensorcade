import { useNavigate } from '@tanstack/react-router';

/**
 * Returns a navigation callback for '/level/:levelId' using TanStack Router's useNavigate,
 * falling back safely when rendered outside a RouterProvider (e.g., in isolated unit tests).
 */
export function useSafeLevelNavigate(): (levelId: string) => void {
  let navigateFn: ((opts: { to: string }) => void) | null = null;
  try {
    navigateFn = useNavigate() as (opts: { to: string }) => void;
  } catch {
    navigateFn = null;
  }

  return (levelId: string): void => {
    const target = `/level/${levelId}`;
    if (navigateFn) {
      try {
        navigateFn({ to: target });
        return;
      } catch {
        // Fall through to browser navigation fallback if router context is unavailable.
      }
    }
    if (typeof window !== 'undefined') {
      window.location.assign(target);
    }
  };
}
