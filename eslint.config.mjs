import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Custom ESLint rule for simulation engine determinism.
 * Enforces zero non-deterministic APIs (Date, Math.random, Math transcendental functions, async/timer APIs, DOM APIs)
 * in packages/engine to guarantee identical execution hashes across V8, SpiderMonkey, and JavaScriptCore.
 */
const engineDeterminismPlugin = {
  meta: {
    name: 'eslint-plugin-engine-determinism',
    version: '0.1.0',
  },
  rules: {
    'no-non-deterministic-apis': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Disallow non-deterministic APIs (Date, Math.random, transcendentals, timers, DOM) in packages/engine simulation paths',
          recommended: true,
        },
        schema: [],
        messages: {
          forbiddenDate:
            'Date is non-deterministic and strictly forbidden in simulation engine paths. Use the engine tick counter or seeded PRNG.',
          forbiddenMathRandom:
            'Math.random() is non-deterministic and strictly forbidden in simulation engine paths. Use seeded Mulberry32 PRNG.',
          forbiddenTranscendental:
            'Math.{{method}}() is transcendental and non-deterministic across JS engines (V8, SpiderMonkey, JSC divergence). Use deterministic polynomial/Chebyshev approximations.',
          forbiddenTimerOrDOM:
            '{{name}} is strictly forbidden in simulation engine paths to ensure determinism and zero DOM/IO dependency.',
        },
      },
      create(context) {
        const forbiddenMath = new Set([
          'random',
          'sin',
          'cos',
          'tan',
          'asin',
          'acos',
          'atan',
          'atan2',
          'sinh',
          'cosh',
          'tanh',
          'asinh',
          'acosh',
          'atanh',
          'exp',
          'expm1',
          'log',
          'log10',
          'log2',
          'log1p',
          'pow',
          'cbrt',
        ]);

        const forbiddenGlobals = new Set([
          'setTimeout',
          'setInterval',
          'setImmediate',
          'clearTimeout',
          'clearInterval',
          'clearImmediate',
          'performance',
          'window',
          'document',
          'crypto',
          'requestAnimationFrame',
          'cancelAnimationFrame',
        ]);

        return {
          Identifier(node) {
            if (node.name === 'Date') {
              // Ignore property accesses where Date is the property (e.g. obj.Date)
              if (
                node.parent &&
                node.parent.type === 'MemberExpression' &&
                node.parent.property === node &&
                !node.parent.computed
              ) {
                return;
              }
              // Ignore type imports/export specifiers
              if (
                node.parent &&
                (node.parent.type === 'ImportSpecifier' || node.parent.type === 'ExportSpecifier')
              ) {
                return;
              }
              context.report({
                node,
                messageId: 'forbiddenDate',
              });
            } else if (forbiddenGlobals.has(node.name)) {
              if (
                node.parent &&
                node.parent.type === 'MemberExpression' &&
                node.parent.property === node &&
                !node.parent.computed
              ) {
                return;
              }
              if (
                node.parent &&
                (node.parent.type === 'ImportSpecifier' || node.parent.type === 'ExportSpecifier')
              ) {
                return;
              }
              context.report({
                node,
                messageId: 'forbiddenTimerOrDOM',
                data: { name: node.name },
              });
            }
          },
          MemberExpression(node) {
            if (
              node.object.type === 'Identifier' &&
              node.object.name === 'Math' &&
              node.property.type === 'Identifier' &&
              forbiddenMath.has(node.property.name)
            ) {
              if (node.property.name === 'random') {
                context.report({
                  node,
                  messageId: 'forbiddenMathRandom',
                });
              } else {
                context.report({
                  node,
                  messageId: 'forbiddenTranscendental',
                  data: { method: node.property.name },
                });
              }
            }
          },
        };
      },
    },
  },
};

/**
 * Custom ESLint rule for design tokens enforcement.
 * Enforces zero raw hex colors and zero raw pixel units outside token definitions
 * per docs/03-art-direction.md:
 * "Tokens as Single Source of Truth: Every color, dimension, font-size, border-radius,
 * transition duration, and z-index is defined in a centralized token schema (packages/ui/tokens).
 * Hardcoded hex codes, inline pixel styles, and arbitrary magic numbers are strictly forbidden and blocked by ESLint."
 */
