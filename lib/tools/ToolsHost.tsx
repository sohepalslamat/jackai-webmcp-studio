'use client';

import { useEffect } from 'react';
import { registerTools } from './register';
import { useConsent } from '../consent/ConsentProvider';
import { store } from '../store';

/**
 * Binds the tool registry to the page lifetime.
 *
 * Mounted once in the layout, so registration survives client navigation and
 * only tears down when the tab goes away. Renders nothing.
 */
export function ToolsHost() {
  const { gate, recordCall } = useConsent();

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    // registerTools is async, and React 19 StrictMode mounts effects twice in
    // development. If the effect is torn down before registration resolves,
    // unregister as soon as it does.
    registerTools({ store, gate, onCall: recordCall })
      .then((unregister) => {
        if (cancelled) unregister();
        else cleanup = unregister;
      })
      .catch(() => {
        // No modelContext in this browser, or registration was rejected.
        // The app is fully usable by hand either way.
      });

    return () => {
      cancelled = true;
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gate]);

  return null;
}
