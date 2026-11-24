import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { coopCoepHeaders } from './src/headers.js';

export { coopCoepHeaders };

const PYODIDE_CORE_FILES = [
  'pyodide.mjs',
  'pyodide.js',
  'pyodide.asm.mjs',
  'pyodide.asm.wasm',
  'pyodide-lock.json',
  'python_stdlib.zip',
] as const;

const MIME_BY_EXT: Record<string, string> = {
  '.wasm': 'application/wasm',
  '.mjs': 'application/javascript; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.zip': 'application/zip',
};

function resolvePyodideDir(): string | null {
  try {
    const runtimePkgPath = path.resolve(import.meta.dirname, '../../packages/runtime/package.json');
    const requireFromRuntime = createRequire(runtimePkgPath);
    return path.dirname(requireFromRuntime.resolve('pyodide'));
  } catch {
    return null;
  }
}

/**
 * Serves self-hosted Pyodide WASM/stdlib assets at `/pyodide/` in dev & preview
 * and copies core runtime files into `dist/pyodide/` on build (ADR-017).
 */
function pyodideAssetsPlugin(): Plugin {
  const pyodideDir = resolvePyodideDir();
  const allowedFiles = new Set<string>(PYODIDE_CORE_FILES);

  const attachMiddleware = (middlewares: {
    use: (
      fn: (
        req: { url?: string },
        res: {
          setHeader: (k: string, v: string) => void;
          statusCode: number;
          end: (chunk?: Buffer) => void;
        },
        next: () => void,
      ) => void,
    ) => void;
  }): void => {
    if (!pyodideDir) return;
    middlewares.use((req, res, next) => {
      const urlPath = (req.url ?? '').split('?')[0] ?? '';
      if (!urlPath.startsWith('/pyodide/')) {
        next();
        return;
      }
      const fileName = path.basename(urlPath);
      if (!allowedFiles.has(fileName)) {
        next();
        return;
      }
      const fullPath = path.join(pyodideDir, fileName);
      if (!fs.existsSync(fullPath)) {
        next();
        return;
      }
      const ext = path.extname(fileName);
      res.setHeader('Content-Type', MIME_BY_EXT[ext] ?? 'application/octet-stream');
      res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.statusCode = 200;
      res.end(fs.readFileSync(fullPath));
    });
  };

  return {
    name: 'tensorcade-pyodide-assets',
    configureServer(server) {
      attachMiddleware(server.middlewares);
    },
    configurePreviewServer(server) {
      attachMiddleware(server.middlewares);
    },
    closeBundle() {
      if (!pyodideDir) return;
      const outDir = path.resolve(import.meta.dirname, 'dist/pyodide');
      fs.mkdirSync(outDir, { recursive: true });
      for (const fileName of PYODIDE_CORE_FILES) {
        const src = path.join(pyodideDir, fileName);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, path.join(outDir, fileName));
        }
      }
    },
  };
}

/**
 * Vite Configuration for Tensorcade Web Application.
 * Configured with strict COOP/COEP headers on both dev and preview servers.
 */
export default defineConfig({
  plugins: [react(), pyodideAssetsPlugin()],
  optimizeDeps: {
    exclude: ['pyodide'],
  },
  worker: {
    format: 'es',
  },
  server: {
    port: 5173,
    strictPort: true,
    headers: coopCoepHeaders,
  },
  preview: {
    port: 4173,
    strictPort: true,
    headers: coopCoepHeaders,
  },
});
