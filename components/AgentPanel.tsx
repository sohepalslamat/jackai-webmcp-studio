'use client';

import { useEffect, useRef, useState } from 'react';
import { useConsent } from '../lib/consent/ConsentProvider';
import { CONSENT_TTL_MS, sensitivityOf, TOOL_NAMES, type ToolName } from '../lib/contracts';

/**
 * The instrument rack.
 *
 * It shows what is normally invisible: which tools exist right now, and every
 * gate decision at the moment it happens. Without it a judge watching a
 * three-minute video sees nothing at all, so readability at 1080p outranks
 * density here.
 */
export function AgentPanel() {
  const { entries, calls } = useConsent();
  const [registered, setRegistered] = useState<string[]>([]);
  const [, tick] = useState(0);
  const [hasContext, setHasContext] = useState(false);

  // Follows the real registry through the toolchange event, so the list
  // reflects what the agent can actually call, not what we believe we set up.
  useEffect(() => {
    const mc = document.modelContext;
    if (!mc) return;

    const refresh = async () => {
      try {
        const tools = await mc.getTools();
        setRegistered(tools.map((tool: { name: string }) => tool.name));
      } catch {
        setRegistered([]);
      }
    };

    refresh();
    mc.addEventListener?.('toolchange', refresh);
    return () => mc.removeEventListener?.('toolchange', refresh);
  }, []);

  // Keeps the countdown honest.
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Resolved after mount, never during render: the server has no
  // document.modelContext, so reading it inline makes the first client paint
  // disagree with the server HTML and React discards the tree.
  useEffect(() => {
    setHasContext(!!document.modelContext);
  }, []);

  return (
    <div className="flex h-full flex-col bg-[var(--color-deck)]">
      <Rack
        label="agent surface"
        badge={
          <span className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                hasContext ? 'live-dot bg-[var(--color-signal)]' : 'bg-[var(--color-ink-faint)]'
              }`}
            />
            <span className={hasContext ? 'text-[var(--color-signal)]' : 'text-[var(--color-ink-faint)]'}>
              {hasContext ? 'linked' : 'no link'}
            </span>
          </span>
        }
      >
        {registered.length === 0 ? (
          <Empty>No tools registered. Open this page in a WebMCP-capable browser.</Empty>
        ) : (
          <ul>
            {registered.map((name, i) => {
              const high = isKnownTool(name) && sensitivityOf(name) === 'high';
              return (
                <li
                  key={name}
                  className="trace-in flex items-center gap-3 py-[5px]"
                  style={{ animationDelay: `${i * 24}ms` }}
                >
                  <span className="stamp tabular w-5 shrink-0 text-[var(--color-ink-faint)]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <code
                    className="flex-1 truncate text-[13px] text-[var(--color-ink-dim)]"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {name}
                  </code>
                  {high && (
                    <span
                      className="stamp shrink-0 border border-[var(--color-alarm-dim)] bg-[var(--color-alarm-dim)]/40 px-1.5 py-0.5 text-[var(--color-alarm)]"
                      title="Sensitive: requires your confirmation"
                    >
                      gated
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Rack>

      <Rack label="gate decisions" badge={<span className="tabular">{entries.length}</span>}>
        {entries.length === 0 ? (
          <Empty>No decisions yet.</Empty>
        ) : (
          <ol className="space-y-2">
            {entries.slice(0, 4).map((e) => {
              const secondsLeft =
                e.status === 'granted' && e.decidedAt
                  ? Math.max(0, Math.ceil((CONSENT_TTL_MS - (Date.now() - e.decidedAt)) / 1000))
                  : null;

              return (
                <li
                  key={e.id}
                  className="trace-in border-l-2 border-[var(--color-rule-bright)] bg-[var(--color-panel)] px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <code
                      className="truncate text-[13px] text-[var(--color-ink)]"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {e.tool}
                    </code>
                    <StatusTag status={e.status} />
                  </div>

                  <p className="mt-1.5 truncate text-xs text-[var(--color-ink-dim)]" title={e.summary}>
                    {e.summary}
                  </p>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <code
                      className="stamp tabular text-[var(--color-ink-faint)]"
                      title={e.hash}
                      style={{ letterSpacing: '0.08em' }}
                    >
                      {e.hash.slice(0, 10)}
                    </code>

                    {secondsLeft !== null && (
                      /* A live countdown is the clearest way to show that a
                         consent is contemporaneous, not permanent. */
                      <span className="flex items-center gap-1.5">
                        <span className="live-dot h-1 w-1 rounded-full bg-[var(--color-signal)]" />
                        <span className="stamp tabular text-[var(--color-signal)]">
                          {secondsLeft}s left
                        </span>
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Rack>

      <Rack label="call log" badge={<span className="tabular">{calls.length}</span>} last>
        {calls.length === 0 ? (
          <Empty>No calls yet.</Empty>
        ) : (
          <ul className="space-y-1">
            {calls.slice(0, 7).map((c, i) => (
              <CallRow key={`${c.at}-${i}`} call={c} isLatest={i === 0} />
            ))}
          </ul>
        )}
      </Rack>
    </div>
  );
}

/**
 * A blocked call is the moment the whole project exists for, so it gets the
 * only alarm colour in the system, one sweep of light, and a sentence in plain
 * words. Never the raw refusal code.
 */
function CallRow({
  call,
  isLatest,
}: {
  call: { tool: string; at: number; outcome: 'allowed' | 'blocked' };
  isLatest: boolean;
}) {
  const blocked = call.outcome === 'blocked';

  // Sweep only for a genuinely new blocked call, not on every re-render.
  const seen = useRef<number | null>(null);
  const isNew = isLatest && blocked && seen.current !== call.at;
  useEffect(() => {
    if (isLatest && blocked) seen.current = call.at;
  }, [isLatest, blocked, call.at]);

  if (!blocked) {
    return (
      <li className="flex items-center gap-2 py-1">
        <span className="h-1 w-1 shrink-0 rounded-full bg-[var(--color-signal-dim)]" />
        <code
          className="flex-1 truncate text-xs text-[var(--color-ink-faint)]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {call.tool}
        </code>
        <span className="stamp shrink-0 text-[var(--color-signal-dim)]">ran</span>
      </li>
    );
  }

  return (
    <li
      className={`border border-[var(--color-rule-bright)] bg-[var(--color-alarm-dim)]/25 px-3 py-2 ${
        isNew ? 'alarm-row' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 shrink-0 bg-[var(--color-alarm)]" />
        <code
          className="flex-1 truncate text-xs font-medium text-[var(--color-alarm)]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {call.tool}
        </code>
        <span className="stamp shrink-0 text-[var(--color-alarm)]">halted</span>
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-ink-dim)]">
        Blocked: this action needs your confirmation.
      </p>
    </li>
  );
}

/** One bay in the rack: a stamped label, a readout, and a hairline below. */
function Rack({
  label,
  badge,
  children,
  last,
}: {
  label: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <section className={`px-5 py-4 ${last ? 'mt-auto' : 'border-b border-[var(--color-rule)]'}`}>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="stamp text-[var(--color-ink-dim)]">{label}</h2>
        <span className="stamp text-[var(--color-ink-faint)]">{badge}</span>
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs leading-relaxed text-[var(--color-ink-faint)]">{children}</p>;
}

const STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: 'awaiting you', className: 'text-[var(--color-alarm)]' },
  granted: { label: 'confirmed', className: 'text-[var(--color-signal)]' },
  consumed: { label: 'spent', className: 'text-[var(--color-ink-faint)]' },
  denied: { label: 'denied', className: 'text-[var(--color-halt)]' },
  expired: { label: 'expired', className: 'text-[var(--color-ink-faint)]' },
};

function StatusTag({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, className: 'text-[var(--color-ink-faint)]' };
  return <span className={`stamp shrink-0 ${s.className}`}>{s.label}</span>;
}

function isKnownTool(name: string): name is ToolName {
  return (TOOL_NAMES as readonly string[]).includes(name);
}
