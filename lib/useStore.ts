'use client';

import { useSyncExternalStore } from 'react';
import { store, type Assistant } from './store';

/**
 * Subscribes a component to the studio store.
 *
 * Same pattern as ConsentProvider: the store hands out a stable snapshot that
 * only changes when the data changes, so React can bail out of re-rendering
 * without an equality check here.
 */
export function useAssistants(): ReadonlyArray<Assistant> {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, () => EMPTY);
}

export function useAssistant(id: string): Assistant | undefined {
  const all = useAssistants();
  return all.find((a) => a.id === id);
}

const EMPTY: ReadonlyArray<Assistant> = [];

export { store };
