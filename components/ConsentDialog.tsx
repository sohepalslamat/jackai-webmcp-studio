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
 *
 * Visually it is a hold notice, not a modal: the room dims, an amber rule
 * appears across the top edge, and the action is stated in full before
 * anything clickable. Nothing here should feel like a cookie banner.
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
        (document.activeElement === confirm ? deny : confirm).focus();
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--color-void)]/85 p-4 backdrop-blur-sm sm:items-center"
    >
      <div className="trace-in w-full max-w-lg border border-[var(--color-rule-bright)] bg-[var(--color-deck)] shadow-[0_24px_80px_-12px_rgba(0,0,0,0.9)]">
        {/* The alarm rule. The only place this colour spans a full edge. */}
        <div className="h-[3px] bg-[var(--color-alarm)]" />

        <div className="px-7 py-6">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 bg-[var(--color-alarm)]" />
            <p className="stamp text-[var(--color-alarm)]">execution halted</p>
          </div>

          <h2
            id="consent-title"
            className="mt-4 text-xl leading-snug text-[var(--color-ink)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {pending.summary}
          </h2>

          <p id="consent-body" className="mt-3 text-sm leading-relaxed text-[var(--color-ink-dim)]">
            Your agent asked to run this. It cannot proceed on its own, and it
            cannot approve this for you. Nothing happens until you decide.
          </p>

          {/* The receipt: exactly what is being authorised. */}
          <dl className="mt-5 border-y border-[var(--color-rule)] py-3 text-xs">
            <div className="flex items-baseline justify-between gap-4 py-1">
              <dt className="stamp">tool</dt>
              <dd
                className="truncate text-[var(--color-ink)]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {pending.tool}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-1">
              <dt className="stamp">fingerprint</dt>
              <dd
                className="tabular truncate text-[var(--color-ink-dim)]"
                title={pending.hash}
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {pending.hash.slice(0, 24)}…
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-1">
              <dt className="stamp">valid for</dt>
              <dd
                className="text-[var(--color-ink-dim)]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                this action · once · 120s
              </dd>
            </div>
          </dl>

          <div className="mt-6 flex gap-3">
            <button
              ref={confirmRef}
              onClick={() => gate.grant(pending.id)}
              className="flex-1 bg-[var(--color-alarm)] px-5 py-3 text-sm font-bold tracking-wide text-[var(--color-void)] transition-opacity hover:opacity-90"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              CONFIRM
            </button>
            <button
              ref={denyRef}
              onClick={() => gate.deny(pending.id)}
              className="flex-1 border border-[var(--color-rule-bright)] px-5 py-3 text-sm font-bold tracking-wide text-[var(--color-ink-dim)] transition-colors hover:border-[var(--color-halt)] hover:text-[var(--color-halt)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              DENY
            </button>
          </div>

          <p className="stamp mt-3 text-center">esc denies</p>
        </div>
      </div>
    </div>
  );
}
