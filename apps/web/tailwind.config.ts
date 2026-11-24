import type { Config } from 'tailwindcss';
import { tensorcadePreset } from '@tensorcade/ui/preset';

const config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
    '../../packages/renderer/src/**/*.{ts,tsx}',
    '../../packages/editors/src/**/*.{ts,tsx}',
  ],
  presets: [tensorcadePreset as unknown as Config],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;

export default config;
