import { describe, it, expect } from 'vitest';
import { createServer } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, '..');

describe('Vite Dev Server COOP/COEP Verification', () => {
  it('serves responses with Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy headers', async () => {
    const server = await createServer({
      configFile: false,
      root: webRoot,
      server: {
        port: 0,
        headers: {
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Embedder-Policy': 'require-corp',
        },
      },
    });

    await server.listen();
    const address = server.httpServer?.address();
    expect(address).toBeDefined();

    if (address && typeof address === 'object') {
      const port = address.port;
      try {
        const response = await fetch(`http://localhost:${port}/`);
        expect(response.headers.get('cross-origin-opener-policy')).toBe('same-origin');
        expect(response.headers.get('cross-origin-embedder-policy')).toBe('require-corp');
      } finally {
        await server.close();
      }
    } else {
      await server.close();
      throw new Error('Server address not available');
    }
  }, 15000);
});
