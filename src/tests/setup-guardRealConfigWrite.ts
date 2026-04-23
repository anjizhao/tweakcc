import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Guard against tests that forget to mock node:fs/promises and write to the
// user's real ~/.tweakcc/config.json during `pnpm test`. A test file that does
// `vi.mock('node:fs/promises')` replaces the module, so this wrapper is only
// reachable from test files that haven't mocked it — which is exactly the
// failure case we want to catch.
const REAL_TWEAKCC_DIRS = [
  path.join(os.homedir(), '.tweakcc'),
  path.join(os.homedir(), '.claude', 'tweakcc'),
];

const isRealConfigPath = (p: unknown): boolean => {
  const s = typeof p === 'string' ? p : p instanceof URL ? p.pathname : '';
  return REAL_TWEAKCC_DIRS.some(d => s === d || s.startsWith(d + path.sep));
};

const blockedMessage = (p: unknown) =>
  `Test leak: attempted to write to real tweakcc config path (${String(p)}). ` +
  `Add \`vi.mock('node:fs/promises')\` at the top of the test file.`;

const realWriteFile = fs.writeFile.bind(fs);
(fs as unknown as { writeFile: typeof fs.writeFile }).writeFile = (async (
  p: Parameters<typeof fs.writeFile>[0],
  ...args: unknown[]
) => {
  if (isRealConfigPath(p)) {
    throw new Error(blockedMessage(p));
  }
  return (realWriteFile as (...a: unknown[]) => Promise<void>)(p, ...args);
}) as typeof fs.writeFile;

const realWriteFileSync = fsSync.writeFileSync;
fsSync.writeFileSync = ((
  p: Parameters<typeof fsSync.writeFileSync>[0],
  ...args: unknown[]
) => {
  if (isRealConfigPath(p)) {
    throw new Error(blockedMessage(p));
  }
  return (realWriteFileSync as (...a: unknown[]) => void)(p, ...args);
}) as typeof fsSync.writeFileSync;
