'use client';

import { useEffect, useRef, useState } from 'react';
import { useConsent } from '../lib/consent/ConsentProvider';
import { CONSENT_TTL_MS, sensitivityOf, TOOL_NAMES, type ToolName } from '../lib/contracts';
import { useT, type TKey } from '../lib/i18n';

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
  const { t } = useT();
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
        <h2 className="text-base font-semibold text-slate-900">{t('panel.title')}</h2>
        {!hasContext && (
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            {t('panel.tools_none')}
          </p>
        )}
      </header>

      {/* Registered tools */}
      <section>
        <SectionTitle>{t('panel.tools')}</SectionTitle>
        {registered.length === 0 ? (
          <Muted>{t('panel.tools_none')}</Muted>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {registered.map((name) => {
              const high = isKnownTool(name) && sensitivityOf(name) === 'high';
              return (
                <li key={name} className="flex items-center justify-between gap-2">
                  <code className="text-[13px] text-slate-800">{name}</code>
                  {high && (
                    <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-900">
                      {t('panel.needs_consent')}
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
        <SectionTitle>{t('panel.decisions')}</SectionTitle>
        {entries.length === 0 ? (
          <Muted>{t('panel.decisions_none')}</Muted>
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
                      {t('panel.expires_in', { s: secondsLeft })}
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
        <SectionTitle>{t('panel.calls')}</SectionTitle>
        {calls.length === 0 ? (
          <Muted>{t('panel.calls_none')}</Muted>
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
 * colour of its own, a one-shot pulse, and a sentence in the user's language.
 * Never the raw refusal code.
 */
function CallRow({
  call,
  isLatest,
}: {
  call: { tool: string; at: number; outcome: 'allowed' | 'blocked' };
  isLatest: boolean;
}) {
  const { t } = useT();
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
        <span className="shrink-0 text-xs font-medium text-emerald-800">
          {t('panel.allowed')}
        </span>
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
        {t('panel.blocked')}
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

function StatusTag({ status }: { status: string }) {
  const { t } = useT();
  const styles: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-900',
    granted: 'bg-emerald-100 text-emerald-900',
    consumed: 'bg-slate-200 text-slate-700',
    denied: 'bg-red-100 text-red-800',
    expired: 'bg-slate-200 text-slate-600',
  };
  const key = `panel.status.${status}` as TKey;
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${
        styles[status] ?? 'bg-slate-200 text-slate-700'
      }`}
    >
      {t(key)}
    </span>
  );
}

function isKnownTool(name: string): name is ToolName {
  return (TOOL_NAMES as readonly string[]).includes(name);
}
