#!/usr/bin/env node
// Runs as the root "postinstall" script — builds the workspace's foundational
// library packages (packages/db, packages/shared) right after `pnpm install`,
// so apps/api, apps/aivita and apps/admin can typecheck/dev/build immediately
// afterward without a manual build step first.
//
// WHY THIS EXISTS: @medsoft/db and @medsoft/shared are consumed via their
// package.json main/types/exports fields, which point at ./dist — not ./src.
// `tsc --noEmit` (every app's "typecheck" script) resolves those imports by
// reading that compiled output, so on a fresh clone (no dist/, gitignored)
// every downstream typecheck/dev/build fails until someone manually runs
// `pnpm --filter @medsoft/shared build && pnpm --filter @medsoft/db build`
// first — undocumented tribal knowledge that cost multiple sessions real time
// before this hook existed (see docs/monorepo-bootstrap.md).
//
// WHY A CHECK-THEN-BUILD SCRIPT INSTEAD OF JUST `pnpm --filter ... build`
// inline in "postinstall": apps/aivita/Dockerfile deliberately runs
// `pnpm install --filter aivita...` BEFORE copying these packages' real
// source (only their package.json stubs are copied first, for Docker layer
// caching — see that Dockerfile's own comments). A postinstall hook fires
// at that exact install step too (verified empirically against pnpm@9,
// pinned in every Dockerfile here) — a naive unconditional build would try
// to compile a package with no src/ and no tsconfig.build.json yet, and
// break that Docker build. Skipping when the source genuinely isn't there
// yet keeps this hook a no-op in that layer; the Dockerfile's own later
// explicit build step (after the real COPY) still runs exactly as before.
// apps/admin's Dockerfile installs with --ignore-scripts, so this never
// fires there at all — also unaffected, also unchanged.

import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Order doesn't matter for correctness (neither depends on the other), but
// keeping it explicit and short is easier to reason about than scanning
// packages/* generically for a two-package workspace. Add a new entry here
// if a third foundational library package shows up.
const LIBS = [
  { dir: 'packages/shared', name: '@medsoft/shared' },
  { dir: 'packages/db', name: '@medsoft/db' },
];

let failed = false;

for (const lib of LIBS) {
  const pkgDir = path.join(repoRoot, lib.dir);
  const marker = path.join(pkgDir, 'tsconfig.build.json');

  if (!existsSync(marker)) {
    // Docker's package.json-only layer (or any other partial checkout) —
    // nothing to build yet, and nothing wrong either. Silent, not an error.
    console.log(`[bootstrap-workspace-libs] ${lib.name}: source not present yet, skipping`);
    continue;
  }

  console.log(`[bootstrap-workspace-libs] building ${lib.name}...`);
  const result = spawnSync('pnpm', ['--filter', lib.name, 'build'], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    console.error(`[bootstrap-workspace-libs] ${lib.name} build failed`);
    failed = true;
  }
}

process.exit(failed ? 1 : 0);
