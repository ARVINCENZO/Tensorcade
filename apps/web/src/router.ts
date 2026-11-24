import { createRouter } from '@tanstack/react-router';
import { rootRoute } from './routes/root.js';
import { indexRoute } from './routes/index.js';
import { levelRoute } from './routes/level.$levelId.js';

export const routeTree = rootRoute.addChildren([indexRoute, levelRoute]);

export function createAppRouter() {
  return createRouter({
    routeTree,
    defaultPreload: 'intent',
  });
}

export const router = createAppRouter();

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
