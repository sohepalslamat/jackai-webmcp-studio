import {
  CONSENT_TTL_MS,
  type ConsentEntry,
  type ConsentGate,
  type ToolName,
} from '../contracts';

/**
 * The consent ledger.
 *
 * Two rules carry everything:
 *  1. It is written only by a user click in the interface. No tool grants consent.
 *  2. A consent is bound to (tool + argument hash), is consumed once, and expires.
 *
 * State lives in memory only. No localStorage: today's approval must not be
 * usable in tomorrow's session.
 */
export class ConsentLedger implements ConsentGate {
  private items = new Map<string, ConsentEntry>();
  private listeners = new Set<() => void>();
  private seq = 0;

  /**
   * Cached view handed to useSyncExternalStore. React demands a reference that
   * only changes when the data changes; rebuilding the array on every read
   * would spin the render loop forever. Invalidated on every mutation.
   */
  private snapshot: ReadonlyArray<ConsentEntry> | null = null;

  private emit() {
    this.snapshot = null;
    for (const fn of this.listeners) fn();
  }

  private newId() {
    this.seq += 1;
    return `c${this.seq}_${Date.now().toString(36)}`;
  }

  private sweep(now = Date.now()) {
    let changed = false;
    for (const e of this.items.values()) {
      if (e.status === 'granted' && e.decidedAt && now - e.decidedAt > CONSENT_TTL_MS) {
        e.status = 'expired';
        changed = true;
      }
    }
    if (changed) this.snapshot = null;
    return changed;
  }

  request(tool: ToolName, hash: string, summary: string): string {
    this.sweep();

    // If a request for this same action is already pending, do not duplicate it:
    // flooding the user with dialogs is itself an attack.
    for (const e of this.items.values()) {
      if (e.status === 'pending' && e.tool === tool && e.hash === hash) return e.id;
    }

    const entry: ConsentEntry = {
      id: this.newId(),
      tool,
      hash,
      summary,
      requestedAt: Date.now(),
      status: 'pending',
    };
    this.items.set(entry.id, entry);
    this.emit();
    return entry.id;
  }

  /** Called from the onClick in ConsentDialog. Nothing else calls it. */
  grant(id: string): void {
    const e = this.items.get(id);
    if (!e || e.status !== 'pending') return;
    e.status = 'granted';
    e.decidedAt = Date.now();
    this.emit();
  }

  deny(id: string): void {
    const e = this.items.get(id);
    if (!e || e.status !== 'pending') return;
    e.status = 'denied';
    e.decidedAt = Date.now();
    this.emit();
  }

  /**
   * Looks for a live granted consent matching both the tool and the hash.
   *
   * Matching on both together is what makes a consent "bound to the action":
   * approval to publish assistant A does not pass a deletion of assistant B,
   * nor even a publish of assistant B.
   */
  consume(tool: ToolName, hash: string): boolean {
    const now = Date.now();
    this.sweep(now);

    for (const e of this.items.values()) {
      if (e.status !== 'granted') continue;
      if (e.tool !== tool) continue;
      if (e.hash !== hash) continue;
      if (!e.decidedAt || now - e.decidedAt > CONSENT_TTL_MS) continue;

      e.status = 'consumed';
      this.emit();
      return true;
    }

    this.emit();
    return false;
  }

  entries(): ReadonlyArray<ConsentEntry> {
    this.sweep();
    if (!this.snapshot) {
      this.snapshot = [...this.items.values()]
        .map((e) => ({ ...e }))
        .sort((a, b) => b.requestedAt - a.requestedAt);
    }
    return this.snapshot;
  }

  pending(): ConsentEntry | undefined {
    return this.entries().find((e) => e.status === 'pending');
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Tests only. */
  reset(): void {
    this.items.clear();
    this.seq = 0;
    this.emit();
  }
}
