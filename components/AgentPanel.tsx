'use client';

import { useEffect, useRef, useState } from 'react';
import { useConsent } from '../lib/consent/ConsentProvider';
import { CONSENT_TTL_MS, sensitivityOf, TOOL_NAMES, type ToolName } from '../lib/contracts';

/**
 * The side panel shows what is normally invisible: which tools exist right now,
 * and every gate decision at the moment it happens. Without it a judge watching
 * a three-minute video sees nothing at all.
 *
 * Type sizes here are deliberately larger than the rest of the interface,
 * because this panel has to stay readable in a 1080p recording.
 */
export function AgentPanel() {
  const { entries, calls } = useConsent();
  const [registered, setRegistered] = useState<string[]>([]);
  const [, tick] = useState(0);

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
  const [hasContext, setHasContext] = useState(false);
  useEffect(() => {
    setHasContext(!!document.modelContext);
  }, []);

  return (
    <aside className="flex h-full w-full flex-col gap-5 border-s border-slate-200 bg-white p-5">
      <header>
        <h2 className="text-base font-semibold text-slate-900">What your agent sees</h2>
        {!hasContext && (
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            No tools registered. Open this page in a WebMCP-capable browser.
          </p>
        )}
      </header>

      {/* Registered tools */}
      <section>
        <SectionTitle>Tools available now</SectionTitle>
        {registered.length === 0 ? (
          <Muted>No tools registered. Open this page in a WebMCP-capable browser.</Muted>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {registered.map((name) => {
              const high = isKnownTool(name) && sensitivityOf(name) === 'high';
              return (
                <li key={name} className="flex items-center justify-between gap-2">
                  <code className="text-[13px] text-slate-800">{name}</code>
                  {high && (
                    <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-900">
                      Needs confirmation
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Gate decisions */}
      <section>
        <SectionTitle>Gate decisions</SectionTitle>
        {entries.length === 0 ? (
          <Muted>No decisions yet.</Muted>
        ) : (
          <ol className="mt-2 space-y-2">
            {entries.slice(0, 5).map((e) => {
              const secondsLeft =
                e.status === 'granted' && e.decidedAt
                  ? Math.max(0, Math.ceil((CONSENT_TTL_MS - (Date.now() - e.decidedAt)) / 1000))
                  : null;

              return (
                <li key={e.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-[13px] text-slate-800">{e.tool}</code>
                    <StatusTag status={e.status} />
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-600" title={e.summary}>
                    {e.summary}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-slate-500">
                    {e.hash.slice(0, 12)}…
                  </p>
                  {secondsLeft !== null && (
                    // A live countdown is the clearest way to show that consent
                    // is contemporaneous, not permanent.
                    <p className="mt-1 text-[11px] font-medium text-emerald-800">
                      Expires in {secondsLeft}s
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Recent calls */}
      <section className="mt-auto">
        <SectionTitle>Recent calls</SectionTitle>
        {calls.length === 0 ? (
          <Muted>No calls yet.</Muted>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {calls.slice(0, 8).map((c, i) => (
              <CallRow key={`${c.at}-${i}`} call={c} isLatest={i === 0} />
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}

/**
 * A blocked call is the moment the whole project exists for, so it gets a
 * colour of its own, a one-shot pulse, and a sentence in plain words.
 * Never the raw refusal code.
 */
function CallRow({
  call,
  isLatest,
}: {
  call: { tool: string; at: number; outcome: 'allowed' | 'blocked' };
  isLatest: boolean;
}) {
  const blocked = call.outcome === 'blocked';

  // Pulse only for a genuinely new blocked call, not on every re-render.
  const seen = useRef<number | null>(null);
  const isNew = isLatest && blocked && seen.current !== call.at;
  useEffect(() => {
    if (isLatest && blocked) seen.current = call.at;
  }, [isLatest, blocked, call.at]);

  if (!blocked) {
    return (
      <li className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5">
        <code className="text-[13px] text-slate-700">{call.tool}</code>
        <span className="shrink-0 text-xs font-medium text-emerald-800">Executed</span>
      </li>
    );
  }

  return (
    <li
      className={`rounded-lg border-s-4 border-amber-500 bg-amber-50 px-3 py-2 ${
        isNew ? 'blocked-pulse' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <code className="text-[13px] font-medium text-amber-950">{call.tool}</code>
      </div>
      <p className="mt-0.5 text-xs font-medium leading-relaxed text-amber-900">
        Blocked: this action needs your confirmation
      </p>
    </li>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{children}</h3>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-xs leading-relaxed text-slate-500">{children}</p>;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Waiting for you',
  granted: 'Confirmed',
  consumed: 'Consumed',
  denied: 'Denied',
  expired: 'Expired',
};

function StatusTag({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-900',
    granted: 'bg-emerald-100 text-emerald-900',
    consumed: 'bg-slate-200 text-slate-700',
    denied: 'bg-red-100 text-red-800',
    expired: 'bg-slate-200 text-slate-600',
  };
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${
        styles[status] ?? 'bg-slate-200 text-slate-700'
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function isKnownTool(name: string): name is ToolName {
  return (TOOL_NAMES as readonly string[]).includes(name);
}
