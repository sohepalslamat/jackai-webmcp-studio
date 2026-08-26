'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';
import { ConsentLedger } from './ledger';
import type { ConsentEntry, ToolCallRecord } from '../contracts';

interface ConsentContextValue {
  gate: ConsentLedger;
  entries: ReadonlyArray<ConsentEntry>;
  pending?: ConsentEntry;
  calls: ReadonlyArray<ToolCallRecord>;
  recordCall: (r: ToolCallRecord) => void;
}

const Ctx = createContext<ConsentContextValue | null>(null);

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const gate = useMemo(() => new ConsentLedger(), []);
  const callsRef = useRef<ToolCallRecord[]>([]);
  const callListeners = useRef(new Set<() => void>());

  const entries = useSyncExternalStore(
    (cb) => gate.subscribe(cb),
    () => gate.entries(),
    () => [] as ReadonlyArray<ConsentEntry>,
  );

  const calls = useSyncExternalStore(
    (cb) => {
      callListeners.current.add(cb);
      return () => callListeners.current.delete(cb);
    },
    () => callsRef.current,
    () => [] as ToolCallRecord[],
  );

  const recordCall = (r: ToolCallRecord) => {
    callsRef.current = [r, ...callsRef.current].slice(0, 50);
    for (const fn of callListeners.current) fn();
  };

  const value: ConsentContextValue = {
    gate,
    entries,
    pending: entries.find((e) => e.status === 'pending'),
    calls,
    recordCall,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useConsent(): ConsentContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useConsent must be used inside <ConsentProvider>');
  return v;
}

/** يُبقي المهلة مرئية: يعيد التصيير كل ثانية ما دام هناك موافقة سارية. */
export function useConsentTick(active: boolean) {
  const [, force] = React.useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(force, 1000);
    return () => clearInterval(id);
  }, [active]);
}
