'use strict';

const path = require('path');
const fs = require('fs-extra');

async function run(a) {
  if (!a.offlineFirst) return;
  const ext = a.language === 'typescript' ? 'ts' : 'js';
  const isTs = a.language === 'typescript';
  const dir = path.join(a.targetDir, 'src/services/offline');

  await fs.writeFile(
    path.join(dir, `cache.${ext}`),
    `import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'offline-cache' });

/** Generic local cache for "last known good" data shown while offline. */
export function cacheSet${isTs ? '<T>' : ''}(key${isTs ? ': string' : ''}, value${isTs ? ': T' : ''}) {
  storage.set(key, JSON.stringify({ value, cachedAt: Date.now() }));
}

export function cacheGet${isTs ? '<T>' : ''}(key${isTs ? ': string' : ''})${isTs ? ': { value: T; cachedAt: number } | null' : ''} {
  const raw = storage.getString(key);
  return raw ? JSON.parse(raw) : null;
}
`
  );

  await fs.writeFile(
    path.join(dir, `mutationQueue.${ext}`),
    `import { MMKV } from 'react-native-mmkv';
import { withRetry } from '../api/retry';

const storage = new MMKV({ id: 'offline-mutation-queue' });
const QUEUE_KEY = 'pending-mutations';

${isTs ? "export interface QueuedMutation {\n  id: string;\n  execute: () => Promise<unknown>; // NOTE: functions can't be persisted directly — see note below\n  createdAt: number;\n}\n\n" : ''}/**
 * Queues writes made while offline so they can be replayed once connectivity
 * returns. In practice, store a serializable *description* of the mutation
 * (endpoint + payload) rather than a function, then look up the matching
 * executor by type when replaying — functions can't survive JSON.stringify.
 */
function readQueue() {
  const raw = storage.getString(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function writeQueue(queue) {
  storage.set(QUEUE_KEY, JSON.stringify(queue));
}

export function enqueueMutation(descriptor${isTs ? ': { type: string; payload: unknown }' : ''}) {
  const queue = readQueue();
  queue.push({ ...descriptor, id: \`\${Date.now()}-\${Math.random().toString(36).slice(2)}\`, createdAt: Date.now() });
  writeQueue(queue);
}

/**
 * Replays queued mutations in order. Pass a map of type -> executor
 * (e.g. { 'profile.update': (payload) => profileRepository.updateProfile(payload) }).
 * Executors that throw are re-queued; successful ones are removed.
 */
export async function flushMutationQueue(executors${isTs ? ': Record<string, (payload: unknown) => Promise<unknown>>' : ''}) {
  const queue = readQueue();
  const remaining = [];

  for (const item of queue) {
    const executor = executors[item.type];
    if (!executor) {
      remaining.push(item); // unknown type — don't drop silently
      continue;
    }
    try {
      await withRetry(() => executor(item.payload), { retries: 2 });
    } catch (err) {
      remaining.push(item);
    }
  }

  writeQueue(remaining);
  return { flushed: queue.length - remaining.length, remaining: remaining.length };
}
`
  );

  await fs.writeFile(
    path.join(dir, `backgroundSync.${ext}`),
    `import NetInfo from '@react-native-community/netinfo';
import { flushMutationQueue } from './mutationQueue';

/**
 * Listens for connectivity changes and flushes the mutation queue as soon as
 * the device comes back online. Call startBackgroundSync() once at app boot.
 */
export function startBackgroundSync(executors${isTs ? ': Record<string, (payload: unknown) => Promise<unknown>>' : ''}) {
  return NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable !== false) {
      flushMutationQueue(executors).catch(() => {
        // Swallow here; individual failures are already re-queued inside flushMutationQueue.
      });
    }
  });
}
`
  );

  await fs.writeFile(
    path.join(dir, `conflictResolution.${ext}`),
    `/**
 * Conflict handling strategies for when a queued local mutation and the
 * server's current state disagree (e.g. edited the same record on two devices).
 * Pick per-entity — "last write wins" is simplest but can silently drop edits.
 */
export const ConflictStrategy = {
  LAST_WRITE_WINS: 'last-write-wins',
  SERVER_WINS: 'server-wins',
  MANUAL: 'manual', // surface a merge UI to the user
};

export function resolveConflict${isTs ? '<T extends { updatedAt: number }>' : ''}(local${isTs ? ': T' : ''}, server${isTs ? ': T' : ''}, strategy${isTs ? ': string' : ''} = ConflictStrategy.LAST_WRITE_WINS) {
  switch (strategy) {
    case ConflictStrategy.SERVER_WINS:
      return server;
    case ConflictStrategy.MANUAL:
      return { conflict: true, local, server };
    case ConflictStrategy.LAST_WRITE_WINS:
    default:
      return local.updatedAt >= server.updatedAt ? local : server;
  }
}
`
  );
}

module.exports = { run };
