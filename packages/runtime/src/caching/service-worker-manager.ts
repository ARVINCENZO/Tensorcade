/**
 * Service Worker Cache Manager for Pyodide Assets.
 *
 * Conforms to docs/QUALITY_BAR.md §Performance budgets and ADR-017 / ADR-018:
 * - Version-pinned cache key ('tensorcade-pyodide-v314.0.8').
 * - Manages registration and cache verification.
 */

import { PYODIDE_VERSION } from '../types.js';

export const PYODIDE_CACHE_NAME = `tensorcade-pyodide-v${PYODIDE_VERSION}`;

export class ServiceWorkerManager {
  /**
   * Registers the Pyodide caching service worker if supported by the browser.
   */
  public static async register(swUrl = '/sw.js'): Promise<ServiceWorkerRegistration | null> {
    if (
      typeof navigator === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !navigator.serviceWorker
    ) {
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register(swUrl, { scope: '/' });
      return registration;
    } catch {
      return null;
    }
  }

  /**
   * Returns true if a service worker is currently active and controlling the page.
   */
  public static isServiceWorkerActive(): boolean {
    if (
      typeof navigator === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !navigator.serviceWorker
    ) {
      return false;
    }
    return !!navigator.serviceWorker.controller;
  }
}
