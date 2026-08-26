'use client';

import { useSyncExternalStore } from 'react';
import { store, type Assistant } from './store';

/**
 * The server render has no store, and useSyncExternalStore requires the server
 * snapshot to be referentially stable. A single frozen empty array, declared
 * before the hooks that close over it, is that stable value.
 */
const EMPTY: ReadonlyArray<Assistant> = Object.freeze([]);
const getServerSnapshot = (): ReadonlyArray<Assistant> => EMPTY;

/**
 * Subscribes a component to the studio store.
 *
 * Same pattern as ConsentProvider: the store hands out a snapshot reference
 * that only changes when the data changes, so React can bail out of
 * re-rendering without an equality check here.
 */
export function useAssistants(): ReadonlyArray<Assistant> {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, getServerSnapshot);
}

export function useAssistant(id: string): Assistant | undefined {
  const all = useAssistants();
  return all.find((a) => a.id === id);
}

export { store };
