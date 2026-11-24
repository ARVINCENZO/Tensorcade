import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './root.js';
import { WorldMapLayout } from '../components/WorldMap/WorldMapLayout.js';

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: WorldMapLayout,
});
