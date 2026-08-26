'use client';

import { useEffect, useRef } from 'react';
import { useConsent } from '../lib/consent/ConsentProvider';

/**
 * The confirmation dialog.
 *
 * This is the only place in the application that calls gate.grant. No WebMCP
 * tool reaches it, and nothing else invokes it programmatically.
 *
 * The text shown comes from summarize() in the application, never from the
 * model, so an agent cannot describe one action to the user while a different
 * one waits behind the button.
 */
export function ConsentDialog() {
  const { gate, pending } = useConsent();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const denyRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (pending) confirmRef.current?.focus();
  }, [pending?.id]);

  useEffect(() => {
    if (!pending) return;

    const onKey = (e: KeyboardEvent) => {
      // Escape is a denial, not a dismissal. Walking away must never be
      // mistaken for agreement.
      if (e.key === 'Escape') {
        e.preventDefault();
        gate.deny(pending.id);
        return;
      }

      // Focus trap. Two focusable elements, so the cycle is explicit.
      if (e.key === 'Tab') {
        const confirm = confirmRef.current;
        const deny = denyRef.current;
        if (!confirm || !deny) return;

        e.preventDefault();
        const active = document.activeElement;
        if (e.shiftKey) {
          (active === confirm ? deny : confirm).focus();
        } else {
          (active === confirm ? deny : confirm).focus();
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending?.id, gate]);

  if (!pending) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
      aria-describedby="consent-body"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-4 sm:items-center"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-300 bg-white p-6 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
          This action needs your confirmation
        </p>

        <h2 id="consent-title" className="mt-2 text-lg font-semibold text-slate-900">
          {pending.summary}
        </h2>

        <p id="consent-body" className="mt-3 text-sm leading-relaxed text-slate-700">
          Your agent asked to run the action below. Nothing happens until you confirm.
        </p>

        <dl className="mt-4 rounded-lg bg-slate-100 p-3 font-mono text-xs text-slate-700">
          <div className="flex justify-between gap-4">
            <dt>tool</dt>
            <dd className="text-slate-900">{pending.tool}</dd>
          </div>
          <div className="mt-1 flex justify-between gap-4">
            <dt>fingerprint</dt>
            <dd className="truncate text-slate-900" title={pending.hash}>
              {pending.hash.slice(0, 16)}…
            </dd>
          </div>
        </dl>

        <div className="mt-5 flex gap-3">
          <button
            ref={confirmRef}
            onClick={() => gate.grant(pending.id)}
            className="flex-1 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            Confirm
          </button>
          <button
            ref={denyRef}
            onClick={() => gate.deny(pending.id)}
            className="flex-1 rounded-lg border border-slate-400 px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
          >
            Deny
          </button>
        </div>
      </div>
    </div>
  );
}
