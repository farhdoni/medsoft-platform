import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: 'dist/index.js',
  banner: {
    js: `
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
`.trim(),
  },
  external: [
    'pg-native',
    'bufferutil',
    'utf-8-validate',
    'mock-aws-s3',
    'aws-sdk',
    'nock',
    '@mapbox/node-pre-gyp',
  ],
  loader: { '.html': 'text' },
});

console.log('Build complete → dist/index.js');