const designTokensPlugin = {
  meta: {
    name: 'eslint-plugin-design-tokens',
    version: '0.1.0',
  },
  rules: {
    'no-raw-hex-or-px': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Disallow raw hex colors (#0B0F17, #fff) and raw px values (16px) outside design tokens',
          recommended: true,
        },
        schema: [],
        messages: {
          forbiddenHex:
            'Raw hex color "{{value}}" is forbidden. Use design tokens from @tensorcade/ui/tokens instead.',
          forbiddenPx:
            'Raw pixel unit "{{value}}" is forbidden outside design tokens. Use 16px tile scale or spacing tokens from @tensorcade/ui/tokens instead.',
        },
      },
      create(context) {
        const hexRegex = /(^|[^a-zA-Z0-9_-])#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/;
        const pxRegex = /(^|[^a-zA-Z0-9_-])(\d+px)\b/;

        function inspectString(str, node) {
          if (typeof str !== 'string') return;

          // Skip HTML/JSX href anchor links (e.g. href="#facade" or href="#main-content")
          if (
            node.parent &&
            ((node.parent.type === 'JSXAttribute' &&
              node.parent.name &&
              node.parent.name.name === 'href') ||
              (node.parent.type === 'Property' &&
                node.parent.key &&
                node.parent.key.name === 'href'))
          ) {
            return;
          }

          const hexMatch = hexRegex.exec(str);
          if (hexMatch && hexMatch[2]) {
            context.report({
              node,
              messageId: 'forbiddenHex',
              data: { value: `#${hexMatch[2]}` },
            });
          }
          const pxMatch = pxRegex.exec(str);
          if (pxMatch && pxMatch[2]) {
            context.report({
              node,
              messageId: 'forbiddenPx',
              data: { value: pxMatch[2] },
            });
          }
        }

        return {
          Literal(node) {
            if (typeof node.value === 'string') {
              inspectString(node.value, node);
            }
          },
          TemplateElement(node) {
            if (node.value && typeof node.value.raw === 'string') {
              inspectString(node.value.raw, node);
            }
          },
        };
      },
    },
  },
};

/**
 * Custom ESLint rule for renderer boundary isolation.
 * Guarantees that renderer files (packages/renderer/**) cannot import mutating APIs from packages/engine.
 * Renderer may only import type definitions (e.g. EngineSnapshot, GridWorldState, Position)
 * or read-only contracts.
 */
