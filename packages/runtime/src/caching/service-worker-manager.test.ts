import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ServiceWorkerManager, PYODIDE_CACHE_NAME } from './service-worker-manager.js';

describe('ServiceWorkerManager', () => {
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  it('provides a version-pinned cache name', () => {
    expect(PYODIDE_CACHE_NAME).toBe('tensorcade-pyodide-v314.0.8');
  });

  it('safely returns null when serviceWorker is not supported in environment', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      writable: true,
      configurable: true,
    });

    const reg = await ServiceWorkerManager.register();
    expect(reg).toBeNull();
    expect(ServiceWorkerManager.isServiceWorkerActive()).toBe(false);
  });

  it('registers service worker when navigator.serviceWorker is available', async () => {
    const mockRegistration = { scope: '/' } as ServiceWorkerRegistration;
    const registerMock = vi.fn().mockResolvedValue(mockRegistration);

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        serviceWorker: {
          register: registerMock,
          controller: {},
        },
      },
      writable: true,
      configurable: true,
    });

    const reg = await ServiceWorkerManager.register('/sw.js');
    expect(reg).toBe(mockRegistration);
    expect(registerMock).toHaveBeenCalledWith('/sw.js', { scope: '/' });
    expect(ServiceWorkerManager.isServiceWorkerActive()).toBe(true);
  });
});