const rendererBoundaryPlugin = {
  meta: {
    name: 'eslint-plugin-renderer-boundary',
    version: '0.1.0',
  },
  rules: {
    'no-engine-mutation-imports': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Disallow importing mutating simulation classes or functions from @tensorcade/engine into renderer',
          recommended: true,
        },
        schema: [],
        messages: {
          forbiddenMutationImport:
            'Importing mutable engine entity "{{name}}" from @tensorcade/engine is forbidden in renderer. The renderer must only consume read-only state snapshots.',
        },
      },
      create(context) {
        const forbiddenEntities = new Set([
          'BaseSimulationEngine',
          'RobotFarmSimulation',
          'ActionTraceRecorder',
          'ActionTraceReplayer',
          'step',
          'restoreSnapshot',
          'reset',
        ]);

        return {
          ImportDeclaration(node) {
            const source = node.source.value;
            if (
              source === '@tensorcade/engine' ||
              source.startsWith('@tensorcade/engine/') ||
              source.includes('/engine/src/')
            ) {
              if (node.importKind === 'type') {
                return;
              }
              for (const specifier of node.specifiers) {
                if (specifier.importKind === 'type') {
                  continue;
                }
                if (
                  specifier.type === 'ImportSpecifier' &&
                  forbiddenEntities.has(specifier.imported.name)
                ) {
                  context.report({
                    node: specifier,
                    messageId: 'forbiddenMutationImport',
                    data: { name: specifier.imported.name },
                  });
                }
              }
            }
          },
        };
      },
    },
  },
};

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/storybook-static/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        warnOnUnsupportedTypeScriptVersion: false,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  // Service workers use browser globals that are outside the standard Node/DOM globals.
  {
    files: ['apps/web/public/**/*.js'],
    languageOptions: {
      globals: {
        caches: 'readonly',
        fetch: 'readonly',
        self: 'readonly',
        URL: 'readonly',
      },
    },
  },
  // Simulation Engine determinism enforcement
  {
    files: ['packages/engine/**/*.{ts,tsx,js,mjs}'],
    plugins: {
      'engine-determinism': engineDeterminismPlugin,
    },
    rules: {
      'engine-determinism/no-non-deterministic-apis': 'error',
      'no-restricted-globals': [
        'error',
        {
          name: 'Date',
          message:
            'Date is forbidden in sim paths to preserve determinism. Use integer tick counter.',
        },
        {
          name: 'performance',
          message: 'performance is forbidden in sim paths. Use fixed timestep ticks.',
        },
        {
          name: 'setTimeout',
          message: 'Async scheduling is forbidden in sim paths.',
        },
        {
          name: 'setInterval',
          message: 'Async scheduling is forbidden in sim paths.',
        },
        {
          name: 'window',
          message: 'DOM APIs forbidden in engine.',
        },
        {
          name: 'document',
          message: 'DOM APIs forbidden in engine.',
        },
        {
          name: 'crypto',
          message: 'Web Crypto API is non-deterministic. Use seeded Mulberry32 PRNG.',
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Math.random is non-deterministic. Use seeded PRNG (Mulberry32).',
        },
        {
          object: 'Math',
          property: 'sin',
          message:
            'Transcendental Math.sin diverges across engines. Use deterministic polynomial approximations.',
        },
        {
          object: 'Math',
          property: 'cos',
          message:
            'Transcendental Math.cos diverges across engines. Use deterministic polynomial approximations.',
        },
        {
          object: 'Math',
          property: 'tan',
          message:
            'Transcendental Math.tan diverges across engines. Use deterministic polynomial approximations.',
        },
        {
          object: 'Math',
          property: 'exp',
          message:
            'Transcendental Math.exp diverges across engines. Use deterministic polynomial approximations.',
        },
        {
          object: 'Math',
          property: 'log',
          message:
            'Transcendental Math.log diverges across engines. Use deterministic polynomial approximations.',
        },
        {
          object: 'Math',
          property: 'log10',
          message:
            'Transcendental Math.log10 diverges across engines. Use deterministic polynomial approximations.',
        },
        {
          object: 'Math',
          property: 'log2',
          message:
            'Transcendental Math.log2 diverges across engines. Use deterministic polynomial approximations.',
        },
        {
          object: 'Math',
          property: 'pow',
          message:
            'Transcendental Math.pow diverges across engines. Use deterministic polynomial approximations.',
        },
        {
          object: 'Math',
          property: 'atan2',
          message:
            'Transcendental Math.atan2 diverges across engines. Use deterministic polynomial approximations.',
        },
      ],
    },
  },
  // Allow test files in packages/engine to use benchmarking/profiling test utilities
  {
    files: ['packages/engine/**/*.test.{ts,tsx,js,mjs}'],
    rules: {
      'engine-determinism/no-non-deterministic-apis': 'off',
      'no-restricted-globals': 'off',
      'no-restricted-properties': 'off',
    },
  },
  // Design tokens enforcement: no raw hex or px outside tokens
  {
    files: ['packages/ui/src/components/**/*.{ts,tsx,js,jsx}', 'apps/**/*.{ts,tsx,js,jsx}'],
    ignores: [
      '**/*.test.{ts,tsx,js,jsx}',
      '**/*.spec.{ts,tsx,js,jsx}',
      '**/*.stories.{ts,tsx,js,jsx}',
      '**/tokens.{ts,js}',
      '**/preset.{ts,js}',
      '**/css-variables.{ts,js}',
      '**/*.config.*',
    ],
    plugins: {
      'design-tokens': designTokensPlugin,
    },
    rules: {
      'design-tokens/no-raw-hex-or-px': 'error',
    },
  },
  // Renderer boundary isolation: renderer cannot import engine mutation APIs
  {
    files: ['packages/renderer/**/*.{ts,tsx,js,mjs}'],
    plugins: {
      'renderer-boundary': rendererBoundaryPlugin,
    },
    rules: {
      'renderer-boundary/no-engine-mutation-imports': 'error',
    },
  },
);
